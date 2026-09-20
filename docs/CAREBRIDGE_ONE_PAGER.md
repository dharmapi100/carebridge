# CareBridge OS — One-Page Overview

**What we are in one line:** We encoded South Korea's labor law into software. CareBridge OS is the compliance, wage-transparency, and worker-classification operating system for the country's institutional elder-care labor market.

## The problem we solve

South Korea is the fastest-aging nation on earth, with 10 million+ people over 65 and a projected shortfall of ~110,000 elder-care workers by 2028. At the same time the government is moving caregiving costs onto national health insurance (간병비 급여화), it is pushing nursing hospitals toward *direct employment* of caregivers. That shift carries real legal weight: hospitals and care agencies now face statutory severance obligations, the four major public insurance enrollments, worker-classification audits, and staffing-ratio compliance — enforced by the Labor Standards Act and the Employee Retirement Benefit Security Act.

Most of the sector is not ready. Roughly two-thirds of caregivers nationally work under agency or brokerage contracts rather than direct employment, about half of hospitals do no caregiver performance monitoring, and audits that should take minutes take weeks. Care workers are high-turnover, often foreign nationals, and the compliance burden falls on facilities that have no tooling to manage it.

## What CareBridge OS is

CareBridge is not a "find me a caregiver" consumer app. It is B2B compliance-and-payroll infrastructure sold to hospitals and licensed care agencies. It has three layers:

- **A — Clinical/staffing fit.** Caregiver-to-facility matching on the basis of credentials, licensing standing, and shift/ratio requirements.
- **B — Labor & severance compliance engine (the core).** Deterministic code that computes statutory severance, overtime, and the four major insurances, and evaluates a hospital's eligibility and staffing-ratio standing against the government's actual caregiving-reform criteria.
- **C — Welfare transparency loop.** A worker-facing audit trail tracking credentials, hours, severance accrual, and visa category — cryptographically signed so it is tamper-evident.

The compliance engine is already built and test-verified: 18/18 test suites pass, covering severance, the four major insurances, visa eligibility (allowlist validation), hospital eligibility scoring, staffing-compliance monitoring, long-stay copay penalties, encrypted audit records, and more.

## Why this is defensible

1. **Regulatory lock-in.** We are the only platform we have found that encodes Korean severance and labor law into auditable, deterministic code. A facility that adopts CareBridge cannot switch without losing its compliance history.
2. **System-of-record gravity.** Ministry audits, insurance claims, and welfare reporting flow through the ledger once a facility adopts it.
3. **Forced adoption, not marketing.** Facilities adopt out of regulatory necessity; caregivers follow because it is how they get paid. No consumer acquisition cost.
4. **A narrow, specific white space.** We found no competitor building a hospital-subsidy-eligibility scorecard against the ministry's designation criteria (beds, direct-employment ratio, accreditation, staffing ratio), and none offering real compliance/severance tooling or wage escrow to caregivers. The incumbent caregivers-matching platforms (CareNation, Caring, Caredoc) are asset-heavy or marketplace models that cannot pivot into compliance infrastructure without cannibalizing their own business.

## Why Korea, and why now

The reform is live and unfinished. A 20-hospital pilot is running now, and the government has announced designation of ~500 "medical-centered" nursing hospitals plus a multi-trillion-won budget — but the final national rules are still pending committee approval, and even the pilot cohort is mostly non-compliant with the direct-employment ideal today. That gap is exactly what CareBridge's tooling addresses.

We are targeting the Korea Startup Grand Challenge (KSGC 2027) as our entry wedge — a soft-landing into Seoul (Pangyo hub) with an eye to the D-10-2 → D-8-4 visa path for the founding team. The same compliance infrastructure is later exportable to Japan, Taiwan, and Western Europe as those societies age too.

## Where we stand, honestly

CareBridge is pre-revenue and pre-customer — as is expected at this stage — but the core software is real, built, and test-verified, not a slide-deck concept. We sell to hospitals and licensed agencies who already hold the regulatory standing to employ caregivers; we deliberately do not become the employer-of-record or visa sponsor ourselves, which is what keeps us on the safe side of the regulatory wall that sank an earlier private pilot in this space.

**The ask:** a 90-day Seoul soft-landing to convert the built software into local hospital and agency pilots, and establish Korea as our global benchmark.

---

*Prepared for CareBridge (founder: Paul Basic). This overview reflects verified facts as of September 2026; specific funding figures, program deadlines, and regulatory thresholds are directional and are re-verified against primary sources before each presentation.*
