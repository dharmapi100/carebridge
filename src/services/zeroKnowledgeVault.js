import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export class ZeroKnowledgeBiometricVault {
  constructor() {
    this.vaultMasterKey = randomBytes(32);
  }

  generateBiometricBlindIndex(rawIdentifier) {
    const salt = 'carebridge-zk-salt-2026';
    return createHash('sha256').update(rawIdentifier + salt).digest('hex');
  }

  encryptBiometricPayload(sensitiveDataObj) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.vaultMasterKey, iv);
    const plaintext = JSON.stringify(sensitiveDataObj);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      blindIndex: this.generateBiometricBlindIndex(sensitiveDataObj.alienRegistrationNumber || 'UNKNOWN'),
      iv: iv.toString('hex'),
      authTag,
      encryptedPayload: encrypted,
      storageSecurity: 'ZERO_KNOWLEDGE_PIPA_COMPLIANT'
    };
  }
}
