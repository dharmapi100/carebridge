# What I'm Building — CareBridge

*The short version for friends, so you know what I've been doing with my life.*

## The honest one-liner

I'm building software that helps nursing homes and care agencies in South Korea follow their own labor laws. South Korea is getting old faster than anywhere on earth, the government is rewriting how elder care gets paid for, and the hospitals and agencies doing that work don't have the tools to keep up with the legal side of it. That's the hole I'm filling.

## The problem, in plain words

Three things are happening at once in Korea:

1. **There aren't enough caregivers.** Over 10 million Koreans are 65 or older, and the country is short something like 110,000 elder-care workers by 2028.
2. **The government is making care cheaper for families** by moving caregiving costs onto national insurance. That's a genuinely good thing.
3. **But with that money comes rules.** To qualify, hospitals have to employ caregivers directly instead of outsourcing them, track their hours properly, and handle severance pay and insurance correctly. If they get it wrong, they face audits and legal liability.

Most of the industry isn't ready. Roughly two-thirds of caregivers work under agency contracts, most hospitals don't even monitor caregiver performance, and a compliance check that should take minutes takes weeks. The people who run these facilities are care professionals, not payroll-and-labor-law specialists — and right now there's no software that speaks their language about the legal side.

## What I'm actually building

**Not** a "find a caregiver" app. There are plenty of those, and they're a different business entirely.

CareBridge is software **sold to the hospitals and care agencies themselves** — the legal-and-payroll backbone they're missing. It does three things:

- Helps them hire and staff caregivers who are properly credentialed and legally allowed to work (many caregivers are foreign nationals on visas).
- Computes the legal stuff deterministically — severance, overtime, the four mandatory insurance contributions — so it's right every time, with a tamper-proof audit record.
- Tells them, up front, whether they qualify for the government's new caregiving-subsidy program, and exactly what they'd need to fix to get there.

The core is already built and passing all its tests — 18 test suites, all green. This isn't a slide deck; the code runs.

## Why I think it can win

The companies that do caregiver *matching* (and there are some big, well-funded ones) can't easily add what I'm building — it would undercut their own business model, and they're mostly investing in physical facilities anyway. Meanwhile, the narrow thing I do — eligibility scoring and real compliance tooling — nobody else in the market has built. A hospital that adopts it can't easily switch away without losing its compliance history. That's the moat.

## And the bigger picture

The aging problem isn't Korea's alone — Japan, Taiwan, and much of the West are right behind. If I can make this work in Korea, the same software is exportable to all of them.

I'm using a Korean government startup program (KSGC) as my way in — a structured entry to Seoul with funding and visa support for the founding team, on the road to setting up an actual company there.

## Where I'm being honest with you

There's no revenue and no customers yet — that's normal at this stage and not what the program is checking. The software is real and tested; what doesn't exist yet is the *business* side — the first Korean hospital or agency signed up. That's exactly what the coming year is for.

I'm going to Korea to prove the thing works in the real world, with real hospitals. If you ever want the wonky technical tour, I'll bore you with the audit-engine details over a beer.

*— Paul*
