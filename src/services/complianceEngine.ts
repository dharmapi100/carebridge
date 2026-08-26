// Path: src/services/complianceEngine.ts

export interface ContractParams {
  workerId: string;
  employmentStartDate: Date;
  averageMonthlyWage: number;
  weeklyWorkingHours: number;
  overtimeHoursWorked: number;
  baseHourlyRate: number;
}

export interface ComplianceLedgerResult {
  workerId: string;
  isEligibleForSeverance: boolean;
  cumulativeSeveranceLiability: number;
  overtimeCompensation: number;
  fourMajorInsurances: {
    nationalPension: number; // ~4.5% employer split baseline
    healthInsurance: number;  // ~3.545% employer split baseline
    employmentInsurance: number; // ~1.15% employer split baseline
  };
  totalEmployerLiability: number;
}

export class KoreanComplianceEngine {
  private readonly SEVERANCE_THRESHOLD_HOURS = 15.0;
  private readonly OVERTIME_MULTIPLIER = 1.5;

  /**
   * Calculates South Korean statutory severance (퇴직금)
   * Mandated under Article 34 of the Employee Retirement Benefit Security Act.
   */
  public calculateSeverance(startDate: Date, monthlyWage: number, weeklyHours: number): { eligible: boolean; liability: number } {
    if (weeklyHours < this.SEVERANCE_THRESHOLD_HOURS) {
      return { eligible: false, liability: 0 };
    }

    const now = new Date();
    const yearsWorked = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (yearsWorked < 1.0) {
      // Under 1 year, statutory severance isn't legally unlocked yet, but tracking active liability is required
      return { eligible: false, liability: 0 };
    }

    // 30 days of average wage per year of continuous service (1 month salary per year worked)
    const liability = monthlyWage * yearsWorked;
    return { eligible: true, liability: Number(liability.toFixed(2)) };
  }

  /**
   * Calculates mandatory overtime compensation (1.5x hourly rate for hours exceeding standard limits)
   */
  public calculateOvertime(baseHourlyRate: number, overtimeHours: number): number {
    return baseHourlyRate * overtimeHours * this.OVERTIME_MULTIPLIER;
  }

  /**
   * Calculates the employer's share of Korea's Four Major Public Insurances (4대 보험)
   */
  public calculatePublicInsurances(monthlyWage: number) {
    return {
      nationalPension: Number((monthlyWage * 0.045).toFixed(2)),       // 4.5%
      healthInsurance: Number((monthlyWage * 0.03545).toFixed(2)),    // ~3.545%
      employmentInsurance: Number((monthlyWage * 0.0115).toFixed(2))  // 1.15%
    };
  }

  /**
   * Runs the complete monthly compliance audit for a worker contract
   */
  public auditContract(params: ContractParams): ComplianceLedgerResult {
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
      (severance.eligible ? (params.averageMonthlyWage / 12) : 0); // Monthly pro-rata severance accrual

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
