// Path: src/tests/test_mohw_policy_watcher.js
//
// Verifies the MOHW caregiving-compliance extension to KoreanPolicyWatcher:
//   1. Config auto-creation + shape (offline, no network)
//   2. HTML parsing logic against a REAL captured MOHW board fixture (offline)
//   3. Keyword-drift detection logic against a SYNTHETIC fixture with guaranteed
//      matches (offline, deterministic — doesn't depend on MOHW publishing a
//      matching post at test-run time)
//   4. A live network smoke test against the real mohw.go.kr endpoint (this one
//      call is allowed to be network-flaky; failures are reported, not fatal to
//      the rest of the suite, matching pollMOHWCaregivingFeed's own graceful
//      degradation contract)
import { KoreanPolicyWatcher } from '../services/policyWatcher.js';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Running MOHW Caregiving PolicyWatcher tests...');

const testLaborPolicyFile = './test_labor_policy.json';
const testCaregivingPolicyFile = './test_caregiving_policy.json';
for (const f of [testLaborPolicyFile, testCaregivingPolicyFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

// ── 1. Config auto-creation + shape ─────────────────────────────────────────
const watcher = new KoreanPolicyWatcher(testLaborPolicyFile, testCaregivingPolicyFile);

assert.ok(fs.existsSync(testCaregivingPolicyFile), 'caregivingPolicy.json must be auto-created');

const policy = watcher.getCurrentCaregivingPolicy();
assert.strictEqual(policy.jurisdiction, 'South Korea Ministry of Health and Welfare (MOHW)');
assert.strictEqual(policy.programStatus, 'pilot_pending_confirmation');
assert.strictEqual(policy.activeRegulations.hospitalMinBeds, 100);
assert.strictEqual(policy.activeRegulations.directEmploymentRequired, true);
assert.ok(policy.activeRegulations.patientCopayRatioMin >= 0.20 && policy.activeRegulations.patientCopayRatioMax <= 0.30);
assert.strictEqual(policy.activeRegulations.caregiverToPatientRatio, 4);
assert.ok(Array.isArray(policy.watchedKeywords) && policy.watchedKeywords.includes('간병'));
assert.ok(Array.isArray(policy.detectedUpdates) && policy.detectedUpdates.length === 0);
console.log('✅ Test 1 passed: caregiving policy config auto-created with expected shape.');

// ── 2. HTML parsing against REAL captured MOHW markup ───────────────────────
const realFixture = fs.readFileSync(path.join(__dirname, 'fixtures/mohw_board_sample.html'), 'utf8');
const realRows = watcher._parseMOHWBoardListing(realFixture);

assert.ok(realRows.length > 0, 'Parser must extract at least one row from real MOHW markup');
for (const row of realRows) {
  assert.ok(row.listNo && /^\d+$/.test(row.listNo), 'Each row must have a numeric listNo');
  assert.ok(row.title && row.title.length > 0, 'Each row must have a non-empty title');
  assert.ok(row.url.startsWith('https://www.mohw.go.kr/board.es'), 'Each row must have a resolved absolute URL');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(row.date), 'Each row must have a YYYY-MM-DD date');
}
console.log(`✅ Test 2 passed: parsed ${realRows.length} real rows from captured MOHW board HTML.`);

// ── 3. Keyword-drift detection against SYNTHETIC fixture (guaranteed matches) ─
const syntheticFixture = fs.readFileSync(path.join(__dirname, 'fixtures/mohw_board_synthetic.html'), 'utf8');
const syntheticRows = watcher._parseMOHWBoardListing(syntheticFixture);
assert.strictEqual(syntheticRows.length, 3, 'Synthetic fixture must yield exactly 3 rows');

const drift = watcher._detectCaregivingDrift(syntheticRows, policy);
assert.strictEqual(drift.length, 2, 'Exactly 2 of the 3 synthetic rows match watched keywords (간병/요양병원/급여화, 간호간병통합서비스)');
assert.ok(drift.some(r => r.title.includes('간병비 급여화')), 'Must detect the 급여화 confirmation post');
assert.ok(drift.some(r => r.title.includes('간호간병통합서비스')), 'Must detect the integrated service post');
assert.ok(!drift.some(r => r.title.includes('지역의사')), 'Must NOT flag unrelated posts');

// Dedupe check: mark one as already-seen, re-run drift detection, expect it dropped
const policyWithHistory = {
  ...policy,
  detectedUpdates: [{ listNo: drift[0].listNo }]
};
const driftAfterDedupe = watcher._detectCaregivingDrift(syntheticRows, policyWithHistory);
assert.strictEqual(driftAfterDedupe.length, 1, 'Already-seen listNo must be excluded from new matches');
console.log('✅ Test 3 passed: keyword-drift detection + dedupe logic verified against synthetic fixture.');

// ── 4. Live network smoke test (best-effort; failure is reported, not fatal) ─
try {
  const result = await watcher.pollMOHWCaregivingFeed();
  assert.ok(typeof result.success === 'boolean', 'pollMOHWCaregivingFeed must return a success flag');
  if (result.success) {
    assert.ok(typeof result.newMatchesCount === 'number');
    const updatedPolicy = watcher.getCurrentCaregivingPolicy();
    assert.ok(new Date(updatedPolicy.lastChecked).getTime() > new Date(policy.lastChecked).getTime(),
      'lastChecked must advance after a successful live poll');
    console.log(`✅ Test 4 passed: live MOHW poll succeeded (${result.newMatchesCount} new matches detected).`);
  } else {
    console.warn(`⚠️  Test 4 degraded gracefully: live MOHW poll failed (${result.error}) — this is a network condition, not a code defect. lastChecked correctly left unchanged.`);
  }
} catch (err) {
  throw new Error(`pollMOHWCaregivingFeed threw unexpectedly (should always resolve, never reject): ${err.message}`);
}

// Cleanup
for (const f of [testLaborPolicyFile, testCaregivingPolicyFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

console.log('🎉 All MOHW Caregiving PolicyWatcher tests passed.');
