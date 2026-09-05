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
import { StaffingComplianceMonitor } from './staffingComplianceMonitor.js';

const CONDITIONAL_GRACE_PERIOD_YEARS = 1;

// Fixability classification for gap-report entries. Modeled after how Korean
// regulators (KOIHA nursing-hospital certification; 장기요양기관 지정갱신제) already
// bundle facility/structural criteria and staffing/operational criteria into a
// single certification/designation decision rather than issuing them as two
// separate approvals -- see docs/KSGC_MASTER_CONTEXT.md for the research trail.
// 'structural' = capital/facilities decisions with longer timelines (bed count,
// room reconfiguration). 'operational' = staffing/employment decisions a hospital
// can act on in weeks-to-months (direct-employment ratio, headcount, shift
// rotation, RN-supervision linkage, accreditation renewal process).
const GAP_FIXABILITY = {
  hospitalMinBeds: 'structural',
  directEmploymentRequired: 'operational',
  medicalAccreditationRequired: 'operational',
  roomConfiguration: 'structural',
  shiftRotation: 'operational',
  caregiverHeadcount: 'operational',
  legacySoloShiftPattern: 'operational',
  rnSupervisionLinkage: 'operational'
};

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
    this.staffingMonitor = options.staffingMonitor || new StaffingComplianceMonitor({
      policyWatcher: this.policyWatcher,
      auditMonitor: this.auditMonitor
    });
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
      this._evaluateDirectEmployment(hospitalData, regs),
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

  _evaluateDirectEmployment(hospitalData, regs) {
    const totalCaregivers = hospitalData.totalCaregivers ?? 0;
    const directCaregivers = hospitalData.directEmploymentCaregivers ?? 0;
    const ratio = totalCaregivers > 0 ? directCaregivers / totalCaregivers : 0;
    const requiredRatio = regs.directEmploymentMinRatio;
    // MOHW states direct employment as a required "principle" without a published
    // partial-compliance percentage. directEmploymentMinRatio defaults to 1.0
    // (100%) in caregivingPolicy.json as a conservative placeholder -- NOT a
    // confirmed government figure -- since industry data shows only ~10% of
    // caregivers are currently directly employed nationally (Yonsei Univ. survey,
    // 227 hospitals, cited in the 2026-07-28 Yonhap report). Update the config
    // value directly once MOHW publishes a real number; this method reads
    // whatever is in caregivingPolicy.json rather than hardcoding it.
    const pass = totalCaregivers > 0 && ratio >= requiredRatio;
    return {
      criterion: 'directEmploymentRequired',
      required: `>=${(requiredRatio * 100).toFixed(0)}% of caregivers directly employed (default placeholder pending MOHW's published threshold)`,
      actual: `${directCaregivers}/${totalCaregivers} directly employed (${(ratio * 100).toFixed(1)}%)`,
      pass,
      reason: pass
        ? `Direct-employment ratio (${(ratio * 100).toFixed(1)}%) meets the configured minimum of ${(requiredRatio * 100).toFixed(0)}%.`
        : `MOHW requires caregivers be directly employed by the hospital rather than sourced through brokers/agencies; this hospital's ratio (${(ratio * 100).toFixed(1)}%) is below the configured minimum of ${(requiredRatio * 100).toFixed(0)}%.`
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

  /**
   * Generates a single, consolidated gap report combining hospital-level
   * eligibility gates AND ward-level staffing/shift compliance -- one
   * designation decision, matching how KOIHA and 장기요양기관 지정갱신제 already
   * bundle facility and staffing criteria into one certification outcome
   * rather than issuing separate approvals.
   *
   * @param {Object} hospitalData same shape as evaluateHospital()
   * @param {Array<Object>} wardStaffingDataList array of wardData objects,
   *   same shape StaffingComplianceMonitor.evaluateWardStaffing() expects
   * @returns {Object} consolidated gap report, also written to the audit log
   */
  generateGapReport(hospitalData, wardStaffingDataList = []) {
    if (!hospitalData || typeof hospitalData !== 'object') {
      throw new Error('generateGapReport requires a hospitalData object.');
    }
    if (!Array.isArray(wardStaffingDataList)) {
      throw new Error('generateGapReport requires wardStaffingDataList to be an array.');
    }

    const facilityResult = this.evaluateHospital(hospitalData);
    const wardResults = wardStaffingDataList.map(w => this.staffingMonitor.evaluateWardStaffing(w));

    const gaps = [];

    for (const gate of facilityResult.hardGates) {
      if (!gate.pass) {
        gaps.push({
          domain: 'facilityAndEmployment',
          scope: hospitalData.hospitalId ?? 'hospital',
          criterion: gate.criterion,
          currentValue: gate.actual,
          requiredValue: gate.required,
          fixability: GAP_FIXABILITY[gate.criterion] ?? 'unclassified',
          recommendedAction: gate.reason
        });
      }
    }

    for (const wardResult of wardResults) {
      for (const finding of wardResult.findings) {
        gaps.push({
          domain: 'staffingAndShiftCompliance',
          scope: wardResult.wardId,
          criterion: finding.criterion,
          currentValue: finding.detail,
          requiredValue: null,
          fixability: GAP_FIXABILITY[finding.criterion] ?? 'unclassified',
          recommendedAction: finding.detail
        });
      }
    }

    const staffingAllMeetStandard = wardResults.length === 0 ||
      wardResults.every(w => w.meetsForthcomingStandard);

    // Overall status takes the worst-case across both domains. Facility
    // eligibility already encodes its own eligible/conditional/ineligible
    // scale; staffing has no MOHW-published grace-period mechanism yet, so
    // any staffing gap can only ever downgrade toward 'ineligible', never
    // upgrade a facility-level 'conditional'/'ineligible' result.
    let overallStatus = facilityResult.status;
    if (!staffingAllMeetStandard && overallStatus === 'eligible') {
      overallStatus = 'ineligible';
    }

    const report = {
      hospitalId: hospitalData.hospitalId ?? null,
      hospitalName: hospitalData.hospitalName ?? null,
      generatedAt: new Date().toISOString(),
      overallStatus,
      domains: {
        facilityAndEmployment: facilityResult,
        staffingAndShiftCompliance: {
          wardResults,
          allWardsMeetStandard: staffingAllMeetStandard
        }
      },
      gaps
    };

    this.auditMonitor.logAuditEvent(
      'HOSPITAL_GAP_REPORT_GENERATED',
      hospitalData.hospitalId ?? 'unknown-hospital',
      { overallStatus: report.overallStatus, gapCount: gaps.length }
    );

    return report;
  }
}
