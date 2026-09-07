# KSGC / CareBridge Master Context
**Single source of truth.** If another doc in this repo disagrees with this one, this one wins — update it, don't create a new file. Last consolidated: 2026-09-07.

## Founder
Paul Basic, American citizen. Satisfies KSGC's non-Korean-national founder requirement for the Main Track. (Confirmed directly by founder — not inferred.)

## Product Identity
- **Product:** CareBridge OS — B2B compliance-and-payroll infrastructure for South Korea's institutional elder-care labor market. **Not** a consumer caregiver-matching app.
- **One-line pitch:** "We encoded Korean labor law into software. Robots solve the labor shortage; CareBridge solves compliance, wage transparency, and worker classification."
- **Tri-layer architecture:**
  - A) Clinical/staffing matching — caregiver-to-facility fit.
  - B) Labor & severance compliance engine — the core, deterministic, statutory layer (Labor Standards Act + Employee Retirement Benefit Security Act encoded as code).
  - C) Welfare transparency loop — worker-facing audit trail (credential wallet, hours/severance tracking, visa category status). Deliberately NOT a family-facing "find a caregiver" app — hard product rule, not an open question.
- **Naming:** Use "CareBridge" / "CareBridge OS" only. "Aegis Care" was considered and rejected — it's a generic, already-in-use elder-care brand name in the US/UK/Canada/Australia (unrelated companies, not Korea-based, not competitors) with zero trademark/SEO distinctiveness. Do not use it.

## Moats (the real ones — and what's *not* a moat, per verified competitive research)
1. **Regulatory lock-in** — the only platform found (across two sessions of research plus Claude cross-check) that encodes LSA/severance law into auditable, deterministic code. Facilities can't switch without losing compliance history.
2. **System-of-record gravity** — MOEL audits, NHI claims, municipal welfare reporting flow through the ledger once adopted.
3. **B2B2C forced adoption** — facility adopts out of regulatory fear/eligibility requirements; caregiver follows because that's how they get paid. No consumer CAC.
4. **Hospital-subsidy-eligibility scoring specifically** — nobody found (in repeated, independent searches) building a scorecard against MOHW's actual ~500-hospital designation criteria (beds, direct-employment ratio, accreditation, staffing/shift ratio, long-stay copay curve).

**What is NOT a safe claim, corrected this session:**
- "Caregiver matching" as a category is crowded and well-capitalized (CareNation ~₩30.5B raised, Samsung/Hana/Shinhan-backed; Caring ~₩75B raised, SV/LB/Hyundai-backed). Never pitch CareBridge as "a matching platform" — that invites direct, losing comparison.
- Agency-side payroll/scheduling software already exists and ships fast: **Caresalary (케어샐러리)**, ₩16,500/month, national-LTC-database-integrated, added severance interim-settlement (Aug 2026) and an AI assistant (Sept 2026). CareBridge is not "better agency payroll."
- **The Homesaeng precedent is real and matters.** Homesaeng and Hubriz ran Seoul's 2024-2025 foreign domestic-helper (가사관리사, E-9-track, NOT elder-care) pilot as the actual employer-of-record/visa-sponsor-adjacent operators. It was wound down (외국인력정책위원회 decided Dec 22, 2025 not to convert to a full program). Homesaeng's cohead, Lee Bong-jae, said on record (Korea JoongAng Daily, "Doomed from the start?"): *"Because visa operations fall under the Employment Ministry, we cannot continue the service independently."* — **This is a real regulatory-authority wall, not a solvable engineering problem.** CareBridge's current scope (selling verification/scoring software to hospitals/agencies who already hold licensing standing, not becoming the employer-of-record or visa sponsor ourselves) stays on the safe side of this wall — verified by reading `visaValidator.js` directly (pure allowlist check, zero network/government-system integration). **If the business model ever drifts toward CareBridge itself sponsoring, employing, or placing caregivers, it walks into exactly the wall Homesaeng hit.** Keep this boundary explicit in every version of the pitch.

## Competitive Landscape (reconciled, most-recent research wins on conflicts)

| Player | Category | Funding/Scale | Why they're not the same product |
|---|---|---|---|
| **CareNation (케어네이션)** | Caregiver-matching marketplace, est. 2013 | ~₩30.5B raised, Samsung Venture/Hana Ventures/Shinhan/LSK-backed, ₩112.7B valuation (Jan 2024), ~90 employees | Reverse-auction matching + Samsung Fire insurance bundling. No compliance/severance engine; structurally can't add one without cannibalizing its non-insurance private-pay model. |
| **Caring (케어링)** | Visiting care, facility ops | ~₩75B raised through Series B (SV/LB/Hyundai/Quantum/ARK-backed), ₩165.8B revenue, 100% direct-operated + ERP | Asset-heavy, physical-infrastructure-first. No deterministic compliance/severance layer. |
| **Caredoc (케어닥)** | Hospital/facility ops + matching | 160 hospital partnerships, 100K+ caregiver pool, ₩102.2B cumulative transaction volume | Facility-ops SaaS + IoT monitoring, pre-IPO track, pivoting toward asset-heavy senior real estate. Has hospital relationships CareBridge doesn't — but its software is ops/IoT, not subsidy-eligibility compliance scoring. |
| **Caresalary (케어샐러리)** | Agency payroll/scheduling SaaS | ₩16,500/mo, live, shipping features monthly (severance interim-settlement Aug 2026, AI assistant Sept 2026) | Owns home-visit-agency payroll/billing/scheduling. NOT nursing-hospital-specific. Do not compete head-on here — underpriced and outpaced. |
| **Korea Senior Research Institute / Smile Senior (스마일시니어)** | Visiting-care brand | Runs caregivers as individually-registered businesses (개인사업자), not employees | Sidesteps direct-employment/severance obligations — a regulatory exposure, not a strength. The 직고용 mandate is a plausible forced-migration event; CareBridge is a ready landing pad if/when that happens. |
| **Homesaeng / Hubriz** | Foreign domestic-helper (가사관리사) pilot operators — cautionary precedent, not a live competitor (program wound down) | N/A | Hit the visa-administration wall directly (see Moats section above). Different visa track (가사관리사/E-9, not 요양보호사 elder-care) from CareBridge's target market, but the structural lesson applies regardless of track. |
| **KStart (K-Work Partners)** | Foreign-worker/international-student life-support platform | ₩800M seed, KAIST Venture Investment-backed | Thesis validation (Korean VC appetite for the demographic/foreign-labor thesis is real), not a direct competitor — general life support, not visa-compliance or care-specific. |
| **Medison (메디슨)** | Hospital NHI-reimbursement factoring/fintech | N/A | Fronts hospitals their reimbursement money early to solve settlement-delay cash-flow problems created by the reform. Balance-sheet fintech, unrelated to eligibility scoring or caregiver compliance. |
| **Hyodol (효돌)** | AI companion robots | N/A | Hardware point-solution, not a compliance competitor. |
| **NHIS Smart Long-Term Care App** | Government incumbent | Free, near-mandatory | De facto default competitor by usage. Position CareBridge as complementary/ingesting data, not a replacement — preempt "why not just use the free tool." |
| **Deel / Remote / Papaya Global** | Category analogy (not Korea/elder-care) | N/A | Judges' likely mental model ("Deel for Korean elder-care labor"). Remote's "Compliance Watchtower" (real-time labor-law dashboard) is the closest external analog to CareBridge's MOHW policy-drift pipeline — usable framing, not a competitor. |

**Confirmed NOT found, across multiple independent search passes (this session + Claude cross-check):** hospital-subsidy-eligibility-scoring software, foreign-caregiver-specific credential/visa compliance as a dedicated product, actual wage escrow for caregivers. This is the real, narrow white space — narrower than "caregiver matching," and the pitch must say so explicitly.

## Regulatory Intel — 간병비 급여화 (Caregiving Fee National Insurance Coverage)

**Phase 1 pilot — currently running, most granular data available:**
- 20 nursing hospitals selected, ~60 patients/hospital, ~1,200 patients total.
- Eligible patients: 의료최고도/의료고도 (highest/high medical-need tier) + 장기요양 1-2등급 (LTC grade 1-2).
- Three staffing tiers hospitals choose from:
  | Tier | Ratio (day) | Caregivers/hospital | Copay rate | Daily copay |
  |---|---|---|---|---|
  | A형 | 1:8 | 17 | 40% | ₩9,756 |
  | B형 | 1:6 | 20 | 40% | ₩11,478 |
  | C형 | 1:4~6 | 25 | 50% | ₩17,935 |
- Support period: 180 days base, extendable to 300 days for highest-need patients, with copay escalating **15%/month after month 6** (more granular than the flat +10%/+20% currently in `longStayPenaltyEngine.js` — reconcile if this pilot's mechanics become the finalized national rule).
- Pilot cohort reality check: avg 47.3% of patients are highest/high-need tier, avg 323 beds, and **15 of 20 pilot hospitals use dispatch/agency staffing vs. only 5 of 20 using direct employment** — even the pilot cohort is mostly non-compliant with the direct-employment ideal today. This is a live compliance gap CareBridge's tooling is directly relevant to.

**National scale-up (announced direction, not yet finalized):**
- ~500 "의료중심 요양병원" (medical-centered nursing hospitals) to be designated by end of 2026.
- Budget: ₩6.5 trillion (2026-2030). National-scale pilot target: H1 2027.
- Prerequisites floated: 100+ beds, direct employment as a principle, 3-shift staffing, medical institution accreditation, adequate care-quality evaluation grades, non-covered-revenue-ratio and case-mix constraints. Conditional/phased designation being considered for hospitals not yet compliant within 1 year.
- July 2026 public forum reality check: only ~10% of caregivers nationally are directly employed; 66% under agency/brokerage contracts; 52% foreign nationals (47% Chinese); 48% hold no certification; 61% of hospitals do zero caregiver performance monitoring. Avg private 1:1 caregiving cost: ~₩3.7M/month.
- **Caregiver-hours boundary (correction, do not overclaim):** the current 24-hour single-caregiver model is **NOT currently illegal** — caregivers are excluded from Labor Standards Act hour limits entirely, and no separate law governs caregiver working hours yet (Chosun Ilbo 2026-02-26). Frame shortfalls as "does not meet the *forthcoming* direct-employment/staffing standard," never as a current legal violation.
- Political friction: Korean Association of Geriatric Hospitals has publicly called parts of the plan a "요양병원 말살 정책" (policy that kills nursing hospitals), objecting to hospital-selection criteria and copay design preceding finalized patient-classification/quality-evaluation systems.
- Adjacent: a national "의료-요양-통합돌봄" (medical-care-integrated community care) rollout is scheduled from March 2026, which MOHW says will connect to this reform.

**Long-stay copay penalty (separate, later-surfaced source — Seoul Economic Daily, named MOHW bureau director):** +10pp at 6 months, +20pp at 1 year, layered on the ~30% base rate. Currently encoded in `longStayPenaltyEngine.js`. Note the Phase-1-pilot source above describes a steeper, monthly-compounding 15%/month curve after month 6 — these two figures haven't been reconciled and may describe different phases/tiers of the same policy. Do not present either as final without checking which (if either) survives to the H1 2027 national rule.

**Correction — do not reuse the old framing:** Seoul's "foreign caregiver pilot" (외국인 가사관리사, launched Sept 2024, operators Homesaeng/Hubriz) is a **가사관리사** (domestic/childcare helper, E-9 quota) program — a different visa track and regulatory regime from institutional elder-care (요양보호사), CareBridge's actual target. The government decided Dec 22, 2025 not to convert it into a full program; it wound down ~Feb 2026. Its failure mode (became "English nanny for the wealthy" — a pricing/equity mismatch) does not map to CareBridge's severance/compliance thesis. Do not use this pilot as a "Why Now" catalyst for elder-care compliance — keep it only as a structural/regulatory-authority cautionary precedent (see Moats section).

**Sources:** 연합뉴스 (2026-07-28), 디멘시아뉴스 (2026-07-29/30), MOHW official press release on the 20-hospital Phase-1 pilot (list_no=1480898), 조선일보 (2026-07-08, 500-hospital designation plan), 의협신문/청년의사/청년의사 (Phase-1 tier mechanics), Seoul Economic Daily (long-stay penalty figures), Korea JoongAng Daily (Homesaeng quote), Donga Ilbo (2025-12-23, pilot non-conversion decision).

## Regulatory Surveillance Targets
- Sources: MOHW (보건복지부), NHIS (국민건강보험), MOEL (고용노동부).
- Watch keywords: 간병비 급여화, 요양병원 간병, 외국인 간병인 고용, 직접고용 의무화, 개인사업자 (contractor-classification loophole).
- Key committee: Health Insurance Policy Deliberation Committee (건정심) — has NOT yet issued a formal ruling on the national scale-up as of this writing.

## Korea Market Entry Plan (2026 rubric category 3 of 4 — settlement potential, now weighted heavily)
**Status:** structural facts verified live (2026-09-07); personal/specific items marked `[PAUL]` need founder input — not fabricated.

**Program timeline (next viable target = KSGC 2027; 2026 window closed June 17, 2026):**
- KSGC 2026 phases (template for the 2027 cycle, structure repeats): Discover (Jul–Sep, 80 teams) → Accelerate (Sep–Dec, 40 teams) → Scale (Dec–Jun, 20 teams). Workspace free in Pangyo + Gangnam all phases.
- Incorporation required mid-program (Phase 1 or 2) to receive financial awards — entity setup is a hard gate, not optional. KSGC provides incorporation + legal/accounting/HR assistance.
- Visa support for up to 3 team members: **D-10-2 (창업준비/startup-prep)** during Accelerate → **D-8-4 (기술창업/tech-startup)** during Scale after incorporation. D-10-2 requires startup-immigration score ≥35 OR K-Startup Grand Challenge recommendation; initial 6 months, up to 4 extensions (~2 yrs). D-8-4 requires the incorporated tech-company standing.
- Funding pool (2026 scale, verify 2027): ~$640K total — participation ~$212K, prize ~$252K, growth ~$166K; top-10 ~$320K + ~$11K settlement fund. **Do not bank a 2027 figure.**

**Plan elements to finalize (`[PAUL]` = needs founder's real decision/input, do not leave as placeholder):**
- **Entity type + timing** `[PAUL]`: 주식회사 (JSC) is the standard choice for KSGC award eligibility + foreign-founder ownership; timing = target incorporation to align with mid-program gate. Confirm type + month.
- **Target hub** `[PAUL]`: Pangyo vs Gangnam — KSGC offers both free. Recommend Pangyo (MSS/K-Startup ecosystem density, tech-startup positioning) unless a real partner/relationship favors Gangnam.
- **Local hiring plan** `[PAUL]`: first Korea-based hires + roles + timeline (real names/roles only; none to fabricate).
- **Local partner/customer conversations** `[PAUL]`: name any real contacts underway/planned (municipal welfare offices, hospitals, agencies). If none exist yet, say so — that is the single most valuable thing to go get (per thesis + this doc).
- **Revenue model in KRW terms** `[PAUL]`: pricing per facility/month, not USD SaaS abstraction. Anchor: agency-payroll competitor Caresalary charges ₩16,500/mo — CareBridge's compliance/subsidy-eligibility layer justifies a different (likely higher) price; propose KRW figure.
- **90-day Seoul soft-landing** (Pangyo hub), pre-warm KIC + accelerator relationships before arrival.

## KSGC Competition Context
- Korea Startup Grand Challenge, backed by MSIT + NIPA.
- Top prize ~$130,000 + follow-on settlement grants for top 20.
- Deadline/window status: **2026 window closed June 17, 2026 (verified 2026-09-07 via ksgc.global) — next viable target is KSGC 2027; confirm the 2027 window live when it opens.**
- 2026 priority sectors: Mechanical, Electrical/Semiconductor, **Information & Communication / ICT-AI (Software, Networks, AI, Cybersecurity, Data — OUR FIT)**, Chemical, Bio & Medical & Life Science, Energy, Craft/Design.
- Positioning: elder-care compliance framed as ICT/AI compliance infrastructure — deterministic software encoding labor law for clinical care delivery at scale. **Verified 2026 sector list (KSGC official guidelines) lists Information & Communication explicitly; the bio/medical framing was the earlier default and is now closed — lead with ICT/AI.**

## Pitch Architecture
1. **Hook** — demographic cliff (10M+ Koreans 65+, fastest-aging nation on earth) + ₩3.7M/month private-care cost crisis + 110K-worker shortfall by 2028.
2. **Vacuum** — Caredoc/Caring are asset-heavy and vacated the compliance layer; CareNation/Korea Senior Research Institute are structurally compliance-avoidant by design; Caresalary owns agency payroll but not nursing-hospital subsidy-eligibility. Say the narrow white space explicitly — do not let "caregiver matching" be the category judges compare us against.
3. **Solution** — Tri-Layer Compliance OS, deterministic statutory code, built against MOHW's actual Phase-1 pilot mechanics (not rounded talking points).
4. **Moat** — regulatory lock-in + AES-256-GCM encrypted, tamper-evident audit logs (real, live, tested — see Technical Note below) + switching-cost liability shield + hospital-eligibility/staffing-ratio/copay-penalty scoring nobody else has built.
5. **The Homesaeng answer, stated directly, not hoped around** — CareBridge sells compliance/scoring infrastructure to hospitals and agencies who already hold licensing/visa-sponsorship standing. We do not become the employer-of-record or visa sponsor. That's what lets us do what Homesaeng couldn't.
6. **GTM** — B2B2C via municipal welfare MOUs → regional agency adoption → SaaS + transactional fees. (Embedded-API-into-existing-platforms pivot was proposed as an alternative — see Open Strategic Questions below; not yet validated.)
7. **Ask** — 90-day Seoul soft-landing (Pangyo hub) → Seoul metro rollout → Korea as global benchmark.
8. **Robots framing** (2027 MOHW budget: ₩37.7B AI care-robot commercialization + ₩14.5B care-tech R&D, announced Sept 1, 2026): CareBridge is not a robot company — it's the compliance/pricing/transparency layer that makes the government's robot infrastructure build-out actually deployable on the human-labor side. Use to preempt "aren't robots the real solution."

## Judge Personas & Objections
- **VC-type:** "Why can't Caredoc clone this in 3 months?" → Caredoc is asset-heavy real estate, structurally incapable of lightweight compliance SaaS.
- **VC-type (harder version):** "Why not just back CareNation/Caring instead, they're already funded?" → They're domestic caregiver marketplaces; CareBridge is the compliance/pricing layer neither of them builds. Different category, not a smaller version of the same one.
- **Ministry/Policy-type:** "Foreign caregiver liability/legal shielding?" → The code encodes the law itself; architecture is the attorney. Legal retainers post-funding, not pre-MVP.
- **Ministry/Policy-type (Homesaeng version):** "A previous private operator said this can't be done independently of the Employment Ministry — what's different now?" → CareBridge sells to license-holders (hospitals/agencies), never becomes the sponsor/employer-of-record itself. See Moats section.
- **Tech/Scalability-type:** "Proprietary data moat?" → Every match/audit generates a cryptographic ledger; network effects compound with adoption; competitors start with zero compliance history.
- **Industry-insider-type:** "Why would 개인사업자-model agencies switch and take on more compliance burden?" → That structure is a regulatory time bomb, not an advantage — the 직고용 mandate trend forces eventual conversion. CareBridge is the pre-built compliant landing pad.

## Open Strategic Questions (explicitly unresolved — do not present as settled)
1. **Embedded-API GTM pivot** (sell compliance/payroll as an API that agencies/platforms like Caredoc/Caring integrate against, monetized per-transaction rather than direct SaaS seat) — proposed, not validated. Open questions: do Caredoc/Caring already have in-house compliance tooling or partnerships covering this (not checked)? Would agencies pay a transaction fee, or is this expected bundled free from EMR vendors (ezCaretech, BIT Computer)? Legal liability split between CareBridge (software), the agency (current employer-of-record), and the hospital (funding recipient) needs real legal review, not assumption.
2. ~~KSGC track framing~~ — **RESOLVED 2026-09-07:** verified KSGC 2026 sector list includes Information & Communication / ICT-AI explicitly; lead with ICT/AI, not bio/medical.
3. **Long-stay copay curve reconciliation** — flat +10%/+20% (currently coded) vs. 15%/month-compounding-after-month-6 (Phase-1 pilot data) — which one governs, or do different tiers use different curves. Needs a primary-source check closer to any pitch deadline.
4. **Adequacy-grade (입원급여 적정성평가) hard-gate vs. track-only** — sources describe the adequacy grade (1·2등급) as essential to the ~500-hospital designation, but `hospitalEligibility` currently treats it as track-only (not a denial condition). If it is actually a hard gate, the engine would pass a hospital the ministry would reject — a false certification. Decided after the national rule firms up, before any hospital-facing claims.

## What's Actually Built (verified against the live repo, 2026-09-07)
Repo: `dharmapi100/carebridge`, canonical clone `/Users/paulbasic/carebridge`. Node.js, Express API. No database wired yet (no live Postgres/Prisma despite being a target stack). **18/18 test files pass** (16 + remittance + arbitration), CI green (Node 18.x/20.x).

**Live in the running API (`src/api/server.js`):** complianceEngine (severance + 4 major insurances), secureSidecar (key-versioned encryption), policyWatcher, matchingEngine, credentialIngestor, visaValidator (local allowlist check only — no Hi-Korea/government-system integration exists, never has; fixed a false claim to the contrary in the response message this session), auditMonitor, piiScrubber, caregiverLedger, predictiveRiskEngine.

**Built, tested, AND wired into the live API (commit d467af9):** hospitalEligibility (+ its `generateGapReport()`, which merges hospital-level and ward-level staffing gaps into one consolidated report — matches the real-world precedent that Korean nursing-hospital certification is one decision, not separate facility/staffing approvals), staffingComplianceMonitor, longStayPenaltyEngine. **Not HTTP-wired (background/daemon by design):** llmExtractor + policyProposals (human-approval gate between an LLM reading MOHW press releases and the live policy thresholds — never auto-applies a change).

**Stubs — deleted as redundant/overclaiming (commit 76f5cff), do not describe as existing:** cryptoShield.js (labeled quantum-resistant but was plain SHA-512 — credibility risk), zeroKnowledgeVault.js (redundant with SecureSidecar). **Kept but reframed:** arbitrationEngine.js → ArbitrationEligibilityEngine (statutory eligibility only, no legal advice), remittanceEscrow.js (2026 rates fixed).

**Status:** no demo built yet, no daemon auto-starts by default, no live database. Pre-pilot, pre-demo. Do not generate outreach emails, pitch decks, or "fast-track" applications assuming a finished/deployed product exists.

## Working Rules
1. Live-verify anything volatile before it goes in a deck: prize amounts, program deadlines, budget figures, competitor funding rounds, regulatory thresholds still pending 건정심 approval.
2. Flag speculative claims as speculative — don't smooth them into confident narrative.
3. No demo scripts, outreach emails, or pitch decks until explicitly requested.
4. When a claim in this doc conflicts with a claim elsewhere (another doc, a prior session), this doc wins — but check the primary source before assuming this doc is right; it has been wrong before and been corrected in place.
5. Optimize to win first place, not just participate. Speak government-compliance/legal-liability-shield language, not "Uber for caregivers." Never use generic Western startup templates.
6. Feature ideas that aren't built yet go in `docs/BUILD_BACKLOG.md`, not here. This doc is verified facts + committed strategy only.
