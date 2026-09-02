export class RemittanceEscrowEngine {
  constructor() {
    this.INCOME_TAX_RATE = 0.033;
    this.LOCAL_TAX_RATE = 0.30;
    this.MAX_REMITTANCE_LIMIT_USD = 50000;
  }

  calculateEscrowAndRemittance({ workerId, grossMonthlyWage, verifiedHoursWorked, targetCurrency = 'USD', exchangeRateKRWtoUSD = 1350 }) {
    const incomeTax = grossMonthlyWage * this.INCOME_TAX_RATE;
    const localIncomeTax = incomeTax * this.LOCAL_TAX_RATE;
    const nationalPension = grossMonthlyWage * 0.045;
    const healthInsurance = grossMonthlyWage * 0.03545;
    const employmentInsurance = grossMonthlyWage * 0.0115;
    
    const totalDeductions = incomeTax + localIncomeTax + nationalPension + healthInsurance + employmentInsurance;
    const netPayableKRW = grossMonthlyWage - totalDeductions;
    const netPayableUSD = netPayableKRW / exchangeRateKRWtoUSD;
    const compliesWithForeignExchangeAct = netPayableUSD <= this.MAX_REMITTANCE_LIMIT_USD;

    return {
      workerId,
      grossMonthlyWage,
      verifiedHoursWorked,
      taxWithholding: {
        incomeTax: Math.round(incomeTax),
        localIncomeTax: Math.round(localIncomeTax)
      },
      fourMajorInsurances: {
        nationalPension: Math.round(nationalPension),
        healthInsurance: Math.round(healthInsurance),
        employmentInsurance: Math.round(employmentInsurance)
      },
      totalDeductions: Math.round(totalDeductions),
      netPayableKRW: Math.round(netPayableKRW),
      remittanceEscrow: {
        targetCurrency,
        netPayableUSD: Number(netPayableUSD.toFixed(2)),
        exchangeRateKRWtoUSD,
        foreignExchangeActCompliant: compliesWithForeignExchangeAct,
        escrowReleaseStatus: 'READY_FOR_VERIFIED_DISBURSEMENT'
      }
    };
  }
}
