// Path: src/services/predictiveRiskEngine.js
//
// Predictive Risk Engine: flags visa/severance exposure BEFORE it becomes a
// legal violation. Reuses KoreanComplianceEngine for severance math (single
// source of truth) instead of re-deriving it -- this engine only adds the
// time-to-deadline layer on top of already-tested compliance logic.
import { KoreanComplianceEngine } from './complianceEngine.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const VISA_WARNING_DAYS = 60;
const SEVERANCE_WARNING_MONTHS = 11; // approaching the 1-year statutory threshold

export class PredictiveRiskEngine {
  constructor(complianceEngine = new KoreanComplianceEngine()) {
    this.complianceEngine = complianceEngine;
  }

  /**
   * Evaluates a single caregiver record for visa-expiry and severance-
   * threshold risk. Requires workerId, employmentStartDate, weeklyHours,
   * monthlyWage; visaExpiryDate is optional (skips visa risk if absent).
   */
  evaluateWorkerRisk(record) {
    const { workerId, employmentStartDate, weeklyHours, monthlyWage, visaExpiryDate } = record;
    if (!workerId || !employmentStartDate || weeklyHours === undefined || monthlyWage === undefined) {
      throw new Error('evaluateWorkerRisk requires workerId, employmentStartDate, weeklyHours, monthlyWage.');
    }

    const start = new Date(employmentStartDate);
    const now = new Date();
    const monthsEmployed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

    const severance = this.complianceEngine.calculateSeverance(start, monthlyWage, weeklyHours);
    const flags = [];
    let riskLevel = 'LOW';

    if (severance.eligible) {
      flags.push('SEVERANCE_OBLIGATION_ACTIVE');
    } else if (weeklyHours >= this.complianceEngine.SEVERANCE_THRESHOLD_HOURS && monthsEmployed >= SEVERANCE_WARNING_MONTHS) {
      riskLevel = 'MEDIUM';
      flags.push('APPROACHING_SEVERANCE_THRESHOLD_1_YEAR');
    }

    let daysToVisaExpiry = null;
    if (visaExpiryDate) {
      daysToVisaExpiry = Math.ceil((new Date(visaExpiryDate) - now) / MS_PER_DAY);
      if (daysToVisaExpiry <= 0) {
        riskLevel = 'CRITICAL';
        flags.push('VISA_EXPIRED');
      } else if (daysToVisaExpiry <= VISA_WARNING_DAYS) {
        riskLevel = 'HIGH';
        flags.push(`VISA_EXPIRING_IN_${daysToVisaExpiry}_DAYS`);
      }
    }

    return {
      workerId,
      riskLevel,
      daysToVisaExpiry,
      monthsEmployed,
      cumulativeSeveranceLiability: severance.liability,
      flags,
      evaluatedAt: now.toISOString()
    };
  }

  /**
   * Scans every caregiver in the ledger and returns a risk report sorted
   * highest-risk first. Skips malformed records instead of aborting the
   * whole scan, and reports how many were skipped.
   */
  scanLedger(caregiverLedger) {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const results = [];
    let skipped = 0;

    for (const record of caregiverLedger.getAllCaregivers()) {
      try {
        results.push(this.evaluateWorkerRisk({
          workerId: record.workerId,
          employmentStartDate: record.employmentStartDate,
          weeklyHours: record.weeklyHours,
          monthlyWage: record.monthlyWage,
          visaExpiryDate: record.visaExpiryDate
        }));
      } catch {
        skipped++;
      }
    }

    results.sort((a, b) => severityOrder[a.riskLevel] - severityOrder[b.riskLevel]);
    return { scannedAt: new Date().toISOString(), totalEvaluated: results.length, skipped, results };
  }
}
