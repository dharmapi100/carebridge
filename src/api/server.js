// Path: src/api/server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { KoreanComplianceEngine } from '../services/complianceEngine.js';
import { SecureSidecar } from '../services/secureSidecar.js';
import { KoreanPolicyWatcher } from '../services/policyWatcher.js';
import { CareBridgeMatchingEngine } from '../services/matchingEngine.js';
import { CredentialIngestor } from '../services/credentialIngestor.js';
import { VisaValidator } from '../services/visaValidator.js';
import { AuditMonitor } from '../services/auditMonitor.js';
import { PIIScrubber } from '../services/piiScrubber.js';
import { CaregiverLedger } from '../services/caregiverLedger.js';
import { PredictiveRiskEngine } from '../services/predictiveRiskEngine.js';
import { HospitalEligibilityEngine } from '../services/hospitalEligibility.js';
import { StaffingComplianceMonitor } from '../services/staffingComplianceMonitor.js';
import { LongStayPenaltyEngine } from '../services/longStayPenaltyEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend dashboard, resolved relative to this file so it
// always serves THIS repo's frontend regardless of where the process is
// launched from. (Previously hardcoded to /Users/paulbasic/src/public/ --
// the old, deprecated source tree -- meaning every local run silently
// served stale frontend code instead of what's actually in this repo.)
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).send('Error loading frontend: ' + err.message);
    }
  });
});

const engine = new KoreanComplianceEngine();
const sidecar = new SecureSidecar();
const policyWatcher = new KoreanPolicyWatcher();
const matchingEngine = new CareBridgeMatchingEngine();
const credentialIngestor = new CredentialIngestor();
const visaValidator = new VisaValidator();
const auditMonitor = new AuditMonitor();
const caregiverLedger = new CaregiverLedger({ auditMonitor });
const predictiveRiskEngine = new PredictiveRiskEngine(engine);
const staffingComplianceMonitor = new StaffingComplianceMonitor({ policyWatcher, auditMonitor });
const hospitalEligibilityEngine = new HospitalEligibilityEngine({ policyWatcher, auditMonitor, staffingMonitor: staffingComplianceMonitor });
const longStayPenaltyEngine = new LongStayPenaltyEngine({ policyWatcher, auditMonitor });

// Health check endpoint with Autonomous Policy Watcher status
app.get('/health', async (req, res) => {
  const policyStatus = await policyWatcher.pollAndVerifyPolicyUpdates();
  res.status(200).json({ 
    status: 'ONLINE', 
    service: 'CareBridge Korean Labor Compliance, Visa, Audit & PII Scrubbing OS',
    version: '1.0.0',
    security: 'AES-256-GCM PIPA-Compliant Sidecar, PII Scrubber & Audit Monitor Active',
    autonomousPolicyWatcher: {
      status: 'ACTIVE',
      lastChecked: policyStatus.policy.lastChecked,
      currentRegulations: policyStatus.policy.activeRegulations
    }
  });
});

// Core Compliance & Severance Audit API Endpoint with PIPA Encryption & Live Policy Check
app.post('/api/v1/compliance/audit', async (req, res) => {
  try {
    const rawBody = req.body;
    const scrubbedBody = PIIScrubber.scrubObject(rawBody);
    const { workerId, employmentStartDate, averageMonthlyWage, weeklyWorkingHours, overtimeHoursWorked, baseHourlyRate } = scrubbedBody;

    if (!workerId || !employmentStartDate || !averageMonthlyWage || weeklyWorkingHours === undefined || !baseHourlyRate) {
      return res.status(400).json({ 
        error: 'Missing required contract parameters: workerId, employmentStartDate, averageMonthlyWage, weeklyWorkingHours, baseHourlyRate' 
      });
    }

    const livePolicy = policyWatcher.getCurrentPolicy();

    const contractParams = {
      workerId,
      employmentStartDate: new Date(employmentStartDate),
      averageMonthlyWage: Number(averageMonthlyWage),
      weeklyWorkingHours: Number(weeklyWorkingHours),
      overtimeHoursWorked: Number(overtimeHoursWorked || 0),
      baseHourlyRate: Number(baseHourlyRate)
    };

    const auditResult = engine.auditContract(contractParams);

    const encryptedAuditRecord = sidecar.encryptPayload({
      ...auditResult,
      governingRegulations: livePolicy.activeRegulations
    });

    auditMonitor.logAuditEvent('COMPLIANCE_AUDIT_RUN', workerId, auditResult);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      jurisdiction: 'South Korea (Labor Standards Act & Retirement Benefit Security Act & PIPA)',
      policyVersionChecked: livePolicy.lastChecked,
      auditLedger: auditResult,
      secureEncryptedStorageToken: encryptedAuditRecord
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Credential OCR Verification Endpoint with PII Scrubbing
app.post('/api/v1/credential/verify', async (req, res) => {
  try {
    const scrubbedBody = PIIScrubber.scrubObject(req.body);
    const { workerId, scannedLicenseNumber } = scrubbedBody;
    
    if (!workerId || !scannedLicenseNumber) {
      return res.status(400).json({ error: 'Missing workerId or scannedLicenseNumber' });
    }

    const verificationResult = credentialIngestor.verifyCredential(workerId, scannedLicenseNumber);
    const encryptedToken = sidecar.encryptPayload(verificationResult);

    auditMonitor.logAuditEvent('CREDENTIAL_OCR_VERIFY', workerId, verificationResult);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      verificationResult,
      secureEncryptedVerificationToken: encryptedToken
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Caregiver Visa Category Eligibility Check (local allowlist only -- see
// visaValidator.js header note: no Hi-Korea/government-system integration
// exists). PII scrubbed before processing.
app.post('/api/v1/visa/verify', async (req, res) => {
  try {
    const applicantData = PIIScrubber.scrubObject(req.body);
    const visaCheck = visaValidator.validateVisaStatus(applicantData);
    const encryptedVisaToken = sidecar.encryptPayload(visaCheck);

    auditMonitor.logAuditEvent('CAREGIVER_VISA_CATEGORY_CHECK', applicantData.alienRegistrationNumber || 'ANONYMOUS', visaCheck);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      visaCategoryCheck: visaCheck,
      secureEncryptedVisaToken: encryptedVisaToken
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Caregiver Smart Matching & Compliance Dispatch Endpoint
app.post('/api/v1/matching/dispatch', async (req, res) => {
  try {
    const scrubbedBody = PIIScrubber.scrubObject(req.body);
    const { requestId, requiredWeeklyHours, overtimeHours, strictNoSeverance, candidates } = scrubbedBody;

    if (!requestId || !candidates || !Array.isArray(candidates)) {
      return res.status(400).json({ error: 'Missing required request parameters: requestId, candidates (array)' });
    }

    const matchResult = await matchingEngine.matchCaregiver(
      { requestId, requiredWeeklyHours, overtimeHours, strictNoSeverance },
      candidates,
      caregiverLedger
    );

    const encryptedDispatchToken = sidecar.encryptPayload(matchResult);

    auditMonitor.logAuditEvent('CAREGIVER_MATCHING_DISPATCH', requestId, matchResult);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      dispatchResult: matchResult,
      secureEncryptedDispatchToken: encryptedDispatchToken
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Predictive Risk Scan Endpoint: flags visa-expiry and severance-threshold
// risk across every registered caregiver, sorted highest-risk first.
app.get('/api/v1/risk/scan', (req, res) => {
  try {
    const riskReport = predictiveRiskEngine.scanLedger(caregiverLedger);
    const encryptedReport = sidecar.encryptPayload(riskReport);

    auditMonitor.logAuditEvent('PREDICTIVE_RISK_SCAN', 'SYSTEM', {
      totalEvaluated: riskReport.totalEvaluated,
      skipped: riskReport.skipped
    });

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      riskReport,
      secureEncryptedRiskToken: encryptedReport
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Regulatory Audit Inspection Endpoint (For MOEL Labor Inspectors)
app.get('/api/v1/audit/inspect', (req, res) => {
  try {
    const inspectionReport = auditMonitor.scanForViolations();
    const encryptedReport = sidecar.encryptPayload(inspectionReport);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      inspectionAgency: 'Ministry of Employment and Labor (MOEL) Inspector Portal',
      inspectionReport,
      secureEncryptedInspectionToken: encryptedReport
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Hospital Eligibility Scorecard Endpoint -- evaluates a nursing hospital
// against MOHW's 간병비 급여화 designation criteria (hard-gated: beds,
// direct-employment, accreditation; track-only: adequacy grade, staffing
// grade, non-covered revenue ratio, case-mix ratio -- see hospitalEligibility.js
// header for which MOHW criteria are confirmed vs. unpublished thresholds).
app.post('/api/v1/hospital/eligibility', (req, res) => {
  try {
    const hospitalData = PIIScrubber.scrubObject(req.body);
    const result = hospitalEligibilityEngine.evaluateHospital(hospitalData);
    const encryptedToken = sidecar.encryptPayload(result);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      eligibilityResult: result,
      secureEncryptedToken: encryptedToken
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Hospital Gap Report Endpoint -- consolidated facility + staffing gap
// report (one designation decision, matching KOIHA/장기요양기관 지정갱신제
// precedent -- see hospitalEligibility.js's generateGapReport() header).
// Accepts optional wardStaffingData[] alongside hospitalData.
app.post('/api/v1/hospital/gap-report', (req, res) => {
  try {
    const body = PIIScrubber.scrubObject(req.body);
    const { hospitalData, wardStaffingData } = body;
    const result = hospitalEligibilityEngine.generateGapReport(hospitalData, wardStaffingData || []);
    const encryptedToken = sidecar.encryptPayload(result);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      gapReport: result,
      secureEncryptedToken: encryptedToken
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Staffing/Shift Compliance Endpoint -- evaluates one ward's caregiver
// staffing + shift pattern against the forthcoming MOHW standard (config-
// driven ratio/shift/room values -- see staffingComplianceMonitor.js header
// for the regulatory-honesty notes on what is/isn't finalized).
app.post('/api/v1/staffing/evaluate', (req, res) => {
  try {
    const wardData = PIIScrubber.scrubObject(req.body);
    const result = staffingComplianceMonitor.evaluateWardStaffing(wardData);
    const encryptedToken = sidecar.encryptPayload(result);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      staffingResult: result,
      secureEncryptedToken: encryptedToken
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Patient Long-Stay Copay Penalty Endpoint -- computes one patient's
// applicable copay ratio + KRW billing breakdown (see longStayPenaltyEngine.js
// header for the sourcing/confidence note on the +10%/+20% figures).
app.post('/api/v1/patient/copay', (req, res) => {
  try {
    const patientData = PIIScrubber.scrubObject(req.body);
    const result = longStayPenaltyEngine.evaluatePatientCopay(patientData);
    const encryptedToken = sidecar.encryptPayload(result);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      copayResult: result,
      secureEncryptedToken: encryptedToken
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Patient Long-Stay Copay Penalty Batch Endpoint -- processes a full
// hospital roster in one pass (cached-policy design, see
// longStayPenaltyEngine.js -- no per-patient file reads).
app.post('/api/v1/patient/copay/batch', (req, res) => {
  try {
    const body = PIIScrubber.scrubObject(req.body);
    const patientDataList = body.patients || [];
    const results = longStayPenaltyEngine.evaluatePatientCopayBatch(patientDataList);
    const encryptedToken = sidecar.encryptPayload(results);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      totalProcessed: results.length,
      copayResults: results,
      secureEncryptedToken: encryptedToken
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[CareBridge API] PII-Scrubbed Compliance, Visa, Audit & Secure OS running on port ${PORT}`);
  
  // ==========================================
  // ZERO-LATENCY AUTONOMOUS MOEL POLICY WATCHER DAEMON
  // ==========================================
  const POLL_INTERVAL_MS = 60 * 1000; // Poll every 60 seconds for zero-latency regulatory updates
  console.log(`[PolicyWatcherDaemon] Initialized. Polling MOEL feed every ${POLL_INTERVAL_MS / 1000}s for instantaneous compliance synchronization.`);
  
  setInterval(async () => {
    try {
      const result = await policyWatcher.pollAndVerifyPolicyUpdates();
      if (result.updated) {
        console.log('[PolicyWatcherDaemon] 🚨 MOEL Regulatory amendment detected and auto-patched instantly.');
      }
    } catch (err) {
      console.error('[PolicyWatcherDaemon] Error during autonomous policy poll:', err.message);
    }
  }, POLL_INTERVAL_MS);
});
