// Path: src/tests/test_visa.js
import { VisaValidator } from '../services/visaValidator.js';
import assert from 'assert';

console.log('Running CareBridge Visa Validator unit tests...');

const validator = new VisaValidator();

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

const invalidResult = validator.validateVisaStatus(invalidApplicant);
assert.strictEqual(invalidResult.eligible, false, 'D-2 visa should be ineligible for care work');

console.log('✅ CareBridge Visa Validator tests passed successfully!');
