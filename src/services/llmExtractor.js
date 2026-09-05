// Path: src/services/llmExtractor.js
//
// Generic OpenAI-compatible chat-completions client used to read a MOHW press
// release and propose a structured policy threshold change. Deliberately
// provider-agnostic: this talks to ANY endpoint that speaks the standard
// `POST /chat/completions` shape (OpenAI, Anthropic-via-proxy, a self-hosted
// vLLM server, or Hermes Agent's local Subscription Proxy at
// http://127.0.0.1:8645/v1 for dev/testing against a Nous Portal subscription).
//
// This is intentionally NOT wired to any single vendor's SDK or API key format
// -- whoever deploys CareBridge in production brings their own LLM_API_BASE_URL
// / LLM_API_KEY / LLM_MODEL, no code change required.
//
// SAFETY CONTRACT: this class only ever PROPOSES a change (returned as data).
// It never writes to caregivingPolicy.json directly -- see policyProposals.js
// for the human-approval gate that stands between an LLM's output and any
// value that actually gates a hospital eligibility decision.
export class LLMExtractor {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.LLM_API_BASE_URL || 'http://127.0.0.1:8645/v1';
    this.apiKey = options.apiKey || process.env.LLM_API_KEY || 'unused-proxy-attaches-real-creds';
    this.model = options.model || process.env.LLM_MODEL || 'Hermes-4-70B';
    // Injectable for testing -- defaults to the global fetch (Node 18+).
    this.fetchImpl = options.fetchImpl || fetch;
  }

  /**
   * Only these keys may ever be proposed as changes -- an allowlist so the LLM
   * cannot invent or overwrite arbitrary config keys (e.g. programStatus,
   * sourceFeed, watchedKeywords) even if it hallucinates a malformed response.
   */
  static get ALLOWED_PROPOSAL_KEYS() {
    return [
      'hospitalMinBeds',
      'directEmploymentMinRatio',
      'patientCopayRatioMin',
      'patientCopayRatioMax',
      'nearPovertyTierCopayRatio',
      'longStayPenalty.sixMonthThresholdDays',
      'longStayPenalty.sixMonthPenaltyRatio',
      'longStayPenalty.oneYearThresholdDays',
      'longStayPenalty.oneYearPenaltyRatio',
      'caregiverToPatientRatio',
      'minShiftRotation',
      'roomConfigMaxBeds',
      'medicalAccreditationRequiredFrom',
      'targetSevereTierPatients2030',
      'targetGoLiveDate'
    ];
  }

  _buildPrompt({ title, url, bodyText }) {
    const allowedKeys = LLMExtractor.ALLOWED_PROPOSAL_KEYS.join(', ');
    return [
      {
        role: 'system',
        content:
          'You are a regulatory-compliance extraction assistant for CareBridge, a Korean ' +
          'labor-compliance platform. You will be given the title and body text of a press ' +
          'release from South Korea\'s Ministry of Health and Welfare (MOHW) concerning the ' +
          '간병비 급여화 (caregiving fee national health insurance coverage) reform for ' +
          'nursing hospitals (요양병원). Your job is ONLY to detect whether the release states ' +
          'a NEW, CONCRETE, NUMERIC or DATE policy threshold (not a vague statement of intent) ' +
          'and extract it. You must respond with ONLY a single JSON object, no prose, no markdown ' +
          'fences, matching exactly this schema:\n' +
          '{\n' +
          '  "hasNumericChange": boolean,\n' +
          '  "proposedChanges": { <key>: <value> },\n' +
          '  "confidence": number between 0 and 1,\n' +
          '  "reasoning": string explaining what you found and why,\n' +
          '  "sourceQuote": string, the exact quoted sentence(s) supporting the extraction\n' +
          '}\n' +
          `The ONLY valid keys for proposedChanges are: ${allowedKeys}. ` +
          'If you are not highly confident, or the release does not state a concrete new number/date, ' +
          'set hasNumericChange to false and leave proposedChanges as an empty object. ' +
          'Never guess a number that is not explicitly stated in the text.'
      },
      {
        role: 'user',
        content: `TITLE: ${title}\nURL: ${url}\n\nBODY TEXT:\n${bodyText}`
      }
    ];
  }

  /**
   * Sends the press release to the configured LLM and returns a parsed, validated
   * extraction result. Never throws for LLM-side issues (bad JSON, HTTP error) --
   * those are returned as { success: false, error }. Only truly unexpected
   * conditions (e.g. fetchImpl itself throwing a network error) propagate.
   */
  async extractPolicyChange({ title, url, bodyText }) {
    if (!title || !bodyText) {
      return { success: false, error: 'title and bodyText are required for extraction.' };
    }

    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: this._buildPrompt({ title, url, bodyText }),
          temperature: 0
        })
      });
    } catch (err) {
      return { success: false, error: `LLM request failed (network): ${err.message}` };
    }

    if (!response.ok) {
      let bodyPreview = '';
      try { bodyPreview = (await response.text()).slice(0, 500); } catch (_) { /* ignore */ }
      return { success: false, error: `LLM endpoint responded with HTTP ${response.status}. ${bodyPreview}` };
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      return { success: false, error: `LLM response was not valid JSON envelope: ${err.message}` };
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'LLM response missing choices[0].message.content.', rawResponse: data };
    }

    const parsed = this._parseExtractionJson(content);
    if (!parsed.success) {
      return { success: false, error: parsed.error, rawContent: content };
    }

    const validated = this._validateExtraction(parsed.data);
    if (!validated.success) {
      return { success: false, error: validated.error, rawContent: content };
    }

    return { success: true, extraction: validated.extraction };
  }

  /**
   * Extracts a JSON object from the LLM's raw text response, tolerating
   * markdown code fences (```json ... ```) which models commonly add despite
   * being told not to.
   */
  _parseExtractionJson(content) {
    let candidate = content.trim();
    const fenceMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      candidate = fenceMatch[1].trim();
    }
    try {
      return { success: true, data: JSON.parse(candidate) };
    } catch (err) {
      return { success: false, error: `Could not parse LLM output as JSON: ${err.message}` };
    }
  }

  /**
   * Enforces the response shape and the proposedChanges key allowlist. This is
   * the last line of defense before an LLM's output is even allowed to become
   * a reviewable proposal.
   */
  _validateExtraction(data) {
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: 'Extraction result is not an object.' };
    }
    if (typeof data.hasNumericChange !== 'boolean') {
      return { success: false, error: 'Extraction result missing boolean hasNumericChange.' };
    }
    if (!data.hasNumericChange) {
      return {
        success: true,
        extraction: {
          hasNumericChange: false,
          proposedChanges: {},
          confidence: typeof data.confidence === 'number' ? data.confidence : 0,
          reasoning: data.reasoning || 'No concrete numeric/date change detected.',
          sourceQuote: data.sourceQuote || ''
        }
      };
    }

    const proposedChanges = data.proposedChanges;
    if (typeof proposedChanges !== 'object' || proposedChanges === null) {
      return { success: false, error: 'hasNumericChange is true but proposedChanges is missing/invalid.' };
    }

    const allowed = new Set(LLMExtractor.ALLOWED_PROPOSAL_KEYS);
    const invalidKeys = Object.keys(proposedChanges).filter(k => !allowed.has(k));
    if (invalidKeys.length > 0) {
      return { success: false, error: `Extraction proposed disallowed keys: ${invalidKeys.join(', ')}` };
    }
    if (Object.keys(proposedChanges).length === 0) {
      return { success: false, error: 'hasNumericChange is true but proposedChanges is empty.' };
    }

    return {
      success: true,
      extraction: {
        hasNumericChange: true,
        proposedChanges,
        confidence: typeof data.confidence === 'number' ? Math.max(0, Math.min(1, data.confidence)) : 0.5,
        reasoning: data.reasoning || '',
        sourceQuote: data.sourceQuote || ''
      }
    };
  }
}
