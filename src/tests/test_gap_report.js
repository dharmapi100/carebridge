// Path: src/tests/test_gap_report.js
import { HospitalEligibilityEngine } from '../services/hospitalEligibility.js';
import { StaffingComplianceMonitor } from '../services/staffingComplianceMonitor.js';
import { KoreanPolicyWatcher } from '../services/policyWatcher.js';
import { AuditMonitor } from '../services/auditMonitor.js';
import assert from 'assert';
import fs from 'fs';

console.log('Running Hospital Gap Report unit tests...');

const testLaborPolicyFile = './test_labor_policy_gap.json';
const testCaregivingPolicyFile = './test_caregiving_policy_gap.json';
const testAuditLogFile = './src/config/test_gap_report_audit.log';

for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testAuditLogFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const policyWatcher = new KoreanPolicyWatcher(testLaborPolicyFile, testCaregivingPolicyFile);
const auditMonitor = new AuditMonitor(testAuditLogFile);
const staffingMonitor = new StaffingComplianceMonitor({ policyWatcher, auditMonitor });
const engine = new HospitalEligibilityEngine({ policyWatcher, auditMonitor, staffingMonitor });

// ── Case 1: fully compliant hospital + fully compliant ward → eligible, zero gaps ─
const compliantHospital = {
  hospitalId: 'HOSP-GAP-001',
  hospitalName: 'Fully Compliant Nursing Hospital',
  bedCount: 150,
  totalCaregivers: 40,
  directEmploymentCaregivers: 40,
  medicalAccreditationStatus: 'accredited',
  region: 'metro'
};
const compliantWard = {
  hospitalId: 'HOSP-GAP-001',
  wardId: 'WARD-GAP-1A',
  bedCount: 4,
  assignedCaregiverCount: 3,
  shiftsPerDay: 2,
  shiftLogs: [
    { caregiverId: 'CG-01', continuousShiftHours: 8, supervisingRnId: 'RN-01' },
    { caregiverId: 'CG-02', continuousShiftHours: 8, supervisingRnId: 'RN-01' },
    { caregiverId: 'CG-03', continuousShiftHours: 8, supervisingRnId: 'RN-02' }
  ]
};
const report1 = engine.generateGapReport(compliantHospital, [compliantWard]);
assert.strictEqual(report1.overallStatus, 'eligible');
assert.strictEqual(report1.gaps.length, 0);
assert.strictEqual(report1.domains.staffingAndShiftCompliance.allWardsMeetStandard, true);
console.log('✅ Case 1 passed: fully compliant hospital + ward → eligible, zero gaps.');

// ── Case 2: facility-eligible hospital but a ward fails staffing → overall downgraded ─
const facilityOkHospital = {
  hospitalId: 'HOSP-GAP-002',
  hospitalName: 'Facility-OK Understaffed Hospital',
  bedCount: 150,
  totalCaregivers: 40,
  directEmploymentCaregivers: 40,
  medicalAccreditationStatus: 'accredited',
  region: 'metro'
};
const legacyWard = {
  hospitalId: 'HOSP-GAP-002',
  wardId: 'WARD-GAP-2B',
  bedCount: 4,
  assignedCaregiverCount: 1,
  shiftsPerDay: 1,
  shiftLogs: [
    { caregiverId: 'CG-LEGACY', continuousShiftHours: 24, supervisingRnId: 'RN-03' }
  ]
};
const report2 = engine.generateGapReport(facilityOkHospital, [legacyWard]);
assert.strictEqual(report2.domains.facilityAndEmployment.status, 'eligible', 'facility gates alone must still pass');
assert.strictEqual(report2.overallStatus, 'ineligible', 'a failing ward must downgrade the overall status');
assert.ok(report2.gaps.some(g => g.domain === 'staffingAndShiftCompliance'));
assert.ok(report2.gaps.every(g => g.domain === 'staffingAndShiftCompliance'), 'no facility-level gaps should exist here');
console.log('✅ Case 2 passed: facility-eligible hospital downgraded to ineligible by ward-level staffing gap.');

// ── Case 3: both domains fail → gaps from both domains present, correctly classified ─
const bothFailHospital = {
  hospitalId: 'HOSP-GAP-003',
  hospitalName: 'Broker-Staffed Small Hospital',
  bedCount: 60, // structural gap
  totalCaregivers: 30,
  directEmploymentCaregivers: 5, // operational gap
  medicalAccreditationStatus: 'accredited',
  region: 'non-metro'
};
const understaffedWard = {
  hospitalId: 'HOSP-GAP-003',
  wardId: 'WARD-GAP-3C',
  bedCount: 4,
  assignedCaregiverCount: 1, // operational gap
  shiftsPerDay: 1, // operational gap
  shiftLogs: [
    { caregiverId: 'CG-05', continuousShiftHours: 22, supervisingRnId: null } // operational gap x2
  ]
};
const report3 = engine.generateGapReport(bothFailHospital, [understaffedWard]);
assert.strictEqual(report3.overallStatus, 'ineligible');
const facilityGaps = report3.gaps.filter(g => g.domain === 'facilityAndEmployment');
const staffingGaps = report3.gaps.filter(g => g.domain === 'staffingAndShiftCompliance');
assert.ok(facilityGaps.length > 0, 'must include facility-level gaps');
assert.ok(staffingGaps.length > 0, 'must include staffing-level gaps');

const bedGap = facilityGaps.find(g => g.criterion === 'hospitalMinBeds');
assert.ok(bedGap, 'bed count gap must be present');
assert.strictEqual(bedGap.fixability, 'structural', 'bed count must be classified structural');

const employmentGap = facilityGaps.find(g => g.criterion === 'directEmploymentRequired');
assert.ok(employmentGap, 'direct-employment gap must be present');
assert.strictEqual(employmentGap.fixability, 'operational', 'direct-employment must be classified operational');

const headcountGap = staffingGaps.find(g => g.criterion === 'caregiverHeadcount');
assert.ok(headcountGap);
assert.strictEqual(headcountGap.fixability, 'operational', 'caregiver headcount must be classified operational');

console.log('✅ Case 3 passed: both domains fail simultaneously, gaps correctly attributed and classified.');

// ── Case 4: multiple wards -- one compliant, one not -- report reflects both ─
const mixedHospital = {
  hospitalId: 'HOSP-GAP-004',
  hospitalName: 'Mixed Ward Compliance Hospital',
  bedCount: 150,
  totalCaregivers: 40,
  directEmploymentCaregivers: 40,
  medicalAccreditationStatus: 'accredited',
  region: 'metro'
};
const wardGood = {
  hospitalId: 'HOSP-GAP-004',
  wardId: 'WARD-GOOD',
  bedCount: 4,
  assignedCaregiverCount: 3,
  shiftsPerDay: 2,
  shiftLogs: [
    { caregiverId: 'CG-10', continuousShiftHours: 8, supervisingRnId: 'RN-10' },
    { caregiverId: 'CG-11', continuousShiftHours: 8, supervisingRnId: 'RN-10' },
    { caregiverId: 'CG-12', continuousShiftHours: 8, supervisingRnId: 'RN-11' }
  ]
};
const wardBad = {
  hospitalId: 'HOSP-GAP-004',
  wardId: 'WARD-BAD',
  bedCount: 4,
  assignedCaregiverCount: 1,
  shiftsPerDay: 1,
  shiftLogs: [
    { caregiverId: 'CG-13', continuousShiftHours: 20, supervisingRnId: 'RN-12' }
  ]
};
const report4 = engine.generateGapReport(mixedHospital, [wardGood, wardBad]);
assert.strictEqual(report4.overallStatus, 'ineligible');
assert.strictEqual(report4.domains.staffingAndShiftCompliance.wardResults.length, 2);
assert.strictEqual(report4.domains.staffingAndShiftCompliance.allWardsMeetStandard, false);
assert.ok(report4.gaps.every(g => g.scope !== 'WARD-GOOD'), 'the compliant ward must contribute zero gaps');
assert.ok(report4.gaps.some(g => g.scope === 'WARD-BAD'), 'the non-compliant ward must contribute gaps');
console.log('✅ Case 4 passed: multi-ward hospital correctly isolates gaps to the non-compliant ward only.');

// ── Case 5: no ward data provided -- report still valid, staffing domain empty ─
const noWardHospital = {
  hospitalId: 'HOSP-GAP-005',
  hospitalName: 'No Ward Data Provided Hospital',
  bedCount: 150,
  totalCaregivers: 40,
  directEmploymentCaregivers: 40,
  medicalAccreditationStatus: 'accredited',
  region: 'metro'
};
const report5 = engine.generateGapReport(noWardHospital);
assert.strictEqual(report5.overallStatus, 'eligible');
assert.strictEqual(report5.domains.staffingAndShiftCompliance.wardResults.length, 0);
assert.strictEqual(report5.domains.staffingAndShiftCompliance.allWardsMeetStandard, true, 'no ward data must not be treated as a failure');
console.log('✅ Case 5 passed: no ward data provided does not falsely fail the staffing domain.');

// ── Case 6: malformed input throws explicitly ───────────────────────────────
assert.throws(() => engine.generateGapReport(null), /requires a hospitalData object/);
assert.throws(() => engine.generateGapReport({ hospitalId: 'X' }, 'not-an-array'), /wardStaffingDataList to be an array/);
console.log('✅ Case 6 passed: malformed input throws explicitly instead of silently failing.');

// ── Case 7: audit logging confirmed for gap-report generation ──────────────
const inspection = auditMonitor.scanForViolations();
// 5 generateGapReport() calls (Cases 1,2,3,4,5) each internally call
// evaluateHospital() (1 log) + evaluateWardStaffing() per ward + 1 gap-report log.
// Case1: 1 ward, Case2: 1 ward, Case3: 1 ward, Case4: 2 wards, Case5: 0 wards.
// Per call: 1 (evaluateHospital) + N (wards) + 1 (gap report log).
// Case1: 1+1+1=3, Case2: 1+1+1=3, Case3: 1+1+1=3, Case4: 1+2+1=4, Case5: 1+0+1=2
// Total = 3+3+3+4+2 = 15
assert.strictEqual(inspection.totalEntriesScanned, 15, 'every internal evaluation + gap-report call must be audit-logged');
console.log('✅ Case 7 passed: all internal evaluations and gap-report generations were audit-logged.');

// Clean up
for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testAuditLogFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

console.log('✅ Hospital Gap Report tests passed successfully!');
