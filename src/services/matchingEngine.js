// Path: src/services/matchingEngine.js
import { KoreanComplianceEngine } from './complianceEngine.js';

export class CareBridgeMatchingEngine {
  constructor() {
    this.complianceEngine = new KoreanComplianceEngine();
  }

  /**
   * Evaluates and ranks available certified caregivers for a specific elder care request
   * based on compliance liability, proximity, and certification status.
   */
  /**
   * Evaluates and ranks available caregivers for a specific elder care request
   * based on REAL compliance verification (via CaregiverLedger), liability, and
   * proximity/experience scoring. Requires a ledger instance so certification is
   * actually checked against the government registry, not just asserted by the
   * caller via a raw isCertified flag (that was the pre-ledger vulnerability).
   */
  async matchCaregiver(request, availableCaregivers, ledger) {
    if (!ledger) {
      throw new Error('matchCaregiver requires a CaregiverLedger instance to verify candidates.');
    }

    const scoredMatches = await Promise.all(availableCaregivers.map(async caregiver => {
      let score = 100;
      let disqualificationReason = null;

      // 1. Verify credential + visa via Ledger (real government-registry-backed check)
      const compliance = ledger.evaluateCaregiverCompliance(caregiver.id);
      if (!compliance.compliant) {
        score = 0;
        disqualificationReason = compliance.reason || 'Regulatory compliance check failed.';
      }

      // 2. Run compliance audit on proposed working hours / wages
      const proposedHours = request.requiredWeeklyHours || 40.0;
      const proposedWage = caregiver.expectedMonthlyWage || 3000000;

      const audit = this.complianceEngine.auditContract({
        workerId: caregiver.id,
        employmentStartDate: new Date(caregiver.employmentStartDate || '2023-01-01'),
        averageMonthlyWage: proposedWage,
        weeklyWorkingHours: proposedHours,
        overtimeHoursWorked: request.overtimeHours || 0,
        baseHourlyRate: caregiver.baseHourlyRate || 18000
      });

      // Penalize if severance liability risk is high and facility requested low-exposure
      if (audit.isEligibleForSeverance && request.strictNoSeverance) {
        score -= 40;
      }

      // 3. Proximity scoring (simulated distance in km)
      const distanceKm = caregiver.distanceKm || 5.0;
      score -= (distanceKm * 3);

      // 4. Experience & Rating bonus
      score += (caregiver.rating || 4.5) * 5;
      score += Math.min((caregiver.yearsOfExperience || 1) * 2, 10);

      return {
        caregiverId: caregiver.id,
        name: caregiver.name,
        finalMatchScore: Math.max(Number(score.toFixed(1)), 0),
        isEligible: score > 50 && compliance.compliant,
        disqualificationReason,
        estimatedEmployerLiability: audit.totalEmployerLiability,
        severanceEligible: audit.isEligibleForSeverance,
        distanceKm
      };
    }));

    scoredMatches.sort((a, b) => b.finalMatchScore - a.finalMatchScore);

    return {
      requestId: request.requestId || 'req-unknown',
      totalCandidatesEvaluated: availableCaregivers.length,
      bestMatch: scoredMatches.find(m => m.isEligible) || null,
      allRankedCandidates: scoredMatches
    };
  }
}
