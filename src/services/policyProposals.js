// Path: src/services/policyProposals.js
//
// Human-approval gate between LLMExtractor's output and the live
// caregivingPolicy.json thresholds that actually gate hospital eligibility
// decisions. This is the enforcement point for the "Level 1+2, not Level 3"
// autonomy decision: proposals are created autonomously, but NOTHING in this
// file (or anywhere else in the codebase) writes an approved proposal's values
// into caregivingPolicy.json without an explicit human calling approve().
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { KoreanPolicyWatcher } from './policyWatcher.js';
import { AuditMonitor } from './auditMonitor.js';

export class PolicyProposalStore {
  constructor(options = {}) {
    this.storeFilePath = path.resolve(options.storeFilePath || './src/config/policyProposals.json');
    this.policyWatcher = options.policyWatcher || new KoreanPolicyWatcher(
      options.laborPolicyFilePath,
      options.caregivingPolicyFilePath
    );
    this.auditMonitor = options.auditMonitor || new AuditMonitor(options.auditLogPath);
    this._ensureStore();
  }

  _ensureStore() {
    const dir = path.dirname(this.storeFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.storeFilePath)) {
      fs.writeFileSync(this.storeFilePath, JSON.stringify({ proposals: [] }, null, 2));
    }
  }

  _read() {
    return JSON.parse(fs.readFileSync(this.storeFilePath, 'utf8'));
  }

  _write(data) {
    fs.writeFileSync(this.storeFilePath, JSON.stringify(data, null, 2));
  }

  /**
   * Records a new draft proposal generated from an LLM extraction. Status starts
   * as 'pending' -- it has NO effect on live policy until approvePolicyProposal()
   * is explicitly called by a human.
   */
  createProposal({ sourcePost, extraction }) {
    if (!extraction || extraction.hasNumericChange !== true) {
      throw new Error('createProposal requires an extraction with hasNumericChange === true.');
    }

    const store = this._read();
    const proposal = {
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      sourcePost: {
        listNo: sourcePost.listNo,
        title: sourcePost.title,
        url: sourcePost.url,
        date: sourcePost.date
      },
      proposedChanges: extraction.proposedChanges,
      confidence: extraction.confidence,
      reasoning: extraction.reasoning,
      sourceQuote: extraction.sourceQuote,
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null
    };

    store.proposals.push(proposal);
    this._write(store);

    this.auditMonitor.logAuditEvent('POLICY_PROPOSAL_CREATED', 'policyWatcherDaemon', {
      proposalId: proposal.id,
      sourceUrl: proposal.sourcePost.url,
      proposedChanges: proposal.proposedChanges,
      confidence: proposal.confidence
    });

    return proposal;
  }

  listPending() {
    return this._read().proposals.filter(p => p.status === 'pending');
  }

  listAll() {
    return this._read().proposals;
  }

  getProposal(proposalId) {
    const proposal = this._read().proposals.find(p => p.id === proposalId);
    if (!proposal) {
      throw new Error(`No proposal found with id ${proposalId}.`);
    }
    return proposal;
  }

  /**
   * THE approval gate. Only this method may cause a proposal's values to reach
   * caregivingPolicy.json, and it requires an explicit human-identified caller
   * (reviewedBy) -- it is never invoked by the daemon or the extractor itself.
   */
  approveProposal(proposalId, reviewedBy, reviewNote = '') {
    if (!reviewedBy) {
      throw new Error('approveProposal requires a reviewedBy identifier (who approved this).');
    }

    const store = this._read();
    const proposal = store.proposals.find(p => p.id === proposalId);
    if (!proposal) {
      throw new Error(`No proposal found with id ${proposalId}.`);
    }
    if (proposal.status !== 'pending') {
      throw new Error(`Proposal ${proposalId} is not pending (current status: ${proposal.status}). Only pending proposals can be approved.`);
    }

    // Apply to live policy -- the ONLY place in the codebase this happens.
    const updatedPolicy = this.policyWatcher.updateCaregivingPolicyThresholds(proposal.proposedChanges);

    proposal.status = 'approved';
    proposal.reviewedAt = new Date().toISOString();
    proposal.reviewedBy = reviewedBy;
    proposal.reviewNote = reviewNote;
    this._write(store);

    this.auditMonitor.logAuditEvent('POLICY_PROPOSAL_APPROVED', reviewedBy, {
      proposalId,
      appliedChanges: proposal.proposedChanges,
      resultingPolicy: updatedPolicy.activeRegulations
    });

    return proposal;
  }

  rejectProposal(proposalId, reviewedBy, reviewNote = '') {
    if (!reviewedBy) {
      throw new Error('rejectProposal requires a reviewedBy identifier (who rejected this).');
    }

    const store = this._read();
    const proposal = store.proposals.find(p => p.id === proposalId);
    if (!proposal) {
      throw new Error(`No proposal found with id ${proposalId}.`);
    }
    if (proposal.status !== 'pending') {
      throw new Error(`Proposal ${proposalId} is not pending (current status: ${proposal.status}). Only pending proposals can be rejected.`);
    }

    proposal.status = 'rejected';
    proposal.reviewedAt = new Date().toISOString();
    proposal.reviewedBy = reviewedBy;
    proposal.reviewNote = reviewNote;
    this._write(store);

    this.auditMonitor.logAuditEvent('POLICY_PROPOSAL_REJECTED', reviewedBy, {
      proposalId,
      rejectedChanges: proposal.proposedChanges,
      reviewNote
    });

    return proposal;
  }
}
