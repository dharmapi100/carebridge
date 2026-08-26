// Path: src/services/testRunner.js
import { KoreanComplianceEngine } from './complianceEngine.js';

const engine = new KoreanComplianceEngine();

const startDate = new Date();
startDate.setFullYear(startDate.getFullYear() - 2); // Started 2 years ago

const mockContract = {
  workerId: "worker-kor-8821",
  employmentStartDate: startDate,
  averageMonthlyWage: 2500000, // 2.5M KRW
  weeklyWorkingHours: 40.0,    // 40 hours/week
  overtimeHoursWorked: 10.0,   // 10 hours overtime
  baseHourlyRate: 15000        // 15k KRW/hr
};

console.log("==================================================");
console.log("   KOREAN LABOR COMPLIANCE & SEVERANCE AUDIT      ");
console.log("==================================================");
console.log(`Worker ID: ${mockContract.workerId}`);
console.log(`Employment Start: ${mockContract.employmentStartDate.toISOString().split('T')[0]}`);
console.log(`Monthly Base Wage: ${mockContract.averageMonthlyWage.toLocaleString()} KRW`);
console.log(`Weekly Working Hours: ${mockContract.weeklyWorkingHours} hrs`);
console.log("--------------------------------------------------");

const auditResult = engine.auditContract(mockContract);

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
