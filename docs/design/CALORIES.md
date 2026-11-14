# Calorie model (v2.17.1; safe minimum v2.17.2; person goals v2.18.0)

> **Since v2.18.0** the aim comes from the person's goal (§7, [ADR 0014](../adr/0014-person-goals.md)); the deficit % (§2) is internal only and the v2.17 calorie line and Week so far card (§4) are replaced by the Planned | Actual table.

Per person. Replaces the fixed kcal targets/deficits and the earlier R6 "BMR + (total − BMR)" idea. Decision: [ADR 0013](../adr/0013-calorie-model.md). Code: `src/lib/calories.js` (pure functions, tested in `tests/v2171.spec.js`).

## 1. BMR (energy at rest)
- **Katch-McArdle:** BMR = 370 + 21.6 × lean mass (kg). Lean mass = weight × (1 − body fat %), each the average of the **last 3–4 weigh-ins** that have body fat. Weights are stored in stone and converted.
- **Fallbacks, labelled "estimate":**
  1. Mifflin-St Jeor from weight, height, age and sex: 10 × kg + 6.25 × cm − 5 × age + 5 (male) or − 161 (female).
  2. No weight: the same formula with UK adult averages for the sex (male 85 kg / 175 cm, female 72 kg / 162 cm), age 45 if unknown.

## 2. Baseline, goal and floor
- **Baseline** (sedentary maintenance) = BMR × **1.15**.
- **Goal** = baseline × (1 − deficit %). Deficit % per person, **default 20%**, changeable on the calorie card (0–40%).
- **Safe minimum (v2.17.2, JC):** goal = max(goal, safe minimum), where safe minimum = **max(90% of BMR, 1,200 kcal for women / 1,500 kcal for men)**. When it applies the card says "limited to your safe minimum" and shows what the deficit would have given.
  - Replaces v2.17.1's "never below BMR", which made any deficit above ≈ 13% equal the floor. With 90% of BMR, deficits up to ≈ 21% are not floored.

## 3. Daily activity credit (net of resting burn — BMR is never counted twice)
a) **Total calories burned for the day** (Google Health / Apple Health): credit = max(0, total − baseline). Steps and exercise are **not** added on top.
b) Otherwise:
   - **Steps** above a per-person **basal step allowance**: the steps already "inside" the baseline. allowance = steps equivalent of [0.15 × BMR − 10% of the goal], at 0.5 kcal per kg per km, stride ≈ height × 0.415, clamped 2,000–3,500. Steps credit = max(0, steps − allowance) × stride × 0.5 × kg.
   - **Logged exercise:** net kcal = (MET − 1) × kg × hours. MET per exercise type (Compendium of Physical Activities): weights 5.0, bodyweight 3.8, cardio 7.0, timed holds 2.8, stretching 2.3. Duration = the session length if recorded, otherwise sets × 3 min.
c) The total credit × the person's **activity adjustment %** (R5, default 100%).

Steps from Google/Apple Health are stored per day (`dailyActivity[date].steps`) and shown on that day in My Exercise.

## 4. Display
- **My Eating (each day) and Home (today):** "Goal · Food · Activity +N (steps: +a · exercise: +b) · Left", "Your first ~N steps are already in your goal", and "How this is calculated" (BMR and method, × 1.15, deficit %, step allowance, floor, estimate labels).
- **Home → Week so far: Plan vs Actual:** complete days only (Sunday → yesterday). Eating = food vs that day's goal + credit (green within ±10%, amber ±10–20%, red beyond; nothing logged = **skipped** and shown as "N days not logged", v2.17.2); exercise = sessions done vs planned; overall = the average. Today shown separately; future days never count.

## 5. Worked example (tested)
91.9 kg, 25.5% fat → lean 68.5 kg → BMR **1,849** → baseline **2,126** → safe minimum **1,664** → 20% deficit **1,701** (not floored); 30% → 1,488, limited to **1,664**. At 10%: **1,913**. JC's step allowance (178 cm) **3,160**; Becks's (165 cm, 10.4 st, 30%) **3,500** (clamped). The allowance depends on the goal, so it rose from v2.17.1's 2,724 / 3,027 when the goal stopped being floored at BMR. 10,000 steps → +232 kcal; 30 min weights → +184 kcal; 2,900 kcal burned (Health) → +774 kcal (nothing added on top).

## 6. Old settings (v2.17.2)
The v2.16.x kcal `deficit` and the R6 admin switch `r6Active` are removed from each person's `calorieSettings` by a one-off, idempotent clean-up when the data loads (nothing else is touched).

## 7. Person goals (v2.18.0, [ADR 0014](../adr/0014-person-goals.md))
Code: `src/lib/goals.js` (pure, tested in `tests/v2180.spec.js`); UI `components/GoalSetup.jsx`, `PlanActual.jsx`, `TodayCard.jsx`.

### 7.1 Goals
| Goal (user-facing) | Description shown | Aim (daily) | Companion focus |
|---|---|---|---|
| Work towards a healthy body weight | Lose weight steadily and improve your body composition, at a pace that's healthy and sustainable. | − gap from the timescale (capped at 25% of body burn) | weight, body fat, measurements |
| Maintain a healthy lifestyle | You're in a good place: keep your health, exercise and eating balanced. | 0 | consistency and balance |
| Build fitness & strength | Grow muscle, strength and fitness, fuelled properly. | +7.5% of body burn; 0 if body fat is high (men ≥ 25%, women ≥ 32%) = recomposition | training progress, protein |
| Grow to a healthy lifestyle | A combined approach: healthier eating, regular exercise and better body composition, together. | −10% if BMI ≥ 25 (or the timescale pace, capped at 10%), else 0 | all areas balanced |
| Support my health | Shape your eating, exercise and body composition around your health conditions — always alongside your GP's advice. | −10% if BMI ≥ 25 (or the pace, capped at 10%), else 0; nutrient priorities from conditions (sat fat for cholesterol, sugars for glucose, salt for blood pressure …) | conditions; needs ≥ 1 condition in My Health |

### 7.2 Timescale and safety
- Slider 3–24 months (weight goals). **Target weight is recommended by the app (v2.18.1)**, not typed first:
  - **Body-fat method** (body composition available): target = lean mass ÷ (1 − target body fat %), using the mid-point of a healthy range by sex and age: men 40+ 18–22%, men under 40 15–19%, women 40+ 25–31%, women under 40 22–28%. The ends of the band give the range. Lean mass = rolling average of the last 3–4 weigh-ins with body fat (else the latest weight × (1 − latest body fat)).
  - **Fallback** (no body fat): BMI 22–24.9 for the height, mid-point as the target, labelled "estimate — add body composition for a better target".
  - Shown as "Your Companion recommends: X kg (range A–B kg)" + one line why, in the goal setup and My Profile. **Accept** (default) or **Change**: an own target shows the amber note "This isn't your Companion's recommendation based on your profile"; stored as `goal.targetKg` + `goal.recommendedKg` + `goal.targetSource` (`recommended` | `own`); companions may gently refer to the recommended figure. Never below BMI 18.5; timescale safety rails apply.
  - Recalculated as body composition changes; a move of ≥ 2 kg from the accepted recommendation → a suggestion to update (Accept / Not now).
- Pace = (current − target) / weeks; daily gap = pace × 7,700 / 7.
- **Red:** > 1% body weight/week, gap > 25% of body burn, or body burn − gap below the safe minimum. **Amber:** > 0.75%/week or > 20%. Alternatives: **Steady** (0.5%/week) and **Gentle** (0.35%/week), in months.
- Target weight below BMI 18.5 is blocked. Language is encouraging and non-shaming.

### 7.3 Setup (mandatory)
Goal (+ timescale), sex, age, height, current weight, typical activity level (**Mostly sitting 1.15 / On my feet a fair bit 1.3 / Very active 1.45**). Until complete: no calorie goal anywhere ("Finish your goal setup"). New people see it at onboarding; existing people once on their next visit ("Later" hides it until the next visit).

### 7.4 Daily goal and the Planned | Actual table
- **Body burn** = BMR × 1.15 on a day with step or device-total data, else BMR × the activity factor. Same in both columns.
- **Aim** = the goal's daily kcal (from the typical burn, so the same every day). Same in both columns.
- **Exercise:** Planned = net (MET − 1) × kg × hours of that weekday's planned exercises (sets × 3 min); Actual = logged exercise + steps above the allowance, or device total − body burn (nothing added on top); × activity adjustment %.
- **Goal** = Body burn + Aim (floored at the safe minimum) + Exercise.
- **Eating:** Planned = the day's children at their snapshot kcal (skipped included); Actual = stored nutrition (portion, Snap, variations; skipped excluded).
- **On track** = Actual eating − Actual goal, ± kcal and %; green at/under, red over.
- **Week to date** = Σ actual eating vs Σ actual goal over past days this week with something logged (never today or future).
- Footnote: "Actual includes eating selections stored in the day which need to be kept up to date, plus any exercises logged when completed".
- Shown on Home (Today, with Week to date and earlier days), each My Eating day, and the My Eating week view (one row per day).

### 7.5 Companions
Every companion's context (`getCrossSectionCtx`) includes the goal, description, focus, timescale, required pace, the day's goal and progress vs pace. Prompts that had fixed kcal targets use the goal. Goal-change suggestions (healthy range for 6+ weeks → Maintain; pace unrealistic or well behind after 4+ weeks → longer timescale) are shown on Today with Accept / Not now; the companion may mention them as suggestions only. The medication rule is unchanged.

### 7.6 Worked example (tested)
91.9 kg, 25.5% fat, 178 cm, male 50, mostly sitting → BMR 1,849, body burn 2,126; recommended target 85.6 kg (range 83.5–87.8; at age 30: 82.5); without body fat 74.3 kg (69.7–78.9, estimate). Becks-like profile (165 cm, 10.4 st, 30%, 47) → 64.2 kg (61.6–67.0). Healthy body weight, 7 months to 82 kg → 0.33 kg/week, aim −359, goal 1,767 (green). 5 months → body burn − gap 1,624 < safe minimum 1,664 → red. 80 kg in 3 months → red; Steady 6 months, Gentle 9 months; applied aim capped at −532. Grow / Support (BMI 29) → −213. Build (25.5% fat) → recomposition (0). On my feet → body burn 2,404 on days without steps.

### 7.7 Food ratings: list items vs selections (v2.18.2, F23, JC 14 Nov)
- **List items (parents, shared):** rated against the **UK reference intake** — 2,000 kcal, sat fat 20 g, free (added) sugars 25 g (the D11 bands). The same for everyone; existing list ratings are not re-rated (only when an item is edited or the admin re-rates lists).
- **Selections (children):** rated against **that person's goal and personal limits** (`personalLimits` in `goals.js`): kcal = the daily goal without exercise (typical body burn + aim, never below the safe minimum); sat fat 20 g × kcal/2,000 and sugars 25 g × kcal/2,000, never above 20 g / 25 g when a condition makes the nutrient a priority (cholesterol → sat fat, blood glucose → sugars). Until the goal setup is complete the reference is used. Ratings are applied when a selection is created or changed, and shown live (lists, totals, Snap previews).
- When the two differ, the existing note shows: "RED today — for your goal" (or "— large portion" / "— with changes" when the portion changed).
- Tested: `tests/v2182.spec.js` (760 kcal pasta: GREAT on the list, RED for a 1,767 kcal goal, unchanged for 2,126).
- **v2.18.3:** frequency warnings ("already … this week") and week counts (incl. the meal generator) use the same live personal rating the screen shows; past weeks' counts use their stored ratings. A one-off, idempotent refresh re-rates the **stored** ratings of the current and future weeks only (per person, once their goal setup is complete; flag `ratings_refresh_v2183`); past weeks keep their history as recorded. Tested: `tests/v2183.spec.js`.
