// Path: src/tests/test_matching.js
import { CareBridgeMatchingEngine } from '../services/matchingEngine.js';
import { CaregiverLedger } from '../services/caregiverLedger.js';
import { AuditMonitor } from '../services/auditMonitor.js';
import assert from 'assert';
import fs from 'fs';

console.log('Running CareBridge Smart Matching unit tests...');

const testLedgerFile = './test_matching_ledger.json';
const testAuditLogFile = './src/config/test_matching_audit.log';
for (const f of [testLedgerFile, testAuditLogFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const auditMonitor = new AuditMonitor(testAuditLogFile);
const ledger = new CaregiverLedger({ ledgerPath: testLedgerFile, auditMonitor });
const engine = new CareBridgeMatchingEngine();

// Kim Ji-young is a real entry in CredentialIngestor's mock government registry
// (WORKER-KIM-02) -- registration should succeed and she should be verifiably
// compliant, not just self-asserted as isCertified: true.
const kimRegistration = ledger.registerCaregiver({
  workerId: 'WORKER-KIM-02',
  hospitalId: 'HOSP-TEST',
  name: 'Kim Ji-young',
  nationality: 'Korean',
  visaType: 'F-2',
  arcNumber: '850101-1234567',
  licenseNumber: 'KR-CARE-2022-11029', // matches mock registry
  employmentType: 'direct',
  monthlyWage: 3000000,
  weeklyHours: 40,
  baseHourlyRate: 18000,
  employmentStartDate: '2024-01-01'
});
assert.strictEqual(kimRegistration.success, true, 'Kim should register successfully against the real mock registry');

// Lee Min-su presents a license number that does NOT match anything in the
// government registry -- registration must fail, and critically, the matching
// engine must disqualify him because he was never actually verified, not
// because a caller-supplied isCertified flag happened to be false (that was
// the pre-ledger vulnerability: a caller could just claim isCertified: true).
const leeRegistration = ledger.registerCaregiver({
  workerId: 'worker-lee-unverified',
  hospitalId: 'HOSP-TEST',
  name: 'Lee Min-su',
  nationality: 'Korean',
  visaType: 'F-2',
  arcNumber: '900101-2345678',
  licenseNumber: 'FORGED-LICENSE-0000',
  employmentType: 'broker',
  monthlyWage: 2800000,
  weeklyHours: 40,
  baseHourlyRate: 16000,
  employmentStartDate: '2024-06-01'
});
assert.strictEqual(leeRegistration.success, false, 'Lee should fail registration -- his license does not match the government registry');

const request = {
  requestId: 'req-elder-88',
  requiredWeeklyHours: 40.0,
  overtimeHours: 5.0,
  strictNoSeverance: false
};

const candidates = [
  { id: 'WORKER-KIM-02', name: 'Kim Ji-young', expectedMonthlyWage: 3000000, employmentStartDate: '2024-01-01', baseHourlyRate: 18000, distanceKm: 2.5, rating: 4.9, yearsOfExperience: 5 },
  { id: 'worker-lee-unverified', name: 'Lee Min-su', expectedMonthlyWage: 2800000, employmentStartDate: '2024-06-01', baseHourlyRate: 16000, distanceKm: 1.0, rating: 4.2, yearsOfExperience: 1 }
];

// matchCaregiver now REQUIRES a ledger -- certification is actually verified,
// never trusted from a raw candidate-supplied flag.
const result = await engine.matchCaregiver(request, candidates, ledger);

assert.strictEqual(result.requestId, 'req-elder-88');
assert.ok(result.bestMatch, 'Should find a valid eligible best match');
assert.strictEqual(result.bestMatch.caregiverId, 'WORKER-KIM-02', 'Kim Ji-young should be top match -- verified against real registry');
assert.strictEqual(result.allRankedCandidates.length, 2);

const leeResult = result.allRankedCandidates.find(m => m.caregiverId === 'worker-lee-unverified');
assert.strictEqual(leeResult.isEligible, false, 'Lee must be disqualified -- he was never registered/verified in the ledger');
assert.ok(leeResult.disqualificationReason, 'Disqualification must include a reason');

// matchCaregiver must reject calls with no ledger -- this is the safety
// contract that prevents ever falling back to trust-the-flag behavior.
await assert.rejects(
  () => engine.matchCaregiver(request, candidates, null),
  /requires a CaregiverLedger instance/
);

// Cleanup
for (const f of [testLedgerFile, testAuditLogFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

console.log('✅ CareBridge Smart Matching tests passed successfully! (now verifying real credentials via CaregiverLedger, not trusting caller-supplied flags)');
