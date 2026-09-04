// Path: src/tests/test_predictive_risk.js
import { PredictiveRiskEngine } from '../services/predictiveRiskEngine.js';
import { CaregiverLedger } from '../services/caregiverLedger.js';
import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('Running PredictiveRiskEngine unit tests...');

const engine = new PredictiveRiskEngine();
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};

// ── 1. Expired visa -> CRITICAL ─────────────────────────────────────────
const expired = engine.evaluateWorkerRisk({
  workerId: 'w-1', employmentStartDate: monthsAgo(3), weeklyHours: 40, monthlyWage: 2500000,
  visaExpiryDate: daysFromNow(-5)
});
assert.strictEqual(expired.riskLevel, 'CRITICAL');
assert.ok(expired.flags.includes('VISA_EXPIRED'));
console.log('✅ Test 1 passed: expired visa flagged CRITICAL.');

// ── 2. Visa expiring within warning window -> HIGH ──────────────────────
const expiringSoon = engine.evaluateWorkerRisk({
  workerId: 'w-2', employmentStartDate: monthsAgo(3), weeklyHours: 40, monthlyWage: 2500000,
  visaExpiryDate: daysFromNow(30)
});
assert.strictEqual(expiringSoon.riskLevel, 'HIGH');
assert.ok(expiringSoon.flags.some(f => f.startsWith('VISA_EXPIRING_IN_')));
console.log('✅ Test 2 passed: visa expiring within 60 days flagged HIGH.');

// ── 3. Approaching 1-year severance threshold -> MEDIUM ─────────────────
const approaching = engine.evaluateWorkerRisk({
  workerId: 'w-3', employmentStartDate: monthsAgo(11), weeklyHours: 40, monthlyWage: 2500000,
  visaExpiryDate: daysFromNow(300)
});
assert.strictEqual(approaching.riskLevel, 'MEDIUM');
assert.ok(approaching.flags.includes('APPROACHING_SEVERANCE_THRESHOLD_1_YEAR'));
console.log('✅ Test 3 passed: approaching severance threshold flagged MEDIUM.');

// ── 4. Already severance-eligible worker, no visa risk -> flagged, LOW visa risk ──
const eligible = engine.evaluateWorkerRisk({
  workerId: 'w-4', employmentStartDate: monthsAgo(14), weeklyHours: 40, monthlyWage: 2500000,
  visaExpiryDate: daysFromNow(300)
});
assert.ok(eligible.flags.includes('SEVERANCE_OBLIGATION_ACTIVE'));
assert.ok(eligible.cumulativeSeveranceLiability > 0);
console.log('✅ Test 4 passed: active severance obligation correctly flagged with real liability figure.');

// ── 5. Fully safe worker -> LOW, no flags ────────────────────────────────
const safe = engine.evaluateWorkerRisk({
  workerId: 'w-5', employmentStartDate: monthsAgo(2), weeklyHours: 20, monthlyWage: 2000000,
  visaExpiryDate: daysFromNow(300)
});
assert.strictEqual(safe.riskLevel, 'LOW');
assert.strictEqual(safe.flags.length, 0);
console.log('✅ Test 5 passed: safe worker with no near-term deadlines flagged LOW with zero flags.');

// ── 6. No visaExpiryDate provided -> visa risk skipped, not thrown ──────
const noVisa = engine.evaluateWorkerRisk({
  workerId: 'w-6', employmentStartDate: monthsAgo(2), weeklyHours: 20, monthlyWage: 2000000
});
assert.strictEqual(noVisa.daysToVisaExpiry, null);
console.log('✅ Test 6 passed: missing visaExpiryDate skips visa risk instead of throwing.');

// ── 7. Malformed record throws explicitly ───────────────────────────────
assert.throws(
  () => engine.evaluateWorkerRisk({ workerId: 'w-7' }),
  /requires workerId, employmentStartDate, weeklyHours, monthlyWage/,
  'missing required fields must throw a clear error, not fail silently'
);
console.log('✅ Test 7 passed: malformed record throws explicitly instead of silently failing.');

// ── 8. scanLedger: aggregates real ledger records, sorted by severity ───
const testLedgerPath = path.resolve('./test_risk_ledger.json');
if (fs.existsSync(testLedgerPath)) fs.unlinkSync(testLedgerPath);
const ledger = new CaregiverLedger({ ledgerPath: testLedgerPath });

// workerId/licenseNumber must match the CredentialIngestor's seeded mock
// registry (WORKER-PARK-01 / WORKER-KIM-02) for registration to succeed.
const reg1 = ledger.registerCaregiver({
  workerId: 'WORKER-PARK-01', licenseNumber: 'KR-CARE-2023-88491', nationality: 'PH', visaType: 'E-9', arcNumber: 'ARC-1',
  employmentStartDate: monthsAgo(2), weeklyHours: 20, monthlyWage: 2000000, visaExpiryDate: daysFromNow(300)
});
const reg2 = ledger.registerCaregiver({
  workerId: 'WORKER-KIM-02', licenseNumber: 'KR-CARE-2022-11029', nationality: 'VN', visaType: 'E-9', arcNumber: 'ARC-2',
  employmentStartDate: monthsAgo(3), weeklyHours: 40, monthlyWage: 2500000, visaExpiryDate: daysFromNow(-1)
});
assert.ok(reg1.success && reg2.success, 'both test caregivers must register successfully against the mock credential registry');

const report = engine.scanLedger(ledger);
assert.strictEqual(report.totalEvaluated, 2, 'both registered caregivers must be evaluated');
assert.strictEqual(report.skipped, 0);
assert.strictEqual(report.results[0].workerId, 'WORKER-KIM-02', 'CRITICAL risk (expired visa) must sort first');
console.log('✅ Test 8 passed: scanLedger evaluates real ledger records, sorted highest-risk first.');

fs.unlinkSync(testLedgerPath);
console.log('🎉 All PredictiveRiskEngine tests passed.');
