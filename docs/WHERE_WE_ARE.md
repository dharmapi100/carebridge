# Where We Are — CareBridge
**A status board, not a strategy doc.** If anything here disagrees with `KSGC_MASTER_CONTEXT.md`, that file wins. Written 2026-09-18, after the first Firecrawl market sweep.

---

## 1. In one paragraph

The **software is real and verified**. The **market thesis just got stress-tested and survived — but two of the three ways we imagined growing are now dead**, and the reason we survived is the compliance core. The **business is unvalidated**: zero Korean customer conversations, no demo, no live database. We are strong on product and empty on proof-of-market. That gap is the whole story right now.

---

## 2. What's actually built (verified by running it, 2026-09-18)

| Item | State |
|---|---|
| Test suites | **18 / 18 pass** — ran `npm test`, exit code 0 |
| Service modules | 21 in `src/services/` |
| Live HTTP API | compliance engine (severance + 4 major insurances), secure sidecar, policy watcher, matching, credential ingestor, visa validator, audit monitor, PII scrubber, caregiver ledger, predictive risk, hospital eligibility, staffing compliance, long-stay penalty |
| Background (not user-facing) | LLM policy extractor + policy proposals — **human approval gate, never auto-applies a change** |
| Encryption | AES-256-GCM, key-versioned, **encrypted + tamper-evident** — *not* "signed". Don't say signed. |
| Data rates | 4-major-insurance rates corrected to 2026, under autonomous drift-watch |

**Not built, do not claim:** no live database, no demo, no daemon auto-start, no monthly audit export package, no KMS.

**Removed on purpose** (were overclaiming): `cryptoShield` ("quantum-resistant" but was plain SHA-512), `zeroKnowledgeVault` (redundant, misleading label). Kept but narrowed: `arbitrationEngine` → statutory eligibility only, no legal advice.

---

## 3. What today's market sweep changed

**Confirmed and firm:**
- Reform is real and on a clock: **500 의료중심 요양병원, copay cut from 100% → ~30%, target H1 2027.**
- Budget curve published: **₩270B (2026) → ₩540B (2027) → ₩1T+ (2028)**, plus fee increases.
- Direct employment is the stated **principle**.
- Compliance/severance obligations apply regardless of what happens to matching.

**Newly dead (stop building on these):**
1. **"Train caregivers overseas and import them."** Blocked. The visa route (E-7 '요양보호사') requires a **Korean domestic college degree**; no overseas equivalency path exists. Verified at MOJ primary source.
2. **Any version of foreign-caregiver import.** At the 54th 국무회의 (**2025-12-16**) the **President explicitly told MOHW not to import foreign caregivers** — *"don't think of importing foreigners; aggregate supply and demand via platforms instead."* This is a policy preference, not a technicality.
3. **Anything resembling a caregiver-matching app.** The government is building a **free public '간병 알바 앱'** (조선일보 2026-08-29) connecting caregivers to nursing hospitals.

**Newly strengthened (this is the good news):**
- The reform is pushing caregivers toward **part-time / 시간제 work** instead of 24-hour shifts. Part-timers have **different severance accrual, different 4-insurance withholding, different hour math** — so this makes compliance *harder* for facilities and *more valuable* for us.
- 20 → 19 pilot hospitals, with two trying to quit because they **couldn't recruit caregivers to employ directly**. The reform's binding problem is labor supply — which the public app addresses — but the facilities that do employ must still get payroll/severance right.

**Hard constraint worth remembering:** foreign hires are capped at **20% of a facility's domestic headcount**. That is a structural ceiling on the foreign-caregiver pool.

---

## 4. The honest blockers

These are the things standing between "verified software" and "a business."

1. **Zero customer conversations.** No hospital, no agency, no municipal office has been talked to. This is the single most valuable thing to go get, and it's the one thing no amount of engineering substitutes for.
2. **No demo.** There is no way for a facility director to *see* this working. For a Korean institutional buyer who makes decisions on trust and relationships, a demo is the entry ticket.
3. **Sales motion is a hypothesis.** B2B2C via municipal MOU → regional adoption is plausible and unproven. No MOU exists.
4. **Legal review hasn't happened.** Liability split between us (software), the agency (employer of record), and the hospital (funding recipient) is assumed, not reviewed.
5. **Unreconciled figures** — we now have three copay numbers and two long-stay penalty curves in the doc. Needs a primary-source check before any hospital-facing claim.

---

## 5. What's next — in order

| # | Action | Owner | Why now | Success metric |
|---|---|---|---|---|
| 1 | **Get 3 real conversations** with nursing-hospital directors or agency operators | Paul | Only source of market truth; kills or confirms the thesis | 3 conversations held, written notes |
| 2 | **Build a demo someone can click** | Paul + Orinth | No demo = no institutional sale | A facility director can run the severance + eligibility flow unaided |
| 3 | **Reconcile the copay figures** at primary source | me | Can't make hospital claims on contradictory numbers | One settled number in the doc |
| 4 | **Legal review of liability split** | external counsel, post-funding | Protects the "liability shield" claim | Written opinion |
| 5 | **Weekly market watch** | automated (cron `9c02d317951b`) | Keeps this file honest | Monday brief, every week |

---

## 6. The one-line answer

**Product: real and getting stronger. Market: thesis survived, two growth paths died, the core got more valuable. Business: unproven, and the gap is sales, not code.**

Get the three conversations. Everything else is downstream of that.
