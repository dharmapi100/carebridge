// Path: src/services/secureSidecar.js
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * CareBridge Secure Sidecar: AES-256-GCM encryption with KEY VERSIONING.
 *
 * Why versioning: a single unversioned key file means that ANY key loss,
 * rotation, or regeneration permanently orphans every audit-log entry
 * encrypted under the previous key -- AES-GCM ciphertext cannot be recovered
 * without its exact original key. We found this exact failure in our own
 * audit log (28/29 historical entries orphaned by an earlier undocumented
 * key rotation) and are fixing the root cause rather than the symptom.
 *
 * Design: a keychain file stores every key ever generated, indexed by a
 * short keyId derived from the key's own hash (so it's deterministic, not
 * a random label that could collide or get lost). Every encrypted payload
 * is tagged with the keyId used to encrypt it. Decryption looks up the
 * correct key by that ID, so rotating to a new active key never breaks the
 * ability to decrypt records encrypted under a retired one.
 *
 * This is the same discipline a managed KMS (AWS KMS, Vault) enforces
 * internally -- see src/docs/security_key_management.md for the documented
 * migration path from this local keychain to a real KMS backend.
 */
export class SecureSidecar {
  constructor(keychainPath = './secure.keychain.json', legacyKeyPath = './secure.key') {
    this.keychainPath = path.resolve(keychainPath);
    this.legacyKeyPath = path.resolve(legacyKeyPath);
    this.keychain = this._loadOrInitKeychain();
  }

  _keyId(keyBuffer) {
    // Deterministic short ID derived from the key itself (not a counter or
    // random label) -- so re-deriving the same key always yields the same ID,
    // and a keychain rebuilt from a legacy key file lines up correctly.
    return createHash('sha256').update(keyBuffer).digest('hex').slice(0, 16);
  }

  _loadOrInitKeychain() {
    if (fs.existsSync(this.keychainPath)) {
      return JSON.parse(fs.readFileSync(this.keychainPath, 'utf8'));
    }

    // Migration path: if an old unversioned secure.key exists, import it as
    // the first entry in the new keychain instead of discarding it -- any
    // audit entries still decryptable under it stay decryptable after this
    // upgrade, rather than being orphaned a second time by the migration
    // itself.
    let keychain;
    if (fs.existsSync(this.legacyKeyPath)) {
      const legacyKey = fs.readFileSync(this.legacyKeyPath);
      const keyId = this._keyId(legacyKey);
      keychain = {
        activeKeyId: keyId,
        keys: {
          [keyId]: {
            key: legacyKey.toString('hex'),
            createdAt: new Date().toISOString(),
            migratedFromLegacyFile: true
          }
        }
      };
    } else {
      const newKey = randomBytes(32);
      const keyId = this._keyId(newKey);
      keychain = {
        activeKeyId: keyId,
        keys: {
          [keyId]: {
            key: newKey.toString('hex'),
            createdAt: new Date().toISOString(),
            migratedFromLegacyFile: false
          }
        }
      };
    }

    fs.writeFileSync(this.keychainPath, JSON.stringify(keychain, null, 2));
    return keychain;
  }

  _saveKeychain() {
    fs.writeFileSync(this.keychainPath, JSON.stringify(this.keychain, null, 2));
  }

  _getActiveKey() {
    return Buffer.from(this.keychain.keys[this.keychain.activeKeyId].key, 'hex');
  }

  _getKeyById(keyId) {
    const entry = this.keychain.keys[keyId];
    if (!entry) {
      throw new Error(`No key found for keyId "${keyId}". This record was encrypted with a key that is not present in the keychain -- it cannot be decrypted.`);
    }
    return Buffer.from(entry.key, 'hex');
  }

  /**
   * Rotates to a brand new active key WITHOUT discarding any previous key.
   * All prior encrypted records remain decryptable via their tagged keyId.
   * This is the operation that used to silently destroy audit history --
   * now it's safe to call at any time.
   */
  rotateKey() {
    const newKey = randomBytes(32);
    const keyId = this._keyId(newKey);
    this.keychain.keys[keyId] = {
      key: newKey.toString('hex'),
      createdAt: new Date().toISOString(),
      migratedFromLegacyFile: false
    };
    this.keychain.activeKeyId = keyId;
    this._saveKeychain();
    return { newActiveKeyId: keyId, totalKeysRetained: Object.keys(this.keychain.keys).length };
  }

  encryptPayload(dataObj) {
    const activeKeyId = this.keychain.activeKeyId;
    const key = this._getActiveKey();
    const iv = randomBytes(12); // Recommended IV length for GCM
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    const plaintext = JSON.stringify(dataObj);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      keyId: activeKeyId,
      iv: iv.toString('hex'),
      authTag,
      data: encrypted
    };
  }

  decryptPayload(encryptedPayload) {
    // Backward compatibility: payloads encrypted before this keyId tagging
    // was introduced won't have a keyId field. Fall back to the active key
    // for those -- this only helps if the active key happens to still be
    // the one that encrypted them (true immediately after this migration,
    // since we import the legacy key as the initial active key above).
    const keyId = encryptedPayload.keyId || this.keychain.activeKeyId;
    const key = this._getKeyById(keyId);

    const iv = Buffer.from(encryptedPayload.iv, 'hex');
    const authTag = Buffer.from(encryptedPayload.authTag, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);

    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedPayload.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}
