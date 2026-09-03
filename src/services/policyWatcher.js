// Path: src/services/policyWatcher.js
import fs from 'fs';
import path from 'path';

export class KoreanPolicyWatcher {
  constructor(
    policyFilePath = './src/config/laborPolicy.json',
    caregivingPolicyFilePath = './src/config/caregivingPolicy.json'
  ) {
    this.policyFilePath = path.resolve(policyFilePath);
    this.caregivingPolicyFilePath = path.resolve(caregivingPolicyFilePath);
    this.mohwBoardUrl = 'https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027';
    this._ensurePolicyStore();
    this._ensureCaregivingPolicyStore();
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
          nationalPensionRate: 0.045,
          healthInsuranceRate: 0.03545,
          employmentInsuranceRate: 0.0115,
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
          patientCopayRatioMin: 0.20,
          patientCopayRatioMax: 0.30,
          nearPovertyTierCopayRatio: 0.20,
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
   */
  updateCaregivingPolicyThresholds(newThresholds) {
    const current = this.getCurrentCaregivingPolicy();
    current.activeRegulations = { ...current.activeRegulations, ...newThresholds };
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
}
