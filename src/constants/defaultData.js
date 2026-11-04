// ═══════════════════════════════════════════════════
// DEFAULT DATA — complete Week 1-6 safety net
// ═══════════════════════════════════════════════════

export const DEFAULT_DATA = {
  config: { week: 7, session: 15, trainingStart: "2026-07-19", lastUpdate: "4 Sep 2026" },
  jc: {
    profile: { name: "JC", dob: "1976-12-19", age: 49, sex: "Male", height: "5ft 11", bodyType: "Upper-body dominant meso-endomorph", fibreType: "Fast-twitch dominant", idealWeight: "13st 6lb", notes: "ADHD diagnosed. Yellow/Red Insights. Trains shirtless — heat sensitivity (thyroid). 90min pre-session fast." },
    meds: [
      { name: "Levothyroxine", type: "medication", dosage: "200mcg", timing: "Lunchtime", frequency: "Daily", notes: "Thyroid — absorption fixed with lunchtime dosing", started: "2026-01", active: true },
      { name: "Statin", type: "medication", dosage: "20mg", timing: "Daily", frequency: "Daily", notes: "Cholesterol — dependent on TSH control", started: "2026-01", active: true },
      { name: "Creatine Monohydrate", type: "supplement", dosage: "5g", timing: "Breakfast (in oats)", frequency: "Daily", notes: "Creapure — muscle performance", started: "2026-07", active: true },
      { name: "Collagen + Vitamin C", type: "supplement", dosage: "10g", timing: "Dinner (skip Wed)", frequency: "Daily", notes: "Tendon/joint support", started: "2026-07", active: true },
      { name: "Protein Shake", type: "supplement", dosage: "1 scoop", timing: "Post-training", frequency: "Training days", notes: "110-130g daily target", started: "2026-07", active: true },
    ],
    medsHistory: [],
        attachments: [{ name: "JC_Beck_Combined_Life_Care_Plan_v3.0.pdf", date: "27 Aug 2026", extracted: "Life Care Plan v3.0 (2026). JC: LDL 3.4→1.4, Ratio 6.3→2.2, HbA1c 43→45, TSH 14.2→0.06. Levo 200mcg lunchtime. Statin 20mg. ADHD. 2000-2200kcal, 110-130g protein, <20g sat fat, 30-35g fibre. Upper-body meso-endo. Waist target <94cm. Portfolio Diet ~70-75%. Porridge 85g oats. ProActiv spread. Brooklea cholesterol drink home days. Afternoon porridge pot prevents reactive snacking. Office lunches: jacket+tuna+eggs+seeds OR cajun chicken+salad+seeds. Beck: Total Chol 9.6, LDL 7.2, HDL 1.2, Trig 2.62, Ratio 8.0, HbA1c 40, eGFR 67. Suspected FH. Atorvastatin+Citalopram. Perimenopausal. RSI wrists. 1700-1900kcal, 90-110g protein, <20g sat fat critical. Compact meso-endo, fast-twitch, lower-body dominant. 60g oats. Weetabix max 1x/wk. Waist target <80cm then 70-75cm. Body fat 24-28%. Lipid clinic referral urgent. Equipment: Marcy HG5000, Bear Grip straps, J Bryant cuffs, Tricep Rope. 3x/wk Sun/Mon/Fri 45-55min shared. Double progression 12→15 reps then move up. Tempo 2s up, 1s hold, 3s down. Habit formation: Friction wk1-3, Momentum wk4-8, Addiction wk9-12. Aldi primary supermarket. Heck chicken sausages. Turkey mince 2%. ProActiv not Nordpak. Passata not jar sauce. Fromage frais replaces bechamel." }],
    body: {
      weight: [{ wk: 1, v: 14.6 }, { wk: 4, v: 14.23 }, { wk: 5, v: 14.21 }],
      bodyFat: [{ wk: 4, v: 24.6 }, { wk: 5, v: 24.4 }],
      muscleMass: [{ wk: 4, v: "10st 2.6lb" }, { wk: 5, v: "10st 2.8lb" }],
      muscleRate: [{ wk: 4, v: 71.6 }, { wk: 5, v: 71.8 }],
      skeletalMuscle: [{ wk: 4, v: 48.7 }, { wk: 5, v: 48.9 }],
      visceralFat: [{ wk: 4, v: 10.7 }, { wk: 5, v: 10.5 }],
      subcutFat: [{ wk: 4, v: 21.4 }, { wk: 5, v: 21.2 }],
      bmr: [{ wk: 4, v: 1840 }, { wk: 5, v: 1842 }],
      bodyWater: [{ wk: 4, v: 54.4 }, { wk: 5, v: 54.6 }],
      boneMass: [{ wk: 4, v: "0st 7.5lb" }, { wk: 5, v: "0st 7.5lb" }],
      bodyAge: [{ wk: 4, v: 52 }, { wk: 5, v: 52 }],
      bmi: [{ wk: 4, v: 27.9 }, { wk: 5, v: 27.8 }],
    },
    measurements: { fullBody: [], bicep: [{ wk: 6, v: 39.5 }], forearm: [], calf: [{ wk: 6, v: 41 }], quad: [{ wk: 6, v: 54 }], chest: [{ wk: 6, v: 110 }], waist: [{ wk: 6, v: 106 }], shoulders: [{ wk: 6, v: 125 }] },
    bloods: [
      { date: "2026-04", tests: { tsh: 14.2, ldl: 3.4, hba1c: 43, cholRatio: 6.3 } },
      { date: "2026-08", tests: { tsh: 0.06, freeT4: 20.1, freeT3: 4.8, totalChol: 3.8, ldl: 1.4, hdl: 1.7, triglycerides: 1.46, cholRatio: 2.2, nonHdl: 2.1, hba1c: 45 } },
    ],
    exercises: {
        sunday: [
          {
            name: "Leg Extension",
            current: "42kg",
            reps: "12×3",
            status: "moved up",
            prog: [{ wk: 1, w: "36kg", r: "12×3" }, { wk: 2, w: "36kg", r: "12×3" }, { wk: 4, w: "36kg", r: "15×3" }, { wk: 5, w: "36kg", r: "15×3" }, { wk: 6, w: "42kg", r: "12×3" }]
          },
          {
            name: "Standing Calf Raise",
            current: "36kg",
            reps: "15×3",
            status: "consolidating",
            prog: [{ wk: 1, w: "36kg", r: "12×3" }, { wk: 2, w: "36kg", r: "12×3" }, { wk: 4, w: "36kg", r: "12×3" }, { wk: 5, w: "36kg", r: "12×3" }, { wk: 6, w: "36kg", r: "15×3" }]
          },
          {
            name: "Seated Cable Row",
            current: "42kg",
            reps: "15×3",
            status: "ready to move",
            target: "49kg × 10×3",
            prog: [{ wk: 2, w: "36kg", r: "12×3" }, { wk: 3, w: "36kg", r: "12×3" }, { wk: 4, w: "29kg", r: "15×3" }, { wk: 5, w: "42kg", r: "15×3" }, { wk: 6, w: "42kg", r: "15×3" }, { wk: 8, w: "42kg", r: "15×3" }]
          },
          {
            name: "Single Leg Calf Raise",
            current: "BW",
            reps: "15×3",
            status: "building",
            prog: [{ wk: 2, w: "BW", r: "12×3" }, { wk: 3, w: "BW", r: "12×3" }, { wk: 4, w: "BW", r: "12×3" }, { wk: 5, w: "BW", r: "12×3" }, { wk: 8, w: "BW", r: "15×3" }]
          },
          {
            name: "Squat Row",
            current: "42kg",
            reps: "12×3",
            status: "building",
            prog: [{ wk: 1, w: "22kg", r: "12×3" }, { wk: 2, w: "36kg", r: "12×3" }, { wk: 4, w: "36kg", r: "12×3" }, { wk: 5, w: "36kg", r: "15×3" }, { wk: 6, w: "42kg", r: "12×3" }, { wk: 8, w: "42kg", r: "12×3" }]
          },
        ],
        monday: [
          {
            name: "Chest Press",
            current: "42kg",
            reps: "12×3",
            status: "moved up",
            prog: [{ wk: 2, w: "29kg", r: "12×3" }, { wk: 3, w: "29kg", r: "12×3" }, { wk: 4, w: "36kg", r: "15×3" }, { wk: 5, w: "36kg", r: "15×3" }, { wk: 6, w: "42kg", r: "12×3" }]
          },
          {
            name: "Lat Pulldown",
            current: "42kg",
            reps: "12/10/10",
            status: "building",
            prog: [{ wk: 1, w: "29kg", r: "12×3" }, { wk: 2, w: "36kg", r: "12×3" }, { wk: 3, w: "36kg", r: "12×3" }, { wk: 4, w: "36kg", r: "15×3" }, { wk: 5, w: "42kg", r: "12×3" }, { wk: 6, w: "42kg", r: "12/10/10" }]
          },
          {
            name: "Shoulder Press",
            current: "29kg",
            reps: "15/15/12",
            status: "building",
            prog: [{ wk: 2, w: "29kg", r: "12×3" }, { wk: 3, w: "29kg", r: "12×3" }, { wk: 4, w: "29kg", r: "12/14/10" }, { wk: 5, w: "29kg", r: "15/15/13" }, { wk: 6, w: "29kg", r: "15/15/12" }]
          },
          {
            name: "Cable Crunch",
            current: "36kg",
            reps: "12×3",
            status: "building",
            prog: [{ wk: 1, w: "22kg", r: "12×3" }, { wk: 2, w: "22kg", r: "12×3" }, { wk: 3, w: "22kg", r: "15×3" }, { wk: 4, w: "29kg", r: "15×3" }, { wk: 5, w: "36kg", r: "12×3" }, { wk: 6, w: "36kg", r: "12×3" }, { wk: 7, w: "36kg", r: "12×3" }]
          },
          {
            name: "Butterfly",
            current: "29kg",
            reps: "10/10/7",
            status: "building",
            prog: [{ wk: 2, w: "22kg", r: "12×3" }, { wk: 3, w: "22kg", r: "15×3" }, { wk: 4, w: "22kg", r: "15×3" }, { wk: 5, w: "29kg", r: "12/8/8" }, { wk: 6, w: "29kg", r: "10×3" }, { wk: 8, w: "29kg", r: "10/10/7" }]
          }
        ],
        friday: [
          {
            name: "Lateral Raise",
            current: "5kg",
            reps: "15/12/12",
            status: "building",
            prog: [{ wk: 2, w: "5kg", r: "12×3" }, { wk: 3, w: "5kg", r: "12×3" }, { wk: 4, w: "5kg", r: "12×3" }, { wk: 5, w: "5kg", r: "12×3" }, { wk: 7, w: "5kg", r: "15/12/12" }]
          },
          {
            name: "Bicep Curl",
            current: "22kg",
            reps: "12/12/10",
            status: "building",
            notes: "Wk1-4 partial ROM (to waist). Wk5+ full range — rep drop is ROM change not regression.",
            prog: [{ wk: 1, w: "22kg", r: "12×3" }, { wk: 2, w: "22kg", r: "12×3" }, { wk: 3, w: "22kg", r: "12×3" }, { wk: 4, w: "22kg", r: "15/15/12" }, { wk: 5, w: "22kg", r: "12/12/8" }, { wk: 7, w: "22kg", r: "12/12/10" }]
          },
          {
            name: "Tricep Pushdown",
            current: "29kg",
            reps: "12×3",
            status: "building",
            prog: [{ wk: 1, w: "22kg", r: "12×3" }, { wk: 2, w: "22kg", r: "12/12/10" }, { wk: 3, w: "22kg", r: "12×3" }, { wk: 4, w: "22kg", r: "15×3" }, { wk: 5, w: "22kg", r: "15×3" }, { wk: 7, w: "29kg", r: "10×3" }, { wk: 7, w: "29kg", r: "12×3" }]
          },
          {
            name: "Face Pull",
            current: "36kg",
            reps: "12×3",
            status: "building",
            prog: [{ wk: 1, w: "22kg", r: "12×3" }, { wk: 2, w: "22kg", r: "12×3" }, { wk: 3, w: "29kg", r: "12×3" }, { wk: 4, w: "29kg", r: "15×3" }, { wk: 5, w: "29kg", r: "15×3" }, { wk: 7, w: "36kg", r: "10×3" }, { wk: 7, w: "36kg", r: "12×3" }]
          },
          {
            name: "Cable Crunch",
            current: "36kg",
            reps: "12×3",
            status: "building",
            prog: [{ wk: 1, w: "22kg", r: "12×3" }, { wk: 2, w: "22kg", r: "12×3" }, { wk: 3, w: "22kg", r: "15×3" }, { wk: 4, w: "29kg", r: "15×3" }, { wk: 5, w: "36kg", r: "12×3" }, { wk: 7, w: "36kg", r: "12×3" }]
          }
        ]
      },
  },
  becks: {
    profile: { name: "Becks", dob: "1978-03-15", age: 48, sex: "Female", height: "5ft 4", bodyType: "Compact meso-endomorph, lower-body dominant", fibreType: "Fast-twitch dominant", idealWeight: "11st 2lb", notes: "Blue/Green Insights. RSI in wrists — neutral grip, cable-based only. Exceptional natural calf/quad development (90-98th percentile untrained). Perimenopausal." },
    meds: [
      { name: "Atorvastatin", type: "medication", dosage: "", timing: "Evening", frequency: "Daily", notes: "Lipid management — raise fatigue at GP review. Request CK levels.", started: "2026-07", active: true },
      { name: "Citalopram", type: "medication", dosage: "", timing: "Daily", frequency: "Daily", notes: "Long-term. Can promote fat retention.", started: "", active: true },
      { name: "Creatine Monohydrate", type: "supplement", dosage: "5g", timing: "Breakfast (in oats)", frequency: "Daily", notes: "Creapure — adds 1-2kg water weight wks 1-3", started: "2026-07", active: true },
      { name: "Collagen + Vitamin C", type: "supplement", dosage: "10g", timing: "Dinner", frequency: "Daily", notes: "Tendon/joint support", started: "2026-07", active: true },
      { name: "Protein Shake", type: "supplement", dosage: "1 scoop", timing: "Post-training", frequency: "Training days", notes: "90-110g daily target", started: "2026-07", active: true },
    ],
    medsHistory: [],
        attachments: [{ name: "JC_Beck_Combined_Life_Care_Plan_v3.0.pdf", date: "27 Aug 2026", extracted: "Life Care Plan v3.0 (2026). JC: LDL 3.4→1.4, Ratio 6.3→2.2, HbA1c 43→45, TSH 14.2→0.06. Levo 200mcg lunchtime. Statin 20mg. ADHD. 2000-2200kcal, 110-130g protein, <20g sat fat, 30-35g fibre. Upper-body meso-endo. Waist target <94cm. Portfolio Diet ~70-75%. Porridge 85g oats. ProActiv spread. Brooklea cholesterol drink home days. Afternoon porridge pot prevents reactive snacking. Office lunches: jacket+tuna+eggs+seeds OR cajun chicken+salad+seeds. Beck: Total Chol 9.6, LDL 7.2, HDL 1.2, Trig 2.62, Ratio 8.0, HbA1c 40, eGFR 67. Suspected FH. Atorvastatin+Citalopram. Perimenopausal. RSI wrists. 1700-1900kcal, 90-110g protein, <20g sat fat critical. Compact meso-endo, fast-twitch, lower-body dominant. 60g oats. Weetabix max 1x/wk. Waist target <80cm then 70-75cm. Body fat 24-28%. Lipid clinic referral urgent. Equipment: Marcy HG5000, Bear Grip straps, J Bryant cuffs, Tricep Rope. 3x/wk Sun/Mon/Fri 45-55min shared. Double progression 12→15 reps then move up. Tempo 2s up, 1s hold, 3s down. Habit formation: Friction wk1-3, Momentum wk4-8, Addiction wk9-12. Aldi primary supermarket. Heck chicken sausages. Turkey mince 2%. ProActiv not Nordpak. Passata not jar sauce. Fromage frais replaces bechamel." }],
    body: {
      weight: [{ wk: 1, v: 14.9 }, { wk: 4, v: 14.56 }, { wk: 5, v: 14.58 }],
      bodyFat: [{ wk: 1, v: 45.2 }, { wk: 4, v: 44.8 }, { wk: 5, v: 44.9 }],
      muscleMass: [{ wk: 1, v: "7st 8.2lb" }, { wk: 4, v: "7st 7.8lb" }, { wk: 5, v: "7st 7.6lb" }],
      muscleRate: [{ wk: 1, v: 51.6 }, { wk: 4, v: 51.9 }, { wk: 5, v: 51.8 }],
      skeletalMuscle: [{ wk: 1, v: 31.9 }, { wk: 4, v: 32.2 }, { wk: 5, v: 32.1 }],
      visceralFat: [{ wk: 1, v: 17.0 }, { wk: 4, v: 16.8 }, { wk: 5, v: 16.8 }],
      subcutFat: [{ wk: 1, v: 39.4 }, { wk: 4, v: 39.0 }, { wk: 5, v: 39.1 }],
      bmr: [{ wk: 1, v: 1478 }, { wk: 4, v: 1472 }, { wk: 5, v: 1471 }],
      bodyWater: [{ wk: 1, v: 37.6 }, { wk: 4, v: 37.9 }, { wk: 5, v: 37.8 }],
      boneMass: [{ wk: 1, v: "0st 6.9lb" }, { wk: 4, v: "0st 6.8lb" }, { wk: 5, v: "0st 6.8lb" }],
      bodyAge: [{ wk: 1, v: 56 }, { wk: 4, v: 55 }, { wk: 5, v: 55 }],
      bmi: [{ wk: 1, v: 35.3 }, { wk: 4, v: 34.8 }, { wk: 5, v: 34.9 }],
    },
    measurements: { fullBody: [], bicep: [{ wk: 6, v: 39 }], forearm: [], calf: [{ wk: 6, v: 40 }], quad: [{ wk: 6, v: 61 }], chest: [{ wk: 6, v: 114 }], waist: [{ wk: 6, v: 108 }], shoulders: [{ wk: 6, v: 114 }] },
    bloods: [
      { date: "2026-04", tests: { totalChol: 9.6, ldl: 7.2, hdl: 1.2, triglycerides: 2.62, cholRatio: 8.0, nonHdl: 8.4, hba1c: 40, egfr: 67 } },
    ],
    exercises: {
        sunday: [
          {
            name: "Leg Extension",
            current: "42kg",
            reps: "10×3",
            status: "moved up",
            prog: [{ wk: 1, w: "36kg", r: "12×3" }, { wk: 2, w: "36kg", r: "12×3" }, { wk: 3, w: "36kg", r: "13/13/12" }, { wk: 4, w: "36kg", r: "15/14/13" }, { wk: 5, w: "36kg", r: "15×3" }, { wk: 6, w: "42kg", r: "10×3" }]
          },
          {
            name: "Standing Calf Raise",
            current: "36kg",
            reps: "15×3",
            status: "consolidating",
            prog: [{ wk: 1, w: "36kg", r: "12×3" }, { wk: 2, w: "36kg", r: "12×3" }, { wk: 3, w: "36kg", r: "13/12/12" }, { wk: 4, w: "36kg", r: "14/14/13" }, { wk: 5, w: "36kg", r: "15×3" }, { wk: 6, w: "36kg", r: "15×3" }]
          },
          {
            name: "Seated Cable Row",
            current: "36kg",
            reps: "12×3",
            status: "moved up",
            prog: [{ wk: 1, w: "29kg", r: "12×3" }, { wk: 2, w: "29kg", r: "13/12/12" }, { wk: 3, w: "29kg", r: "14/14/13" }, { wk: 4, w: "29kg", r: "15×3" }, { wk: 5, w: "36kg", r: "12×3" }, { wk: 6, w: "36kg", r: "12×3" }, { wk: 8, w: "36kg", r: "12×3" }]
          },
          {
            name: "Single Leg Calf Raise",
            current: "BW",
            reps: "15×3",
            status: "building",
            prog: [{ wk: 4, w: "BW", r: "12×3" }, { wk: 5, w: "BW", r: "12×3" }, { wk: 6, w: "BW", r: "12×3" }, { wk: 8, w: "BW", r: "15×3" }]
          },
          {
            name: "Squat Row",
            current: "36kg",
            reps: "12×3",
            status: "building",
            prog: [{ wk: 1, w: "29kg", r: "10×3" }, { wk: 2, w: "29kg", r: "10×3" }, { wk: 3, w: "29kg", r: "11/10/10" }, { wk: 4, w: "29kg", r: "12/11/10" }, { wk: 5, w: "29kg", r: "12×3" }, { wk: 6, w: "36kg", r: "12/12/10" }, { wk: 8, w: "36kg", r: "12×3" }]
          },
        ],
        monday: [
          {
            name: "Chest Press",
            current: "36kg",
            reps: "10×3",
            status: "moved up",
            prog: [{ wk: 1, w: "29kg", r: "12×3" }, { wk: 2, w: "29kg", r: "13/12/12" }, { wk: 3, w: "29kg", r: "14/13/13" }, { wk: 4, w: "29kg", r: "15/14/14" }, { wk: 5, w: "29kg", r: "15×3" }, { wk: 6, w: "36kg", r: "10×3" }]
          },
          {
            name: "Lat Pulldown",
            current: "36kg",
            reps: "10×3",
            status: "building",
            prog: [{ wk: 1, w: "29kg", r: "12×3" }, { wk: 2, w: "29kg", r: "13/12/12" }, { wk: 3, w: "29kg", r: "14/13/13" }, { wk: 4, w: "29kg", r: "15×3" }, { wk: 5, w: "36kg", r: "10×3" }, { wk: 6, w: "36kg", r: "10×3" }]
          },
          {
            name: "Shoulder Press",
            current: "22kg",
            reps: "12×3",
            status: "building",
            prog: [{ wk: 1, w: "22kg", r: "10×3" }, { wk: 2, w: "22kg", r: "11/10/10" }, { wk: 3, w: "22kg", r: "12/12/10" }, { wk: 4, w: "22kg", r: "14/13/12" }, { wk: 5, w: "22kg", r: "15×3" }, { wk: 6, w: "22kg", r: "12×3" }]
          },
          {
            name: "Cable Crunch",
            current: "29kg",
            reps: "12×3",
            status: "moved up",
            prog: [{ wk: 1, w: "16kg", r: "12×3" }, { wk: 2, w: "16kg", r: "13/12/12" }, { wk: 3, w: "16kg", r: "15×3" }, { wk: 4, w: "22kg", r: "12×3" }, { wk: 5, w: "29kg", r: "10×3" }, { wk: 6, w: "22kg", r: "12/10/12" }, { wk: 7, w: "22kg", r: "12×3" }, { wk: 7, w: "29kg", r: "12×3" }]
          },
          {
            name: "Butterfly",
            current: "22kg",
            reps: "8×3",
            status: "moved up",
            notes: "Wk8 22kg assisted — JC supporting behind hands. Progression: assisted 8→12×3, then unassisted, then build reps. Same approach as Bicep Curl.",
            prog: [{ wk: 1, w: "16kg", r: "10×3" }, { wk: 2, w: "16kg", r: "11/10/10" }, { wk: 3, w: "16kg", r: "13/12/12" }, { wk: 4, w: "16kg", r: "14/14/13" }, { wk: 5, w: "16kg", r: "15×3" }, { wk: 6, w: "16kg", r: "15×3" }, { wk: 8, w: "22kg", r: "8×3 (assisted)" }]
          }
        ],
        friday: [
          {
            name: "Lateral Raise",
            current: "3kg",
            reps: "15×3",
            status: "consolidating",
            notes: "Not quite horizontal to protect RSI.",
            prog: [{ wk: 1, w: "3kg", r: "10×3" }, { wk: 2, w: "3kg", r: "10×3" }, { wk: 3, w: "3kg", r: "11/10/10" }, { wk: 4, w: "3kg", r: "12/11/10" }, { wk: 5, w: "3kg", r: "12×3" }, { wk: 7, w: "3kg", r: "15×3" }]
          },
          {
            name: "Bicep Curl",
            current: "22kg",
            reps: "8×3",
            status: "moved up",
            notes: "Wk7 moved up 16→22kg (37.5% jump). Assisted with hand under bar. Partial ROM to waist first, then full range once unassisted. RSI consideration.",
            prog: [{ wk: 1, w: "16kg", r: "12×3" }, { wk: 2, w: "16kg", r: "12×3" }, { wk: 3, w: "16kg", r: "13/13/12" }, { wk: 4, w: "16kg", r: "15/14/13" }, { wk: 5, w: "16kg", r: "15×3" }, { wk: 7, w: "22kg", r: "8×3" }]
          },
          {
            name: "Tricep Pushdown",
            current: "22kg",
            reps: "12×3",
            status: "building",
            prog: [{ wk: 1, w: "16kg", r: "12×3" }, { wk: 2, w: "16kg", r: "13/12/12" }, { wk: 3, w: "16kg", r: "14/14/13" }, { wk: 4, w: "16kg", r: "15×3" }, { wk: 5, w: "22kg", r: "10×3" }, { wk: 7, w: "22kg", r: "12×3" }]
          },
          {
            name: "Face Pull",
            current: "29kg",
            reps: "10×3",
            status: "moved up",
            prog: [{ wk: 1, w: "22kg", r: "8×3" }, { wk: 2, w: "22kg", r: "9/8/8" }, { wk: 3, w: "22kg", r: "10/9/9" }, { wk: 4, w: "22kg", r: "10×3" }, { wk: 5, w: "22kg", r: "12×3" }, { wk: 7, w: "22kg", r: "15×3" }, { wk: 7, w: "29kg", r: "10×3" }]
          },
          {
            name: "Cable Crunch",
            current: "22kg",
            reps: "12/10/12",
            status: "reduce",
            prog: [{ wk: 1, w: "16kg", r: "12×3" }, { wk: 2, w: "16kg", r: "13/12/12" }, { wk: 3, w: "16kg", r: "15×3" }, { wk: 4, w: "22kg", r: "12×3" }, { wk: 5, w: "29kg", r: "10×3" }, { wk: 6, w: "22kg", r: "12/10/12" }]
          }
        ]
      },
  },
};
