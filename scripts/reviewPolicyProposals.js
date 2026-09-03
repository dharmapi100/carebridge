#!/usr/bin/env node
// Path: scripts/reviewPolicyProposals.js
//
// Human-in-the-loop CLI for reviewing autonomous MOHW policy proposals created
// by src/daemons/policyWatcherDaemon.js. This is the ONLY sanctioned way (short
// of calling PolicyProposalStore directly from your own script) that a proposal
// can move from 'pending' to actually affecting caregivingPolicy.json.
//
// Usage:
//   node scripts/reviewPolicyProposals.js list
//   node scripts/reviewPolicyProposals.js show <proposalId>
//   node scripts/reviewPolicyProposals.js approve <proposalId> "<your name>" ["note"]
//   node scripts/reviewPolicyProposals.js reject  <proposalId> "<your name>" ["note"]
import { PolicyProposalStore } from '../src/services/policyProposals.js';

const store = new PolicyProposalStore();
const [, , command, ...args] = process.argv;

function printProposalSummary(p) {
  console.log(`\n[${p.status.toUpperCase()}] ${p.id}`);
  console.log(`  Source: ${p.sourcePost.title}`);
  console.log(`  URL: ${p.sourcePost.url}`);
  console.log(`  Detected: ${p.createdAt}`);
  console.log(`  Confidence: ${p.confidence}`);
  console.log(`  Proposed changes: ${JSON.stringify(p.proposedChanges)}`);
  console.log(`  Reasoning: ${p.reasoning}`);
  if (p.sourceQuote) console.log(`  Source quote: "${p.sourceQuote}"`);
  if (p.reviewedBy) console.log(`  Reviewed by ${p.reviewedBy} at ${p.reviewedAt}${p.reviewNote ? ' — ' + p.reviewNote : ''}`);
}

switch (command) {
  case 'list': {
    const pending = store.listPending();
    if (pending.length === 0) {
      console.log('No pending policy proposals.');
    } else {
      console.log(`${pending.length} pending proposal(s):`);
      pending.forEach(printProposalSummary);
    }
    break;
  }

  case 'show': {
    const [proposalId] = args;
    if (!proposalId) {
      console.error('Usage: reviewPolicyProposals.js show <proposalId>');
      process.exit(1);
    }
    printProposalSummary(store.getProposal(proposalId));
    break;
  }

  case 'approve': {
    const [proposalId, reviewedBy, note] = args;
    if (!proposalId || !reviewedBy) {
      console.error('Usage: reviewPolicyProposals.js approve <proposalId> "<your name>" ["note"]');
      process.exit(1);
    }
    const approved = store.approveProposal(proposalId, reviewedBy, note || '');
    console.log(`✅ Approved and applied to caregivingPolicy.json:`);
    printProposalSummary(approved);
    break;
  }

  case 'reject': {
    const [proposalId, reviewedBy, note] = args;
    if (!proposalId || !reviewedBy) {
      console.error('Usage: reviewPolicyProposals.js reject <proposalId> "<your name>" ["note"]');
      process.exit(1);
    }
    const rejected = store.rejectProposal(proposalId, reviewedBy, note || '');
    console.log(`🚫 Rejected (no change applied):`);
    printProposalSummary(rejected);
    break;
  }

  default:
    console.log('CareBridge MOHW Policy Proposal Review CLI');
    console.log('');
    console.log('Commands:');
    console.log('  list                                              List pending proposals');
    console.log('  show <proposalId>                                 Show full proposal detail');
    console.log('  approve <proposalId> "<your name>" ["note"]       Apply proposal to live policy');
    console.log('  reject  <proposalId> "<your name>" ["note"]       Discard proposal, no change');
    process.exit(command ? 1 : 0);
}
