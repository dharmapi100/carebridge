// Path: src/tests/test_caregiver_ledger.js
import { CaregiverLedger } from '../services/caregiverLedger.js';
import { AuditMonitor } from '../services/auditMonitor.js';
import { CareBridgeMatchingEngine } from '../services/matchingEngine.js';
import assert from 'assert';
import fs from 'fs';

console.log('Running Caregiver Ledger & Matching Integration tests...');

const testLedgerFile = './test_ledger.json';
const testAuditLogFile = './src/config/test_ledger_audit.log';

for (const f of [testLedgerFile, testAuditLogFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const auditMonitor = new AuditMonitor(testAuditLogFile);
const ledger = new CaregiverLedger({ ledgerPath: testLedgerFile, auditMonitor });

// ── 1. Registration & Verification ──────────────────────────────────────────
// Park Eun-ji is in the mock registry (CredentialIngestor)
const registration = ledger.registerCaregiver({
  workerId: 'WORKER-PARK-01',
  hospitalId: 'HOSP-001',
  name: 'Park Eun-ji',
  nationality: 'Korean',
  visaType: 'F-2',
  visaExpiryDate: '2028-12-31',
  arcNumber: '850101-1234567',
  licenseNumber: 'KR-CARE-2023-88491',
  employmentType: 'direct',
  monthlyWage: 3000000,
  weeklyHours: 40,
  baseHourlyRate: 18000,
  employmentStartDate: '2024-01-01'
});
assert.strictEqual(registration.success, true);
console.log('✅ Test 1 passed: registration success.');

// ── 2. Compliance evaluation ────────────────────────────────────────────────
const compliance = ledger.evaluateCaregiverCompliance('WORKER-PARK-01');
assert.strictEqual(compliance.compliant, true);
assert.ok(compliance.complianceAudit.cumulativeSeveranceLiability > 0);
console.log('✅ Test 2 passed: compliance evaluation works.');

// ── 3. Staffing Summary aggregation ─────────────────────────────────────────
const summary = ledger.getHospitalStaffingSummary('HOSP-001');
assert.strictEqual(summary.totalCaregivers, 1);
assert.strictEqual(summary.directEmploymentCaregivers, 1);
console.log('✅ Test 3 passed: staffing summary aggregation correct.');

// ── 4. Matching Engine Integration (Verification-Aware) ────────────────────
const engine = new CareBridgeMatchingEngine();
const request = { requiredWeeklyHours: 40 };
const candidates = [{ id: 'WORKER-PARK-01' }]; // Candidate needs verification by the engine

const matches = await engine.matchCaregiver(request, candidates, ledger);
assert.ok(matches.bestMatch, 'Should have a best match after real verification');
assert.strictEqual(matches.bestMatch.isEligible, true, 'Park should be eligible after real verification');
assert.strictEqual(matches.allRankedCandidates.length, 1);
console.log('✅ Test 4 passed: matching engine now correctly verifies through ledger.');

// ── 5. Invalid registration (bad license) ──────────────────────────────────
const badReg = ledger.registerCaregiver({
  workerId: 'WORKER-PARK-01',
  licenseNumber: 'WRONG-NUMBER'
});
assert.strictEqual(badReg.success, false);
console.log('✅ Test 5 passed: invalid credential registration rejected.');

// Cleanup
for (const f of [testLedgerFile, testAuditLogFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

console.log('🎉 All Caregiver Ledger integration tests passed.');
