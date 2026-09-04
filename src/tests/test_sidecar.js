// Path: src/tests/test_sidecar.js
import { SecureSidecar } from '../services/secureSidecar.js';
import assert from 'assert';
import fs from 'fs';

console.log('Running SecureSidecar unit tests...');

const testKeychainFile = './test_secure.keychain.json';
const testLegacyKeyFile = './test_secure_legacy.key';
for (const f of [testKeychainFile, testLegacyKeyFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

// ── 1. Basic encrypt/decrypt round-trip ─────────────────────────────────────
const sidecar = new SecureSidecar(testKeychainFile, testLegacyKeyFile);

const payload = {
  workerId: 'test-worker-99',
  liability: 1500000,
  confidentialNote: 'Sensitive PIPA Protected Record'
};

const encrypted = sidecar.encryptPayload(payload);
assert.ok(encrypted.keyId, 'Encrypted payload must be tagged with the keyId used to encrypt it');
assert.ok(encrypted.iv, 'Encrypted payload must contain IV');
assert.ok(encrypted.authTag, 'Encrypted payload must contain authTag');
assert.ok(encrypted.data, 'Encrypted payload must contain data');

const decrypted = sidecar.decryptPayload(encrypted);
assert.strictEqual(decrypted.workerId, payload.workerId);
assert.strictEqual(decrypted.liability, payload.liability);
assert.strictEqual(decrypted.confidentialNote, payload.confidentialNote);
console.log('✅ Test 1 passed: basic encrypt/decrypt round-trip works, payload tagged with keyId.');

// ── 2. THE ACTUAL BUG WE FOUND: key rotation must NOT orphan old records ───
// This is the regression test for the exact failure mode discovered in
// production (28/29 audit entries permanently undecryptable after a key
// rotation). Before the fix, rotating the key made ALL prior ciphertext
// unreadable. After the fix, old records must still decrypt correctly.
const encryptedBeforeRotation = sidecar.encryptPayload({ note: 'encrypted before rotation' });
const rotationResult = sidecar.rotateKey();
assert.ok(rotationResult.newActiveKeyId, 'rotateKey must return the new active keyId');
assert.strictEqual(rotationResult.totalKeysRetained, 2, 'rotating must ADD a key, not replace the only one');

// The old record must STILL be decryptable after rotation -- this is the
// entire point of the fix.
const stillDecryptable = sidecar.decryptPayload(encryptedBeforeRotation);
assert.strictEqual(stillDecryptable.note, 'encrypted before rotation', 'records encrypted before a key rotation must remain decryptable after rotation');

// New records must use the NEW active key, not the retired one.
const encryptedAfterRotation = sidecar.encryptPayload({ note: 'encrypted after rotation' });
assert.notStrictEqual(encryptedAfterRotation.keyId, encryptedBeforeRotation.keyId, 'post-rotation encryption must use the new active key');
assert.strictEqual(sidecar.decryptPayload(encryptedAfterRotation).note, 'encrypted after rotation');
console.log('✅ Test 2 passed: key rotation no longer orphans previously-encrypted records (regression test for the real bug found).');

// ── 3. Multiple rotations: full history remains decryptable ────────────────
const encryptedRecords = [];
for (let i = 0; i < 5; i++) {
  encryptedRecords.push(sidecar.encryptPayload({ sequence: i }));
  if (i < 4) sidecar.rotateKey();
}
assert.strictEqual(Object.keys(sidecar.keychain.keys).length, 6, '1 initial key + 1 rotation from Test 2 + 4 rotations in this loop = 6 total');
for (let i = 0; i < 5; i++) {
  const decoded = sidecar.decryptPayload(encryptedRecords[i]);
  assert.strictEqual(decoded.sequence, i, `record ${i} must decrypt correctly regardless of how many rotations happened after it`);
}
console.log('✅ Test 3 passed: full audit history across multiple key rotations remains decryptable.');

// ── 4. Migration path: importing a pre-existing legacy secure.key ──────────
const legacyKeychainFile = './test_migration.keychain.json';
const legacyKeyFile = './test_migration_legacy.key';
for (const f of [legacyKeychainFile, legacyKeyFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

// Simulate a pre-existing unversioned key file (the old architecture).
const { randomBytes } = await import('crypto');
const preExistingKey = randomBytes(32);
fs.writeFileSync(legacyKeyFile, preExistingKey);

// A fresh SecureSidecar pointed at this legacy file (no keychain yet) must
// import it rather than silently generating an unrelated new key -- that
// would orphan anything already encrypted under the legacy key in a real
// migration scenario.
const migratedSidecar = new SecureSidecar(legacyKeychainFile, legacyKeyFile);
assert.strictEqual(
  Buffer.from(migratedSidecar.keychain.keys[migratedSidecar.keychain.activeKeyId].key, 'hex').toString('hex'),
  preExistingKey.toString('hex'),
  'the legacy key must be imported as the initial active key, not discarded'
);
assert.strictEqual(migratedSidecar.keychain.keys[migratedSidecar.keychain.activeKeyId].migratedFromLegacyFile, true);
console.log('✅ Test 4 passed: pre-existing legacy secure.key is imported into the new keychain, not discarded.');

// ── 5. Decrypting with an unknown keyId fails loudly, not silently ─────────
assert.throws(
  () => sidecar.decryptPayload({ keyId: 'nonexistent-key-id', iv: '00', authTag: '00', data: '00' }),
  /No key found for keyId/,
  'attempting to decrypt with a keyId not present in the keychain must throw a clear error'
);
console.log('✅ Test 5 passed: unknown keyId fails with a clear error instead of a confusing crash.');

// ── 6. Blind index: deterministic, non-reversible, collision-resistant ────
const arcNumber = 'ARC-1234567890';
const indexA = sidecar.blindIndex(arcNumber);
const indexB = sidecar.blindIndex(arcNumber);
assert.strictEqual(indexA, indexB, 'the same raw identifier must always produce the same blind index');
assert.notStrictEqual(indexA, sidecar.blindIndex('ARC-0000000000'), 'different identifiers must not collide');
assert.ok(!indexA.includes(arcNumber), 'the blind index must not contain or leak the raw identifier');
assert.strictEqual(indexA.length, 64, 'blind index must be a fixed-length SHA-256 hex digest');
console.log('✅ Test 6 passed: blind index is deterministic, collision-resistant, and non-reversible.');

// Cleanup
for (const f of [testKeychainFile, testLegacyKeyFile, legacyKeychainFile, legacyKeyFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

console.log('🎉 All SecureSidecar tests passed (including the key-rotation regression test for the real production bug found).');
