// Path: src/tests/test_remittance_escrow.js
import { RemittanceEscrowEngine } from '../services/remittanceEscrow.js';
import assert from 'assert';

console.log('Running Remittance Escrow tests...');

const engine = new RemittanceEscrowEngine();

// ── 1. 2026 insurance rates are applied (matches complianceEngine.js) ────────
{
  const result = engine.calculateEscrowAndRemittance({
    workerId: 'w1', grossMonthlyWage: 2500000, verifiedHoursWorked: 160
  });
  // National Pension 4.75% of 2.5M = 118,750 (2026) — must NOT be 112,500 (2025)
  assert.strictEqual(result.fourMajorInsurances.nationalPension, 118750, 'National Pension must be 4.75% (2026), not stale 4.5%');
  // Health Insurance 3.595% of 2.5M = 89,875
  assert.strictEqual(result.fourMajorInsurances.healthInsurance, 89875, 'Health Insurance must be 3.595% (2026), not stale 3.545%');
  // Employment Insurance 0.9% of 2.5M = 22,500
  assert.strictEqual(result.fourMajorInsurances.employmentInsurance, 22500, 'Employment Insurance must be 0.9% (2026), not stale 1.15%');
  console.log('✅ Test 1 passed: remittance engine uses corrected 2026 insurance rates.');
}

// ── 2. Net-pay and escrow math is internally consistent ─────────────────────
{
  const result = engine.calculateEscrowAndRemittance({
    workerId: 'w2', grossMonthlyWage: 2500000, verifiedHoursWorked: 160,
    targetCurrency: 'USD', exchangeRateKRWtoUSD: 1350
  });
  const gross = 2500000;
  const incomeTax = gross * 0.033;
  const localTax = incomeTax * 0.30;
  const totalDeductions = Math.round(incomeTax + localTax + 118750 + 89875 + 22500);
  assert.strictEqual(result.totalDeductions, totalDeductions, 'total deductions must be the sum of components');
  assert.strictEqual(result.netPayableKRW, gross - totalDeductions, 'net KRW must be gross minus deductions');
  assert.ok(Math.abs(result.remittanceEscrow.netPayableUSD - (gross - totalDeductions) / 1350) < 0.01, 'net USD must equal KRW/rate');
  console.log('✅ Test 2 passed: net-pay/escrow math consistent (tax + insurance + conversion).');
}

// ── 3. Foreign Exchange Act compliance flag triggers correctly ──────────────
{
  const normal = engine.calculateEscrowAndRemittance({ workerId: 'w3', grossMonthlyWage: 2500000, verifiedHoursWorked: 160 });
  assert.strictEqual(normal.remittanceEscrow.foreignExchangeActCompliant, true, 'normal wage should be compliant');

  const high = engine.calculateEscrowAndRemittance({ workerId: 'w4', grossMonthlyWage: 80000000, verifiedHoursWorked: 160 });
  assert.strictEqual(high.remittanceEscrow.foreignExchangeActCompliant, false, 'wage producing >$50k net remittance should flag non-compliant');
  console.log('✅ Test 3 passed: Foreign Exchange Act compliance flag works (normal vs high-wage).');
}

console.log('🎉 All Remittance Escrow tests passed.');
