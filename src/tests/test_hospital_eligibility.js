// Path: src/tests/test_hospital_eligibility.js
import { HospitalEligibilityEngine } from '../services/hospitalEligibility.js';
import { KoreanPolicyWatcher } from '../services/policyWatcher.js';
import { AuditMonitor } from '../services/auditMonitor.js';
import assert from 'assert';
import fs from 'fs';

console.log('Running Hospital Eligibility Scorecard unit tests...');

const testLaborPolicyFile = './test_labor_policy_elig.json';
const testCaregivingPolicyFile = './test_caregiving_policy_elig.json';
const testAuditLogFile = './src/config/test_hospital_eligibility_audit.log';

for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testAuditLogFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

// Shared policy watcher + audit monitor pointed at isolated test files, so this
// suite never touches the real caregivingPolicy.json or production audit log.
const policyWatcher = new KoreanPolicyWatcher(testLaborPolicyFile, testCaregivingPolicyFile);
const auditMonitor = new AuditMonitor(testAuditLogFile);
const engine = new HospitalEligibilityEngine({ policyWatcher, auditMonitor });

const policy = policyWatcher.getCurrentCaregivingPolicy();
assert.strictEqual(policy.activeRegulations.hospitalMinBeds, 100, 'sanity check on seeded policy');

// ── Case 1: fully eligible hospital ─────────────────────────────────────────
const eligibleHospital = {
  hospitalId: 'HOSP-001',
  hospitalName: 'Seoul Central Nursing Hospital',
  bedCount: 150,
  totalCaregivers: 40,
  directEmploymentCaregivers: 40,
  medicalAccreditationStatus: 'accredited',
  region: 'metro',
  admissionBenefitAdequacyGrade: '1등급',
  nursingStaffGrade: '1등급',
  nonCoveredRevenueRatio: 0.05,
  severeCaseMixRatio: 0.62
};
const result1 = engine.evaluateHospital(eligibleHospital);
assert.strictEqual(result1.status, 'eligible');
assert.strictEqual(result1.conditionalExpiresAt, null);
assert.strictEqual(result1.failedGateCriteria.length, 0);
assert.ok(result1.hardGates.every(g => g.pass === true));
console.log('✅ Case 1 passed: fully compliant hospital → eligible.');

// ── Case 2: non-metro hospital under bed count → conditional w/ 1yr grace ──
const ruralUnderBeds = {
  hospitalId: 'HOSP-002',
  hospitalName: 'Gangwon Rural Nursing Hospital',
  bedCount: 80,
  totalCaregivers: 20,
  directEmploymentCaregivers: 20,
  medicalAccreditationStatus: 'accredited',
  region: 'non-metro'
};
const result2 = engine.evaluateHospital(ruralUnderBeds);
assert.strictEqual(result2.status, 'conditional');
assert.ok(result2.conditionalExpiresAt, 'conditional status must include an expiry timestamp');
const expiryYear = new Date(result2.conditionalExpiresAt).getFullYear();
const nextYear = new Date().getFullYear() + 1;
assert.strictEqual(expiryYear, nextYear, 'conditional grace period must be exactly 1 year out');
assert.deepStrictEqual(result2.failedGateCriteria, ['hospitalMinBeds']);
console.log('✅ Case 2 passed: non-metro hospital under bed minimum → conditional (1yr grace).');

// ── Case 3: direct-employment failure is a HARD fail, no grace period at all ─
const brokeredCaregivers = {
  hospitalId: 'HOSP-003',
  hospitalName: 'Busan Broker-Staffed Hospital',
  bedCount: 200,
  totalCaregivers: 30,
  directEmploymentCaregivers: 5,   // mostly agency/broker-supplied
  medicalAccreditationStatus: 'accredited',
  region: 'non-metro'  // even rural does NOT get a pass on this criterion
};
const result3 = engine.evaluateHospital(brokeredCaregivers);
assert.strictEqual(result3.status, 'ineligible');
assert.strictEqual(result3.conditionalExpiresAt, null);
assert.ok(result3.failedGateCriteria.includes('directEmploymentRequired'));
console.log('✅ Case 3 passed: direct-employment failure → ineligible even for non-metro hospital (no documented grace period).');

// ── Case 4: metro hospital missing accreditation → ineligible (no grace for metro) ─
const metroUnaccredited = {
  hospitalId: 'HOSP-004',
  hospitalName: 'Incheon Metro Nursing Hospital',
  bedCount: 300,
  totalCaregivers: 50,
  directEmploymentCaregivers: 50,
  medicalAccreditationStatus: 'not_accredited',
  region: 'metro'
};
const result4 = engine.evaluateHospital(metroUnaccredited);
assert.strictEqual(result4.status, 'ineligible');
assert.strictEqual(result4.conditionalExpiresAt, null);
assert.deepStrictEqual(result4.failedGateCriteria, ['medicalAccreditationRequired']);
console.log('✅ Case 4 passed: metro hospital missing accreditation → ineligible (grace period only documented for non-metro).');

// ── Case 5: tracked-only factors are recorded but NEVER affect eligibility ──
const trackedFactorsHospital = {
  hospitalId: 'HOSP-005',
  hospitalName: 'Daegu Nursing Hospital',
  bedCount: 120,
  totalCaregivers: 25,
  directEmploymentCaregivers: 25,
  medicalAccreditationStatus: 'accredited',
  region: 'metro',
  // deliberately "bad-looking" tracked values that would fail a hard gate if we
  // ever mistakenly turned these into gates
  admissionBenefitAdequacyGrade: '5등급',
  nursingStaffGrade: '5등급',
  nonCoveredRevenueRatio: 0.95,
  severeCaseMixRatio: 0.01
};
const result5 = engine.evaluateHospital(trackedFactorsHospital);
assert.strictEqual(result5.status, 'eligible', 'poor tracked-factor values must NOT block eligibility — no published threshold exists yet');
assert.strictEqual(result5.trackedFactors.admissionBenefitAdequacyGrade.value, '5등급');
assert.strictEqual(result5.trackedFactors.admissionBenefitAdequacyGrade.status, 'recorded_pending_mohw_threshold');
assert.strictEqual(result5.trackedFactors.nonCoveredRevenueRatio.value, 0.95);
assert.strictEqual(result5.trackedFactors.severeCaseMixRatio.status, 'recorded_pending_mohw_threshold');
console.log('✅ Case 5 passed: tracked-only factors recorded verbatim, never gate eligibility.');

// ── Case 6: missing/null tracked factors handled gracefully ────────────────
const minimalHospital = {
  hospitalId: 'HOSP-006',
  hospitalName: 'Jeju Minimal-Data Hospital',
  bedCount: 110,
  totalCaregivers: 15,
  directEmploymentCaregivers: 15,
  medicalAccreditationStatus: 'accredited',
  region: 'metro'
};
const result6 = engine.evaluateHospital(minimalHospital);
assert.strictEqual(result6.status, 'eligible');
assert.strictEqual(result6.trackedFactors.nursingStaffGrade.value, null);
console.log('✅ Case 6 passed: missing tracked-factor data defaults to null without throwing.');

// ── Case 7: audit logging — every evaluation must be recorded ──────────────
const auditInspection = auditMonitor.scanForViolations();
assert.strictEqual(auditInspection.totalEntriesScanned, 6, 'all 6 evaluations above must have been audit-logged');
console.log('✅ Case 7 passed: all 6 eligibility evaluations were written to the audit log.');

// ── Case 8: malformed input throws instead of silently misclassifying ──────
assert.throws(() => engine.evaluateHospital(null), /requires a hospitalData object/);
assert.throws(() => engine.evaluateHospital(undefined), /requires a hospitalData object/);
console.log('✅ Case 8 passed: malformed input throws explicitly instead of silently failing.');

// Cleanup
for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testAuditLogFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

console.log('🎉 All Hospital Eligibility Scorecard tests passed.');
