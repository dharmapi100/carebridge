// Path: src/tests/test_visa.js
import { VisaValidator } from '../services/visaValidator.js';
import assert from 'assert';

console.log('Running CareBridge Visa Validator unit tests...');

const validator = new VisaValidator();

// Phrases that would imply a real government/authority check occurred.
// This is a LOCAL allowlist check only -- no Hi-Korea, Ministry of Justice,
// or any government-system integration exists. Checked case-insensitively
// against every response, not just spot-checked once, so a future wording
// change can't silently reintroduce the same misleading claim under
// different phrasing.
const BANNED_AUTHORITY_PHRASES = ['hi-korea', 'ministry', 'officially', 'government', 'verified'];

function assertNoAuthorityClaim(result, label) {
  const text = JSON.stringify(result).toLowerCase();
  for (const phrase of BANNED_AUTHORITY_PHRASES) {
    assert.ok(!text.includes(phrase), `${label}: response must not contain authority-implying phrase "${phrase}" -- got: ${text}`);
  }
}

const validApplicant = {
  nationality: 'China',
  visaType: 'F-4',
  alienRegistrationNumber: '850101-2******'
};

const invalidApplicant = {
  nationality: 'Vietnam',
  visaType: 'D-2', // Student visa - not allowed for full-time care work without special permit
  alienRegistrationNumber: '020101-3******'
};

const validResult = validator.validateVisaStatus(validApplicant);
assert.strictEqual(validResult.eligible, true, 'F-4 visa should be eligible for care work');
assertNoAuthorityClaim(validResult, 'F-4 valid result');
console.log('✅ F-4 visa eligible, message contains no authority-implying language.');

const invalidResult = validator.validateVisaStatus(invalidApplicant);
assert.strictEqual(invalidResult.eligible, false, 'D-2 visa should be ineligible for care work');
assertNoAuthorityClaim(invalidResult, 'D-2 invalid result');
console.log('✅ D-2 visa ineligible, message contains no authority-implying language.');

// ── E-7-2 confirmed addition: foreign students certified as 요양보호사 ─────
const e72Applicant = {
  nationality: 'Vietnam',
  visaType: 'E-7-2',
  alienRegistrationNumber: '990101-4******'
};
const e72Result = validator.validateVisaStatus(e72Applicant);
assert.strictEqual(e72Result.eligible, true, 'E-7-2 visa should be eligible for care work (2026 confirmed expansion)');
assertNoAuthorityClaim(e72Result, 'E-7-2 result');
console.log('✅ E-7-2 visa correctly added and eligible, no authority-implying language.');

// ── E-9-Care deliberately NOT included -- unconfirmed against a primary
// government source. This must keep failing until/unless a primary source
// is found and the allowlist is deliberately updated.
const e9CareApplicant = {
  nationality: 'Philippines',
  visaType: 'E-9-CARE',
  alienRegistrationNumber: '010101-5******'
};
const e9CareResult = validator.validateVisaStatus(e9CareApplicant);
assert.strictEqual(e9CareResult.eligible, false, 'E-9-Care must stay excluded until confirmed against a primary government source');
console.log('✅ E-9-Care correctly excluded (unconfirmed category).');

// ── Case-insensitivity + case normalization on the visa type itself ────────
const lowercaseApplicant = { nationality: 'China', visaType: 'f-4', alienRegistrationNumber: '850101-2******' };
const lowercaseResult = validator.validateVisaStatus(lowercaseApplicant);
assert.strictEqual(lowercaseResult.eligible, true, 'visa type matching should be case-insensitive');
console.log('✅ Visa type matching is case-insensitive.');

console.log('✅ CareBridge Visa Validator tests passed successfully!');
