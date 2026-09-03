// Path: src/tests/test_policy_proposals.js
import { PolicyProposalStore } from '../services/policyProposals.js';
import { KoreanPolicyWatcher } from '../services/policyWatcher.js';
import { AuditMonitor } from '../services/auditMonitor.js';
import assert from 'assert';
import fs from 'fs';

console.log('Running PolicyProposalStore unit tests...');

const testLaborPolicyFile = './test_labor_policy_prop.json';
const testCaregivingPolicyFile = './test_caregiving_policy_prop.json';
const testAuditLogFile = './src/config/test_proposals_audit.log';
const testStoreFile = './test_policy_proposals.json';

for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testAuditLogFile, testStoreFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const policyWatcher = new KoreanPolicyWatcher(testLaborPolicyFile, testCaregivingPolicyFile);
const auditMonitor = new AuditMonitor(testAuditLogFile);
const store = new PolicyProposalStore({
  storeFilePath: testStoreFile,
  policyWatcher,
  auditMonitor
});

// ── 1. Store auto-creates empty ──────────────────────────────────────────────
assert.ok(fs.existsSync(testStoreFile));
assert.deepStrictEqual(store.listAll(), []);
console.log('✅ Test 1 passed: proposal store auto-created empty.');

// ── 2. createProposal requires hasNumericChange === true ────────────────────
assert.throws(
  () => store.createProposal({ sourcePost: { listNo: '1', title: 't', url: 'u', date: 'd' }, extraction: { hasNumericChange: false } }),
  /requires an extraction with hasNumericChange/
);
console.log('✅ Test 2 passed: createProposal rejects non-actionable extractions.');

// ── 3. createProposal records a pending proposal + audit log entry ──────────
const proposal1 = store.createProposal({
  sourcePost: { listNo: '1499999', title: '요양병원 간병비 급여화 확정안 발표', url: 'https://www.mohw.go.kr/x', date: '2026-09-04' },
  extraction: {
    hasNumericChange: true,
    proposedChanges: { directEmploymentMinRatio: 0.8 },
    confidence: 0.9,
    reasoning: 'Stated 80% requirement.',
    sourceQuote: '80% 이상'
  }
});
assert.strictEqual(proposal1.status, 'pending');
assert.ok(proposal1.id);
assert.strictEqual(store.listPending().length, 1);

const auditAfterCreate = auditMonitor.scanForViolations();
assert.strictEqual(auditAfterCreate.totalEntriesScanned, 1, 'proposal creation must be audit-logged');
console.log('✅ Test 3 passed: proposal created as pending, audit-logged.');

// ── 4. Live policy is UNCHANGED until approval ───────────────────────────────
const policyBeforeApproval = policyWatcher.getCurrentCaregivingPolicy();
assert.strictEqual(policyBeforeApproval.activeRegulations.directEmploymentMinRatio, 1.0, 'creating a proposal must NOT touch live policy');
console.log('✅ Test 4 passed: pending proposal has zero effect on live caregivingPolicy.json.');

// ── 5. approveProposal requires a reviewedBy identifier ──────────────────────
assert.throws(() => store.approveProposal(proposal1.id, ''), /requires a reviewedBy/);
console.log('✅ Test 5 passed: approval without an identified human reviewer is rejected.');

// ── 6. approveProposal applies the change to live policy ────────────────────
const approved = store.approveProposal(proposal1.id, 'Paul (founder)', 'Confirmed against MOHW source directly.');
assert.strictEqual(approved.status, 'approved');
assert.strictEqual(approved.reviewedBy, 'Paul (founder)');

const policyAfterApproval = policyWatcher.getCurrentCaregivingPolicy();
assert.strictEqual(policyAfterApproval.activeRegulations.directEmploymentMinRatio, 0.8, 'approval must apply proposedChanges to live policy');
console.log('✅ Test 6 passed: approval applies proposed changes to live caregivingPolicy.json.');

// ── 7. Cannot approve an already-approved proposal twice ────────────────────
assert.throws(() => store.approveProposal(proposal1.id, 'Someone Else'), /is not pending/);
console.log('✅ Test 7 passed: double-approval is rejected (idempotency/safety).');

// ── 8. rejectProposal leaves live policy untouched ───────────────────────────
const proposal2 = store.createProposal({
  sourcePost: { listNo: '1499998', title: '간병 정책 관련 발표', url: 'https://www.mohw.go.kr/y', date: '2026-09-05' },
  extraction: {
    hasNumericChange: true,
    proposedChanges: { hospitalMinBeds: 9999 }, // deliberately absurd, should never land
    confidence: 0.3,
    reasoning: 'Low-confidence guess.',
    sourceQuote: 'ambiguous text'
  }
});
const rejected = store.rejectProposal(proposal2.id, 'Paul (founder)', 'Confidence too low, does not match source text clearly.');
assert.strictEqual(rejected.status, 'rejected');

const policyAfterRejection = policyWatcher.getCurrentCaregivingPolicy();
assert.strictEqual(policyAfterRejection.activeRegulations.hospitalMinBeds, 100, 'rejected proposal must NOT affect live policy');
console.log('✅ Test 8 passed: rejected proposal has zero effect on live policy.');

// ── 9. listPending excludes reviewed proposals ───────────────────────────────
assert.strictEqual(store.listPending().length, 0, 'both proposals have been reviewed, none should remain pending');
assert.strictEqual(store.listAll().length, 2);
console.log('✅ Test 9 passed: listPending correctly excludes approved/rejected proposals.');

// ── 10. getProposal throws for unknown id ────────────────────────────────────
assert.throws(() => store.getProposal('does-not-exist'), /No proposal found/);
console.log('✅ Test 10 passed: unknown proposal id throws explicitly.');

// Cleanup
for (const f of [testLaborPolicyFile, testCaregivingPolicyFile, testAuditLogFile, testStoreFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

console.log('🎉 All PolicyProposalStore tests passed.');
