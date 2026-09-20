// Path: src/docs/ksgc_pitch_deck_outline.md
# CareBridge | KSGC Pitch Deck Master Outline

> **DRAFT — source-checked 2026-09-20. Ledger: `docs/VERIFICATION_LEDGER.md`.
> Corrected this session:** the Hi-Korea visa validator claim (we have no such integration),
> the unsourced $15B TAM and ₩5.2tn SAM, the cross-border training funnel as "key moat"
> (blocked by the E-7 domestic-degree rule), and two absolute claims.
> **Open:** the Slide 1 tagline — see `pitch_strategy.md` for the A/B/C options.

## Slide 1: Cover / Hook
- **Visual:** CareBridge OS logo, clean enterprise dark-mode aesthetic.
- **Tagline:** **⚠️ PENDING.** The old line ("Enterprise Compliance & Cross-Border Workforce
  Infrastructure") is retired — cross-border import is closed by policy. Interim, use:
  *"We encoded Korean labor law into software."*
- **Speaker Note:** "South Korea is aging faster than any nation in history. But the real crisis
  isn't only a shortage of hands — it's that the government is about to make every nursing hospital
  legally responsible for payroll, severance and working hours it currently tracks on spreadsheets."

## Slide 2: The Problem
- **Pain Point 1 (The Demographic Wall):** Korea has **10.51 million people aged 65+** (20.3% of
  the population) and the fastest-aging OECD economy. Estimated **~110,000 caregiver shortfall by
  2028**.
- **Pain Point 2 (The Compliance Trap, not a foreign-labour bottleneck):** The government is
  shifting caregiving costs onto national health insurance (간병비 급여화) and requiring facilities
  to **directly employ** caregivers. The verified industry position: **only 10% of caregivers are
  directly employed, 66% work through agencies or brokers, and 61% of hospitals do no performance
  monitoring at all.**
- **Pain Point 3 (The Regulatory Minefield):** Manual payroll exposes facilities to retroactive
  liability under the Labor Standards Act (severance), the 4 Major Public Insurances, and PIPA.
- **Do not use** a "facilities are forced to hire cross-border workers" framing: the President
  directed MOHW *against* foreign-caregiver import (54th 국무회의, 2025-12-16) and the E-7 route
  requires a Korean degree plus a 20%-of-domestic-headcount cap.

## Slide 3: The Solution (CareBridge OS)
- **Visual:** Architectural flow.
- **Core offering:** a **compliance and payroll layer for facilities that employ care workers**.
  *Do not call it "Korea's first" — the superlative is unverifiable.*
- **Key pillars (only what is built):**
  1. *Statutory Severance & Labour Compliance Engine* — severance, overtime thresholds, 4 Major
     Public Insurances on 2026 rates.
  2. *Visa-Category Check* — a **local approved-list comparison**. **Not** a Ministry of Justice or
     Hi-Korea integration; nothing in the product calls a government API.
  3. *PII Scrubber & AES-256-GCM Security Sidecar* — masking, key-versioned encryption,
     tamper-evident audit records.
  4. *Hospital Eligibility Scoring & Gap Report* — scores a facility against MOHW's published
     designation criteria.
  5. *Credential Verification* and *staffing-ratio / shift compliance*.

## Slide 4: Product Demo / Technology
- **Visual:** screenshot of the bilingual dashboard (`npm start` → `http://localhost:3000`).
- **Differentiators:**
  - Read-only policy drift-watch across MOHW / MOEL / NPS feeds — **proposes** threshold changes;
    a human approves them, nothing auto-applies.
  - Compliance audit computing cumulative severance liability and the 4 Major Public Insurances
    from a worker record.
  - **Tamper-evident** audit records (GCM auth tag) built for inspection. **Say tamper-evident, not
    "immutable" — the records are encrypted and authenticated, not immutable — and not "signed",
    which would imply proof of authorship.**

## Slide 5: Market Opportunity
- **⚠️ The previous TAM ($15B+) and SAM (₩5.2tn) are removed — no source supports either.** The
  ₩5.2tn appears to have been the *간병비 support budget line* from the reform, not a market size;
  do not put it back without a real bottom-up model.
- **Defensible ground-up counts instead (all verified):**
  - **1,280 요양병원** (nursing hospitals), 2026 Q2 — *and falling every year* (1,464 in 2021).
  - **4,758 노인요양시설** (elder-care facilities), 2025.
  - **23,373 재가급여** home-visit agencies, 2025.
  - **29,734 장기요양기관** in total, 2025.
  - ~270,000 nursing-hospital beds (MOHW, 2020 data).
- **SOM:** facilities facing the direct-employment transition — the consolidation story is a
  tailwind, not a headwind.
- Size the TAM only after a bottom-up model exists. **An unsourced number is worse than none.**

## Slide 6: Business Model (B2B SaaS)
- **Revenue:** tiered monthly subscription per facility, priced on bed capacity and caregiver
  headcount. Anchor: agency-payroll incumbent Caresalary charges **₩16,500/month** (verified), so a
  compliance/eligibility layer must be justified above that.
- **Expansion revenue:** audit-readiness reporting, additional facility sites.
- **Unit economics:** near-zero marginal cost per facility; software margins.

## Slide 7: Go-To-Market (rewritten — the cross-border funnel is dead)
- **Phase 1 — Facility landing.** Direct work with nursing hospitals and care facilities preparing
  for 직접고용 and the H1-2027 pilot.
- **Phase 2 — The government-app wedge.** The state is building a free public **'간병 알바 앱'**
  matching caregivers to nursing hospitals (조선일보, 2026-08-29), and pushing **part-time/시간제**
  work. That app matches; it does not compute prorated severance, 4-insurance withholding or
  working-hour records for short shifts. **Position CareBridge as the compliance layer underneath
  any matching platform — including a government one.** *(This app does not exist yet and its
  scope is unknown; present as positioning, not an integration.)*
- **Phase 3 — Domestic pipeline.** Foreign students already in Korea (D-2 → D-10 → E-7 요양보호사)
  are the only viable foreign-caregiver path. A secondary module, not the headline.
- **Export (potential only):** Japan and Taiwan face the same demographic curve. **No foreign
  market entered, no foreign customer.**

## Slide 8: The Regulatory & Risk Moat
- **Liability position:** enterprise compliance-automation software with tamper-evident audit
  records. The facility keeps legal governance and uses CareBridge as its evidence layer.
- **PIPA:** PII is masked before storage and payloads are encrypted (AES-256-GCM, key-versioned).
  **Do not claim "zero raw storage" without verifying every path — state the mechanism instead.**
- **Be explicit about the boundary:** CareBridge does **not** become the employer of record, the
  visa sponsor, or the placement agent. That is what keeps us clear of the wall a previous private
  operator hit (Homesaeng — pilot wound down after the 2025-12-22 decision not to make it a full
  programme).

## Slide 9: Team & Vision
- **Vision:** making statutory labour compliance automatic for the institutions that care for
  super-aged societies.
- **Mission:** dignity in elder care, underwritten by software that gets the law right.
- **Founder:** Paul Basic — American citizen, satisfies the KSGC main-track non-Korean-national
  CEO requirement.

## Slide 10: The Ask
- **The ask:** KSGC acceleration, and introductions to facilities and municipal welfare bodies
  preparing for the 직접고용 transition.
- **Do not present Ministry of Justice or MOEL "pilot programs" as planned** — no such partnership
  exists or has been discussed. Frame them as an aspiration to explore, not a roadmap item.
- **Closing:** "CareBridge: getting labour compliance right for the people who care for Korea's
  oldest."