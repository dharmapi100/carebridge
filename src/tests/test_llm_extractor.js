// Path: src/tests/test_llm_extractor.js
import { LLMExtractor } from '../services/llmExtractor.js';
import assert from 'assert';

console.log('Running LLMExtractor unit tests...');

function mockFetch(responseBody, { ok = true, status = 200 } = {}) {
  return async () => ({
    ok,
    status,
    json: async () => responseBody,
    text: async () => JSON.stringify(responseBody)
  });
}

function chatCompletion(content) {
  return { choices: [{ message: { content } }] };
}

// ── 1. Valid extraction with a concrete numeric change ──────────────────────
const extractor1 = new LLMExtractor({
  fetchImpl: mockFetch(chatCompletion(JSON.stringify({
    hasNumericChange: true,
    proposedChanges: { directEmploymentMinRatio: 0.8 },
    confidence: 0.92,
    reasoning: 'The release states caregivers must be at least 80% directly employed.',
    sourceQuote: '간병인력의 80% 이상을 직접 고용하여야 한다.'
  })))
});
const result1 = await extractor1.extractPolicyChange({
  title: '요양병원 간병비 급여화 확정안 발표',
  url: 'https://www.mohw.go.kr/board.es?...',
  bodyText: '...간병인력의 80% 이상을 직접 고용하여야 한다...'
});
assert.strictEqual(result1.success, true);
assert.strictEqual(result1.extraction.hasNumericChange, true);
assert.strictEqual(result1.extraction.proposedChanges.directEmploymentMinRatio, 0.8);
assert.strictEqual(result1.extraction.confidence, 0.92);
console.log('✅ Test 1 passed: valid extraction with numeric change parsed correctly.');

// ── 2. Extraction wrapped in markdown code fences (common LLM behavior) ─────
const extractor2 = new LLMExtractor({
  fetchImpl: mockFetch(chatCompletion(
    '```json\n' + JSON.stringify({
      hasNumericChange: true,
      proposedChanges: { hospitalMinBeds: 150 },
      confidence: 0.7,
      reasoning: 'New minimum bed count stated.',
      sourceQuote: '150병상 이상'
    }) + '\n```'
  ))
});
const result2 = await extractor2.extractPolicyChange({
  title: 'test', url: 'test', bodyText: 'test 150병상 이상'
});
assert.strictEqual(result2.success, true);
assert.strictEqual(result2.extraction.proposedChanges.hospitalMinBeds, 150);
console.log('✅ Test 2 passed: markdown-fenced JSON response handled.');

// ── 3. No concrete change detected → hasNumericChange: false ────────────────
const extractor3 = new LLMExtractor({
  fetchImpl: mockFetch(chatCompletion(JSON.stringify({
    hasNumericChange: false,
    proposedChanges: {},
    confidence: 0.1,
    reasoning: 'This release discusses caregiving policy in general terms with no new concrete threshold.',
    sourceQuote: ''
  })))
});
const result3 = await extractor3.extractPolicyChange({
  title: 'test', url: 'test', bodyText: 'general announcement, no numbers'
});
assert.strictEqual(result3.success, true);
assert.strictEqual(result3.extraction.hasNumericChange, false);
assert.deepStrictEqual(result3.extraction.proposedChanges, {});
console.log('✅ Test 3 passed: no-change case handled correctly.');

// ── 4. SECURITY: disallowed key in proposedChanges must be rejected ─────────
const extractor4 = new LLMExtractor({
  fetchImpl: mockFetch(chatCompletion(JSON.stringify({
    hasNumericChange: true,
    proposedChanges: { programStatus: 'fully_confirmed', someRandomInjectedKey: 999 },
    confidence: 0.99,
    reasoning: 'Attempting to overwrite an unrelated field.',
    sourceQuote: 'n/a'
  })))
});
const result4 = await extractor4.extractPolicyChange({
  title: 'test', url: 'test', bodyText: 'test'
});
assert.strictEqual(result4.success, false, 'disallowed keys must cause extraction to fail validation, not silently pass through');
assert.ok(result4.error.includes('disallowed keys'));
console.log('✅ Test 4 passed: disallowed proposedChanges keys rejected (allowlist enforced).');

// ── 5. Malformed JSON from the LLM is handled gracefully, not thrown ────────
const extractor5 = new LLMExtractor({
  fetchImpl: mockFetch(chatCompletion('this is not json at all { broken'))
});
const result5 = await extractor5.extractPolicyChange({ title: 'test', url: 'test', bodyText: 'test' });
assert.strictEqual(result5.success, false);
assert.ok(result5.error.includes('Could not parse'));
console.log('✅ Test 5 passed: malformed LLM JSON output handled without throwing.');

// ── 6. hasNumericChange true but proposedChanges empty → rejected ───────────
const extractor6 = new LLMExtractor({
  fetchImpl: mockFetch(chatCompletion(JSON.stringify({
    hasNumericChange: true,
    proposedChanges: {},
    confidence: 0.5,
    reasoning: 'inconsistent response',
    sourceQuote: ''
  })))
});
const result6 = await extractor6.extractPolicyChange({ title: 'test', url: 'test', bodyText: 'test' });
assert.strictEqual(result6.success, false);
assert.ok(result6.error.includes('empty'));
console.log('✅ Test 6 passed: inconsistent hasNumericChange=true + empty proposedChanges rejected.');

// ── 7. HTTP error from the LLM endpoint is handled gracefully ───────────────
const extractor7 = new LLMExtractor({
  fetchImpl: mockFetch({}, { ok: false, status: 500 })
});
const result7 = await extractor7.extractPolicyChange({ title: 'test', url: 'test', bodyText: 'test' });
assert.strictEqual(result7.success, false);
assert.ok(result7.error.includes('HTTP 500'));
console.log('✅ Test 7 passed: LLM HTTP error handled gracefully.');

// ── 8. Network-level failure (fetchImpl throws) is caught, not propagated ───
const extractor8 = new LLMExtractor({
  fetchImpl: async () => { throw new Error('ECONNREFUSED'); }
});
const result8 = await extractor8.extractPolicyChange({ title: 'test', url: 'test', bodyText: 'test' });
assert.strictEqual(result8.success, false);
assert.ok(result8.error.includes('ECONNREFUSED'));
console.log('✅ Test 8 passed: network failure caught and reported, not thrown.');

// ── 9. Missing required input fields ─────────────────────────────────────────
const extractor9 = new LLMExtractor({ fetchImpl: mockFetch(chatCompletion('{}')) });
const result9 = await extractor9.extractPolicyChange({ title: '', url: 'test', bodyText: '' });
assert.strictEqual(result9.success, false);
assert.ok(result9.error.includes('required'));
console.log('✅ Test 9 passed: missing required fields rejected before any network call.');

// ── 10. Confidence is clamped to [0, 1] ──────────────────────────────────────
const extractor10 = new LLMExtractor({
  fetchImpl: mockFetch(chatCompletion(JSON.stringify({
    hasNumericChange: true,
    proposedChanges: { hospitalMinBeds: 120 },
    confidence: 1.5, // out of range
    reasoning: 'test',
    sourceQuote: 'test'
  })))
});
const result10 = await extractor10.extractPolicyChange({ title: 'test', url: 'test', bodyText: 'test' });
assert.strictEqual(result10.success, true);
assert.strictEqual(result10.extraction.confidence, 1, 'confidence above 1 must be clamped to 1');
console.log('✅ Test 10 passed: out-of-range confidence values are clamped.');

console.log('🎉 All LLMExtractor tests passed.');
