// v2.16.1 SAD-A9: SYNTHETIC test data with the same shapes as the real database — no real person's data.
// Two made-up people under the keys the app still expects ("jc", "becks"; Step 3 removes these keys).
// Deterministic: the same date gives the same data. Weeks are relative to today's training week.
// Usage: node scripts/make-fixture.mjs [out.json]  (or imported by seed-emulator.mjs)
import fs from "node:fs";

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
let r = rng(20261114);
const pick = (a) => a[Math.floor(r() * a.length)];
const int = (a, b) => a + Math.floor(r() * (b - a + 1));
const round1 = (n) => Math.round(n * 10) / 10;

const START = new Date(2026, 6, 19); // the app's training start (calcWeek)
export function currentWeek(now = new Date()) { return Math.floor((now - START) / (7 * 86400000)) + 1; }
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
function sundayOf(d) { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); return x; }

const EX = {
  sunday: [["Leg Press", "weights", 60], ["Leg Extension", "weights", 30], ["Leg Curl", "weights", 25], ["Calf Raise", "weights", 40], ["Plank", "timed_hold", 0]],
  monday: [["Chest Press", "weights", 30], ["Lat Pulldown", "weights", 35], ["Seated Row", "weights", 30], ["Shoulder Press", "weights", 15], ["Bicep Curl", "weights", 8]],
  friday: [["Squat", "weights", 40], ["Romanian Deadlift", "weights", 35], ["Face Pull", "weights", 15], ["Tricep Pushdown", "weights", 15], ["Treadmill Walk", "cardio", 0]],
};
const STATUSES = ["building", "consolidating", "ready to move", "moved up", "maintaining"];

function exercises(scale, cw) {
  const out = {};
  for (const day of Object.keys(EX)) {
    out[day] = EX[day].map(([name, exType, base], i) => {
      const w0 = Math.max(0, Math.round(base * scale));
      const prog = [];
      for (let wk = 1; wk < cw; wk++) {
        if (r() < 0.15) continue; // a missed week now and then
        const w = w0 + Math.floor(wk / 4) * 2;
        const reps = [int(8, 15), int(8, 15), int(8, 15)];
        const e = { wk, w: w + "kg", r: reps.every((x) => x === reps[0]) ? reps[0] + "×3" : reps.join("/") };
        if (wk > cw - 4) { e.goodForm = pick(["good", "working"]); e.fullRange = pick(["good", "working"]); }
        if (r() < 0.2) e.note = pick(["felt strong", "short on time", "slept badly", "good pump"]);
        prog.push(e);
      }
      const last = prog[prog.length - 1] || { w: w0 + "kg", r: "10×3" };
      const ex = { name, current: last.w, reps: last.r, status: STATUSES[(i + day.length) % STATUSES.length], prog,
        settings: { type: "machine", equipment: "Gym machine", increments: "2.5", description: "Synthetic test exercise." },
        notes: i === 0 ? "keep the back flat" : "" };
      if (exType !== "weights") ex.exType = exType;
      if (i === 1) { ex.sets = 3; ex.progressionNotes = "Double progression: build reps to target then increase weight."; }
      return ex;
    });
  }
  return out;
}

function person(name, sex, age, scale, cw) {
  const series = (base, spread) => [cw - 4, cw - 3, cw - 2, cw - 1].map((wk) => ({ wk, v: round1(base + (r() - 0.5) * spread) }));
  return {
    profile: { name, age, sex, height: sex === "Male" ? "178cm" : "165cm", bodyType: "Mesomorph", fibreType: "Mixed", idealWeight: sex === "Male" ? "80kg" : "62kg", notes: "Synthetic test person.", dob: (2026 - age) + "-03-15" },
    meds: [
      { name: "Vitamin D", dose: "1000IU", freq: "Daily", time: "Morning", notes: "", started: "2026-01-10", active: true },
      { name: "Omega 3", dose: "1g", freq: "Daily", time: "Evening", notes: "", started: "2026-02-01", active: true },
      { name: "Test Tablet", dose: "10mg", freq: "Daily", time: "Morning", notes: "synthetic", started: "2025-06-01", active: false },
    ],
    medsHistory: [{ date: "2026-10-01", snapshot: "Vitamin D 1000IU; Omega 3 1g" }],
    attachments: [],
    body: { weight: series(sex === "Male" ? 84 : 66, 2), bodyFat: series(sex === "Male" ? 22 : 28, 1), muscleMass: series(sex === "Male" ? 60 : 45, 1),
      visceralFat: series(9, 1), bmr: series(sex === "Male" ? 1750 : 1400, 30), bodyWater: series(55, 1), bodyAge: series(age, 2) },
    measurements: { fullBody: [], bicep: [{ wk: cw - 2, v: 33 }], forearm: [], calf: [{ wk: cw - 2, v: 38 }], quad: [], chest: [{ wk: cw - 2, v: 100 }], waist: [{ wk: cw - 2, v: 88 }], shoulders: [] },
    bloods: [{ date: "2026-09-01", tests: { tsh: 2.1, ldl: 3.0, hba1c: 36, cholRatio: 3.5 } }],
    exercises: exercises(scale, cw),
    vitals: [{ date: "2026-11-01", time: "08:00", sys: 122, dia: 78, hr: 64, spo2: 98 }],
    healthProfile: "Non-smoker. Synthetic test profile.",
    healthNotes: "Synthetic: mild knee ache after running.",
    healthLog: [{ date: "2026-11-02", note: "Synthetic log entry." }],
    onboarding: { goals: "Get stronger", activity: "3 gym sessions a week", equipment: "Gym", dietary: "None", allergies: "None", conditions: "None", medications: "Vitamin D" },
    sessionGuides: { sunday: { warmup: "1. Bike — 2 minutes easy\n2. Leg swings — 30 seconds", cooldown: "1. Quad stretch — 30 seconds each\n2. Hamstring stretch — 30 seconds" } },
  };
}

const FOOD = [
  ["Porridge with Berries", 320, "GREAT"], ["Greek Yoghurt Pot", 180, "GREAT"], ["Wholemeal Toast", 210, "GOOD"], ["Granola Bowl", 380, "AMBER"],
  ["Scrambled Eggs", 250, "GOOD"], ["Bacon Roll", 450, "RED"], ["Fruit Salad", 120, "GREAT"], ["Bagel and Cream Cheese", 360, "AMBER"],
];
const food = (prefix, list) => list.map(([name, kcal, rating], i) => ({
  id: prefix + "_" + i, name, jcKcal: kcal, beckKcal: Math.round(kcal * 0.85), protein: int(4, 25), fat: int(2, 20), satFat: int(1, 8), carbs: int(10, 60),
  fibre: int(1, 8), salt: round1(r()), rating, itemType: i % 2 ? "packaged" : "ingredient", ingredients: i % 2 ? [] : ["oats 50g", "milk 200ml"], freq: "daily", isCustom: true, source: "synthetic",
}));

export function makeFixture(now = new Date()) {
  r = rng(20261114); // same seed every call: deterministic
  const cw = currentWeek(now);
  // Old-format meal plans only for weeks well in the past: the current week starts with no plan (tests set their own)
  const wk3 = iso(sundayOf(new Date(now - 21 * 86400000))), wk4 = iso(sundayOf(new Date(now - 28 * 86400000)));
  const dash = { config: { week: cw, session: 1, trainingStart: "2026-07-19", lastUpdate: "1 Nov 2026" },
    jc: person("JC", "Male", 50, 1, cw), becks: person("Becks", "Female", 47, 0.6, cw) };
  const fb = (who) => ({ summary: "Synthetic feedback for " + who + ".", concerns: ["Synthetic concern"], positives: ["Synthetic positive"], actions: ["Synthetic action"], meds: "No medication advice.", _generatedAt: "Sat 1 Nov" });
  const sfb = (who, day) => ({ exercises: dash[who].exercises[day].map((e) => ({ name: e.name, verdict: "Synthetic verdict.", icon: "check", newStatus: "building", recommendation: "Keep building reps" })),
    summary: "Synthetic session summary.", nextSession: "Synthetic next session.", _generatedAt: "Sat 1 Nov", _feedbackWeek: cw - 1, _feedbackFor: who });
  const d = {
    anthropic_api_key: "dev-placeholder-not-a-real-key",
    "dashboard:data": dash,
    custom_breakfasts: food("b", FOOD), custom_lunches: food("l", FOOD.slice(0, 4)), custom_meals: food("m", FOOD.slice(4)), custom_snacks: food("s", FOOD.slice(5)),
    companion_energy: { initial: 25, balance: 25, spent: 0, pct: 100, keyStatus: "active", depleted: false, needsCalibration: false, calibratedAt: "2026-11-01" },
    body_feedback: { jc: { wins: ["Synthetic win"], tweaks: ["Synthetic tweak"], outlook: "Synthetic outlook.", _at: "1 Nov", _when: "1 Nov" } },
    meas_feedback: { jc: { wins: ["Synthetic win"], tweaks: ["Synthetic tweak"], outlook: "Synthetic outlook.", _at: "1 Nov", _when: "1 Nov" } },
    eat_feedback: { jc: { week: { wins: ["Synthetic win"], tweaks: ["Synthetic tweak"], outlook: "Synthetic outlook.", _when: "1 Nov" } } },
    feedback_results: { jc: { good: ["Synthetic good"], opportunities: ["Synthetic opportunity"], focus: "Synthetic focus", _when: "1 Nov" }, becks: { good: ["Synthetic good"], opportunities: ["Synthetic opportunity"], focus: "Synthetic focus", _when: "1 Nov" } },
    feedback_history: { jc: [{ good: ["Synthetic good"], opportunities: [], focus: "Synthetic focus", _when: "25 Oct" }], becks: [] },
    health_feedback: { jc: fb("JC"), becks: fb("Becks") }, health_fb_jc: fb("JC"), health_fb_becks: fb("Becks"),
    help_history: { jc: [{ q: "How do I log?", a: "Synthetic answer.", when: "1 Nov" }] },
    qa_history: { jc: [{ q: "Synthetic question?", a: "Synthetic answer.", when: "1 Nov" }], becks: [] },
    session_feedback_all: { jc_sunday: sfb("jc", "sunday"), becks_sunday: sfb("becks", "sunday") },
    journal_jc: [{ id: "j1", date: "2026-11-01", text: "Synthetic journal entry.", mood: 4, ts: "2026-11-01T09:00:00Z" }],
    daily_mood_jc: { date: "2026-11-01", mood: 4 }, user_mood_jc: 4,
    generated_targets_jc: { nutrition: { calories: "2200", protein: "140g", satFat: "25g", sugar: "30g", fibre: "30g" }, bodyComp: { weight: "80kg", bodyFat: "18%", waist: "86cm", visceralFat: "8" }, exercise: { phase: "Build", weeklyMins: "150", sessions: "3", primaryGoal: "Strength" }, medical: { priority: "None", nextAction: "None", bloods: "Annual" } },
    meal_defaults: { jc: { b: "b_0", l: "l_1", d: "m_4" }, becks: {} },
    shop_defaults: [], supermarket_pref: "Tesco", user_colour_jc: "blue", user_colour_becks: "purple", rag_health_hash_jc: 12345,
  };
  d["mealplan:" + wk4 + ":jc"] = { monday: { b: "b_0", l: "l_1", d: "m_4" }, tuesday: { b: "b_2", l: "l_0", d: "m_5" } };
  d["mealplan:" + wk3 + ":becks"] = { monday: { b: "b_0" } };
  dash.jc.exercises.sunday.forEach((e) => { if (e.prog.length) d["comment:jc:" + e.name + ":" + e.prog[e.prog.length - 1].wk] = "Synthetic session comment."; });
  // Most values are JSON strings under flat keys, as in the real database
  const out = {};
  for (const k of Object.keys(d)) out[k] = typeof d[k] === "string" ? d[k] : JSON.stringify(d[k]);
  out.supermarket_pref = "Tesco"; out.user_colour_jc = "blue"; out.user_colour_becks = "purple";
  return out;
}

if (process.argv[1] && process.argv[1].endsWith("make-fixture.mjs")) {
  const f = makeFixture();
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(f, null, 1));
  console.log("Synthetic fixture: " + Object.keys(f).length + " keys (no real data).");
}
