// Path: src/tests/test_policy_watcher_daemon.js
import { PolicyWatcherDaemon } from '../daemons/policyWatcherDaemon.js';
import { KoreanPolicyWatcher } from '../services/policyWatcher.js';
import { PolicyProposalStore } from '../services/policyProposals.js';
import { AuditMonitor } from '../services/auditMonitor.js';
import assert from 'assert';
import fs from 'fs';

console.log('Running PolicyWatcherDaemon unit tests...');

const testLaborPolicyFile = './test_labor_policy_daemon.json';
const testCaregivingPolicyFile = './test_caregiving_policy_daemon.json';
const testAuditLogFile = './src/config/test_daemon_audit.log';
const testStoreFile = './test_daemon_proposals.json';

for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testAuditLogFile, testStoreFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const policyWatcher = new KoreanPolicyWatcher(testLaborPolicyFile, testCaregivingPolicyFile);
const auditMonitor = new AuditMonitor(testAuditLogFile);
const proposalStore = new PolicyProposalStore({ storeFilePath: testStoreFile, policyWatcher, auditMonitor });

// Stub out the network-touching methods on policyWatcher so this suite is
// fully deterministic and offline -- pollMOHWCaregivingFeed/fetchMOHWPostBody
// are already covered by their own live-network tests in test_mohw_policy_watcher.js.
function makeStubbedPolicyWatcher({ pollResult, bodyResults = {} }) {
  const stub = Object.create(policyWatcher);
  stub.pollMOHWCaregivingFeed = async () => pollResult;
  stub.fetchMOHWPostBody = async (listNo) => bodyResults[listNo] || { success: false, error: 'no stub configured for this listNo' };
  return stub;
}

function makeMockExtractor(extractionResult) {
  return { extractPolicyChange: async () => extractionResult };
}

// ── 1. No new matches → no proposals created ─────────────────────────────────
{
  const stubbedWatcher = makeStubbedPolicyWatcher({
    pollResult: { success: true, newMatchesCount: 0, newMatches: [], policy: {} }
  });
  const daemon = new PolicyWatcherDaemon({
    policyWatcher: stubbedWatcher,
    llmExtractor: makeMockExtractor({ success: true, extraction: { hasNumericChange: false } }),
    proposalStore
  });
  const summary = await daemon.runOnce();
  assert.strictEqual(summary.pollSuccess, true);
  assert.strictEqual(summary.newMatchesCount, 0);
  assert.strictEqual(summary.proposalsCreated.length, 0);
  console.log('✅ Test 1 passed: no new matches → no proposals, no errors.');
}

// ── 2. Poll failure → graceful early exit, no crash ──────────────────────────
{
  const stubbedWatcher = makeStubbedPolicyWatcher({
    pollResult: { success: false, error: 'simulated network failure', policy: {} }
  });
  const daemon = new PolicyWatcherDaemon({
    policyWatcher: stubbedWatcher,
    llmExtractor: makeMockExtractor({ success: true, extraction: { hasNumericChange: false } }),
    proposalStore
  });
  const summary = await daemon.runOnce();
  assert.strictEqual(summary.pollSuccess, false);
  assert.strictEqual(summary.proposalsCreated.length, 0);
  assert.ok(summary.errors[0].includes('simulated network failure'));
  console.log('✅ Test 2 passed: poll failure handled gracefully, no crash.');
}

// ── 3. New match + successful extraction with numeric change → proposal created ─
{
  const post = { listNo: '1500001', title: '요양병원 간병비 급여화 확정안 발표', url: 'https://www.mohw.go.kr/x', date: '2026-09-04' };
  const stubbedWatcher = makeStubbedPolicyWatcher({
    pollResult: { success: true, newMatchesCount: 1, newMatches: [post], policy: {} },
    bodyResults: { [post.listNo]: { success: true, bodyText: '간병인력의 80% 이상을 직접 고용하여야 한다.', url: post.url } }
  });
  const daemon = new PolicyWatcherDaemon({
    policyWatcher: stubbedWatcher,
    llmExtractor: makeMockExtractor({
      success: true,
      extraction: {
        hasNumericChange: true,
        proposedChanges: { directEmploymentMinRatio: 0.8 },
        confidence: 0.9,
        reasoning: 'Explicit 80% threshold stated.',
        sourceQuote: '80% 이상'
      }
    }),
    proposalStore
  });
  const summary = await daemon.runOnce();
  assert.strictEqual(summary.proposalsCreated.length, 1);
  assert.strictEqual(proposalStore.listPending().length, 1);

  // Critically: the daemon itself must NOT have applied this to live policy.
  const policy = policyWatcher.getCurrentCaregivingPolicy();
  assert.strictEqual(policy.activeRegulations.directEmploymentMinRatio, 1.0, 'daemon must never auto-apply -- only a human approval can do that');
  console.log('✅ Test 3 passed: new match with numeric change → proposal created, live policy untouched (autonomy boundary holds).');
}

// ── 4. New match but extraction says no concrete change → no proposal ───────
{
  const post = { listNo: '1500002', title: '요양병원 간병 관련 일반 announcement', url: 'https://www.mohw.go.kr/z', date: '2026-09-05' };
  const stubbedWatcher = makeStubbedPolicyWatcher({
    pollResult: { success: true, newMatchesCount: 1, newMatches: [post], policy: {} },
    bodyResults: { [post.listNo]: { success: true, bodyText: 'general vague announcement', url: post.url } }
  });
  const daemon = new PolicyWatcherDaemon({
    policyWatcher: stubbedWatcher,
    llmExtractor: makeMockExtractor({ success: true, extraction: { hasNumericChange: false, proposedChanges: {}, confidence: 0.1, reasoning: 'vague', sourceQuote: '' } }),
    proposalStore
  });
  const countBefore = proposalStore.listAll().length;
  const summary = await daemon.runOnce();
  assert.strictEqual(summary.proposalsCreated.length, 0);
  assert.strictEqual(proposalStore.listAll().length, countBefore);
  console.log('✅ Test 4 passed: keyword match without concrete numeric change → no proposal created.');
}

// ── 5. Body-fetch failure for one post doesn't crash the whole cycle ────────
{
  const post = { listNo: '1500003', title: '요양병원 간병 오류 테스트', url: 'https://www.mohw.go.kr/w', date: '2026-09-06' };
  const stubbedWatcher = makeStubbedPolicyWatcher({
    pollResult: { success: true, newMatchesCount: 1, newMatches: [post], policy: {} },
    bodyResults: {} // deliberately no stub → fetchMOHWPostBody returns failure
  });
  const daemon = new PolicyWatcherDaemon({
    policyWatcher: stubbedWatcher,
    llmExtractor: makeMockExtractor({ success: true, extraction: { hasNumericChange: false } }),
    proposalStore
  });
  const summary = await daemon.runOnce();
  assert.strictEqual(summary.proposalsCreated.length, 0);
  assert.ok(summary.errors.some(e => e.includes('body fetch failed')));
  console.log('✅ Test 5 passed: body-fetch failure for one post logged as error, cycle completes without throwing.');
}

// ── 6. Extraction-level failure (LLM error) doesn't crash the cycle ─────────
{
  const post = { listNo: '1500004', title: '요양병원 간병 LLM 오류 테스트', url: 'https://www.mohw.go.kr/v', date: '2026-09-07' };
  const stubbedWatcher = makeStubbedPolicyWatcher({
    pollResult: { success: true, newMatchesCount: 1, newMatches: [post], policy: {} },
    bodyResults: { [post.listNo]: { success: true, bodyText: 'text', url: post.url } }
  });
  const daemon = new PolicyWatcherDaemon({
    policyWatcher: stubbedWatcher,
    llmExtractor: makeMockExtractor({ success: false, error: 'simulated LLM endpoint down' }),
    proposalStore
  });
  const summary = await daemon.runOnce();
  assert.strictEqual(summary.proposalsCreated.length, 0);
  assert.ok(summary.errors.some(e => e.includes('simulated LLM endpoint down')));
  console.log('✅ Test 6 passed: LLM extraction failure handled gracefully, cycle completes.');
}

// ── 7. Multiple posts in one cycle: partial success handled correctly ───────
{
  const goodPost = { listNo: '1500005', title: '요양병원 간병 급여화 세부 기준', url: 'https://www.mohw.go.kr/a', date: '2026-09-08' };
  const badPost = { listNo: '1500006', title: '요양병원 간병 실패 케이스', url: 'https://www.mohw.go.kr/b', date: '2026-09-08' };
  const stubbedWatcher = makeStubbedPolicyWatcher({
    pollResult: { success: true, newMatchesCount: 2, newMatches: [goodPost, badPost], policy: {} },
    bodyResults: {
      [goodPost.listNo]: { success: true, bodyText: '기준병상을 120병상으로 한다.', url: goodPost.url }
      // badPost has no stub → will fail body fetch
    }
  });
  let callCount = 0;
  const daemon = new PolicyWatcherDaemon({
    policyWatcher: stubbedWatcher,
    llmExtractor: {
      extractPolicyChange: async () => {
        callCount += 1;
        return {
          success: true,
          extraction: {
            hasNumericChange: true,
            proposedChanges: { hospitalMinBeds: 120 },
            confidence: 0.85,
            reasoning: 'Explicit bed count stated.',
            sourceQuote: '120병상'
          }
        };
      }
    },
    proposalStore
  });
  const summary = await daemon.runOnce();
  assert.strictEqual(summary.proposalsCreated.length, 1, 'only the good post should produce a proposal');
  assert.strictEqual(callCount, 1, 'LLM should only be called for the post whose body fetch succeeded');
  assert.ok(summary.errors.some(e => e.includes(badPost.listNo)));
  console.log('✅ Test 7 passed: partial-success cycle (one good, one bad post) handled correctly.');
}

// ── 8. start()/stop() lifecycle doesn't throw and interval is cleared ───────
{
  const stubbedWatcher = makeStubbedPolicyWatcher({
    pollResult: { success: true, newMatchesCount: 0, newMatches: [], policy: {} }
  });
  const daemon = new PolicyWatcherDaemon({
    policyWatcher: stubbedWatcher,
    llmExtractor: makeMockExtractor({ success: true, extraction: { hasNumericChange: false } }),
    proposalStore,
    pollIntervalMs: 60000
  });
  daemon.start();
  await new Promise(resolve => setTimeout(resolve, 50)); // let the immediate runOnce() fire
  daemon.stop();
  assert.strictEqual(daemon._timer, null);
  console.log('✅ Test 8 passed: start()/stop() lifecycle works without throwing, timer cleared.');
}

// Cleanup
for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testAuditLogFile, testStoreFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

console.log('🎉 All PolicyWatcherDaemon tests passed.');
