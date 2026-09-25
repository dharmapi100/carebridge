# CareBridge OS 🇰🇷

> **Labor-compliance and payroll infrastructure for South Korea's institutional elder-care market**
> Built for the Korean Startup Grand Challenge (KSGC)

CareBridge encodes Korean labour law into deterministic software: statutory severance (퇴직금), the 4 Major Public Insurances (4대보험), visa-category eligibility, and nursing-hospital subsidy-eligibility scoring.

It is a B2B compliance product sold to facilities and agencies that already hold licensing standing. It is **not** a consumer caregiver-matching app, and it is **not** an employer-of-record or visa-sponsor service.

---

## Status, read this first

Pre-pilot. Everything below is split into what exists and what does not, so nothing here oversells the product.

**Exists**

- 18 service modules and 13 HTTP endpoints
- 18 test suites, all passing (`npm test`)
- Bilingual EN/KO interface with live result cards

**Does not exist yet**

- **No database.** All state is file-backed JSON under `src/config/`, regenerated on first run.
- **No scripted demo** a facility director could follow unaided.
- **No live customer** and no signed partner.
- **No Ministry of Justice / Hi-Korea integration.** Visa checks are a local approved-list comparison, not a government-system query. Nothing in this repository calls a Korean government API.
- **No automatic policy application.** The policy watcher is read-only and any proposed threshold change waits behind a human approval gate.
- **No legal advice.** `arbitrationEngine.js` returns a statutory eligibility determination only.

---

## Architecture

Node.js and Express using ES modules, with no build step. Production dependencies are `express` and `cors` only.

Two files remain in `src/services/` as `.ts` (`complianceEngine.ts`, `testRunner.ts`); nothing imports them and the project has no TypeScript compilation step. The running code is the `.js` files.

### Services (`src/services/`)

| Module | Exported class | Responsibility |
|---|---|---|
| `complianceEngine.js` | `KoreanComplianceEngine` | Statutory severance, overtime thresholds, 4 Major Public Insurances (2026 rates) |
| `secureSidecar.js` | `SecureSidecar` | AES-256-GCM encryption, key-versioned, GCM tamper-evident; deterministic blind index |
| `piiScrubber.js` | `PIIScrubber` | PIPA-compliant PII masking and tokenisation |
| `auditMonitor.js` | `AuditMonitor` | Audit-log scanning and violation reporting |
| `caregiverLedger.js` | `CaregiverLedger` | Worker record store |
| `predictiveRiskEngine.js` | `PredictiveRiskEngine` | Risk scoring over ledger records (visa expiry, severance exposure) |
| `credentialIngestor.js` | `CredentialIngestor` | Credential validation against the local certified registry |
| `visaValidator.js` | `VisaValidator` | Visa-category eligibility against a local approved list |
| `matchingEngine.js` | `CareBridgeMatchingEngine` | Caregiver scoring and dispatch |
| `hospitalEligibility.js` | `HospitalEligibilityEngine` | MOHW designation-criteria scoring, plus a consolidated gap report |
| `staffingComplianceMonitor.js` | `StaffingComplianceMonitor` | Staffing-ratio and shift-pattern checks against the forthcoming standard |
| `longStayPenaltyEngine.js` | `LongStayPenaltyEngine` | Long-stay copay penalty calculation |
| `remittanceEscrow.js` | `RemittanceEscrowEngine` | Wage escrow, plus a Foreign Exchange Act flag (2026 rates) |
| `arbitrationEngine.js` | `ArbitrationEligibilityEngine` | Statutory severance eligibility determination only. No settlement amounts, no legal opinion |
| `policyWatcher.js` | `KoreanPolicyWatcher` | Read-only polling of MOHW / MOEL / NPS boards for rate and threshold changes |
| `policyProposals.js` | `PolicyProposalStore` | Proposed policy changes awaiting human approval |
| `llmExtractor.js` | `LLMExtractor` | Extracts candidate policy changes from ministry pages (background only) |
| `i18n.js` | `translations` | EN/KO strings |
| `testRunner.js` | - | Core compliance test harness |

### HTTP API (`src/api/server.js`)

13 routes:

```
GET  /                  GET  /health
GET  /api/v1/audit/inspect
GET  /api/v1/risk/scan
POST /api/v1/compliance/audit
POST /api/v1/credential/verify
POST /api/v1/visa/verify
POST /api/v1/matching/dispatch
POST /api/v1/hospital/eligibility
POST /api/v1/hospital/gap-report
POST /api/v1/staffing/evaluate
POST /api/v1/patient/copay
POST /api/v1/patient/copay/batch
```

### Interface (`src/public/index.html`)

A single bilingual dashboard in vanilla HTML, CSS and JavaScript. No framework, no bundler. Five independent tool cards, each with a fixed-height result area, so clicking one never shifts the layout. That was bugging me.

---

## Quick start

```bash
npm install      # install dependencies
npm test         # run the harness and all 18 test suites
npm start        # start the API and dashboard on http://localhost:3000
```

That is it. No config file needed and no database to set up; state regenerates itself on first run.

## Testing

`npm test` runs the core compliance harness and then every suite in `src/tests/test_*.js`, failing on the first error. Current result: **18 / 18 passing.**

CI (`.github/workflows/ci.yml`) runs the same command on Node 18.x and 20.x.

---

## Security notes

- Payload encryption is AES-256-GCM via `secureSidecar.js`, key-versioned so rotation does not orphan older records. GCM's authentication tag makes records tamper-evident; it is **not** a signature scheme and does not prove *who* produced a record.
- Keys live in `secure.key` / `secure.keychain.json`, both gitignored. See `src/docs/security_key_management.md` for handling notes. A proper KMS is the production migration path; a plain key file is fine at this stage.
- `cryptoShield.js` and `zeroKnowledgeVault.js` were removed from this codebase: both were labelled as stronger guarantees than the code actually implemented.

---

## Documentation

| File | Purpose |
|---|---|
| `docs/KSGC_MASTER_CONTEXT.md` | Single source of truth: verified market facts, competitive landscape, positioning |
| `docs/WHERE_WE_ARE.md` | Current status board: what's built, what's blocking, what's next |
| `docs/BUILD_BACKLOG.md` | Scoped feature ideas not yet built |
| `src/docs/security_key_management.md` | Key handling per environment |
| `src/docs/pitch_strategy.md` | Pitch framing notes |

---

## Deployment

`Dockerfile` and `docker-compose.yml` are included for containerised runs.
