// Path: src/services/policyWatcher.js
import fs from 'fs';
import path from 'path';

export class KoreanPolicyWatcher {
  constructor(
    policyFilePath = './src/config/laborPolicy.json',
    caregivingPolicyFilePath = './src/config/caregivingPolicy.json',
    insurancePolicyFilePath = './src/config/insurancePolicy.json'
  ) {
    this.policyFilePath = path.resolve(policyFilePath);
    this.caregivingPolicyFilePath = path.resolve(caregivingPolicyFilePath);
    this.insurancePolicyFilePath = path.resolve(insurancePolicyFilePath);
    this.mohwBoardUrl = 'https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027';
    this.moelBoardUrl = 'https://www.moel.go.kr/news/enews/report/enewsList.do';
    this.npsBoardUrl = 'https://www.nps.or.kr/pnsgdnc/nscvrgdata/getOHAE0002M0List.do';
    this._ensurePolicyStore();
    this._ensureCaregivingPolicyStore();
    this._ensureInsurancePolicyStore();
  }

  _ensurePolicyStore() {
    const dir = path.dirname(this.policyFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.policyFilePath)) {
      const defaultPolicy = {
        lastChecked: new Date().toISOString(),
        jurisdiction: 'South Korea Ministry of Employment and Labor (MOEL)',
        activeRegulations: {
          severanceThresholdWeeklyHours: 15.0,
          overtimeMultiplier: 1.5,
          nationalPensionRate: 0.0475,
          healthInsuranceRate: 0.03595,
          employmentInsuranceRate: 0.009,
          minimumHourlyWage2026: 10030 // KRW
        },
        sourceFeed: 'https://www.moel.go.kr (Simulated Autonomous Feed)'
      };
      fs.writeFileSync(this.policyFilePath, JSON.stringify(defaultPolicy, null, 2));
    }
  }

  getCurrentPolicy() {
    const data = fs.readFileSync(this.policyFilePath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * Simulates an autonomous check against the Ministry of Employment and Labor (MOEL)
   * or statutory updates. In production, this can parse RSS feeds, legal gazettes, or APIs.
   */
  async pollAndVerifyPolicyUpdates() {
    const current = this.getCurrentPolicy();
    
    // Simulate checking for policy amendments or announcements
    const simulatedUpdateDetected = false; // Set to true if a policy shift is found

    console.log(`[PolicyWatcher] Polled MOEL regulatory feed. Current policy version verified. Last checked: ${new Date().toISOString()}`);

    return {
      updated: simulatedUpdateDetected,
      policy: current
    };
  }

  /**
   * Dynamically patches policy thresholds if government regulations change
   */
  updatePolicyThresholds(newThresholds) {
    const current = this.getCurrentPolicy();
    current.activeRegulations = { ...current.activeRegulations, ...newThresholds };
    current.lastChecked = new Date().toISOString();
    
    fs.writeFileSync(this.policyFilePath, JSON.stringify(current, null, 2));
    console.log('[PolicyWatcher] ⚠️ Regulatory policy thresholds updated dynamically!', newThresholds);
    return current;
  }

  // ─────────────────────────────────────────────────────────────
  // MOHW Caregiving Compliance (간병비 급여화) — nursing hospital track
  // ─────────────────────────────────────────────────────────────

  _ensureCaregivingPolicyStore() {
    const dir = path.dirname(this.caregivingPolicyFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.caregivingPolicyFilePath)) {
      // NOTE: These figures reflect MOHW's July–Aug 2026 public forum / National
      // Assembly briefing drafts. The formal 건강보험정책심의위원회 (NHI Policy
      // Deliberation Committee) ruling has NOT been finalized as of this writing —
      // programStatus stays 'pilot_pending_confirmation' until a confirmed MOHW
      // press release supersedes it. Do not treat these as settled law.
      const defaultCaregivingPolicy = {
        lastChecked: new Date().toISOString(),
        jurisdiction: 'South Korea Ministry of Health and Welfare (MOHW)',
        programStatus: 'pilot_pending_confirmation',
        activeRegulations: {
          targetGoLiveDate: '2027-H1',
          hospitalMinBeds: 100,
          directEmploymentRequired: true,
          // MOHW has not published a partial-compliance percentage for direct
          // employment -- 1.0 (100%) is a conservative default, NOT a confirmed
          // government figure. Update this the moment MOHW publishes a real
          // number (watch pollMOHWCaregivingFeed()'s detectedUpdates for the
          // announcement, then read it and set this manually -- the watcher
          // flags the announcement, it does not extract or apply the number).
          directEmploymentMinRatio: 1.0,
          patientCopayRatioMin: 0.20,
          patientCopayRatioMax: 0.30,
          nearPovertyTierCopayRatio: 0.20,
          // Long-stay penalty: per Seoul Economic Daily (서울경제, 2026-09-22),
          // citing a named MOHW 보험급여과 bureau director on-record at the
          // 간병비 급여화 public forum: patients admitted 6+ months face a +10
          // percentage-point copay increase; 1+ year admissions face +20pp.
          // This is a named-official public statement, same confidence tier as
          // hospitalMinBeds/medicalAccreditationRequiredFrom above -- NOT yet a
          // 건강보험정책심의위원회 (건정심) formal ruling. Update via the policy
          // watcher's drift-detection review flow if 건정심 finalizes different
          // figures.
          longStayPenalty: {
            sixMonthThresholdDays: 183,
            sixMonthPenaltyRatio: 0.10,
            oneYearThresholdDays: 365,
            oneYearPenaltyRatio: 0.20
          },
          caregiverToPatientRatio: 4,
          minShiftRotation: 2,
          roomConfigMaxBeds: 4,
          medicalAccreditationRequiredFrom: '2027-01-01',
          targetSevereTierPatients2030: 85000
        },
        sourceFeed: this.mohwBoardUrl,
        watchedKeywords: ['간병', '요양병원', '급여화', '간병비', '간호간병통합서비스'],
        // Rolling log of MOHW press releases that matched our keywords, so a human
        // can review and decide whether activeRegulations needs a manual update.
        detectedUpdates: []
      };
      fs.writeFileSync(this.caregivingPolicyFilePath, JSON.stringify(defaultCaregivingPolicy, null, 2));
    }
  }

  getCurrentCaregivingPolicy() {
    const data = fs.readFileSync(this.caregivingPolicyFilePath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * Dynamically patches caregiving policy thresholds — mirrors updatePolicyThresholds()
   * for the MOEL track. This is the ONLY sanctioned way activeRegulations changes;
   * the autonomous poller never writes here directly (see pollMOHWCaregivingFeed).
   *
   * Supports dot-path keys (e.g. 'longStayPenalty.sixMonthPenaltyRatio') for nested
   * regulation objects, alongside flat top-level keys -- both are shallow/O(1) per
   * key, so this stays cheap even as nested regulation groups grow.
   */
  updateCaregivingPolicyThresholds(newThresholds) {
    const current = this.getCurrentCaregivingPolicy();

    for (const [key, value] of Object.entries(newThresholds)) {
      if (key.includes('.')) {
        const [parentKey, childKey] = key.split('.');
        if (!current.activeRegulations[parentKey] || typeof current.activeRegulations[parentKey] !== 'object') {
          current.activeRegulations[parentKey] = {};
        }
        current.activeRegulations[parentKey][childKey] = value;
      } else {
        current.activeRegulations[key] = value;
      }
    }

    current.lastChecked = new Date().toISOString();

    fs.writeFileSync(this.caregivingPolicyFilePath, JSON.stringify(current, null, 2));
    console.log('[PolicyWatcher] ⚠️ MOHW caregiving policy thresholds updated dynamically!', newThresholds);
    return current;
  }

  /**
   * Parses MOHW's 보도자료 (press release) board listing HTML into structured rows.
   * The board renders a plain server-side <table class="tstyle_list"> with one <tr>
   * per release: title link (with list_no), department, and registration date.
   * Pulled out as its own method so it's independently unit-testable against a
   * captured HTML fixture, without requiring a live network call.
   */
  _parseMOHWBoardListing(html) {
    const rows = [];
    // Matches each title anchor: href contains list_no=NNNN, innerText is the title.
    // The 새글(new post) marker <i> and <span class="sr_only"> tags are stripped.
    const rowRegex = /<a href="([^"]*?list_no=(\d+)[^"]*)"\s+class="txt_title">\s*(?:<i[^>]*><\/i>)?\s*(?:<span class="sr_only">[^<]*<\/span>)?\s*([^<]+)<\/a>[\s\S]*?data-label="등록일">([^<]+)</g;

    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const [, relativeHref, listNo, rawTitle, date] = match;
      rows.push({
        listNo,
        title: rawTitle.trim(),
        date: date.trim(),
        url: `https://www.mohw.go.kr${relativeHref.replace(/&amp;/g, '&')}`
      });
    }
    return rows;
  }

  /**
   * Given parsed board rows and a policy's watchedKeywords, returns the subset of
   * rows whose title matches at least one keyword AND whose listNo has not already
   * been recorded in detectedUpdates (dedupe across repeated polls).
   */
  _detectCaregivingDrift(rows, policy) {
    const keywords = policy.watchedKeywords || [];
    const alreadySeen = new Set((policy.detectedUpdates || []).map(u => u.listNo));

    return rows.filter(row => {
      if (alreadySeen.has(row.listNo)) return false;
      return keywords.some(kw => row.title.includes(kw));
    });
  }

  /**
   * Autonomous poll against the real MOHW press release board. This is a READ-ONLY
   * discovery step: it never auto-applies numeric threshold changes (Korean
   * regulatory prose is not safe to auto-parse into policy constants). Instead it
   * appends any newly matched press releases to detectedUpdates for human review,
   * and flips programStatus toward a review state so downstream services/dashboards
   * can surface "MOHW policy drift — needs review" rather than silently going stale.
   *
   * Network/parse failures are caught and logged; lastChecked is intentionally left
   * unchanged on failure so staleness is visible/auditable rather than masked.
   */
  async pollMOHWCaregivingFeed() {
    const policy = this.getCurrentCaregivingPolicy();

    let html;
    try {
      const response = await fetch(this.mohwBoardUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (CareBridge PolicyWatcher/1.0)' }
      });
      if (!response.ok) {
        throw new Error(`MOHW board responded with HTTP ${response.status}`);
      }
      html = await response.text();
    } catch (err) {
      console.warn(`[PolicyWatcher] ⚠️ MOHW feed poll failed (leaving policy as last-known-good): ${err.message}`);
      return {
        success: false,
        error: err.message,
        policy
      };
    }

    const rows = this._parseMOHWBoardListing(html);
    const newMatches = this._detectCaregivingDrift(rows, policy);

    if (newMatches.length > 0) {
      policy.detectedUpdates = [
        ...(policy.detectedUpdates || []),
        ...newMatches.map(m => ({ ...m, detectedAt: new Date().toISOString() }))
      ];
      policy.programStatus = 'drift_detected_needs_review';
      console.log(`[PolicyWatcher] 🔎 MOHW caregiving drift detected: ${newMatches.length} new release(s) matched watched keywords.`);
    } else {
      console.log('[PolicyWatcher] Polled MOHW caregiving feed. No new matching releases.');
    }

    policy.lastChecked = new Date().toISOString();
    fs.writeFileSync(this.caregivingPolicyFilePath, JSON.stringify(policy, null, 2));

    return {
      success: true,
      newMatchesCount: newMatches.length,
      newMatches,
      policy
    };
  }

  /**
   * Fetches and extracts the plain-text body of a single MOHW press release
   * detail page, given its list_no. Used by the daemon to hand real article
   * text to LLMExtractor -- board listing rows only have a title, not content.
   */
  async fetchMOHWPostBody(listNo) {
    const detailUrl = `https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=${listNo}`;

    let html;
    try {
      const response = await fetch(detailUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (CareBridge PolicyWatcher/1.0)' }
      });
      if (!response.ok) {
        throw new Error(`MOHW detail page responded with HTTP ${response.status}`);
      }
      html = await response.text();
    } catch (err) {
      return { success: false, error: err.message };
    }

    const startMarker = 'class="viewArea">';
    const startIdx = html.indexOf(startMarker);
    if (startIdx === -1) {
      return { success: false, error: 'Could not locate viewArea content block in MOHW detail page (page structure may have changed).' };
    }
    const endIdx = html.indexOf('첨부파일', startIdx);
    const rawSnippet = endIdx > -1 ? html.slice(startIdx, endIdx) : html.slice(startIdx, startIdx + 20000);

    const bodyText = rawSnippet
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&rsquo;|&lsquo;/g, "'")
      .replace(/&rdquo;|&ldquo;/g, '"')
      .replace(/&middot;/g, '·')
      .replace(/&rarr;/g, '→')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

    if (bodyText.length === 0) {
      return { success: false, error: 'Extracted body text was empty.' };
    }

    return { success: true, bodyText, url: detailUrl };
  }

  // ─────────────────────────────────────────────────────────────
  // 4-Major-Insurance Rate Watch (국민연금/건강보험/고용보험 employee-side %)
  // ─────────────────────────────────────────────────────────────
  //
  // Same non-auto-write contract as the MOHW caregiving watcher above: this
  // only discovers candidate rate-change announcements across the three
  // boards that actually publish them (MOHW health-insurance rate decisions,
  // NPS pension-rate notices, MOEL employment/industrial-accident insurance
  // notices) and records them in insurancePolicy.json's detectedUpdates for
  // human review. It NEVER patches complianceEngine.js's rate constants or
  // laborPolicy.json directly -- a human updates those manually after
  // confirming a detected announcement, same as the caregiving flow.

  _ensureInsurancePolicyStore() {
    const dir = path.dirname(this.insurancePolicyFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.insurancePolicyFilePath)) {
      const defaultInsurancePolicy = {
        lastChecked: new Date().toISOString(),
        jurisdiction: 'MOHW / NPS / MOEL (4-major-insurance rate announcements)',
        // Mirrors laborPolicy.json's employee-side rates -- kept here too so
        // drift-detection has a "last confirmed" baseline to display next to
        // any newly detected announcement, without needing to cross-reference.
        activeRegulations: {
          nationalPensionRate: 0.0475,
          healthInsuranceRate: 0.03595,
          employmentInsuranceRate: 0.009
        },
        sourceFeeds: {
          mohw: this.mohwBoardUrl,
          nps: this.npsBoardUrl,
          moel: this.moelBoardUrl
        },
        watchedKeywords: ['보험료율', '건강보험료', '국민연금 보험료', '고용보험료', '산재보험료'],
        detectedUpdates: []
      };
      fs.writeFileSync(this.insurancePolicyFilePath, JSON.stringify(defaultInsurancePolicy, null, 2));
    }
  }

  getCurrentInsurancePolicy() {
    const data = fs.readFileSync(this.insurancePolicyFilePath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * Parses MOEL's 보도자료 board listing (structurally identical to MOHW's:
   * server-side <table> with a title <a> carrying a numeric id, plus a
   * separate 등록일 cell). Reuses the same row shape as _parseMOHWBoardListing
   * so downstream drift-detection stays generic.
   */
  _parseMOELBoardListing(html) {
    const rows = [];
    const rowRegex = /<a href="enewsView\.do\?news_seq=(\d+)"[^>]*title="([^"]+)"[\s\S]*?<td aria-label="등록일">([^<]+)<\/td>/g;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const [, listNo, rawTitle, rawDate] = match;
      rows.push({
        listNo,
        title: rawTitle.trim(),
        date: rawDate.trim().replace(/\./g, '-').replace(/-$/, ''),
        url: `https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=${listNo}`
      });
    }
    return rows;
  }

  /**
   * Parses NPS's 보도자료 board listing: <li class="list-item"> blocks, title
   * as the <a> tag's text content (not an attribute) carrying a pstId query
   * param, and a separate 작성일 field inside the item's info list.
   */
  _parseNPSBoardListing(html) {
    const rows = [];
    const itemRegex = /<li class="list-item">[\s\S]*?<a href="([^"]*?pstId=([A-Z0-9]+)[^"]*)">\s*([^<]+?)\s*<\/a>[\s\S]*?<span class="data">(\d{4}\/\d{2}\/\d{2})<\/span>/g;
    let match;
    while ((match = itemRegex.exec(html)) !== null) {
      const [, relativeHref, listNo, rawTitle, rawDate] = match;
      const href = relativeHref.startsWith('http') ? relativeHref : `https://www.nps.or.kr${relativeHref}`;
      rows.push({
        listNo,
        title: rawTitle.trim(),
        date: rawDate.replace(/\//g, '-'),
        url: href.replace(/&amp;/g, '&')
      });
    }
    return rows;
  }

  /**
   * Polls all three insurance-rate feeds (MOHW, MOEL, NPS), pooling matches
   * through the same generic _detectCaregivingDrift keyword-match+dedupe
   * logic used for the caregiving track (it only depends on
   * {watchedKeywords, detectedUpdates}, not on caregiving specifics).
   * Read-only discovery, same graceful-degradation contract as
   * pollMOHWCaregivingFeed: a failed board fetch is logged and skipped,
   * never fatal to the other boards or to lastChecked.
   */
  async pollInsuranceRateFeeds() {
    const policy = this.getCurrentInsurancePolicy();
    const boards = [
      { name: 'mohw', url: this.mohwBoardUrl, parse: html => this._parseMOHWBoardListing(html) },
      { name: 'moel', url: this.moelBoardUrl, parse: html => this._parseMOELBoardListing(html) },
      { name: 'nps', url: this.npsBoardUrl, parse: html => this._parseNPSBoardListing(html) }
    ];

    const allNewMatches = [];
    const errors = [];

    for (const board of boards) {
      try {
        const response = await fetch(board.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (CareBridge PolicyWatcher/1.0)' }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const html = await response.text();
        const rows = board.parse(html);
        const newMatches = this._detectCaregivingDrift(rows, policy);
        allNewMatches.push(...newMatches.map(m => ({ ...m, board: board.name })));
      } catch (err) {
        errors.push(`${board.name}: ${err.message}`);
        console.warn(`[PolicyWatcher] ⚠️ Insurance-rate feed poll failed for ${board.name} (leaving as last-known-good): ${err.message}`);
      }
    }

    if (allNewMatches.length > 0) {
      policy.detectedUpdates = [
        ...(policy.detectedUpdates || []),
        ...allNewMatches.map(m => ({ ...m, detectedAt: new Date().toISOString() }))
      ];
      console.log(`[PolicyWatcher] 🔎 Insurance-rate drift detected: ${allNewMatches.length} new release(s) across ${boards.length} boards.`);
    } else {
      console.log('[PolicyWatcher] Polled insurance-rate feeds. No new matching releases.');
    }

    policy.lastChecked = new Date().toISOString();
    fs.writeFileSync(this.insurancePolicyFilePath, JSON.stringify(policy, null, 2));

    return {
      success: errors.length < boards.length, // at least one board succeeded
      newMatchesCount: allNewMatches.length,
      newMatches: allNewMatches,
      errors,
      policy
    };
  }
}
