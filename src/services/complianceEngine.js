// Path: src/services/complianceEngine.js

export class KoreanComplianceEngine {
  constructor() {
    this.SEVERANCE_THRESHOLD_HOURS = 15.0;
    this.OVERTIME_MULTIPLIER = 1.5;
  }

  calculateSeverance(startDate, monthlyWage, weeklyHours) {
    if (weeklyHours < this.SEVERANCE_THRESHOLD_HOURLS) { // wait, fix typo below
    }
    if (weeklyHours < this.SEVERANCE_THRESHOLD_HOURS) {
      return { eligible: false, liability: 0 };
    }

    const now = new Date();
    const yearsWorked = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (yearsWorked < 1.0) {
      return { eligible: false, liability: 0 };
    }

    const liability = monthlyWage * yearsWorked;
    return { eligible: true, liability: Number(liability.toFixed(2)) };
  }

  calculateOvertime(baseHourlyRate, overtimeHours) {
    return baseHourlyRate * overtimeHours * this.OVERTIME_MULTIPLIER;
  }

  calculatePublicInsurances(monthlyWage) {
    return {
      nationalPension: Number((monthlyWage * 0.045).toFixed(2)),
      healthInsurance: Number((monthlyWage * 0.03545).toFixed(2)),
      employmentInsurance: Number((monthlyWage * 0.0115).toFixed(2))
    };
  }

  auditContract(params) {
    const severance = this.calculateSeverance(
      params.employmentStartDate,
      params.averageMonthlyWage,
      params.weeklyWorkingHours
    );

    const overtimeComp = this.calculateOvertime(params.baseHourlyRate, params.overtimeHoursWorked);
    const insurances = this.calculatePublicInsurances(params.averageMonthlyWage);

    const totalEmployerLiability = 
      params.averageMonthlyWage + 
      overtimeComp + 
      insurances.nationalPension + 
      insurances.healthInsurance + 
      insurances.employmentInsurance + 
      (severance.eligible ? (params.averageMonthlyWage / 12) : 0);

    return {
      workerId: params.workerId,
      isEligibleForSeverance: severance.eligible,
      cumulativeSeveranceLiability: severance.liability,
      overtimeCompensation: overtimeComp,
      fourMajorInsurances: insurances,
      totalEmployerLiability: Number(totalEmployerLiability.toFixed(2))
    };
  }
}
