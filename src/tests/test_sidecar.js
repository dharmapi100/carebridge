// Path: src/tests/test_sidecar.js
import { SecureSidecar } from '../services/secureSidecar.js';
import assert from 'assert';
import fs from 'fs';

console.log('Running SecureSidecar unit tests...');

const testKeyFile = './test_secure.key';
if (fs.existsSync(testKeyFile)) fs.unlinkSync(testKeyFile);

const sidecar = new SecureSidecar(testKeyFile);

const payload = {
  workerId: 'test-worker-99',
  liability: 1500000,
  confidentialNote: 'Sensitive PIPA Protected Record'
};

const encrypted = sidecar.encryptPayload(payload);
assert.ok(encrypted.iv, 'Encrypted payload must contain IV');
assert.ok(encrypted.authTag, 'Encrypted payload must contain authTag');
assert.ok(encrypted.data, 'Encrypted payload must contain data');

const decrypted = sidecar.decryptPayload(encrypted);
assert.strictEqual(decrypted.workerId, payload.workerId);
assert.strictEqual(decrypted.liability, payload.liability);
assert.strictEqual(decrypted.confidentialNote, payload.confidentialNote);

// Clean up
if (fs.existsSync(testKeyFile)) fs.unlinkSync(testKeyFile);

console.log('✅ SecureSidecar tests passed successfully!');
