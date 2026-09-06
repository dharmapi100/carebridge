// Path: src/services/complianceEngine.js

export class KoreanComplianceEngine {
  constructor() {
    this.SEVERANCE_THRESHOLD_HOURS = 15.0;
    this.OVERTIME_MULTIPLIER = 1.5;
    // 2026 4대보험 employee-side contribution rates (verified against
    // multiple Korean payroll/labor sources, Sept 2026 -- these are set
    // annually and MUST be re-verified each year, not treated as fixed
    // constants forever):
    //   - National Pension (국민연금): total rate 9.5% (up from 9.0% in
    //     2025), split 50/50 employer/employee -> employee share 4.75%.
    //   - Health Insurance (건강보험): total rate 7.19% (up from 7.09%),
    //     split 50/50 -> employee share 3.595%.
    //   - Employment Insurance (고용보험, 실업급여 portion only): 1.8% total,
    //     split 50/50 -> employee share 0.9%. The separate 고용안정·직업능력개발
    //     사업 levy (0.25%-0.85% depending on company size) is EMPLOYER-ONLY
    //     and is intentionally NOT included here -- this constant is the
    //     employee's own withheld amount, not total employer cost.
    // Previous values (0.045/0.03545/0.0115) were stale 2025-or-earlier
    // figures and did not match any confirmed employee-side rate.
    this.NATIONAL_PENSION_RATE = 0.0475;
    this.HEALTH_INSURANCE_RATE = 0.03595;
    this.EMPLOYMENT_INSURANCE_RATE = 0.009;
  }

  calculateSeverance(startDate, monthlyWage, weeklyHours) {
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
      nationalPension: Number((monthlyWage * this.NATIONAL_PENSION_RATE).toFixed(2)),
      healthInsurance: Number((monthlyWage * this.HEALTH_INSURANCE_RATE).toFixed(2)),
      employmentInsurance: Number((monthlyWage * this.EMPLOYMENT_INSURANCE_RATE).toFixed(2))
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
