// Path: src/services/credentialIngestor.js
import fs from 'fs';
import path from 'path';

export class CredentialIngestor {
  constructor(registryPath = './src/config/certifiedRegistry.json') {
    this.registryPath = path.resolve(registryPath);
    this._ensureRegistry();
  }

  _ensureRegistry() {
    const dir = path.dirname(this.registryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.registryPath)) {
      // Mock official South Korean Certified Care Worker (요양보호사) registry database
      const defaultRegistry = {
        "WORKER-PARK-01": {
          name: "Park Eun-ji",
          licenseNumber: "KR-CARE-2023-88491",
          isCertified: true,
          expiryDate: "2028-12-31",
          issuingAuthority: "Seoul Metropolitan Government"
        },
        "WORKER-KIM-02": {
          name: "Kim Ji-young",
          licenseNumber: "KR-CARE-2022-11029",
          isCertified: true,
          expiryDate: "2027-05-15",
          issuingAuthority: "Gyeonggi Provincial Government"
        }
      };
      fs.writeFileSync(this.registryPath, JSON.stringify(defaultRegistry, null, 2));
    }
  }

  /**
   * Simulates OCR extraction and government database cross-verification for a caregiver's license document
   */
  verifyCredential(workerId, scannedLicenseNumber) {
    if (!fs.existsSync(this.registryPath)) {
      return { verified: false, reason: 'Registry database unavailable.' };
    }

    const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
    const record = registry[workerId];

    if (!record) {
      return {
        verified: false,
        workerId,
        reason: 'Worker ID not found in official Ministry Certified Care Worker registry.'
      };
    }

    const isMatch = record.licenseNumber === scannedLicenseNumber;
    const isNotExpired = new Date(record.expiryDate) > new Date();

    if (isMatch && isNotExpired) {
      return {
        verified: true,
        workerId,
        licenseDetails: record,
        message: 'OCR extraction successful. Credential verified against official government registry.'
      };
    } else {
      return {
        verified: false,
        workerId,
        reason: 'License number mismatch or credential has expired.'
      };
    }
  }
}
