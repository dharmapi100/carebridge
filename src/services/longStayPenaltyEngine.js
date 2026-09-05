// Path: src/services/longStayPenaltyEngine.js
//
// Long-Stay Copay Penalty Engine — computes a patient's caregiving-fee copay
// ratio under South Korea's MOHW 간병비 급여화 reform, including the long-stay
// admission-duration penalty.
//
// IMPORTANT — regulatory honesty note (verified 2026-09-04):
// Base copay ratio (~30%) and the long-stay penalty structure (+10pp at 6mo,
// +20pp at 1yr) are sourced from Seoul Economic Daily (서울경제, 2026-09-22),
// citing a named MOHW 보험급여과 bureau director on-record at the public forum
// on 간병비 급여화. This is a named-official public statement -- the same
// confidence tier as hospitalMinBeds/medicalAccreditationRequiredFrom already
// hard-coded in hospitalEligibility.js -- but it is NOT yet a formal
// 건강보험정책심의위원회 (건정심/NHI Policy Deliberation Committee) ruling.
// All figures are read from caregivingPolicy.json's activeRegulations.longStayPenalty,
// never hardcoded here, so a 건정심 ruling that changes these numbers requires
// zero code changes -- same discipline as every other engine in this codebase.
//
// SCOPE NOTE: this engine deliberately does NOT attempt the full 5-tier medical
// classification x LTCI-grade priority-queue/waitlist model (원래 계획 item #3's
// broader scope). MOHW has not published a scoring/ranking mechanism for how
// patients are prioritized within the ~85,000-patient cap, nor a per-tier copay
// differentiation beyond the flat ~30% base -- inventing that ranking logic would
// be fabricating regulatory content, the exact mistake already corrected once in
// this codebase (see hospitalEligibility.js's direct-employment threshold history).
// This engine covers ONLY the piece with a specific, attributable, named-source
// figure: the long-stay copay escalation.
import { KoreanPolicyWatcher } from './policyWatcher.js';
import { AuditMonitor } from './auditMonitor.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export class LongStayPenaltyEngine {
  constructor(options = {}) {
    this.policyWatcher = options.policyWatcher || new KoreanPolicyWatcher(
      options.laborPolicyFilePath,
      options.caregivingPolicyFilePath
    );
    this.auditMonitor = options.auditMonitor || new AuditMonitor(options.auditLogPath);

    // Performance: cache the parsed policy in memory rather than doing a sync
    // fs.readFileSync()+JSON.parse() per patient. A hospital roster can be
    // thousands of patients; re-parsing the same small JSON file per patient
    // is pure overhead. Call refreshPolicy() to pick up a policy update
    // (e.g. after PolicyProposalStore.approveProposal()) without recreating
    // this engine instance.
    this._cachedPolicy = null;
    this.refreshPolicy();
  }

  refreshPolicy() {
    this._cachedPolicy = this.policyWatcher.getCurrentCaregivingPolicy();
    return this._cachedPolicy;
  }

  /**
   * Computes the applicable copay ratio for one patient given their admission
   * duration. Pure function over the cached policy -- O(1), no I/O.
   *
   * @param {number} admissionDurationDays days since admission (inclusive)
   * @param {boolean} [isNearPovertyTier=false] applies the lower near-poverty
   *   base rate instead of the standard base rate; the long-stay penalty still
   *   layers on top per the same published mechanism.
   * @returns {Object} { baseCopayRatio, penaltyApplied, penaltyRatio, finalCopayRatio, tier }
   */
  calculateCopayRatio(admissionDurationDays, isNearPovertyTier = false) {
    if (typeof admissionDurationDays !== 'number' || admissionDurationDays < 0 || !Number.isFinite(admissionDurationDays)) {
      throw new Error('calculateCopayRatio requires a non-negative finite admissionDurationDays.');
    }

    const regs = this._cachedPolicy.activeRegulations;
    const lsp = regs.longStayPenalty;

    const baseCopayRatio = isNearPovertyTier ? regs.nearPovertyTierCopayRatio : regs.patientCopayRatioMax;

    let penaltyRatio = 0;
    let tier = 'standard';

    if (admissionDurationDays >= lsp.oneYearThresholdDays) {
      penaltyRatio = lsp.oneYearPenaltyRatio;
      tier = 'long_stay_1yr_plus';
    } else if (admissionDurationDays >= lsp.sixMonthThresholdDays) {
      penaltyRatio = lsp.sixMonthPenaltyRatio;
      tier = 'long_stay_6mo_plus';
    }

    const finalCopayRatio = Number((baseCopayRatio + penaltyRatio).toFixed(4));

    return {
      admissionDurationDays,
      isNearPovertyTier,
      baseCopayRatio,
      penaltyApplied: penaltyRatio > 0,
      penaltyRatio,
      finalCopayRatio,
      tier
    };
  }

  /**
   * Convenience overload: same as calculateCopayRatio, but derives duration
   * from an admission date instead of a raw day count.
   */
  calculateCopayRatioFromAdmissionDate(admissionDate, isNearPovertyTier = false, asOfDate = new Date()) {
    const admission = admissionDate instanceof Date ? admissionDate : new Date(admissionDate);
    const asOf = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
    const durationDays = Math.floor((asOf.getTime() - admission.getTime()) / MS_PER_DAY);
    return this.calculateCopayRatio(durationDays, isNearPovertyTier);
  }

  /**
   * Evaluates a full patient and applies the resulting copay ratio to their
   * gross monthly caregiving cost, producing a per-patient billing breakdown.
   * Audit-logs the result (per-patient financial calculation, PIPA-relevant).
   *
   * @param {Object} patientData
   * @param {string} patientData.patientId
   * @param {string} patientData.hospitalId
   * @param {number} patientData.admissionDurationDays
   * @param {number} patientData.grossMonthlyCaregivingCostKRW
   * @param {boolean} [patientData.isNearPovertyTier=false]
   * @returns {Object} billing breakdown, also written to the audit log
   */
  evaluatePatientCopay(patientData) {
    if (!patientData || typeof patientData !== 'object') {
      throw new Error('evaluatePatientCopay requires a patientData object.');
    }

    const ratioResult = this.calculateCopayRatio(
      patientData.admissionDurationDays,
      patientData.isNearPovertyTier ?? false
    );

    const grossCost = patientData.grossMonthlyCaregivingCostKRW;
    if (typeof grossCost !== 'number' || grossCost < 0) {
      throw new Error('evaluatePatientCopay requires a non-negative grossMonthlyCaregivingCostKRW.');
    }

    const patientCopayKRW = Number((grossCost * ratioResult.finalCopayRatio).toFixed(2));
    const nhiCoveredKRW = Number((grossCost - patientCopayKRW).toFixed(2));

    const result = {
      patientId: patientData.patientId ?? null,
      hospitalId: patientData.hospitalId ?? null,
      evaluatedAt: new Date().toISOString(),
      policyLastChecked: this._cachedPolicy.lastChecked,
      ...ratioResult,
      grossMonthlyCaregivingCostKRW: grossCost,
      patientCopayKRW,
      nhiCoveredKRW
    };

    this.auditMonitor.logAuditEvent('PATIENT_COPAY_EVALUATION', patientData.patientId ?? 'unknown-patient', result);

    return result;
  }

  /**
   * Batch evaluation across a full patient roster in a single pass. Reads the
   * cached policy exactly once regardless of roster size (O(n) total, not
   * O(n) file reads) -- built for hospital-scale rosters, not one-off single
   * calls. Individual audit-log I/O per patient is unavoidable (audit trail
   * requires one immutable entry per financial calculation) but the policy
   * lookup and copay math are all in-memory.
   *
   * @param {Array<Object>} patientDataList array of patientData objects, same
   *   shape as evaluatePatientCopay()
   * @returns {Array<Object>} array of billing breakdowns, same order as input
   */
  evaluatePatientCopayBatch(patientDataList) {
    if (!Array.isArray(patientDataList)) {
      throw new Error('evaluatePatientCopayBatch requires an array of patientData objects.');
    }
    return patientDataList.map(patientData => this.evaluatePatientCopay(patientData));
  }
}
