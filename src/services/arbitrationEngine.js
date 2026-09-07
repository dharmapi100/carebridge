// Path: src/services/arbitrationEngine.js
//
// Dispute-eligibility determination for worker claims against a facility.
//
// IMPORTANT SCOPE (read before modifying): This engine ONLY encodes the same
// statutory thresholds complianceEngine.js already encodes — whether a worker
// meets the legal bars for a severance claim (>=15 hrs/wk AND >=12 months) —
// and returns a mechanical ELIGIBILITY determination. It deliberately does NOT
// output recommended settlement amounts, defense strategies, or any legal
// opinion. That is the job of qualified counsel, and CareBridge must never be
// seen as dispensing legal advice (see KSGC_MASTER_CONTEXT / skill: "the code
// is a legal guardrail" is a pitch line, not a legal fact). If you feel tempted
// to add a "recommended settlement" or "likelihood of liability" field here,
// don't — redirect the caller to counsel instead.
export class ArbitrationEligibilityEngine {
  constructor() {
    // Matches complianceEngine.js / laborPolicy.json statutory thresholds.
    this.SEVERANCE_MIN_WEEKLY_HOURS = 15;
    this.SEVERANCE_MIN_MONTHS = 12;
  }

  /**
   * Determines whether a worker's severance-arrears claim meets the statutory
   * eligibility bars (Labor Standards Act severance threshold). Purely
   * mechanical: returns eligibility + the specific reason, never a settlement
   * or legal opinion.
   */
  determineSeveranceClaimEligibility({ employmentDurationMonths, weeklyHours }) {
    const meetsHours = weeklyHours >= this.SEVERANCE_MIN_WEEKLY_HOURS;
    const meetsTenure = employmentDurationMonths >= this.SEVERANCE_MIN_MONTHS;

    return {
      eligible: meetsHours && meetsTenure,
      reason: meetsHours && meetsTenure
        ? 'Meets both statutory bars (>=15 hrs/wk and >=12 months)'
        : [
            meetsHours ? null : 'under 15 hrs/wk',
            meetsTenure ? null : 'under 12 months'
          ].filter(Boolean).join('; ') + ' — statutory severance bar not met',
      thresholds: {
        minWeeklyHours: this.SEVERANCE_MIN_WEEKLY_HOURS,
        minMonths: this.SEVERANCE_MIN_MONTHS
      }
    };
  }
}
