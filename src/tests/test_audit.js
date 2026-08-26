// Path: src/tests/test_audit.js
import { AuditMonitor } from '../services/auditMonitor.js';
import assert from 'assert';
import fs from 'fs';

console.log('Running CareBridge Audit Monitor unit tests...');

const testLogPath = './src/config/test_access_audit.log';
if (fs.existsSync(testLogPath)) fs.unlinkSync(testLogPath);

const monitor = new AuditMonitor(testLogPath);

monitor.logAuditEvent('COMPLIANCE_AUDIT_RUN', 'worker-test-1', { liability: 1000000 });
monitor.logAuditEvent('HI_KOREA_VISA_CHECK', '850101-2******', { eligible: true });

const inspection = monitor.scanForViolations();
assert.strictEqual(inspection.totalEntriesScanned, 2);

// Clean up
if (fs.existsSync(testLogPath)) fs.unlinkSync(testLogPath);

console.log('✅ CareBridge Audit Monitor tests passed successfully!');
