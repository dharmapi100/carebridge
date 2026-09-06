// Path: src/tests/test_api_endpoints.js
//
// Endpoint-level smoke tests -- proves the wiring itself works (HTTP ->
// engine -> response), not the underlying math (already covered by each
// engine's own unit tests: test_hospital_eligibility.js,
// test_staffing_compliance.js, test_gap_report.js, test_long_stay_penalty.js).
// Boots a real server instance on an isolated port and hits it with fetch.
import { spawn } from 'child_process';
import assert from 'assert';

console.log('Running API endpoint wiring smoke tests...');

const PORT = 3901;
const BASE = `http://localhost:${PORT}`;

const server = spawn('node', ['src/api/server.js'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe']
});

function waitForServer(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = async () => {
      try {
        const res = await fetch(`${BASE}/health`);
        if (res.ok) return resolve();
      } catch (e) { /* not up yet */ }
      if (Date.now() - start > timeoutMs) return reject(new Error('Server did not start in time'));
      setTimeout(tryConnect, 200);
    };
    tryConnect();
  });
}

async function run() {
  await waitForServer();

  // ── /api/v1/hospital/eligibility ──────────────────────────────────────
  const eligRes = await fetch(`${BASE}/api/v1/hospital/eligibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hospitalId: 'HOSP-API-TEST', bedCount: 150, totalCaregivers: 40,
      directEmploymentCaregivers: 40, medicalAccreditationStatus: 'accredited', region: 'metro'
    })
  });
  assert.strictEqual(eligRes.status, 200);
  const eligBody = await eligRes.json();
  assert.strictEqual(eligBody.success, true);
  assert.strictEqual(eligBody.eligibilityResult.status, 'eligible');
  console.log('✅ POST /api/v1/hospital/eligibility wired correctly.');

  // ── /api/v1/staffing/evaluate ──────────────────────────────────────────
  const staffRes = await fetch(`${BASE}/api/v1/staffing/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hospitalId: 'HOSP-API-TEST', wardId: 'WARD-A', bedCount: 4,
      assignedCaregiverCount: 3, shiftsPerDay: 2,
      shiftLogs: [{ caregiverId: 'CG-1', continuousShiftHours: 8, supervisingRnId: 'RN-1' }]
    })
  });
  assert.strictEqual(staffRes.status, 200);
  const staffBody = await staffRes.json();
  assert.strictEqual(staffBody.staffingResult.meetsForthcomingStandard, true);
  console.log('✅ POST /api/v1/staffing/evaluate wired correctly.');

  // ── /api/v1/hospital/gap-report ─────────────────────────────────────────
  const gapRes = await fetch(`${BASE}/api/v1/hospital/gap-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hospitalData: {
        hospitalId: 'HOSP-API-TEST', bedCount: 150, totalCaregivers: 40,
        directEmploymentCaregivers: 40, medicalAccreditationStatus: 'accredited', region: 'metro'
      },
      wardStaffingData: [{
        hospitalId: 'HOSP-API-TEST', wardId: 'WARD-A', bedCount: 4,
        assignedCaregiverCount: 3, shiftsPerDay: 2,
        shiftLogs: [{ caregiverId: 'CG-1', continuousShiftHours: 8, supervisingRnId: 'RN-1' }]
      }]
    })
  });
  assert.strictEqual(gapRes.status, 200);
  const gapBody = await gapRes.json();
  assert.strictEqual(gapBody.gapReport.overallStatus, 'eligible');
  assert.strictEqual(gapBody.gapReport.gaps.length, 0);
  console.log('✅ POST /api/v1/hospital/gap-report wired correctly.');

  // ── /api/v1/patient/copay ───────────────────────────────────────────────
  const copayRes = await fetch(`${BASE}/api/v1/patient/copay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: 'PT-API-TEST', admissionDurationDays: 400, grossMonthlyCaregivingCostKRW: 2670000 })
  });
  assert.strictEqual(copayRes.status, 200);
  const copayBody = await copayRes.json();
  assert.strictEqual(copayBody.copayResult.tier, 'long_stay_1yr_plus');
  assert.strictEqual(copayBody.copayResult.finalCopayRatio, 0.5);
  console.log('✅ POST /api/v1/patient/copay wired correctly.');

  // ── /api/v1/patient/copay/batch ─────────────────────────────────────────
  const batchRes = await fetch(`${BASE}/api/v1/patient/copay/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patients: [
        { patientId: 'PT-A', admissionDurationDays: 30, grossMonthlyCaregivingCostKRW: 2000000 },
        { patientId: 'PT-B', admissionDurationDays: 400, grossMonthlyCaregivingCostKRW: 2000000 }
      ]
    })
  });
  assert.strictEqual(batchRes.status, 200);
  const batchBody = await batchRes.json();
  assert.strictEqual(batchBody.totalProcessed, 2);
  assert.strictEqual(batchBody.copayResults[0].tier, 'standard');
  assert.strictEqual(batchBody.copayResults[1].tier, 'long_stay_1yr_plus');
  console.log('✅ POST /api/v1/patient/copay/batch wired correctly.');

  // ── Malformed input still returns a handled error, not a crash ─────────
  // hospitalData is present as a top-level object (passes Express's strict
  // JSON body-parser) but is missing everything evaluateHospital needs --
  // proves the route's own try/catch handles a bad-shape payload gracefully.
  const badRes = await fetch(`${BASE}/api/v1/staffing/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shiftLogs: 'not-an-array' })
  });
  assert.strictEqual(badRes.status, 500);
  const badBody = await badRes.json();
  assert.strictEqual(badBody.success, false);
  console.log('✅ Malformed request handled gracefully (500 + error, not a crash).');

  console.log('✅ API endpoint wiring smoke tests passed successfully!');
}

run()
  .then(() => { server.kill(); process.exit(0); })
  .catch((err) => { console.error('❌', err.message); server.kill(); process.exit(1); });
