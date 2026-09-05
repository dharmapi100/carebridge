// Path: src/tests/test_staffing_compliance.js
import { StaffingComplianceMonitor } from '../services/staffingComplianceMonitor.js';
import { KoreanPolicyWatcher } from '../services/policyWatcher.js';
import { AuditMonitor } from '../services/auditMonitor.js';
import assert from 'assert';
import fs from 'fs';

console.log('Running Staffing Compliance Monitor unit tests...');

const testLaborPolicyFile = './test_labor_policy_staffing.json';
const testCaregivingPolicyFile = './test_caregiving_policy_staffing.json';
const testAuditLogFile = './src/config/test_staffing_compliance_audit.log';

for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testAuditLogFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const policyWatcher = new KoreanPolicyWatcher(testLaborPolicyFile, testCaregivingPolicyFile);
const auditMonitor = new AuditMonitor(testAuditLogFile);
const monitor = new StaffingComplianceMonitor({ policyWatcher, auditMonitor });

const policy = policyWatcher.getCurrentCaregivingPolicy();
assert.strictEqual(policy.activeRegulations.caregiverToPatientRatio, 4, 'sanity check on seeded policy');
assert.strictEqual(policy.activeRegulations.minShiftRotation, 2, 'sanity check on seeded policy');
assert.strictEqual(policy.activeRegulations.roomConfigMaxBeds, 4, 'sanity check on seeded policy');

// (4 beds / 4 ratio) * 2 shifts * 1.2 buffer = 2.4
// (1.2 = SHIFT_COVERAGE_BUFFER_MULTIPLIER in staffingComplianceMonitor.js)
const BUFFER = 1.2;
const expectedHeadcount1 = Math.ceil(((4 / 4) * 2) * BUFFER * 100) / 100;
const requiredHeadcount = monitor.calculateRequiredHeadcountPerRoom(policy.activeRegulations);
assert.strictEqual(requiredHeadcount, expectedHeadcount1, 'required headcount must be derived from ratio/shift/buffer, not hardcoded');
console.log(`✅ Case 1 passed: required headcount correctly derived as ${requiredHeadcount} (not a flat constant).`);

// ── Case 2: fully compliant ward → meets forthcoming standard ──────────────
const compliantWard = {
  hospitalId: 'HOSP-001',
  wardId: 'WARD-3A',
  bedCount: 4,
  assignedCaregiverCount: 3,
  shiftsPerDay: 2,
  shiftLogs: [
    { caregiverId: 'CG-01', continuousShiftHours: 8, supervisingRnId: 'RN-01' },
    { caregiverId: 'CG-02', continuousShiftHours: 8, supervisingRnId: 'RN-01' },
    { caregiverId: 'CG-03', continuousShiftHours: 8, supervisingRnId: 'RN-02' }
  ]
};
const result2 = monitor.evaluateWardStaffing(compliantWard);
assert.strictEqual(result2.meetsForthcomingStandard, true);
assert.strictEqual(result2.findings.length, 0);
console.log('✅ Case 2 passed: fully compliant ward → meets forthcoming standard.');

// ── Case 3: legacy 24hr-solo pattern → flagged, NOT claimed illegal ────────
const legacyWard = {
  hospitalId: 'HOSP-002',
  wardId: 'WARD-1B',
  bedCount: 4,
  assignedCaregiverCount: 1,
  shiftsPerDay: 1,
  shiftLogs: [
    { caregiverId: 'CG-LEGACY-01', continuousShiftHours: 24, supervisingRnId: 'RN-03' }
  ]
};
const result3 = monitor.evaluateWardStaffing(legacyWard);
assert.strictEqual(result3.meetsForthcomingStandard, false);
const soloFinding = result3.findings.find(f => f.criterion === 'legacySoloShiftPattern');
assert.ok(soloFinding, 'must flag the legacy solo-shift pattern');
assert.ok(!/\bis illegal\b/i.test(soloFinding.detail), 'must NOT claim the legacy pattern is illegal');
assert.ok(soloFinding.detail.includes('NOT currently illegal'), 'must explicitly disclose it is not currently illegal');
assert.deepStrictEqual(soloFinding.affectedCaregiverIds, ['CG-LEGACY-01']);
console.log('✅ Case 3 passed: legacy solo-shift pattern flagged as gap, explicitly not claimed illegal.');

// ── Case 4: insufficient headcount despite correct shift count ─────────────
const understaffedWard = {
  hospitalId: 'HOSP-003',
  wardId: 'WARD-2C',
  bedCount: 4,
  assignedCaregiverCount: 2, // below the 2.4 required
  shiftsPerDay: 2,
  shiftLogs: [
    { caregiverId: 'CG-04', continuousShiftHours: 12, supervisingRnId: 'RN-04' },
    { caregiverId: 'CG-05', continuousShiftHours: 12, supervisingRnId: 'RN-04' }
  ]
};
const result4 = monitor.evaluateWardStaffing(understaffedWard);
assert.strictEqual(result4.meetsForthcomingStandard, false);
assert.ok(result4.findings.some(f => f.criterion === 'caregiverHeadcount'));
console.log('✅ Case 4 passed: correct shift count but insufficient headcount → flagged.');

// ── Case 5: missing RN supervision linkage ──────────────────────────────────
const unsupervisedWard = {
  hospitalId: 'HOSP-004',
  wardId: 'WARD-4D',
  bedCount: 4,
  assignedCaregiverCount: 3,
  shiftsPerDay: 2,
  shiftLogs: [
    { caregiverId: 'CG-06', continuousShiftHours: 8, supervisingRnId: 'RN-05' },
    { caregiverId: 'CG-07', continuousShiftHours: 8, supervisingRnId: null },
    { caregiverId: 'CG-08', continuousShiftHours: 8, supervisingRnId: null }
  ]
};
const result5 = monitor.evaluateWardStaffing(unsupervisedWard);
assert.strictEqual(result5.meetsForthcomingStandard, false);
const rnFinding = result5.findings.find(f => f.criterion === 'rnSupervisionLinkage');
assert.ok(rnFinding);
assert.deepStrictEqual(rnFinding.affectedCaregiverIds, ['CG-07', 'CG-08']);
console.log('✅ Case 5 passed: unsupervised caregiver shifts correctly flagged.');

// ── Case 6: oversized room configuration flagged as track-only, non-blocking ─
const oversizedRoomWard = {
  hospitalId: 'HOSP-005',
  wardId: 'WARD-6E',
  bedCount: 6, // exceeds forthcoming 4-bed target
  assignedCaregiverCount: 4,
  shiftsPerDay: 2,
  shiftLogs: [
    { caregiverId: 'CG-09', continuousShiftHours: 8, supervisingRnId: 'RN-06' },
    { caregiverId: 'CG-10', continuousShiftHours: 8, supervisingRnId: 'RN-06' },
    { caregiverId: 'CG-11', continuousShiftHours: 8, supervisingRnId: 'RN-07' },
    { caregiverId: 'CG-12', continuousShiftHours: 8, supervisingRnId: 'RN-07' }
  ]
};
const result6 = monitor.evaluateWardStaffing(oversizedRoomWard);
const roomFinding = result6.findings.find(f => f.criterion === 'roomConfiguration');
assert.ok(roomFinding, 'oversized room must be flagged');
assert.strictEqual(roomFinding.status, 'does_not_meet_forthcoming_standard');
console.log('✅ Case 6 passed: oversized room configuration flagged as a gap.');

// ── Case 7: audit logging confirmed for every evaluation ───────────────────
const inspection = auditMonitor.scanForViolations();
assert.strictEqual(inspection.totalEntriesScanned, 5, 'every evaluateWardStaffing() call (Cases 2-6) must be audit-logged');
console.log('✅ Case 7 passed: all 5 evaluations were audit-logged.');

// ── Case 8: config-driven -- changing policy flips required headcount ──────
policyWatcher.updateCaregivingPolicyThresholds({ caregiverToPatientRatio: 5, minShiftRotation: 3 });
const updatedPolicy = policyWatcher.getCurrentCaregivingPolicy();
const newRequiredHeadcount = monitor.calculateRequiredHeadcountPerRoom(updatedPolicy.activeRegulations);
// (4 beds / 5 ratio) * 3 shifts * 1.2 buffer
const expectedHeadcount8 = Math.ceil(((4 / 5) * 3) * BUFFER * 100) / 100;
assert.strictEqual(newRequiredHeadcount, expectedHeadcount8, 'required headcount must recompute from updated policy values, proving no hardcoded numbers');
console.log(`✅ Case 8 passed: required headcount is genuinely config-driven, recomputes to ${newRequiredHeadcount} on policy update.`);

// Clean up
for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testAuditLogFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

console.log('✅ Staffing Compliance Monitor tests passed successfully!');
