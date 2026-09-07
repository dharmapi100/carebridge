// Path: src/tests/test_arbitration_engine.js
import { ArbitrationEligibilityEngine } from '../services/arbitrationEngine.js';
import assert from 'assert';

console.log('Running Arbitration Eligibility Engine tests...');

const engine = new ArbitrationEligibilityEngine();

// ── 1. Statutory severance bars (>=15 hrs/wk AND >=12 months) ───────────────
{
  // Meets both bars → eligible
  const eligible = engine.determineSeveranceClaimEligibility({ employmentDurationMonths: 24, weeklyHours: 40 });
  assert.strictEqual(eligible.eligible, true);

  // Under hours but long tenure → not eligible
  const lowHours = engine.determineSeveranceClaimEligibility({ employmentDurationMonths: 24, weeklyHours: 10 });
  assert.strictEqual(lowHours.eligible, false);
  assert.ok(lowHours.reason.includes('under 15 hrs/wk'), 'reason should name the unmet bar');

  // Meets hours but short tenure → not eligible
  const shortTenure = engine.determineSeveranceClaimEligibility({ employmentDurationMonths: 6, weeklyHours: 40 });
  assert.strictEqual(shortTenure.eligible, false);
  assert.ok(shortTenure.reason.includes('under 12 months'), 'reason should name the unmet bar');

  // Boundary: exactly 15 hrs and exactly 12 months → eligible
  const boundary = engine.determineSeveranceClaimEligibility({ employmentDurationMonths: 12, weeklyHours: 15 });
  assert.strictEqual(boundary.eligible, true, 'boundary values (>=) must count as eligible');
  console.log('✅ Test 1 passed: severance eligibility thresholds (and boundary) correct.');
}

// ── 2. Deliberately does NOT dispense legal advice ──────────────────────────
{
  const result = engine.determineSeveranceClaimEligibility({ employmentDurationMonths: 24, weeklyHours: 40 });
  // The output must be a mechanical determination only — no settlement advice,
  // no "likelihood of liability", no defense strategy, no case citations.
  const keys = Object.keys(result);
  assert.ok(!keys.includes('recommendedSettlementKRW'), 'must not recommend a settlement amount');
  assert.ok(!keys.includes('likelihoodOfFacilityLiability'), 'must not output a legal liability opinion');
  assert.ok(!keys.includes('defenseStrategy'), 'must not output a defense strategy');
  assert.ok(!keys.includes('legalPrecedentsCited'), 'must not cite legal precedent as guidance');
  console.log('✅ Test 2 passed: engine outputs statutory determination only, never legal advice.');
}

// ── 3. Thresholds are exposed and match complianceEngine.js ─────────────────
{
  const result = engine.determineSeveranceClaimEligibility({ employmentDurationMonths: 12, weeklyHours: 15 });
  assert.strictEqual(result.thresholds.minWeeklyHours, 15);
  assert.strictEqual(result.thresholds.minMonths, 12);
  console.log('✅ Test 3 passed: thresholds exposed and match the 15hrs/12mo statutory bars.');
}

console.log('🎉 All Arbitration Eligibility Engine tests passed.');
