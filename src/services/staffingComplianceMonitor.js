// Path: src/services/staffingComplianceMonitor.js
//
// Shift & Staffing-Ratio Compliance Monitor — evaluates a nursing hospital's
// caregiver staffing pattern against MOHW's 간병비 급여화 (caregiving fee
// national insurance coverage) reform target for a given room/ward.
//
// IMPORTANT — regulatory honesty note (verified 2026-09-04):
// MOHW's own stated baseline (mohw.go.kr board post, list_no=1479428) is:
//   - 1 caregiver : 4 patients ANNUAL AVERAGE caseload (NOT a live per-shift headcount)
//   - 2-shift OR 3-shift rotation (either is explicitly allowed, not "2-3" as a range)
//   - 4-bed room configuration
// This is still contested, not finalized law:
//   - Multiple outlets (mediwelfare.com, newsthevoice.com) report the industry
//     and some regulators are actively pushing back toward 6-bed rooms / 2-shift
//     as a more realistic alternative.
//   - The 건강보험정책심의위원회 (NHI Policy Deliberation Committee) has not issued
//     a final ruling as of this writing -- caregivingPolicy.json's programStatus
//     stays 'pilot_pending_confirmation' until it does.
// This engine therefore treats patientsPerRoom / targetRatio / shiftRotation as
// CONFIG-DRIVEN (sourced from KoreanPolicyWatcher's caregivingPolicy.json), never
// hardcoded, so a policy update flips behavior with zero code changes.
//
// LEGAL ACCURACY NOTE: the pre-reform 24-hour single-caregiver pattern is NOT
// illegal today. Per Chosun Ilbo (2026-02-26), caregivers are currently excluded
// from Labor Standards Act working-hour protections entirely -- there is no
// governing law on caregiver hours yet. This engine must never claim the legacy
// pattern is "in violation" of current law. It is flagged only as
// "does not meet the forthcoming staffing standard" -- a prospective compliance
// gap, not a legal violation claim.
//
// Required per-room headcount is DERIVED, not a flat constant, because MOHW's
// ratio is an annual-average caseload per caregiver, not a live per-shift number.
// KBS/Daum (2026-08-25) confirm the real-world conversion cost: moving one 4-bed
// room to legally-adequate 3-shift coverage requires ~4.8 caregivers per room
// (accounting for shift handoff + leave/rest coverage), not a bare headcount of 1.
// This monitor computes that multiplier explicitly instead of assuming a fixed number.
import { KoreanPolicyWatcher } from './policyWatcher.js';
import { AuditMonitor } from './auditMonitor.js';

// Leave/rest coverage buffer applied per shift to account for days off, sick
// leave, and handoff overlap. 1.2x is a conservative, disclosed assumption
// (matches the real-world ~4.8-caregivers-per-4-bed-room/3-shift figure widely
// reported in Korean press coverage of this reform: 4 beds / 4-ratio * 3 shifts
// * 1.2 buffer = 4.32; press figures of 4.8 imply a slightly higher ~1.33x buffer
// in practice -- we disclose our assumption rather than silently matching a
// press estimate we can't verify the derivation of).
const SHIFT_COVERAGE_BUFFER_MULTIPLIER = 1.2;

// Any single caregiver logged with a continuous shift at or beyond this many
// hours is flagged as the pre-reform, unregulated 24-hour-solo pattern.
const LEGACY_SOLO_SHIFT_HOURS_THRESHOLD = 20;

export class StaffingComplianceMonitor {
  constructor(options = {}) {
    this.policyWatcher = options.policyWatcher || new KoreanPolicyWatcher(
      options.laborPolicyFilePath,
      options.caregivingPolicyFilePath
    );
    this.auditMonitor = options.auditMonitor || new AuditMonitor(options.auditLogPath);
  }

  /**
   * Computes the minimum caregiver headcount required to legally staff one
   * room under the forthcoming shift-rotation standard.
   *
   * requiredHeadcount = (patientsPerRoom / targetRatio) * shiftRotationCount * bufferMultiplier
   *
   * @param {Object} regs activeRegulations from caregivingPolicy.json
   * @returns {number} required caregiver headcount per room, rounded up
   */
  calculateRequiredHeadcountPerRoom(regs) {
    const patientsPerRoom = regs.roomConfigMaxBeds;
    const targetRatio = regs.caregiverToPatientRatio;
    const shiftCount = regs.minShiftRotation;

    const baseHeadcount = (patientsPerRoom / targetRatio) * shiftCount;
    return Math.ceil(baseHeadcount * SHIFT_COVERAGE_BUFFER_MULTIPLIER * 100) / 100;
  }

  /**
   * Evaluates one ward/room's caregiver staffing + shift pattern against the
   * forthcoming MOHW standard.
   *
   * @param {Object} wardData
   * @param {string} wardData.hospitalId
   * @param {string} wardData.wardId
   * @param {number} wardData.bedCount actual beds in this room/ward
   * @param {number} wardData.assignedCaregiverCount distinct caregivers rostered to this room across all shifts
   * @param {number} wardData.shiftsPerDay actual shift rotation count currently practiced (1 = solo/24hr pattern)
   * @param {Array<{caregiverId: string, continuousShiftHours: number, supervisingRnId: string|null}>} wardData.shiftLogs
   * @returns {Object} evaluation result, also written to the audit log
   */
  evaluateWardStaffing(wardData) {
    const policy = this.policyWatcher.getCurrentCaregivingPolicy();
    const regs = policy.activeRegulations;

    const requiredHeadcount = this.calculateRequiredHeadcountPerRoom(regs);
    const requiredRoomBeds = regs.roomConfigMaxBeds;

    const findings = [];
    let meetsStandard = true;

    // 1. Room configuration check (track-only signal, not a hard gate here --
    // room reconfiguration is a capital/facilities decision, not a staffing one)
    const roomConfigMatches = wardData.bedCount <= requiredRoomBeds;
    if (!roomConfigMatches) {
      findings.push({
        criterion: 'roomConfiguration',
        status: 'does_not_meet_forthcoming_standard',
        detail: `Room has ${wardData.bedCount} beds; forthcoming standard targets rooms of ${requiredRoomBeds} beds or fewer.`
      });
    }

    // 2. Shift rotation check
    const shiftRotationMeetsStandard = wardData.shiftsPerDay >= regs.minShiftRotation;
    if (!shiftRotationMeetsStandard) {
      meetsStandard = false;
      findings.push({
        criterion: 'shiftRotation',
        status: 'does_not_meet_forthcoming_standard',
        detail: `Ward runs ${wardData.shiftsPerDay} shift(s)/day; forthcoming standard requires at least ${regs.minShiftRotation}. ` +
          `NOTE: the pre-reform single-shift pattern is not a violation of current law -- caregivers are ` +
          `presently excluded from Labor Standards Act hour limits. This is a prospective compliance gap only.`
      });
    }

    // 3. Headcount check
    const headcountMeetsStandard = wardData.assignedCaregiverCount >= requiredHeadcount;
    if (!headcountMeetsStandard) {
      meetsStandard = false;
      findings.push({
        criterion: 'caregiverHeadcount',
        status: 'does_not_meet_forthcoming_standard',
        detail: `Ward has ${wardData.assignedCaregiverCount} caregiver(s) assigned; forthcoming standard requires ` +
          `approximately ${requiredHeadcount} to sustain ${regs.minShiftRotation}-shift coverage at a 1:${regs.caregiverToPatientRatio} ratio.`
      });
    }

    // 4. Legacy 24-hour-solo pattern detection (per-caregiver shift log check)
    const legacySoloShifts = (wardData.shiftLogs || []).filter(
      log => log.continuousShiftHours >= LEGACY_SOLO_SHIFT_HOURS_THRESHOLD
    );
    if (legacySoloShifts.length > 0) {
      meetsStandard = false;
      findings.push({
        criterion: 'legacySoloShiftPattern',
        status: 'does_not_meet_forthcoming_standard',
        detail: `${legacySoloShifts.length} caregiver(s) logged continuous shifts of ${LEGACY_SOLO_SHIFT_HOURS_THRESHOLD}+ hours ` +
          `(pre-reform pattern). This is NOT currently illegal -- caregivers have no governing hour-limit law today -- ` +
          `but does not meet the forthcoming shift-rotation standard.`,
        affectedCaregiverIds: legacySoloShifts.map(l => l.caregiverId)
      });
    }

    // 5. RN-supervision linkage check -- caregivers must work under a
    // supervising RN; unlicensed medical acts by caregivers are prohibited.
    const unsupervisedShifts = (wardData.shiftLogs || []).filter(log => !log.supervisingRnId);
    if (unsupervisedShifts.length > 0) {
      meetsStandard = false;
      findings.push({
        criterion: 'rnSupervisionLinkage',
        status: 'does_not_meet_forthcoming_standard',
        detail: `${unsupervisedShifts.length} shift log(s) have no linked supervising RN.`,
        affectedCaregiverIds: unsupervisedShifts.map(l => l.caregiverId)
      });
    }

    const result = {
      hospitalId: wardData.hospitalId,
      wardId: wardData.wardId,
      evaluatedAt: new Date().toISOString(),
      programStatus: policy.programStatus,
      requiredHeadcountPerRoom: requiredHeadcount,
      currentAssignedCaregiverCount: wardData.assignedCaregiverCount,
      currentShiftsPerDay: wardData.shiftsPerDay,
      meetsForthcomingStandard: meetsStandard,
      findings
    };

    this.auditMonitor.logAuditEvent('STAFFING_COMPLIANCE_EVALUATION', wardData.wardId, result);

    return result;
  }
}
