# Verification Ledger — CareBridge claims vs. sources

**Purpose:** every factual claim that appears in CareBridge pitch/strategy material, checked against a primary or named source before it goes in front of a judge. Nothing enters the master doc unless it appears here as CONFIRMED, or explicitly carries a "conflicting sources" note.

**Method:** Firecrawl search + scrape of Korean primary sources (MOHW/보건복지부, MOJ/법무부, immigration.go.kr, 의협신문, 의료&복지뉴스, 국민일보, 중앙일보, 조선일보, THE VC / startup media). Verdicts: CONFIRMED / PARTLY / WRONG / UNVERIFIABLE / CONFLICT.

---

## A. My own pass — 2026-09-18 (reform mechanics + budget curve)

### A1. Per-year budget — CONFIRMED, and now precise
Source: 의협신문, `doctorsnews.co.kr/news/articleView.html?idxno=161308` (2025-09-22 공청회 report), quoting 이중규 MOHW 건강보험정책국장.
Verbatim: *"간병 급여화에는 5년간 모두 6조 5000억원의 재정이 든다. 상세 내역은 ▲2026년=간병비 지원 2700억원+수가인상(정책+성과) 1000억원 ▲2027년=간병비 지원 5400억원+수가인상 2000억원 ▲2028년=간병비 지원 1조 3000억원+수가인상 3000억원 ▲2029년=간병비 지원 1조 8000억원+수가인상 3000억원 ▲2030년=간병비 지원 1조 8000억원+수가인상 4000억원"*

**Doc said:** ₩270B (2026) → ₩540B (2027) → ₩1T+ (2028)
**Actual:** 2,700억 ✓ → 5,400억 ✓ → **1조 3,000억** (doc's "₩1T+" understates it) → 1조 8,000억 (2029) → 1조 8,000억 (2030)
Total ₩6.5T, split 간병비 ₩5.2T + 수가 인상 ₩1.3T.
→ **Action: replace with the exact five-year table.** It is stronger and it is sourced.

### A2. Long-stay penalty — CONFIRMED (the coded rule is the right one)
Same source, verbatim: *"180일 이상 장기 입원 환자에게는 간병비 수수가 10%를 낮추고, 본인부담률을 10% 높이며, 360일 이상 입원은 간병비 수가 20% 삭감, 본인부담률 20% 상향 등으로 조정한다."*
→ 180 days: 수가 −10%, copay +10pp. 360 days: 수가 −20%, copay +20pp.
**This matches `longStayPenaltyEngine.js` (+10pp at 6 months, +20pp at 1 year).** 6 months = 180 days ✓, 1 year = 360 days ✓ (the doc says 365 — minor, correct to 360).

### A3. The "15%/month compounding" figure — WRONG as stated
No source found describing a 15%/month compounding copay curve. What exists is a **stepwise pilot escalation**, not compounding:
Source: 충남대병원 배포 PDF 「ʼ25년 하반기 요양병원 간병지원 시범사업 개선사항」, verbatim: *"180일 이용 후 종료자: 기본 본인부담률(A,B형 40%, C형 50%) 적용. 270일 이용 후 종료자: 연장 3개월차(A,B형 50%, C형 60%)로 적용."*
→ Base 40/50% → at the 3rd extension month (270 days) 50/60% → further steps after.
→ **Action: delete "15%/month after month 6" from the doc.** It is the pilot's step-based extension ladder, mis-stated as a compounding curve. This closes Open Question #3.

### A4. 500-hospital timeline — CONFLICT, do not state as settled
- **의협신문 (2025-09-22 공청회):** *"1단계로 내년(2026년)에는 **200곳 4만 병상**, 2028년 350곳 7만 병상, 2030년 500곳 10만 병상"* — phased 200 → 350 → 500 by 2030.
- **조선일보 (2026-07-08):** "정부 간병비 지원 요양병원, 올 연말에 500곳 일괄 지정" — 500 by end of 2026.
- **매경 via 의료&복지뉴스 / jnjeil (earlier, 국정기획위 report):** *"현재 20개 요양병원에서 시행중인 간병지원 시범사업을 **2029년까지 500개로 늘린 뒤** … **2030년부터** 매년 2조 1,000억원을 투입, 본사업"* — 500 by 2029, full business 2030.
→ **The doc currently asserts the 2026 figure as fact.** Present it as: MOHW's published direction has shifted across documents (200→350→500 by 2030 at the Sep-2025 공청회; 500 by end-2026 per Jul-2026 press; 500 by 2029 / full business 2030 per an earlier 국정기획위 roadmap). **Confirm at the source closest to any pitch deadline.**

### A5. Copay target — CONFIRMED, with wording caveat
Two independent sources (의협신문; 매경 via 의료&복지뉴스): *"간병비 본인부담률은 30% 안팎이 될 전망"* / *"40~50%보다 낮은 30% 수준을 고려하고 있는 것으로 전해졌다."*
→ Correct to "**under consideration** (~30%), versus 40–50% now in the pilot" — not a settled rate.

### A6. Staffing basis for the national plan — CONFIRMED
의협신문: *"간병 기준 병상은 4인실이며, 환자 4명당 간병인 1인을 배치해 1일 3교대로 운용한다."*
→ 4-bed rooms, 1 caregiver per 4 patients, 3 shifts/day. This is the national-plan basis, distinct from the pilot's A/B/C tier table.

### A7. ⚠️ CORRECTION TO MY OWN EARLIER FINDING — `hospitalEligibility.js`
I told you the adequacy grade was correctly track-only because "MOHW has not published a minimum grade". **A source contradicts that.**
Source: 의료&복지뉴스 / jnjeil, verbatim: *"복지부는 지난해 간병지원 시범사업 요양병원을 선정하면서 △의료기관 인증 획득 △**2주기 3차 요양병원 적정성평가 1, 2등급** △**4인실 이상 일반병상 172개 이상** △입원환자 중 의료최고도, 의료고도 환자 비중 **1/3 이상** 등을 기준으로 제시한 바 있다."*

MOHW has published at least these numeric/status thresholds — for **pilot selection**:
| Criterion | Published threshold | Engine treats it as |
|---|---|---|
| Medical accreditation | required | hard gate ✓ |
| 적정성평가 grade | **1 or 2등급** | track-only — **understates a published rule** |
| 4-bed-or-larger general beds | **≥172** | not modelled |
| 의료최고도/고도 patient share | **≥1/3** | not modelled |

→ **Caveat that must be checked before acting:** these are the criteria MOHW used to select the **20-hospital pilot** in 2024, not necessarily the 500-hospital designation rule. But the engine's comment "has not published a minimum grade" is **too strong** — a minimum grade has been published for at least one designation round. Open Question #4 is now sharper, and `hospitalEligibility.js`'s header comment needs correcting.

---

## B. Delegated verification — all four clusters complete (2026-09-20)

### B1. Korean market size + demographics — 14 claims
**CONFIRMED (10):** beds ~270,000 (MOHW 제5차 국민보건의료실태조사: 요양병상 271,999 in 2020); 노인요양시설 4,758 in 2025, up from 4,057 in 2021 (e-나라지표/보건복지부); 10M+ aged 65+ (통계청 2025 고령자통계: 10,514,000 = 20.3%); fastest-aging nation; ~110,000 caregiver shortfall by 2028 (이민정책연구원, 2026-03-15; government projection 116,734); ₩3.7M/month private 1:1 caregiving (장석용 연세대, 2026-07-28); ~10% directly employed; ~66% agency/도급; ~61% of hospitals do zero monitoring.

**PARTLY (3):**
- **요양병원 count — the doc's "~1,400-1,500" is out of date.** NHIS 자율공시 「연도별 요양기관 현황」: 1,464 (2021) → 1,435 → 1,392 → 1,342 → 1,306 (2025) → **1,280 (2026 Q2)**. Falling every year. *(I verified this table myself in a browser.)*
- "52% foreign nationals (47% Chinese)" — 47% is the share of **all** caregivers who are Chinese, not 47% of the 52% foreign group.
- "48% hold no certification" — 48% hold **no certification of any kind**; the share lacking a 요양보호사 cert specifically is 57%.

**WRONG (1):** **"~79,000+ 요양 institutions total nationally" has no basis.** All 장기요양기관 = **29,734 (2025)**; all 요양기관 (incl. 의원·약국) = **105,271 (2026 Q2)**. The ~79,000 figure is 노인복지시설 in **2019** (a different, older category).

### B2. Competitor funding — 14 claims
**CONFIRMED (10):** CareNation ~₩30.5bn cumulative + investor set; Caring ~₩75bn through Series B (SV인베스트먼트 lead, LB, 현대투자파트너스, 퀀텀벤처스, 아크임팩트); Caring ₩165.8bn revenue + 100% direct-operated; Caredoc 160 partner hospitals / 100k+ caregiver pool / ₩102.2bn cumulative GMV; Caredoc pre-IPO, KOSDAQ target 2027; Caresalary ₩16,500/month; KStart ₩800m seed (KAIST청년창업투자지주); Hyodol founded 2009, self-styled Korea No.1 care robot; Homesaeng(홈스토리생활)+Hubriz(휴브리즈) ran the Seoul pilot; 외국인력정책위원회 2025-12-22 declined the full programme; pilot launched Sep 2024.

**PARTLY (4):**
- **CareNation ₩112.7bn valuation — the exact figure is unsourced.** The Jan-2024 round and ">₩100bn (예비유니콘)" are confirmed; no Korean report states 1,127억.
- CareNation "~90 employees" — founded 2013 ✓; headcount is **55 (THE VC, 2026-06) to 80 (JobKorea)** standalone, ~490 group-wide.
- **Caresalary "AI assistant Sept 2026" — contradicted.** Its changelog shows AI features already on 2026-08-05; September entries are AI *updates* (AI 일정 자동편성 9/11). Severance interim-settlement (2026-08-01) is confirmed.
- Caredoc ₩102.2bn GMV is a **stale snapshot** — 2025 reporting already cites ₩3,000억+.

### B3. KSGC programme facts — 14 claims + 2027 status
**CONFIRMED (10):** 2026 window closed 2026-06-17 15:00 KST; phases Discover/Accelerate/Scale; 80/40/20 teams; free workspace Pangyo + Gangnam; incorporation required to receive awards ("Legal entity incorporation and local hiring are required in Phase 3"); funding pool; sector list; CEO must be non-Korean; D-10-2 (Phase 2) → D-8-4 (Phase 3) for up to 3; D-10-2 via score ≥35 **or** KSGC recommendation.

**WRONG (2):**
- **"Top prize ~$130,000" is wrong.** Official 2026 guidelines: **Prize Money 1st = KRW 100 million** (~USD 70,000), 2nd ₩70M, 3rd ₩50M, 4th ₩40M, 5th ₩30M, 6th–8th ₩10M, 9th–20th ₩5M. *(I verified this in the guidelines PDF myself.)*
- "backed by MSIT + NIPA" — the 2026 programme is **Ministry of SMEs and Startups (MSS)**, operated via KISED/GCCEI. NIPA ran KSGC only through the 2023 cycle.

**PARTLY (3):**
- Sector name is **"Information & Communication"** (Software · Networks · AI · Cybersecurity · Data) — not "ICT-AI". Other categories: Electrical & **Electronics**, **Chemical & Textile**, Bio & Medical & Life Science, Energy & **Resources**, Craft & Design.
- "Top-10 receive ~$320,000 + ~$11,000 settlement" — traced to a **2022** listing; the 2026 schedule differs (top 10 ≈ ₩330M; the ~$11k item was *living expenses*, not settlement support).
- Selection scale is **~100 teams total** across two tracks (Main 80 + International Student 20); programme period July 2026 – April 2027.

**2027 cycle: NOT open, no dates published.** Expected cadence ~spring 2027 (the 2026 call went out 2026-05-06).

### B4. TAM/SAM, robot budget, Hi-Korea — 10 claims
**CONFIRMED (6):** MOHW 2027 budget ₩37.7bn for care-robot commercialisation and ₩14.5bn new care-tech R&D, both approved at 국무회의 on **2026-09-01** (MOHW press release; 장관 정은경); 의료-요양-통합돌봄 법 시행 **2026-03-27**; 간병비 급여화 national pilot targeted **H1 2027**; copay cut from 100% toward ~30%.

**UNVERIFIABLE (2) — remove from any deck:**
- **"$15B+ global elder-care compliance and workforce management market"** — no publisher states this. Nearest adjacent: long-term care software $5.9bn (2024); care-home management software ~$3.2bn (2024).
- **"₩5.2 trillion Korean LTCI and nursing-facility administrative market"** — no source. Real LTCI figures are differently scoped and much larger (LTCI 급여비 ₩17.7tn in 2025). The ₩5.2tn in the budget table above is the **간병비 support line**, not a market size — the pitch deck appears to have conflated them.

**PARTLY (2):**
- "Caregivers excluded from Labor Standards Act hour limits" — **true for private 간병인** engaged as 가사사용인, **not** for facility-employed 요양보호사 or 간호(조무)사, who are covered employees. The blanket phrasing overstates.
- "500 hospitals by end of 2026, ₩6.5tn across 2026-2030" — see A4; ₩6.5tn is a **5-year** figure, and the designation timeline conflicts across sources.

**Hi-Korea integration: PARTLY.** Commercial third-party APIs that resell HiKorea/외국인등록증 data **do exist** (CODEF `developer.codef.io`, 틸코블렛, 하이픈코퍼레이션, 알체라) — several describe themselves as scraping-based. But **no MOJ/MOHW official programme** offering a branded private "Hi-Korea API" was found. So: CareBridge's own `visaValidator` remains a local allowlist (correct as documented), and `src/docs/pitch_strategy.md` claiming a "Hi-Korea visa" integration is **misleading and must go**.

## C. Claims already visible as unsupported in tracked pitch files (not yet verified)

| File | Claim | Problem |
|---|---|---|
| `src/docs/pitch_strategy.md:10` | "**Hi-Korea visa** …" integration | The master doc states there is **no** Hi-Korea/government API integration. Directly contradictory. |
| `src/docs/pitch_strategy.md:17` | "ensure **100%** PIPA compliance" | Absolute claim; no system can guarantee this. |
| `src/docs/ksgc_pitch_deck_outline.md:31` | TAM "$15B+ global elder-care compliance and workforce management market" | No source cited anywhere. |
| `src/docs/ksgc_pitch_deck_outline.md:32` | SAM "₩5.2 trillion South Korean LTCI … market" | No source cited; the ₩5.2T in the budget above is the *간병비 support* line, not an LTCI market size. Possible conflation. |
| `docs/WHERE_WE_ARE.md:17` | "Service modules: 21 in `src/services/`" | I wrote this. Actual: **19 `.js`** files (18 services + a test harness) plus 2 vestigial `.ts`. Fix. |