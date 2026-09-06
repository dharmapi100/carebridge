# CareBridge Build Backlog / Ideas

Not verified regulatory facts, not committed strategy — that's `KSGC_MASTER_CONTEXT.md`. This file is for concrete feature ideas that came up but haven't been scoped, confirmed, or built yet. Move an item to "In Progress" only after an explicit plan + go-ahead (per standing rule: always confirm before building).

## Proposed, Not Yet Scoped

### Monthly Audit Export Package ("5-Minute Audit Token")
**Origin:** surfaced in pitch-strategy discussion ("Two Crown Jewels" framing) as an existing feature — corrected in `KSGC_MASTER_CONTEXT.md`: it does NOT exist yet. What's real today: `AuditMonitor.scanForViolations()` + `/api/v1/audit/inspect` (live, wired) scans and reports on the audit log on-demand. What's proposed and NOT built: a monthly job that bundles a period's wage/overtime/severance calculations into one exportable, tamper-evident package an agency could hand directly to a MOEL auditor.
**If built:** would compose existing pieces (`AuditMonitor`, `SecureSidecar`, `complianceEngine`) rather than new crypto — mostly a batching/export/reporting layer. Needs a real go/no-go decision, not just narrative reuse.
**Terminology to fix wherever it's described:** current encryption is AES-256-GCM (tamper-evident via GCM auth tag) — real and tested. It is NOT a "signature" scheme. Say "encrypted, tamper-evident" not "cryptographically signed" until/unless real signing (e.g. HMAC or asymmetric signatures proving *who* generated a record) is actually added.

## Explicitly Not Building Yet (parked, with reason)
- Full 5-tier patient classification / priority-queue model — no published MOHW scoring/ranking mechanism to build against (see KSGC_MASTER_CONTEXT.md).
- KMS-based key management — correct for demo stage is local-file + key-versioning (done); KMS is a real prod-only migration, not needed pre-pilot.
- Dashboard UI redesign — explicitly paused by Paul.

## Test-or-Cut Decision Needed
`arbitrationEngine.js`, `remittanceEscrow.js`, `cryptoShield.js`, `zeroKnowledgeVault.js` — real code, zero tests, not wired into the API. Status: unverified, described nowhere as "working." Decide: write tests and wire in, or remove. Not yet decided.

## Wiring Backlog (tested, not yet live)
`hospitalEligibility.js` (+ `generateGapReport()`), `staffingComplianceMonitor.js`, `longStayPenaltyEngine.js` — all pass their test suites, none have HTTP endpoints in `server.js`. This is the highest-leverage next step discussed (demo-ability gap), not yet started.
