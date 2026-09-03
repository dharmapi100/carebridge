// Path: src/daemons/policyWatcherDaemon.js
//
// Autonomous interval loop tying together:
//   KoreanPolicyWatcher.pollMOHWCaregivingFeed()  -- discover new matching posts
//   KoreanPolicyWatcher.fetchMOHWPostBody()       -- fetch full article text
//   LLMExtractor.extractPolicyChange()            -- draft a structured proposal
//   PolicyProposalStore.createProposal()          -- record it for human review
//
// AUTONOMY BOUNDARY (Level 1+2, explicitly NOT Level 3):
// This daemon runs entirely unattended and WILL create proposals without a
// human in the loop. It will NEVER call approveProposal() itself, and nothing
// in this file writes to caregivingPolicy.json's activeRegulations. A human
// must run the review CLI (scripts/reviewPolicyProposals.js) to approve or
// reject each draft before it can affect a live hospital eligibility decision.
//
// Run directly:   node src/daemons/policyWatcherDaemon.js
// Run once (no loop, useful for testing/cron-external scheduling):
//                 node src/daemons/policyWatcherDaemon.js --once
import { KoreanPolicyWatcher } from '../services/policyWatcher.js';
import { LLMExtractor } from '../services/llmExtractor.js';
import { PolicyProposalStore } from '../services/policyProposals.js';

const DEFAULT_POLL_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export class PolicyWatcherDaemon {
  constructor(options = {}) {
    this.policyWatcher = options.policyWatcher || new KoreanPolicyWatcher();
    this.llmExtractor = options.llmExtractor || new LLMExtractor();
    this.proposalStore = options.proposalStore || new PolicyProposalStore({
      policyWatcher: this.policyWatcher
    });
    this.pollIntervalMs = options.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
    this._timer = null;
  }

  /**
   * Runs exactly one poll-extract-propose cycle. This is the unit the interval
   * loop repeats, and it's what tests/manual smoke-runs call directly.
   */
  async runOnce() {
    const summary = {
      startedAt: new Date().toISOString(),
      pollSuccess: false,
      newMatchesCount: 0,
      proposalsCreated: [],
      errors: []
    };

    const pollResult = await this.policyWatcher.pollMOHWCaregivingFeed();
    summary.pollSuccess = pollResult.success;

    if (!pollResult.success) {
      summary.errors.push(`Poll failed: ${pollResult.error}`);
      console.warn(`[PolicyWatcherDaemon] ⚠️ Poll failed, skipping this cycle: ${pollResult.error}`);
      return summary;
    }

    summary.newMatchesCount = pollResult.newMatchesCount;

    if (pollResult.newMatchesCount === 0) {
      console.log('[PolicyWatcherDaemon] No new matching MOHW posts this cycle.');
      return summary;
    }

    for (const post of pollResult.newMatches) {
      try {
        const bodyResult = await this.policyWatcher.fetchMOHWPostBody(post.listNo);
        if (!bodyResult.success) {
          summary.errors.push(`Post ${post.listNo}: body fetch failed — ${bodyResult.error}`);
          console.warn(`[PolicyWatcherDaemon] ⚠️ Could not fetch body for "${post.title}": ${bodyResult.error}`);
          continue;
        }

        const extractionResult = await this.llmExtractor.extractPolicyChange({
          title: post.title,
          url: post.url,
          bodyText: bodyResult.bodyText
        });

        if (!extractionResult.success) {
          summary.errors.push(`Post ${post.listNo}: extraction failed — ${extractionResult.error}`);
          console.warn(`[PolicyWatcherDaemon] ⚠️ LLM extraction failed for "${post.title}": ${extractionResult.error}`);
          continue;
        }

        const { extraction } = extractionResult;
        if (!extraction.hasNumericChange) {
          console.log(`[PolicyWatcherDaemon] "${post.title}" matched keywords but no concrete threshold change detected. No proposal created.`);
          continue;
        }

        const proposal = this.proposalStore.createProposal({ sourcePost: post, extraction });
        summary.proposalsCreated.push(proposal.id);
        console.log(`[PolicyWatcherDaemon] 📝 New policy proposal created (id: ${proposal.id}) from "${post.title}". Awaiting human review.`);
      } catch (err) {
        summary.errors.push(`Post ${post.listNo}: unexpected error — ${err.message}`);
        console.error(`[PolicyWatcherDaemon] ❌ Unexpected error processing "${post.title}": ${err.message}`);
      }
    }

    summary.finishedAt = new Date().toISOString();
    return summary;
  }

  /**
   * Starts the interval loop. Fires runOnce() immediately, then every
   * pollIntervalMs thereafter. Call stop() to clear the interval.
   */
  start() {
    if (this._timer) {
      console.warn('[PolicyWatcherDaemon] Already running.');
      return;
    }
    console.log(`[PolicyWatcherDaemon] Starting autonomous MOHW policy watch (interval: ${this.pollIntervalMs / 1000 / 60} min).`);
    this.runOnce().catch(err => console.error('[PolicyWatcherDaemon] ❌ Initial cycle threw unexpectedly:', err));
    this._timer = setInterval(() => {
      this.runOnce().catch(err => console.error('[PolicyWatcherDaemon] ❌ Cycle threw unexpectedly:', err));
    }, this.pollIntervalMs);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      console.log('[PolicyWatcherDaemon] Stopped.');
    }
  }
}

// CLI entrypoint
const isMainModule = process.argv[1] && process.argv[1].endsWith('policyWatcherDaemon.js');
if (isMainModule) {
  const daemon = new PolicyWatcherDaemon();
  const runOnceFlag = process.argv.includes('--once');

  if (runOnceFlag) {
    daemon.runOnce().then(summary => {
      console.log(JSON.stringify(summary, null, 2));
      process.exit(summary.errors.length > 0 && summary.proposalsCreated.length === 0 && !summary.pollSuccess ? 1 : 0);
    });
  } else {
    daemon.start();
    process.on('SIGINT', () => { daemon.stop(); process.exit(0); });
    process.on('SIGTERM', () => { daemon.stop(); process.exit(0); });
  }
}
