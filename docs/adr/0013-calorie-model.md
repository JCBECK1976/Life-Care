# ADR 0013 — Calorie model: BMR × 1.15 baseline, deficit %, net activity credit

- **Status:** Accepted (JC, 14 Nov 2026). Built in v2.17.1 (build). Replaces fixed per-person kcal targets/deficits and the v2.16.2 R6 approach.
- **Context:** fixed targets (2,000–2,200 / 1,700–1,900) ignore body composition and activity. The first R6 design credited "total − BMR", which double-counts everyday movement already covered by a maintenance figure, and kcal deficits don't scale between people.
- **Decision:** per [docs/design/CALORIES.md](../design/CALORIES.md):
  - BMR by Katch-McArdle from recent weigh-ins, with labelled fallbacks.
  - Baseline = BMR × 1.15; goal = baseline × (1 − deficit %), default 20%; never below BMR.
  - Activity credit net of the baseline: total burned − baseline when Health provides it; otherwise steps above a per-person allowance plus exercise (MET − 1) × kg × h.
  - The R5 adjustment % applies to the credit.
- **Alternatives rejected:** fixed kcal deficits (don't scale); total − BMR (double-counts daily life); adding steps and exercise on top of total burned (double count).
- **Open:** the BMR floor makes any deficit above ≈ 13% equal the floor (HANDOVER decision).
