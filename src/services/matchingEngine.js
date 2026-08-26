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
  matchCaregiver(request, availableCaregivers) {
    const scoredMatches = availableCaregivers.map(caregiver => {
      let score = 100;
      let disqualificationReason = null;

      // 1. Verify certification status (Must be a certified 요양보호사)
      if (!caregiver.isCertified) {
        score = 0;
        disqualificationReason = 'Unverified or missing Certified Care Worker (요양보호사) license.';
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
      score -= (distanceKm * 3); // Deduct 3 points per km away

      // 4. Experience & Rating bonus
      score += (caregiver.rating || 4.5) * 5;
      score += Math.min((caregiver.yearsOfExperience || 1) * 2, 10);

      return {
        caregiverId: caregiver.id,
        name: caregiver.name,
        finalMatchScore: Math.max(Number(score.toFixed(1)), 0),
        isEligible: score > 50 && caregiver.isCertified,
        disqualificationReason,
        estimatedEmployerLiability: audit.totalEmployerLiability,
        severanceEligible: audit.isEligibleForSeverance,
        distanceKm
      };
    });

    // Sort by highest match score
    scoredMatches.sort((a, b) => b.finalMatchScore - a.finalMatchScore);

    return {
      requestId: request.requestId || 'req-unknown',
      totalCandidatesEvaluated: availableCaregivers.length,
      bestMatch: scoredMatches.find(m => m.isEligible) || null,
      allRankedCandidates: scoredMatches
    };
  }
}
