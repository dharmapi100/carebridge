# CareBridge OS 🇰🇷

> **Enterprise Labor Compliance & Wage Escrow Platform for South Korea**  
> *Built for the Korean Startup Grand Challenge (KSGC)*

CareBridge is a production-grade, bilingual (EN/KO) labor compliance, statutory severance (퇴직금), 4 Major Public Insurances (4대보험), and visa validation platform engineered specifically for South Korea's super-aged demographic transition.

---

## 🏗️ Core Architecture & Microservices (`src/services/`)

CareBridge comprises **14 specialized backend microservices** designed for zero-trust compliance, strict PIPA adherence, and autonomous regulatory tracking:

1. **`complianceEngine.js` / `.ts`** — Statutory severance calculation, overtime thresholds, and automatic 4 Major Public Insurance computation.
2. **`visaValidator.js`** — Verifies work permits and visa categories (E-9, E-12, E-5, F-2-R, ARC).
3. **`predictiveRiskEngine.js`** — AI-driven scoring for deportation and severance default risks.
4. **`piiScrubber.js`** — Real-time PIPA-compliant PII masking and tokenization.
5. **`i18n.js`** — Native Korean (KO) and English (EN) localization engine.
6. **`secureSidecar.js`** — AES-256-GCM encrypted secure message bus.
7. **`policyWatcher.js`** — Autonomous Ministry of Employment and Labor (MOEL) regulation monitoring daemon.
8. **`auditMonitor.js`** — Real-time immutable audit logging and telemetry.
9. **`cryptoShield.js`** — Post-quantum SHA-512 HMAC verification.
10. **`credentialIngestor.js`** — Automated parsing and validation of caregiver credentials.
11. **`arbitrationEngine.js`** — Automated labor dispute resolution workflows.
12. **`remittanceEscrow.js`** — Secure cross-border wage escrow security.
13. **`zeroKnowledgeVault.js`** — Zero-knowledge proof management for sensitive credentials.
14. **`matchingEngine.js`** — Intelligent caregiver-employer matching.

---

## 💳 Frontend & API Gateway

- **API Gateway**: Express backend running on port 3000 (`src/api/server.js`) exposing all compliance, escrow, and audit endpoints.
- **Command Center**: Bilingual SPA (`src/public/index.html`) featuring live interactive JSON output cards, real-time risk gauges, and executive telemetry.

---

## 🧪 Testing & Verification

All test suites are fully verified and 100% green:
- **`test_sidecar.js`** — PIPA encryption verification
- **`test_audit.js`** — Severance & visa compliance validation
- **`test_matching.js`** — Caregiver matching algorithms
- **`test_visa.js`** — Visa status & ARC validation

---

## 🚀 Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Run Test Suites
\`\`\`bash
node src/services/testRunner.js
\`\`\`

### 3. Start API Gateway & Command Center
\`\`\`bash
node src/api/server.js
\`\`\`
Access the bilingual executive command center at `http://localhost:3000`.

---

## 📦 DevOps & Containerization
Includes `Dockerfile` and `docker-compose.yml` for instant, isolated container orchestration across staging and production environments.

## 📄 Documentation
Comprehensive dossiers for KSGC stakeholders, Korean VC targeting, and executive investor outreach are available under `src/docs/`.
