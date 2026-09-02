export class PredictiveRiskEngine {
  evaluateWorkerRisk(workerRecord) {
    const { workerId, visaExpiryDate, employmentStartDate, weeklyWorkingHours } = workerRecord;
    const now = new Date();
    const visaExpiry = new Date(visaExpiryDate);
    const start = new Date(employmentStartDate);
    
    const daysToVisaExpiry = Math.ceil((visaExpiry - now) / (1000 * 60 * 60 * 24));
    const monthsEmployed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    
    let riskLevel = 'LOW';
    let flags = [];

    if (daysToVisaExpiry <= 0) {
      riskLevel = 'CRITICAL';
      flags.push('VISA_EXPIRED_IMMEDIATE_DEPORTATION_RISK');
    } else if (daysToVisaExpiry <= 60) {
      riskLevel = 'HIGH';
      flags.push(`VISA_EXPIRING_SOON_DAYS_${daysToVisaExpiry}`);
    }

    if (weeklyWorkingHours >= 15) {
      if (monthsEmployed >= 12) {
        flags.push('SEVERANCE_OBLIGATION_ACTIVE_EXCEEDS_1_YEAR');
      } else if (monthsEmployed >= 11) {
        riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM';
        flags.push('APPROACHING_STATUTORY_SEVERANCE_THRESHOLD_1_YEAR');
      }
    }

    let recommendedAction = 'NO_ACTION_REQUIRED';
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      recommendedAction = 'INITIATE_HI_KOREA_VISA_EXTENSION_IMMEDIATELY';
    } else if (flags.includes('APPROACHING_STATUTORY_SEVERANCE_THRESHOLD_1_YEAR')) {
      recommendedAction = 'SCHEDULE_SEVERANCE_RESERVE_ALLOCATION';
    }

    return {
      workerId,
      riskLevel,
      daysToVisaExpiry,
      monthsEmployed,
      complianceFlags: flags,
      recommendedAction,
      evaluatedAt: new Date().toISOString()
    };
  }
}
