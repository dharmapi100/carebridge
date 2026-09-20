// Path: src/docs/pitch_strategy.md
# CareBridge Investor Pitch Strategy & Narrative

> **DRAFT — every factual claim below was source-checked on 2026-09-20; the ledger is
> `docs/VERIFICATION_LEDGER.md`. The only open item is the positioning line (marked below),
> which is Paul's call. Do not quote a number from this file without checking the ledger.**

## Core Positioning Statement

**⚠️ PENDING PAUL'S DECISION.** The previous line — *"the Enterprise Compliance & Cross-Border
Workforce Infrastructure"* — is retired: cross-border caregiver import is closed by verified
government policy (see "What changed" below). Three candidates:

- **A** — "CareBridge is the labor-compliance and payroll infrastructure for South Korea's elder-care
  market — the layer any matching platform, including a government one, needs underneath it."
- **B** — "CareBridge is the Enterprise Labor-Compliance Infrastructure for Super-Aged Societies."
- **C** — "We encoded Korean labor law into software. Robots solve the labor shortage; CareBridge
  solves compliance, wage transparency, and worker classification."

Until one is chosen, use **C** — it is already the master doc's one-line pitch and claims nothing
we cannot support.

## The Problem

- **The demographic wall.** South Korea has **10,514,000 people aged 65+** — 20.3% of the
  population (통계청 2025 고령자통계) — and is the fastest-aging OECD economy.
- **The labour gap.** An estimated **~110,000 caregiver shortfall by 2028** (이민정책연구원,
  2026-03; the government's own projection is 116,734).
- **The compliance trap.** The government is moving caregiving costs onto national health
  insurance (간병비 급여화) and requiring facilities to **directly employ** caregivers. That turns a
  staffing problem into a statutory one: severance (퇴직금), the 4 Major Public Insurances (4대보험),
  working-hour records, and PIPA obligations over caregiver and patient data.
- **The industry is not ready.** A verified 2026 survey of 227 hospitals / 7,167 caregivers found
  that only **10% of caregivers are directly employed**, **66% work under agency or brokerage
  contracts**, and **61% of hospitals do no caregiver performance monitoring at all**.
- Private 1:1 caregiving costs families about **₩3.7 million per month**.

## The Solution (CareBridge OS)

A B2B compliance and payroll layer for facilities that employ care workers. What it actually does
today:

- **Statutory severance and the 4 Major Public Insurances** — deterministic calculation against
  2026 rates, with drift-watch on MOHW / MOEL / NPS feeds.
- **Hospital subsidy-eligibility scoring** — scores a facility against MOHW's published designation
  criteria and produces a consolidated gap report.
- **Staffing-ratio and shift compliance** — checks against the forthcoming direct-employment and
  3-shift standard.
- **PII masking**, plus **AES-256-GCM encrypted, tamper-evident audit records**. GCM's auth tag
  makes records tamper-evident; it is **not** a signature scheme and does not prove who generated
  a record.
- **Credential verification**, and a **visa-category check against a locally maintained approved
  list**.

**Do not claim any Ministry of Justice / Hi-Korea / government-system integration.**
`visaValidator.js` is a local allow-list comparison and nothing in this repository calls a Korean
government API. Commercial third-party APIs that resell HiKorea data do exist (CODEF, 틸코블렛,
하이픈코퍼레이션, 알체라), but CareBridge has not integrated one.

## What changed in the market (verified 2026-09-20)

- **Cross-border caregiver import is closed as a wedge.** The 특정활동(E-7) '요양보호사' visa
  (created July 2024) requires a **Korean domestic college degree**, TOPIK 3+/KIIP 3, and caps
  foreign hires at **20% of a facility's domestic headcount**; it is a **two-year pilot**. At the
  54th 국무회의 (2025-12-16) the President directed MOHW not to import foreign caregivers, pushing
  part-time (시간제) work instead.
- **The remaining path is domestic:** foreign students already in Korea (D-2 → D-10 → E-7). Real,
  but a secondary module — not the headline.
- **The reform is the driver, not matching.** 500 의료중심 요양병원; a national pilot targeted at
  **H1 2027**; copay cut from 100% toward **~30% (still under consideration)**; ₩6.5tn over five
  years.
- Part-time and multi-site shift work is a **harder** severance / insurance / payroll problem than
  the old 24-hour salaried model. That is the tailwind — and why the compliance layer is the
  business rather than a feature.

## Scalability & Exportability

- **Software, not headcount.** Serving the 1,000th facility costs almost nothing more than serving
  the tenth. Competitors scale by hiring caregivers and renting buildings.
- **Export is potential, not traction.** The same stack is plausibly relevant to Japan, Taiwan and
  Western Europe. **No foreign market has been entered and no foreign customer exists.** Present it
  as TAM framing only.

## Defensibility

- **Switching cost.** Compliance history lives in the system; migrating off means recreating it.
- **Compounding data.** More facilities produce more wage, classification and audit data, which
  makes the engine more defensible for the next customer.
- **Audit records** are encrypted and tamper-evident, which is what an inspection needs.

**Do not claim "100% PIPA compliance"** or any other absolute. State the specific mechanism
(masking, encryption, access logging) and let the reader judge it.

## Honest status

No database, no scripted demo, no customer, no signed partner, no foreign traction, and no legal
review of the liability split between CareBridge, the agency and the facility. Pre-pilot.
