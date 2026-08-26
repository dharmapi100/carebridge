// Path: src/services/auditMonitor.js
import fs from 'fs';
import path from 'path';
import { SecureSidecar } from './secureSidecar.js';

export class AuditMonitor {
  constructor(logPath = './src/config/access_audit.log') {
    this.logPath = path.resolve(logPath);
    this.sidecar = new SecureSidecar();
    this._ensureLogFile();
  }

  _ensureLogFile() {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.logPath)) {
      fs.writeFileSync(this.logPath, '');
    }
  }

  /**
   * Records an immutable, encrypted audit event for labor inspectors or PIPA compliance checks
   */
  logAuditEvent(actionType, actorId, details) {
    const event = {
      timestamp: new Date().toISOString(),
      actionType,
      actorId,
      details,
      status: 'SECURE_LOGGED'
    };

    // Encrypt the event payload for tamper-evident storage
    const encryptedRecord = this.sidecar.encryptPayload(event);
    
    const logLine = JSON.stringify({
      timestamp: event.timestamp,
      actionType,
      encryptedPayload: encryptedRecord
    }) + '\n';

    fs.appendFileSync(this.logPath, logLine, 'utf8');
    return { logged: true, timestamp: event.timestamp };
  }

  /**
   * Scans audit logs for unauthorized access attempts or compliance violations
   */
  scanForViolations() {
    if (!fs.existsSync(this.logPath)) return [];
    
    const lines = fs.readFileSync(this.logPath, 'utf8').trim().split('\n').filter(Boolean);
    const violations = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        // Decrypt to inspect for anomalies
        const decrypted = this.sidecar.decryptPayload(entry.encryptedPayload);
        if (decrypted.actionType === 'UNAUTHORIZED_ACCESS_ATTEMPT' || decrypted.details?.isCertified === false) {
          violations.push(decrypted);
        }
      } catch (e) {
        // Log decryption failure as tampering alert
        violations.push({ error: 'Integrity check warning: unreadable audit log entry.' });
      }
    }

    return {
      totalEntriesScanned: lines.length,
      violationsDetected: violations.length,
      violations
    };
  }
}
