// Path: src/tests/test_long_stay_penalty.js
import { LongStayPenaltyEngine } from '../services/longStayPenaltyEngine.js';
import { KoreanPolicyWatcher } from '../services/policyWatcher.js';
import { AuditMonitor } from '../services/auditMonitor.js';
import assert from 'assert';
import fs from 'fs';

console.log('Running Long-Stay Copay Penalty Engine unit tests...');

const testLaborPolicyFile = './test_labor_policy_lsp.json';
const testCaregivingPolicyFile = './test_caregiving_policy_lsp.json';
const testAuditLogFile = './src/config/test_long_stay_penalty_audit.log';

for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testAuditLogFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const policyWatcher = new KoreanPolicyWatcher(testLaborPolicyFile, testCaregivingPolicyFile);
const auditMonitor = new AuditMonitor(testAuditLogFile);
const engine = new LongStayPenaltyEngine({ policyWatcher, auditMonitor });

const policy = policyWatcher.getCurrentCaregivingPolicy();
assert.strictEqual(policy.activeRegulations.longStayPenalty.sixMonthThresholdDays, 183, 'sanity check on seeded policy');
assert.strictEqual(policy.activeRegulations.longStayPenalty.oneYearThresholdDays, 365, 'sanity check on seeded policy');

// ── Case 1: standard-tier patient, short stay -- no penalty ────────────────
const r1 = engine.calculateCopayRatio(30);
assert.strictEqual(r1.tier, 'standard');
assert.strictEqual(r1.penaltyApplied, false);
assert.strictEqual(r1.finalCopayRatio, 0.30);
console.log('✅ Case 1 passed: short-stay standard patient → 30% base, no penalty.');

// ── Case 2: exactly at the 6-month threshold -- penalty applies ────────────
const r2 = engine.calculateCopayRatio(183);
assert.strictEqual(r2.tier, 'long_stay_6mo_plus');
assert.strictEqual(r2.penaltyApplied, true);
assert.strictEqual(r2.finalCopayRatio, 0.40); // 0.30 + 0.10
console.log('✅ Case 2 passed: exactly 183 days → 6mo+ tier, 40% copay.');

// ── Case 3: one day before threshold -- no penalty (boundary correctness) ──
const r3 = engine.calculateCopayRatio(182);
assert.strictEqual(r3.tier, 'standard');
assert.strictEqual(r3.finalCopayRatio, 0.30);
console.log('✅ Case 3 passed: 182 days (one day short) → standard tier, boundary correct.');

// ── Case 4: 1-year-plus tier ─────────────────────────────────────────────────
const r4 = engine.calculateCopayRatio(400);
assert.strictEqual(r4.tier, 'long_stay_1yr_plus');
assert.strictEqual(r4.finalCopayRatio, 0.50); // 0.30 + 0.20
console.log('✅ Case 4 passed: 400 days → 1yr+ tier, 50% copay.');

// ── Case 5: near-poverty tier uses the lower base rate, penalty still layers ─
const r5 = engine.calculateCopayRatio(400, true);
assert.strictEqual(r5.baseCopayRatio, 0.20);
assert.strictEqual(r5.finalCopayRatio, 0.40); // 0.20 + 0.20
console.log('✅ Case 5 passed: near-poverty tier base (20%) + 1yr penalty (20%) = 40%.');

// ── Case 6: derive duration from admission date correctly ──────────────────
const admissionDate = new Date('2026-01-01');
const asOfDate = new Date('2026-08-01'); // 212 days later -> 6mo+ tier
const r6 = engine.calculateCopayRatioFromAdmissionDate(admissionDate, false, asOfDate);
assert.strictEqual(r6.tier, 'long_stay_6mo_plus');
console.log('✅ Case 6 passed: admission-date-derived duration correctly maps to 6mo+ tier.');

// ── Case 7: invalid duration inputs throw explicitly ────────────────────────
assert.throws(() => engine.calculateCopayRatio(-5), /non-negative finite/);
assert.throws(() => engine.calculateCopayRatio(NaN), /non-negative finite/);
assert.throws(() => engine.calculateCopayRatio('90'), /non-negative finite/);
console.log('✅ Case 7 passed: invalid duration inputs throw explicitly.');

// ── Case 8: full patient copay evaluation with real KRW math ───────────────
const patient1 = {
  patientId: 'PT-001',
  hospitalId: 'HOSP-001',
  admissionDurationDays: 400,
  grossMonthlyCaregivingCostKRW: 2670000, // matches the researched ~267万 gross figure
  isNearPovertyTier: false
};
const eval1 = engine.evaluatePatientCopay(patient1);
assert.strictEqual(eval1.finalCopayRatio, 0.50);
assert.strictEqual(eval1.patientCopayKRW, 1335000); // 2,670,000 * 0.50
assert.strictEqual(eval1.nhiCoveredKRW, 1335000);
console.log('✅ Case 8 passed: full patient billing breakdown computes correct KRW split.');

// ── Case 9: malformed patient input throws explicitly ──────────────────────
assert.throws(() => engine.evaluatePatientCopay(null), /requires a patientData object/);
assert.throws(() => engine.evaluatePatientCopay({ patientId: 'X', admissionDurationDays: 10, grossMonthlyCaregivingCostKRW: -1 }), /non-negative grossMonthlyCaregivingCostKRW/);
console.log('✅ Case 9 passed: malformed patient input throws explicitly.');

// ── Case 10: batch evaluation processes a full roster in one pass ──────────
const roster = [
  { patientId: 'PT-A', hospitalId: 'HOSP-001', admissionDurationDays: 30, grossMonthlyCaregivingCostKRW: 2000000 },
  { patientId: 'PT-B', hospitalId: 'HOSP-001', admissionDurationDays: 200, grossMonthlyCaregivingCostKRW: 2000000 },
  { patientId: 'PT-C', hospitalId: 'HOSP-001', admissionDurationDays: 400, grossMonthlyCaregivingCostKRW: 2000000 }
];
const batchResults = engine.evaluatePatientCopayBatch(roster);
assert.strictEqual(batchResults.length, 3);
assert.strictEqual(batchResults[0].tier, 'standard');
assert.strictEqual(batchResults[1].tier, 'long_stay_6mo_plus');
assert.strictEqual(batchResults[2].tier, 'long_stay_1yr_plus');
assert.strictEqual(batchResults[0].patientId, 'PT-A', 'batch must preserve input order');
console.log('✅ Case 10 passed: batch evaluation processes a full roster correctly, preserving order.');

// ── Case 11: batch rejects non-array input ──────────────────────────────────
assert.throws(() => engine.evaluatePatientCopayBatch({ not: 'an array' }), /requires an array/);
console.log('✅ Case 11 passed: batch evaluation rejects non-array input explicitly.');

// ── Case 12: performance -- cached policy means no repeated file reads ─────
// A large synthetic roster must process quickly since policy is read once at
// construction, not per-patient. This is a smoke test for the caching design,
// not a strict benchmark.
const largeRoster = Array.from({ length: 5000 }, (_, i) => ({
  patientId: `PT-BULK-${i}`,
  hospitalId: 'HOSP-BULK',
  admissionDurationDays: i % 400,
  grossMonthlyCaregivingCostKRW: 2000000
}));
const start = Date.now();
const largeResults = engine.evaluatePatientCopayBatch(largeRoster);
const elapsedMs = Date.now() - start;
assert.strictEqual(largeResults.length, 5000);
assert.ok(elapsedMs < 5000, `batch of 5000 patients took ${elapsedMs}ms, expected well under 5000ms with cached policy`);
console.log(`✅ Case 12 passed: batch of 5000 patients processed in ${elapsedMs}ms (cached policy, no per-patient file reads).`);

// ── Case 13: config-driven -- policy update changes computed ratios ────────
policyWatcher.updateCaregivingPolicyThresholds({
  'longStayPenalty.sixMonthPenaltyRatio': 0.15,
  'longStayPenalty.oneYearPenaltyRatio': 0.25
});
engine.refreshPolicy();
const r13 = engine.calculateCopayRatio(400);
assert.strictEqual(r13.finalCopayRatio, 0.55); // 0.30 + 0.25, proves dot-path update + refreshPolicy() both work
console.log('✅ Case 13 passed: dot-path policy update + refreshPolicy() correctly changes computed ratios.');

// ── Case 14: audit logging confirmed for every patient evaluation ──────────
const inspection = auditMonitor.scanForViolations();
// Case 8 (1) + Case 10 (3) + Case 12 (5000) = 5004
assert.strictEqual(inspection.totalEntriesScanned, 5004, 'every evaluatePatientCopay() call must be audit-logged');
console.log('✅ Case 14 passed: all 5004 patient evaluations were audit-logged.');

// Clean up
for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testAuditLogFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

console.log('✅ Long-Stay Copay Penalty Engine tests passed successfully!');
