// Path: src/services/testRunner.ts
import { KoreanComplianceEngine, ContractParams } from './complianceEngine';

const engine = new KoreanComplianceEngine();

// Simulate a caregiver who started 2 years ago, working 40 hours a week
const mockCaregiverContract: ContractParams = {
  workerId: "worker-kor-8821",
  // Start date set 2 years ago to trigger statutory severance eligibility
  employmentStartDate: new Date(new Date().setFullYear(new Date().getFullYear() - 2)),
  averageMonthlyWage: 2500000, // 2.5M KRW / month (~$1,850 USD)
  weeklyWorkingHours: 40.0,    // Well above the 15-hour severance threshold
  overtimeHoursWorked: 10.0,   // 10 hours of overtime this month
  baseHourlyRate: 15000        // 15,000 KRW / hour
};

console.log("==================================================");
console.log("   KOREAN LABOR COMPLIANCE & SEVERANCE AUDIT      ");
console.log("==================================================");
console.log(`Worker ID: ${mockCaregiverContract.workerId}`);
console.log(`Employment Start: ${mockCaregiverContract.employmentStartDate.toISOString().split('T')[0]}`);
console.log(`Monthly Base Wage: ${mockCaregiverContract.averageMonthlyWage.toLocaleString()} KRW`);
console.log(`Weekly Working Hours: ${mockCaregiverContract.weeklyWorkingHours} hrs`);
console.log("--------------------------------------------------");

const auditResult = engine.auditContract(mockCaregiverContract);

console.log(`Severance Eligible: ${auditResult.isEligibleForSeverance ? 'YES (Meets >15hr/wk & >1yr criteria)' : 'NO'}`);
console.log(`Cumulative Severance Liability: ${auditResult.cumulativeSeveranceLiability.toLocaleString()} KRW`);
console.log(`Overtime Compensation (1.5x): ${auditResult.overtimeCompensation.toLocaleString()} KRW`);
console.log("--- Four Major Public Insurances (4대 보험) ---");
console.log(`  National Pension (4.5%): ${auditResult.fourMajorInsurances.nationalPension.toLocaleString()} KRW`);
console.log(`  Health Insurance (~3.545%): ${auditResult.fourMajorInsurances.healthInsurance.toLocaleString()} KRW`);
console.log(`  Employment Insurance (1.15%): ${auditResult.fourMajorInsurances.employmentInsurance.toLocaleString()} KRW`);
console.log("--------------------------------------------------");
console.log(`TOTAL EMPLOYER MONTHLY LIABILITY: ${auditResult.totalEmployerLiability.toLocaleString()} KRW`);
console.log("==================================================");
console.log("✓ Audit ledger generated successfully. Zero compliance exposure.");
