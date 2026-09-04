# CareBridge Security Architecture: Encryption Key Management

## Current State (KSGC Demo Stage)

CareBridge's audit-log integrity system (`secureSidecar.js`) uses **AES-256-GCM
encryption with local key-file storage and key versioning**. Every audit event
logged through `AuditMonitor` is encrypted before it touches disk, and every
encrypted record is tagged with the ID of the key that encrypted it.

### Why key versioning matters

Before this fix, CareBridge stored a single, unversioned encryption key
(`secure.key`). If that key file was ever lost, rotated, or regenerated, every
audit-log entry encrypted under the old key became **permanently
undecryptable** — there is no way to recover AES-GCM ciphertext without its
exact original key. We discovered this exact failure mode during internal
testing: 28 of 29 historical audit entries had been orphaned by an earlier,
undocumented key rotation.

For a product whose core value proposition is a *tamper-evident,
government-inspector-verifiable audit trail* (the "5-Minute Audit" narrative),
an unversioned single-key design is a real architectural risk — not a
theoretical one. We found it, and we fixed it rather than leaving it for a
production incident.

### The fix: key versioning

- Every encryption key is now stored with a unique key ID and generation
  timestamp in a keychain file, not a single unversioned blob.
- Every encrypted payload is tagged with the key ID used to encrypt it.
- Decryption looks up the correct key by ID rather than assuming "the current
  key" is the only key that has ever existed.
- Key rotation is supported without breaking historical audit trail integrity:
  old keys are retained (not overwritten), so records encrypted under a
  retired key remain fully decryptable and verifiable indefinitely.

This is the same versioning discipline used by managed key-management systems
(KMS) — the logic is identical regardless of where the key material physically
lives.

## What's Next: Production KMS Migration

For KSGC demo and pilot purposes, local versioned key storage is appropriate:
it's simple, fully auditable, and has zero external infrastructure
dependencies to fail during a live demo.

**Before any deployment handling real hospital/caregiver PII at scale**, we
will migrate key storage from local files to a managed KMS (AWS KMS or
HashiCorp Vault). Because the versioning logic is already correct, this
migration is scoped to `secureSidecar.js`'s key-loading/key-retrieval layer
only — not a rewrite of the encryption or audit architecture. This is a
deliberate, sequenced engineering decision: get the cryptographic logic
correct first, then swap the storage backend for one with hardware-backed key
protection, access auditing, and automatic rotation policies.

## Talking Points for Judges / Investors

If asked "why isn't this on a real KMS today":

> "Our key-versioning architecture is already KMS-compatible by design — every
> key is versioned and tagged, exactly how AWS KMS or Vault would manage it
> internally. At demo/pilot stage we run this locally to keep the system
> self-contained and fully auditable without external cloud dependencies. The
> migration to a managed KMS for production deployments handling real PII is
> a scoped, isolated change to one module — not an architecture change."

This demonstrates security maturity: we identified a real risk through our own
testing, fixed the underlying logic correctly, and have an explicit, low-risk
path to hardened production infrastructure.
