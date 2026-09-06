// Path: src/tests/test_insurance_policy_watcher.js
//
// Verifies the insurance-rate-watch extension to KoreanPolicyWatcher:
//   1. Config auto-creation + shape (offline, no network)
//   2. HTML parsing for MOEL + NPS boards against REAL captured markup (offline)
//   3. Keyword-drift detection against SYNTHETIC fixtures with guaranteed matches
//      (offline, deterministic)
//   4. Live network smoke test against pollInsuranceRateFeeds() -- best-effort,
//      network failures are reported, not fatal (mirrors pollMOHWCaregivingFeed's
//      graceful-degradation contract)
import { KoreanPolicyWatcher } from '../services/policyWatcher.js';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Running Insurance-Rate PolicyWatcher tests...');

const testLaborPolicyFile = './test_labor_policy_ins.json';
const testCaregivingPolicyFile = './test_caregiving_policy_ins.json';
const testInsurancePolicyFile = './test_insurance_policy.json';
for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testInsurancePolicyFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

// ── 1. Config auto-creation + shape ─────────────────────────────────────────
const watcher = new KoreanPolicyWatcher(testLaborPolicyFile, testCaregivingPolicyFile, testInsurancePolicyFile);

assert.ok(fs.existsSync(testInsurancePolicyFile), 'insurancePolicy.json must be auto-created');

const policy = watcher.getCurrentInsurancePolicy();
assert.strictEqual(policy.activeRegulations.nationalPensionRate, 0.0475);
assert.strictEqual(policy.activeRegulations.healthInsuranceRate, 0.03595);
assert.strictEqual(policy.activeRegulations.employmentInsuranceRate, 0.009);
assert.ok(policy.sourceFeeds.mohw && policy.sourceFeeds.moel && policy.sourceFeeds.nps, 'must track all 3 board URLs');
assert.ok(Array.isArray(policy.watchedKeywords) && policy.watchedKeywords.includes('보험료율'));
assert.ok(Array.isArray(policy.detectedUpdates) && policy.detectedUpdates.length === 0);
console.log('✅ Test 1 passed: insurance policy config auto-created with expected shape.');

// ── 2. HTML parsing against REAL captured markup (MOEL + NPS) ───────────────
const moelFixture = fs.readFileSync(path.join(__dirname, 'fixtures/moel_board_sample.html'), 'utf8');
const moelRows = watcher._parseMOELBoardListing(moelFixture);
assert.strictEqual(moelRows.length, 2, 'MOEL parser must extract both rows from real captured markup');
for (const row of moelRows) {
  assert.ok(row.listNo && /^\d+$/.test(row.listNo), 'Each MOEL row must have a numeric listNo');
  assert.ok(row.title && row.title.length > 0, 'Each MOEL row must have a non-empty title');
  assert.ok(row.url.startsWith('https://www.moel.go.kr/news/enews/report/enewsView.do'), 'Each MOEL row must have a resolved absolute URL');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(row.date), 'Each MOEL row must have a YYYY-MM-DD date');
}
console.log(`✅ Test 2a passed: parsed ${moelRows.length} real rows from captured MOEL board HTML.`);

const npsFixture = fs.readFileSync(path.join(__dirname, 'fixtures/nps_board_sample.html'), 'utf8');
const npsRows = watcher._parseNPSBoardListing(npsFixture);
assert.strictEqual(npsRows.length, 2, 'NPS parser must extract both rows from real captured markup');
for (const row of npsRows) {
  assert.ok(row.listNo && row.listNo.length > 0, 'Each NPS row must have a listNo');
  assert.ok(row.title && row.title.length > 0, 'Each NPS row must have a non-empty title');
  assert.ok(row.url.startsWith('https://www.nps.or.kr/'), 'Each NPS row must have a resolved absolute URL');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(row.date), 'Each NPS row must have a YYYY-MM-DD date');
}
console.log(`✅ Test 2b passed: parsed ${npsRows.length} real rows from captured NPS board HTML.`);

// ── 3. Keyword-drift detection against SYNTHETIC fixtures ───────────────────
const moelSynthetic = fs.readFileSync(path.join(__dirname, 'fixtures/moel_board_synthetic.html'), 'utf8');
const moelSyntheticRows = watcher._parseMOELBoardListing(moelSynthetic);
assert.strictEqual(moelSyntheticRows.length, 3, 'MOEL synthetic fixture must yield exactly 3 rows');

const moelDrift = watcher._detectCaregivingDrift(moelSyntheticRows, policy);
assert.strictEqual(moelDrift.length, 2, 'Exactly 2 of the 3 MOEL synthetic rows match watched insurance keywords');
assert.ok(moelDrift.some(r => r.title.includes('고용보험료율')), 'Must detect employment insurance rate post');
assert.ok(moelDrift.some(r => r.title.includes('산재보험료율')), 'Must detect industrial accident insurance rate post');
assert.ok(!moelDrift.some(r => r.title.includes('청년 일자리')), 'Must NOT flag unrelated posts');
console.log('✅ Test 3a passed: MOEL keyword-drift detection verified against synthetic fixture.');

const npsSynthetic = fs.readFileSync(path.join(__dirname, 'fixtures/nps_board_synthetic.html'), 'utf8');
const npsSyntheticRows = watcher._parseNPSBoardListing(npsSynthetic);
assert.strictEqual(npsSyntheticRows.length, 2, 'NPS synthetic fixture must yield exactly 2 rows');

const npsDrift = watcher._detectCaregivingDrift(npsSyntheticRows, policy);
assert.strictEqual(npsDrift.length, 1, 'Exactly 1 of the 2 NPS synthetic rows matches watched insurance keywords');
assert.ok(npsDrift[0].title.includes('국민연금 보험료율'), 'Must detect the pension rate post');
console.log('✅ Test 3b passed: NPS keyword-drift detection verified against synthetic fixture.');

// Dedupe check (shared logic with caregiving watcher, spot-checked here too)
const policyWithHistory = { ...policy, detectedUpdates: [{ listNo: moelDrift[0].listNo }] };
const moelDriftAfterDedupe = watcher._detectCaregivingDrift(moelSyntheticRows, policyWithHistory);
assert.strictEqual(moelDriftAfterDedupe.length, 1, 'Already-seen listNo must be excluded from new matches');
console.log('✅ Test 3c passed: dedupe logic verified for insurance-rate drift.');

// ── 4. Live network smoke test (best-effort; failure is reported, not fatal) ─
try {
  const result = await watcher.pollInsuranceRateFeeds();
  assert.ok(typeof result.success === 'boolean', 'pollInsuranceRateFeeds must return a success flag');
  assert.ok(Array.isArray(result.errors), 'pollInsuranceRateFeeds must return an errors array (per-board failures)');
  if (result.success) {
    assert.ok(typeof result.newMatchesCount === 'number');
    const updatedPolicy = watcher.getCurrentInsurancePolicy();
    assert.ok(new Date(updatedPolicy.lastChecked).getTime() > new Date(policy.lastChecked).getTime(),
      'lastChecked must advance after at least one successful live poll');
    console.log(`✅ Test 4 passed: live insurance-rate poll succeeded (${result.newMatchesCount} new matches, ${result.errors.length} board errors).`);
  } else {
    console.warn(`⚠️  Test 4 degraded gracefully: all boards failed (${result.errors.join('; ')}) — network condition, not a code defect.`);
  }
} catch (err) {
  throw new Error(`pollInsuranceRateFeeds threw unexpectedly (should always resolve, never reject): ${err.message}`);
}

// Cleanup
for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testInsurancePolicyFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

console.log('🎉 All Insurance-Rate PolicyWatcher tests passed.');
