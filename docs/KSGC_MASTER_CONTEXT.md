# KSGC / CareBridge Master Context

**Founder:** Paul Basic. **Project:** CareBridge OS. This is the sole public identity for the venture — see identity note below.

## Founder Identity / Naming (resolved)
"Aegis Care" is **not** CareBridge. It is a generic, unrelated elder/home-care brand already in use by unaffiliated companies in the US, UK, Canada, and Australia (Aegis Living, Aegis Care Solutions – Leeds, Aegis Care Operations Ltd – Canada, Aegis Care Partners – Australia). None are Korea-related or competitors. It carries zero name distinctiveness for trademark/SEO/investor purposes and should **not** be used as CareBridge's public-facing DBA unless a Korean trademark search explicitly clears it. Default: use "CareBridge" / "CareBridge OS" everywhere.

## Product Identity
- **Product:** CareBridge OS — Tri-Layer Compliance & Smart Matching Platform for South Korea's elder-care labor market.
- **Layers:** A) Clinical Matching, B) Korean Labor & Severance Compliance Engine, C) Welfare Transparency Loop.
- **Core value prop:** Encodes the Labor Standards Act + Employee Retirement Benefit Security Act into deterministic code, turning multi-week MOEL audits into 5-minute cryptographic compliance ledgers. Not a consumer matching app — the compliance/payroll OS for high-turnover care labor.
- **Public narrative:** "Building the standard for super-aged societies across Asia."

## KSGC Competition Context
- Korea Startup Grand Challenge, backed by MSIT + NIPA.
- Top prize ~$130,000 + follow-on settlement grants for top 20.
- 2026 priority sectors: Mechanical, Electrical/Semiconductor, ICT/AI, Chemical, **Bio & Medical & Life Science** (our fit), Energy, Craft/Design.
- Positioning: elder-care compliance framed as bio/medical infrastructure — labor compliance enables clinical care delivery at scale.

## Competitive Landscape (expanded, live-researched)

| Player | Category | Focus | Vulnerability / Relevance |
|---|---|---|---|
| **Caredoc (케어닥)** | Direct competitor | Hospital matching, senior housing, pre-IPO track, ₩300B+ cumulative GMV | Pivoting into asset-heavy real estate; abandoning software/compliance layer |
| **Caring (케어링)** | Direct competitor | Visiting care, welfare-center ops | ₩40B raised through **Series C** (corrected from earlier "Series B"), ₩165.8B revenue. Larger than previously tracked. Heavy physical infra, low software modularity, no compliance layer |
| **CareNation (케어네이션)** | Direct competitor, founded 2013 | P2P caregiver marketplace on 비급여 (non-insurance private-pay); caregivers self-price, chosen via reviews | Pure marketplace model — no labor-compliance layer, structurally can't pivot without cannibalizing itself |
| **Korea Senior Research Institute (한국시니어연구소)** | Direct competitor — **previously untracked, high priority** | Owns "Smile Senior" (스마일시니어) visiting-care brand | Runs caregivers as individually registered businesses (개인사업자), not employees, sidestepping direct-employment/severance obligations. This is precisely the loophole the 직고용 mandate targets — a forced-migration event for their whole model is a plausible near-term catalyst, and CareBridge is the ready landing pad |
| **Hyodol (효돌)** | Adjacent, not a compliance competitor | AI companion robots | Hardware point-solution, no compliance backend |
| **NHIS Smart Long-Term Care App (스마트장기요양앱)** | Government incumbent/dependency | Free, near-mandatory 급여제공관리 tool for LTC institutions | De facto default competitor by usage; need a clear story for "why not just use the free NHIS tool" — position as complementary/ingesting, not a replacement |
| **7-startup fair-competition coalition (Mar 2025)** | Market signal | Joint statement incl. Korea Senior Research Institute + 6 others | Signals a consolidating, organizing incumbent bloc — supports "why now" urgency |
| **Deel / Remote / Papaya Global** | Category analogy (not Korea/elder-care) | Global EOR/compliance-as-a-service | Judges' likely mental model ("Deel for Korean elder-care labor"). Remote's public "Compliance Watchtower" (real-time labor-law-change dashboard) is the closest external analog to our MOHW policy-drift pipeline — borrow the framing |

**Moat:** Regulatory Lock-In + System-of-Record Gravity. Switching off CareBridge exposes agencies to MOEL audits and criminal liability for payroll/severance miscalculations. Unlike asset-heavy incumbents (Caredoc/Caring) or compliance-avoidant business models (CareNation, Korea Senior Research Institute), CareBridge is the only player where compliance rigor is the product, not a cost center.

## Market Intel
- 10M+ Koreans aged 65+; fastest-aging nation on earth.
- 110,000-worker elder-care labor shortfall projected by 2028.
- 1:1 private caregiving averages ₩3.7M/month; "care bankruptcy" (간병 파산) is a live crisis term.
- Government pushing direct-employment (직고용) mandates + NHIS caregiving-cost subsidization (간병비 급여화) for 100+ bed nursing hospitals.
- Seoul's foreign-caregiver pilot (외국인 가사관리사 시범사업, launched Sept 2024) hit cost/wage/broker friction but was **extended through 2025**, not cancelled — evidence of continued government appetite, not abandonment.
- Target market: ~227 medical nursing hospitals + 1,500+ regional care centers, Seoul-Gyeonggi-do corridor.

## Regulatory Surveillance Targets
- Sources: MOHW (보건복지부), NHIS (국민건강보험), MOEL (고용노동부).
- Watch keywords: 간병비 급여화, 요양병원 간병, 외국인 간병인 고용, 직접고용 의무화, 개인사업자 (contractor-classification loophole).
- Key committee: Health Insurance Policy Deliberation Committee (건정심).

## Pitch Architecture
1. Hook — demographic cliff + ₩3.7M cost crisis + 110K shortfall.
2. Vacuum — Caredoc/Caring vacated the compliance layer; CareNation and Korea Senior Research Institute are structurally compliance-avoidant by design; Seoul's pilot proved government demand and got extended.
3. Solution — Tri-Layer Compliance OS, deterministic statutory code.
4. Moat — regulatory lock-in + cryptographic audit ledgers + switching-cost liability shield.
5. GTM — B2B2C via municipal welfare MOUs → regional agency adoption → SaaS + transactional fees.
6. Ask — 90-day Seoul soft-landing (Pangyo hub) → Seoul metro rollout → Korea as global benchmark.

## Judge Personas & Objections
- **VC-type:** Why can't Caredoc clone this in 3 months? → Caredoc is asset-heavy real estate, structurally incapable of lightweight compliance SaaS.
- **Ministry/Policy-type:** Foreign caregiver liability/legal shielding? → The code encodes the law itself; architecture is the attorney. Legal retainers post-funding, not pre-MVP.
- **Tech/Scalability-type:** Proprietary data moat? → Every match/audit generates a cryptographic ledger; network effects compound with adoption; competitors start with zero compliance history.
- **Industry-insider-type (new):** Why would agencies on the 개인사업자 model switch and take on more compliance burden? → That structure is a regulatory time bomb, not an advantage — the 직고용 mandate trend forces eventual conversion. CareBridge is the pre-built compliant landing pad for that forced migration.

## Technical Context
- Stack: Node.js/TypeScript, PostgreSQL + Prisma ORM.
- Core engine: `complianceEngine.js` — deterministic severance, 1.5x overtime, 4대 보험 bracket calcs.
- MVP status: working architecture, DB schema, compliance API endpoint. Emphasize tangible execution over finished product for KSGC.
- Repo demo: local HTML (index.html) showing audit output + encrypted dispatch tokens.

## Strategic North Star
1. Optimize to win first place, not just participate.
2. Prioritize regulatory timing + institutional partnerships over consumer traction.
3. Speak government-compliance/legal-liability-shield language, not "Uber for caregivers."
4. Preparing for 90-day Seoul soft-landing (January cohort), pre-warmed KIC/accelerator relationships.
5. Tone: investor-grade, battle-tested, hyper-localized — never generic Western startup templates.
