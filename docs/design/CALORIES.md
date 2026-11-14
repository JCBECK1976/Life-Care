# Calorie model (v2.17.1, safe minimum and skipped days v2.17.2)

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
