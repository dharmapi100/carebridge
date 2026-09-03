// Path: src/services/hospitalEligibility.js
//
// Hospital Eligibility Scorecard — 간병비 급여화 (caregiving fee national insurance
// coverage) designation logic for South Korea's Ministry of Health and Welfare (MOHW)
// nursing hospital reform.
//
// IMPORTANT — regulatory honesty note:
// MOHW has publicly named 7 factors relevant to "의료중심 요양병원" (medical-focus
// nursing hospital) designation, but as of this writing only 3 have a published,
// confirmed numeric/status threshold:
//   1. hospitalMinBeds (>= 100 beds)                       -- CONFIRMED (Yonhap, 2026-07-28)
//   2. directEmploymentRequired (caregivers directly employed) -- CONFIRMED as a principle
//   3. medicalAccreditationRequired (from 2027-01-01)       -- CONFIRMED
// The remaining 4 are named as selection factors but have NO published minimum/maximum:
//   - 입원급여 적정성 평가 등급 (admission benefit adequacy grade)
//   - 간호 인력 등급 (nursing staffing grade)
//   - 비급여 수익 비율 (non-covered revenue ratio)
//   - 의료최고도/고도 환자 비율 (severe case-mix ratio)
// This engine HARD-GATES only the 3 confirmed criteria and TRACK-ONLY records the
// other 4 (status: 'recorded_pending_mohw_threshold') so nothing is fabricated.
// Once MOHW publishes concrete thresholds for the tracked factors (surfaced via
// KoreanPolicyWatcher.pollMOHWCaregivingFeed()'s drift detection), this engine should
// be updated to promote them into hard gates — see caregivingPolicy.json.
import { KoreanPolicyWatcher } from './policyWatcher.js';
import { AuditMonitor } from './auditMonitor.js';

const CONDITIONAL_GRACE_PERIOD_YEARS = 1;

// Per Chosun Ilbo (2026-07-08): non-metro ("지방") nursing hospitals may receive
// conditional designation if they commit to meeting deficient criteria within 1 year.
// This exception applies ONLY to the infrastructure/administrative gates below —
// MOHW frames direct-employment as foundational to service quality, not something
// eligible for a grace period.
const CONDITIONALLY_EXEMPTABLE_CRITERIA = ['hospitalMinBeds', 'medicalAccreditationRequired'];

export class HospitalEligibilityEngine {
  constructor(options = {}) {
    this.policyWatcher = options.policyWatcher || new KoreanPolicyWatcher(
      options.laborPolicyFilePath,
      options.caregivingPolicyFilePath
    );
    this.auditMonitor = options.auditMonitor || new AuditMonitor(options.auditLogPath);
  }

  /**
   * Evaluates a nursing hospital against MOHW's 간병비 급여화 designation criteria.
   *
   * @param {Object} hospitalData
   * @param {string} hospitalData.hospitalId
   * @param {string} hospitalData.hospitalName
   * @param {number} hospitalData.bedCount
   * @param {number} hospitalData.directEmploymentCaregivers
   * @param {number} hospitalData.totalCaregivers
   * @param {'accredited'|'not_accredited'|'expired'} hospitalData.medicalAccreditationStatus
   * @param {string} [hospitalData.admissionBenefitAdequacyGrade] tracked only
   * @param {string} [hospitalData.nursingStaffGrade] tracked only
   * @param {number} [hospitalData.nonCoveredRevenueRatio] tracked only, 0-1
   * @param {number} [hospitalData.severeCaseMixRatio] tracked only, 0-1
   * @param {'metro'|'non-metro'} hospitalData.region
   * @returns {Object} evaluation result, also written to the audit log
   */
  evaluateHospital(hospitalData) {
    if (!hospitalData || typeof hospitalData !== 'object') {
      throw new Error('evaluateHospital requires a hospitalData object.');
    }

    const policy = this.policyWatcher.getCurrentCaregivingPolicy();
    const regs = policy.activeRegulations;

    const hardGates = [
      this._evaluateBedCount(hospitalData, regs),
      this._evaluateDirectEmployment(hospitalData),
      this._evaluateAccreditation(hospitalData, regs)
    ];

    const trackedFactors = this._collectTrackedFactors(hospitalData);

    const failedGates = hardGates.filter(g => !g.pass);
    const { status, conditionalExpiresAt } = this._determineStatus(failedGates, hospitalData.region);

    const result = {
      hospitalId: hospitalData.hospitalId ?? null,
      hospitalName: hospitalData.hospitalName ?? null,
      evaluatedAt: new Date().toISOString(),
      policySourceLastChecked: policy.lastChecked,
      policyProgramStatus: policy.programStatus,
      status,
      conditionalExpiresAt,
      hardGates,
      trackedFactors,
      failedGateCriteria: failedGates.map(g => g.criterion)
    };

    this.auditMonitor.logAuditEvent(
      'HOSPITAL_ELIGIBILITY_CHECK',
      hospitalData.hospitalId ?? 'unknown-hospital',
      result
    );

    return result;
  }

  _evaluateBedCount(hospitalData, regs) {
    const bedCount = hospitalData.bedCount;
    const pass = typeof bedCount === 'number' && bedCount >= regs.hospitalMinBeds;
    return {
      criterion: 'hospitalMinBeds',
      required: regs.hospitalMinBeds,
      actual: bedCount ?? null,
      pass,
      reason: pass
        ? `Bed count ${bedCount} meets MOHW minimum of ${regs.hospitalMinBeds}.`
        : `Bed count ${bedCount ?? 'unknown'} is below MOHW's confirmed minimum of ${regs.hospitalMinBeds} beds for 의료중심 요양병원 designation.`
    };
  }

  _evaluateDirectEmployment(hospitalData) {
    const totalCaregivers = hospitalData.totalCaregivers ?? 0;
    const directCaregivers = hospitalData.directEmploymentCaregivers ?? 0;
    const ratio = totalCaregivers > 0 ? directCaregivers / totalCaregivers : 0;
    // MOHW states direct employment as a required "principle" without a published
    // partial-compliance percentage. We treat this conservatively: full compliance
    // (100% of caregivers directly employed) is required to pass this gate, since
    // no partial threshold has been confirmed and industry data shows only ~10% of
    // caregivers are currently directly employed nationally (Yonsei Univ. survey,
    // 227 hospitals, cited in the 2026-07-28 Yonhap report).
    const pass = totalCaregivers > 0 && ratio >= 1.0;
    return {
      criterion: 'directEmploymentRequired',
      required: 'All caregivers directly employed by the hospital (no published partial-compliance threshold)',
      actual: `${directCaregivers}/${totalCaregivers} directly employed (${(ratio * 100).toFixed(1)}%)`,
      pass,
      reason: pass
        ? 'All caregivers are directly employed by the hospital, satisfying MOHW\'s direct-employment principle.'
        : 'MOHW requires caregivers be directly employed by the hospital rather than sourced through brokers/agencies; this hospital does not yet fully satisfy that principle.'
    };
  }

  _evaluateAccreditation(hospitalData, regs) {
    const pass = hospitalData.medicalAccreditationStatus === 'accredited';
    return {
      criterion: 'medicalAccreditationRequired',
      required: `Accredited (의료기관 인증), mandatory nationwide from ${regs.medicalAccreditationRequiredFrom}`,
      actual: hospitalData.medicalAccreditationStatus ?? 'unknown',
      pass,
      reason: pass
        ? 'Hospital holds current 의료기관 인증 (medical institution accreditation).'
        : `Hospital lacks medical institution accreditation, mandatory under MOHW policy from ${regs.medicalAccreditationRequiredFrom}.`
    };
  }

  _collectTrackedFactors(hospitalData) {
    const factorDefs = [
      {
        key: 'admissionBenefitAdequacyGrade',
        note: 'MOHW has named 입원급여 적정성 평가 등급 (admission benefit adequacy grade) as a selection factor but has not published a minimum grade.'
      },
      {
        key: 'nursingStaffGrade',
        note: 'MOHW has named 간호 인력 등급 (nursing staffing grade) as a selection factor but has not published a minimum grade.'
      },
      {
        key: 'nonCoveredRevenueRatio',
        note: 'MOHW has named 비급여 수익 비율 (non-covered revenue ratio) as a selection factor but has not published a maximum cap.'
      },
      {
        key: 'severeCaseMixRatio',
        note: 'MOHW has named 의료최고도/고도 환자 비율 (severe case-mix ratio) as a selection factor but has not published a minimum ratio.'
      }
    ];

    const tracked = {};
    for (const { key, note } of factorDefs) {
      tracked[key] = {
        value: hospitalData[key] ?? null,
        status: 'recorded_pending_mohw_threshold',
        note
      };
    }
    return tracked;
  }

  _determineStatus(failedGates, region) {
    if (failedGates.length === 0) {
      return { status: 'eligible', conditionalExpiresAt: null };
    }

    const hasNonExemptableFailure = failedGates.some(
      g => !CONDITIONALLY_EXEMPTABLE_CRITERIA.includes(g.criterion)
    );

    if (hasNonExemptableFailure) {
      // Any failure of a criterion MOHW has not documented a grace period for
      // (currently: direct employment) is an outright ineligible result.
      return { status: 'ineligible', conditionalExpiresAt: null };
    }

    if (region === 'non-metro') {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + CONDITIONAL_GRACE_PERIOD_YEARS);
      return { status: 'conditional', conditionalExpiresAt: expiry.toISOString() };
    }

    // Metro hospitals failing bed-count/accreditation have no documented grace period.
    return { status: 'ineligible', conditionalExpiresAt: null };
  }
}
