// Path: src/services/secureSidecar.js
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

export class SecureSidecar {
  constructor(keyFilePath = './secure.key') {
    this.keyFilePath = path.resolve(keyFilePath);
    this.key = this._loadOrGenerateKey();
  }

  _loadOrGenerateKey() {
    if (fs.existsSync(this.keyFilePath)) {
      return fs.readFileSync(this.keyFilePath);
    } else {
      // Generate a secure 32-byte key for AES-256-GCM
      const key = randomBytes(32);
      fs.writeFileSync(this.keyFilePath, key);
      return key;
    }
  }

  encryptPayload(dataObj) {
    const iv = randomBytes(12); // Recommended IV length for GCM
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    
    const plaintext = JSON.stringify(dataObj);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      iv: iv.toString('hex'),
      authTag,
      data: encrypted
    };
  }

  decryptPayload(encryptedPayload) {
    const iv = Buffer.from(encryptedPayload.iv, 'hex');
    const authTag = Buffer.from(encryptedPayload.authTag, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedPayload.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}
