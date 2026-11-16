// v2.18.0 person goals (docs/design/CALORIES.md §7, ADR 0014). Pure functions, tested with known inputs and a fixed clock.
// One goal per person drives the daily calorie goal everywhere (Home, My Eating, every companion):
//   Goal = Body burn (BMR + daily living) + Aim (from the person's goal and timescale) + Exercise.
import { MET, DEFAULT_MET, MIN_PER_SET, WEEKDAY, bmrOf, leanMass, dayFoodKcal, exerciseKcal, exerciseOn, heightCm, isMale, ageOf, isoDay, planOf,
  safeMinimum, settingsOf, stepsOn, toKg, weekDates, BASELINE_FACTOR } from "./calories.js";

export var KCAL_PER_KG = 7700;
export var WEEKS_PER_MONTH = 52 / 12;
export var GOALS = [
  { id: "healthy_weight", label: "Work towards a healthy body weight", timescale: true,
    desc: "Lose weight steadily and improve your body composition, at a pace that's healthy and sustainable.",
    focus: "weight, body fat and measurements; a steady, sustainable deficit sized by the timescale" },
  { id: "maintain", label: "Maintain a healthy lifestyle", timescale: false,
    desc: "You're in a good place: keep your health, exercise and eating balanced.",
    focus: "consistency and balance across eating, exercise and wellbeing; maintenance calories" },
  { id: "build", label: "Build fitness & strength", timescale: false,
    desc: "Grow muscle, strength and fitness, fuelled properly.",
    focus: "training progress and protein; a small surplus (or maintenance for recomposition when body fat is high)" },
  { id: "grow", label: "Grow to a healthy lifestyle", timescale: true,
    desc: "A combined approach: healthier eating, regular exercise and better body composition, together.",
    focus: "all areas balanced; a gentle deficit (about 10%) only if above a healthy weight" },
  { id: "support", label: "Support my health", timescale: true,
    desc: "Shape your eating, exercise and body composition around your health conditions — always alongside your GP's advice.",
    focus: "the person's health conditions and their nutrient priorities; a modest deficit (0–10%) only if above a healthy weight; always alongside their GP's advice" },
];
export function goalDef(id) { return GOALS.filter(function(g) { return g.id === id; })[0] || null; }
export var ACTIVITY = { sitting: { label: "Mostly sitting", factor: 1.15 }, feet: { label: "On my feet a fair bit", factor: 1.3 }, very: { label: "Very active", factor: 1.45 } };
export var MONTHS_MIN = 3, MONTHS_MAX = 24, DEFAULT_MONTHS = 6;
export var BMI_MIN = 18.5, BMI_HEALTHY_MAX = 24.9;

function num(x) { var n = parseFloat(x); return isFinite(n) ? n : null; }
function round(x) { return Math.round(x); }
export function goalOf(p) { return (p && p.goal) || {}; }
export function activityOf(p) { var a = p && p.profile && p.profile.activityLevel; return ACTIVITY[a] ? a : null; }

/** Latest weight in kg: the newest weigh-in, else the weight given at setup. */
export function currentKg(p) {
  var w = ((p && p.body && p.body.weight) || []).filter(function(e) { return e && toKg(e.v); }).slice().sort(function(a, b) { return (a.wk || 0) - (b.wk || 0); });
  if (w.length) return toKg(w[w.length - 1].v);
  return num(p && p.profile && p.profile.weightKg);
}
export function bmiOf(kg, cm) { return kg && cm ? kg / Math.pow(cm / 100, 2) : null; }
export function healthyRange(cm) { if (!cm) return null; var m2 = Math.pow(cm / 100, 2); return { minKg: Math.round(BMI_MIN * m2 * 10) / 10, maxKg: Math.round(BMI_HEALTHY_MAX * m2 * 10) / 10 }; }
export function latestBodyFat(p) { var f = ((p && p.body && p.body.bodyFat) || []).filter(function(e) { return e && num(e.v) > 2; }); return f.length ? num(f[f.length - 1].v) : null; }

/* ---------- v2.18.1: the recommended target weight (the app recommends; the person accepts or changes it) ---------- */
// Healthy body-fat targets (%), by sex and age; the mid-point is the target. Younger adults slightly lower.
export var BODY_FAT_TARGET = { male: { "40+": [18, 22], under40: [15, 19] }, female: { "40+": [25, 31], under40: [22, 28] } };
export var BMI_TARGET = [22, 24.9];   // fallback: the top half of the healthy BMI range
export var MATERIAL_KG = 2;           // a change in the recommendation big enough to suggest updating
function r1(x) { return Math.round(x * 10) / 10; }
/** Lean mass for the recommendation: the rolling average (3–4 weigh-ins with body fat), else the latest weight × (1 − latest body fat). */
function leanFor(p) {
  var l = leanMass(p && p.body); if (l) return { leanKg: l.leanKg, bodyFatPct: l.bodyFatPct };
  var kg = currentKg(p), bf = latestBodyFat(p); return kg && bf ? { leanKg: kg * (1 - bf / 100), bodyFatPct: bf } : null;
}
/**
 * The Companion's recommended target weight: { kg, minKg, maxKg, method: "body-fat" | "bmi", estimate, why } or null.
 * Body-fat method: lean mass ÷ (1 − target body fat %). Fallback: BMI 22–24.9 for the height (an estimate). Never below BMI 18.5.
 */
export function recommendedTarget(p, now) {
  var cm = heightCm(p); var age = ageOf(p, now); var male = isMale(p);
  var floor = cm ? BMI_MIN * Math.pow(cm / 100, 2) : 0;
  var lean = leanFor(p);
  if (lean) {
    var band = BODY_FAT_TARGET[male ? "male" : "female"][age != null && age < 40 ? "under40" : "40+"];
    var mid = (band[0] + band[1]) / 2;
    var kg = lean.leanKg / (1 - mid / 100), lo = lean.leanKg / (1 - band[0] / 100), hi = lean.leanKg / (1 - band[1] / 100);
    return { kg: r1(Math.max(kg, floor)), minKg: r1(Math.max(lo, floor)), maxKg: r1(Math.max(hi, floor)), method: "body-fat", estimate: false, bodyFatTarget: band,
      why: "Based on your lean mass (" + r1(lean.leanKg) + " kg) and a healthy body-fat range for your age and sex (" + band[0] + "–" + band[1] + "%)." };
  }
  if (!cm) return null;
  var m2 = Math.pow(cm / 100, 2);
  return { kg: r1((BMI_TARGET[0] + BMI_TARGET[1]) / 2 * m2), minKg: r1(BMI_TARGET[0] * m2), maxKg: r1(BMI_TARGET[1] * m2), method: "bmi", estimate: true,
    why: "Estimate from a healthy weight range for your height — add body composition (body fat %) for a better target." };
}
/** The target in use: the person's chosen target, else the current recommendation. */
export function targetInUse(p) { var g = goalOf(p); var t = num(g.targetKg); if (t) return t; var rec = recommendedTarget(p); return rec ? rec.kg : null; }
/** True when the person chose their own target that differs from the Companion's recommendation. */
export function isOwnTarget(g, rec) { return !!(g && g.targetSource === "own" && num(g.targetKg) && rec && Math.abs(num(g.targetKg) - rec.kg) >= 0.5); }

/* ---------- v2.18.2: personal limits for rating that person's selections (F23) ---------- */
/**
 * { kcal, satFat, addedSugar } for rating one person's selections: kcal = their daily goal without exercise
 * (body burn on a typical day + aim, never below the safe minimum); sat fat and free sugars scale with it from the
 * 2,000 kcal reference (20 g / 25 g), and never above the reference when a condition makes that nutrient a priority
 * (e.g. cholesterol → sat fat, blood glucose → sugars). null until the goal setup is complete (then the reference is used).
 */
export function personalLimits(p) {
  if (!setupComplete(p)) return null;
  var b = bmrOf(p).bmr, a = aimOf(p);
  var kcal = Math.max(safeMinimum(b, isMale(p)), typicalBurn(p) + a.kcal);
  var pri = nutrientPriorities([conditionsOf(p), p.healthProfile].join(" ")).join(" ");
  var sf = 20 * kcal / 2000, su = 25 * kcal / 2000;
  if (/saturated fat/.test(pri)) sf = Math.min(sf, 20);
  if (/sugars/.test(pri)) su = Math.min(su, 25);
  return { kcal: kcal, satFat: Math.round(sf * 10) / 10, addedSugar: Math.round(su * 10) / 10 };
}

/** Health conditions for "Support my health": My Health → My conditions, or the profile questionnaire's conditions. */
export function conditionsOf(p) {
  var t = [p && p.healthConditions, p && p.onboarding && p.onboarding.conditions].filter(function(x) { return x && !/^\s*(none|n\/a|no|-)\s*\.?\s*$/i.test(String(x)); });
  return t.join(". ").trim();
}
var NUTRIENTS = [
  [/cholesterol|ldl|statin|\bfh\b|hypercholest|lipid|heart/i, "saturated fat (keep low), soluble fibre (more)"],
  [/diabet|glucose|hba1c|insulin|prediabet|blood sugar/i, "free and added sugars (keep low), refined carbohydrates"],
  [/blood pressure|hypertens/i, "salt (keep under 6 g)"],
  [/kidney|renal|egfr|ckd/i, "salt and protein (as advised by the GP)"],
  [/thyroid|tsh|levothyrox/i, "iodine/selenium balance; take levothyroxine apart from calcium/iron-rich foods"],
  [/ibs|coeliac|celiac|crohn|colitis/i, "trigger foods (FODMAP/gluten as advised)"],
  [/osteopor|bone/i, "calcium and vitamin D"],
  [/gout|uric/i, "purines and alcohol"],
];
export function nutrientPriorities(text) { var out = []; NUTRIENTS.forEach(function(n) { if (n[0].test(text || "")) out.push(n[1]); }); return out; }

/** What the mandatory setup still needs (empty = complete). */
export function setupMissing(p) {
  var g = goalOf(p), pr = (p && p.profile) || {}, m = [];
  if (!goalDef(g.id)) m.push("goal");
  if (!/^[mf]/i.test(String(pr.sex || ""))) m.push("sex");
  if (!ageOf(p)) m.push("age");
  if (!heightCm(p)) m.push("height");
  if (!currentKg(p)) m.push("weight");
  if (!activityOf(p)) m.push("activity");
  if (g.id === "support" && !conditionsOf(p)) m.push("conditions");
  return m;
}
export function setupComplete(p) { return setupMissing(p).length === 0; }

/** Typical daily body burn (no step data): BMR × the activity level's factor. */
export function typicalBurn(p) { var b = bmrOf(p).bmr; return round(b * ((ACTIVITY[activityOf(p)] || ACTIVITY.sitting).factor)); }

/**
 * Safety check for a weight-loss timescale (also drives the slider colours).
 * red: > 1% body weight/week, or a gap > 25% of body burn, or below the safe minimum. amber: > 0.75%/week or > 20%.
 */
export function paceCheck(o) {
  var weeks = o.months * WEEKS_PER_MONTH;
  var lose = Math.max(0, o.currentKg - o.targetKg);
  var kgW = weeks > 0 ? lose / weeks : 0;
  var pctW = o.currentKg ? kgW / o.currentKg * 100 : 0;
  var gap = kgW * KCAL_PER_KG / 7;
  var gapPct = o.burn ? gap / o.burn * 100 : 0;
  var minimum = safeMinimum(o.bmr, o.male);
  var reasons = [];
  if (pctW > 1) reasons.push("more than 1% of your body weight a week");
  if (gapPct > 25) reasons.push("a daily gap of more than 25% of your body burn");
  if (o.burn - gap < minimum) reasons.push("below your safe minimum of " + minimum + " kcal");
  var level = reasons.length ? "red" : (pctW > 0.75 || gapPct > 20) ? "amber" : "green";
  var monthsFor = function(pct) { if (!lose) return MONTHS_MIN; var m = Math.ceil(lose / (o.currentKg * pct / 100) / WEEKS_PER_MONTH); return Math.min(MONTHS_MAX, Math.max(MONTHS_MIN, m)); };
  var alternatives = level === "green" ? [] : [{ label: "Steady", months: monthsFor(0.5) }, { label: "Gentle", months: monthsFor(0.35) }];
  return { kgPerWeek: Math.round(kgW * 100) / 100, pctPerWeek: Math.round(pctW * 100) / 100, dailyGap: round(gap), gapPct: Math.round(gapPct * 10) / 10, minimum: minimum, level: level, reasons: reasons, alternatives: alternatives };
}
/** Target weight check: never below BMI 18.5. */
export function targetAllowed(targetKg, cm) { var r = healthyRange(cm); return !r || !targetKg || targetKg >= Math.round(BMI_MIN * Math.pow(cm / 100, 2) * 10) / 10; }

/**
 * The daily Aim (signed kcal: − deficit, + surplus) for the person's goal, with a plain description.
 * Computed from the typical body burn so it is the same every day.
 */
export function aimOf(p) {
  var g = goalOf(p), def = goalDef(g.id); if (!def) return null;
  var bmr = bmrOf(p).bmr, burn = typicalBurn(p), male = isMale(p), cm = heightCm(p), kg = currentKg(p);
  var bmi = bmiOf(kg, cm), range = healthyRange(cm);
  var months = Math.min(MONTHS_MAX, Math.max(MONTHS_MIN, num(g.months) || DEFAULT_MONTHS));
  var target = targetInUse(p);   // v2.18.1: chosen target, else the Companion's recommendation
  var out = { goal: def.id, label: def.label, months: null, targetKg: null, kcal: 0, approach: "maintenance", pace: null, capped: false };
  var byPace = function(capPct) {
    if (!target || !kg || kg <= target) return null;
    var pc = paceCheck({ currentKg: kg, targetKg: target, months: months, burn: burn, bmr: bmr, male: male });
    var gap = pc.dailyGap, cap = burn * capPct / 100;
    if (gap > cap) { gap = cap; out.capped = true; }
    out.months = months; out.targetKg = Math.round(target * 10) / 10; out.pace = pc;
    return -round(gap);
  };
  if (def.id === "healthy_weight") {
    var a = byPace(25);
    if (a == null) { out.approach = "maintenance (already at or below the target)"; } else { out.kcal = a; out.approach = "deficit sized by the timescale"; }
  } else if (def.id === "build") {
    var bf = latestBodyFat(p), high = bf != null && bf >= (male ? 25 : 32);
    if (high) { out.approach = "maintenance for recomposition (body fat is high)"; } else { out.kcal = round(burn * 0.075); out.approach = "+7.5% surplus"; }
  } else if (def.id === "grow" || def.id === "support") {
    var above = bmi != null && bmi >= 25;
    if (above) {
      var gentle = -round(burn * 0.10);
      var paced = g.targetKg ? byPace(10) : null;
      out.kcal = paced != null ? paced : gentle; out.approach = def.id === "grow" ? "gentle deficit (about 10%)" : "modest deficit (up to 10%)";
      if (paced == null) { out.months = null; out.pace = null; }
    } else { out.approach = "maintenance (already a healthy weight)"; }
    if (def.id === "support") out.priorities = nutrientPriorities(conditionsOf(p));
  }
  return out;
}
export function aimText(a) {
  if (!a) return "";
  var s = a.label;
  if (a.months) s += " · " + a.months + " months";
  return s;
}

function plannedExercise(p, date) {
  var day = WEEKDAY[new Date(date + "T12:00:00").getDay()];
  return ((p && p.exercises && p.exercises[day]) || []).filter(function(x) { return x && !x.stopped; }).map(function(ex) {
    var last = (ex.prog || [])[(ex.prog || []).length - 1];
    var sets = parseInt(ex.sets, 10) || (last && Array.isArray(last.sets) && last.sets.length) || (/×(\d+)$/.test(String((last && last.r) || ex.reps || "")) ? parseInt(/×(\d+)$/.exec(String((last && last.r) || ex.reps))[1], 10) : 3);
    var minutes = parseFloat(ex.duration) > 0 ? parseFloat(ex.duration) : sets * MIN_PER_SET;
    return { name: ex.name, met: MET[ex.exType || "weights"] || DEFAULT_MET, minutes: minutes };
  });
}
/** Planned kcal from the day's selections at their ORIGINAL planned values (the child's snapshot), skipped included. */
export function dayPlannedKcal(doc, date) {
  var ch = (doc && doc.children) || {}, t = 0;
  Object.keys(ch).forEach(function(id) { var c = ch[id]; if (c && c.date === date) t += (c.snapshot && num(c.snapshot.kcal)) || 0; });
  return round(t);
}

/**
 * The Planned | Actual table for one date.
 * Body burn: BMR × 1.15 when the day has step (or device total) data, else BMR × the activity level's factor.
 * Exercise actual: device total − burn when given (nothing added on top); otherwise logged exercise + steps above the allowance.
 */
export function dayTable(p, date, doc) {
  if (!setupComplete(p)) return { ready: false, missing: setupMissing(p) };
  var b = bmrOf(p).bmr, adj = settingsOf(p).adjPct / 100, aim = aimOf(p), minimum = safeMinimum(b, isMale(p));
  var pl = planOf(p, null, Math.max(minimum, round(b * BASELINE_FACTOR) + aim.kcal));
  var steps = stepsOn(p, date);
  var g = p.googleDaily && p.googleDaily[date]; var total = g && num(g.kcal);
  var measured = steps != null || total != null;
  var burn = round(b * (measured ? BASELINE_FACTOR : (ACTIVITY[activityOf(p)].factor)));
  var kg = pl.weightKg;
  var exPlanned = round(plannedExercise(p, date).reduce(function(s, x) { return s + exerciseKcal(x.met, kg, x.minutes); }, 0) * adj);
  var exActual, mode, stepsK = 0, loggedK = 0;
  if (total != null) { mode = "total"; exActual = round(Math.max(0, total - burn) * adj); }
  else {
    mode = "parts";
    stepsK = steps != null ? Math.max(0, steps - pl.stepAllowance) * pl.kcalPerStep : 0;
    loggedK = exerciseOn(p, date).done.reduce(function(s, x) { return s + exerciseKcal(x.met, kg, x.minutes); }, 0);
    exActual = round((stepsK + loggedK) * adj);
  }
  var base = burn + aim.kcal, floored = base < minimum; if (floored) base = minimum;
  var plannedEat = dayPlannedKcal(doc, date), actualEat = dayFoodKcal(doc, date);
  var goalP = base + exPlanned, goalA = base + exActual;
  var diff = actualEat - goalA;
  var diffP = plannedEat - goalP;   /* v2.20.0: On track for the Planned column too */
  return { ready: true, date: date, bmr: b, method: pl.method, estimate: pl.estimate, burn: burn, measured: measured, activity: activityOf(p), aim: aim, minimum: minimum, floored: floored,
    exercise: { planned: exPlanned, actual: exActual, mode: mode, steps: round(stepsK * adj), logged: round(loggedK * adj), stepsCount: steps, totalBurned: total },
    goal: { planned: goalP, actual: goalA }, eating: { planned: plannedEat, actual: actualEat },
    onTrack: { kcal: diff, pct: goalA ? Math.round(diff / goalA * 100) : 0, colour: diff <= 0 ? "green" : "red" }, onTrackPlanned: { kcal: diffP, pct: goalP ? Math.round(diffP / goalP * 100) : 0, colour: diffP <= 0 ? "green" : "red" }, hasActual: actualEat > 0, stepAllowance: pl.stepAllowance, adjPct: settingsOf(p).adjPct };
}

/** Week to date: Σ actual eating vs Σ actual goal over PAST days this week that have actual data (never today or the future). */
export function weekToDate(p, doc, now) {
  now = new Date(now || Date.now());
  var today = isoDay(now);
  var days = weekDates(now).filter(function(d) { return d < today; }).map(function(d) { return dayTable(p, d, doc); }).filter(function(t) { return t.ready && t.hasActual; });
  if (!days.length) return { pct: null, kcal: 0, days: [], colour: "none" };
  var eat = days.reduce(function(s, t) { return s + t.eating.actual; }, 0), goal = days.reduce(function(s, t) { return s + t.goal.actual; }, 0);
  var diff = eat - goal;
  return { pct: Math.round(diff / goal * 100), kcal: diff, days: days.map(function(t) { return t.date; }), colour: diff <= 0 ? "green" : "red" };
}

/** Progress against the required pace since the goal was set. */
export function progressOf(p, now) {
  var g = goalOf(p), a = aimOf(p); if (!a || !a.pace || !g.setAt || !num(g.startKg)) return null;
  var weeks = Math.max(0, (new Date(now || Date.now()) - new Date(g.setAt)) / (7 * 864e5));
  var expected = num(g.startKg) - a.pace.kgPerWeek * weeks, actual = currentKg(p);
  if (actual == null) return null;
  var lost = num(g.startKg) - actual, expLost = num(g.startKg) - expected;
  var status = weeks < 2 ? "too early to judge" : lost >= expLost * 0.9 ? "on pace or ahead" : lost >= expLost * 0.5 ? "a little behind pace" : "well behind pace";
  return { weeks: Math.round(weeks * 10) / 10, startKg: num(g.startKg), currentKg: Math.round(actual * 10) / 10, expectedKg: Math.round(expected * 10) / 10, status: status };
}

/** In the healthy BMI range at every weigh-in of the last 6+ weeks (dated or by training week). */
function healthySixWeeks(p, now) {
  var cm = heightCm(p); var r = healthyRange(cm); if (!r) return false;
  var w = ((p.body && p.body.weight) || []).filter(function(e) { return e && toKg(e.v); });
  if (w.length < 2) return false;
  var span = (w[w.length - 1].wk || 0) - (w[0].wk || 0);
  var recent = w.filter(function(e) { return (w[w.length - 1].wk || 0) - (e.wk || 0) <= 6; });
  return span >= 6 && recent.every(function(e) { var k = toKg(e.v); return k >= r.minKg && k <= r.maxKg; });
}
/** A goal change the app (and the companions) may suggest. Suggestion only: the person accepts or dismisses. */
export function goalSuggestion(p, now) {
  var g = goalOf(p); if (!goalDef(g.id)) return null;
  var dismissed = g.dismissed || {};
  var s = null;
  if ((g.id === "healthy_weight" || g.id === "grow") && healthySixWeeks(p, now)) s = { key: "maintain", to: { id: "maintain" }, text: "You've been in the healthy weight range for 6 weeks or more. Would you like to switch to “Maintain a healthy lifestyle”?" };
  else if (goalDef(g.id).timescale && g.targetSource !== "own" && num(g.recommendedKg) && recommendedTarget(p, now) && Math.abs(recommendedTarget(p, now).kg - num(g.recommendedKg)) >= MATERIAL_KG) {
    var nr = recommendedTarget(p, now);
    s = { key: "target-" + nr.kg, to: { targetKg: nr.kg, recommendedKg: nr.kg, targetSource: "recommended" }, text: "As your body composition has changed, your Companion now recommends a target of " + nr.kg + " kg (was " + num(g.recommendedKg) + " kg). Would you like to update it?" };
  }
  else {
    var a = aimOf(p), pr = progressOf(p, now);
    if (a && a.pace && (a.pace.level === "red" || (pr && pr.weeks >= 4 && pr.status === "well behind pace"))) {
      var m = (a.pace.alternatives[0] && a.pace.alternatives[0].months) || Math.min(MONTHS_MAX, (a.months || DEFAULT_MONTHS) + 3);
      if (m > (a.months || 0)) s = { key: "timescale-" + m, to: { months: m }, text: "Your current pace looks hard to keep up. A longer timescale of " + m + " months would be steadier — would you like to change it?" };
    }
  }
  return s && !dismissed[s.key] ? s : null;
}

/** One context block for every companion: the goal, its focus, timescale, required pace and progress vs pace. */
export function goalCtx(p, now) {
  var g = goalOf(p), def = goalDef(g.id);
  if (!def) return "PERSON GOAL: not set yet (setup incomplete) — don't give calorie targets; encourage them to finish the goal setup.";
  var a = aimOf(p), t = dayTable(p, isoDay(new Date(now || Date.now())), null), pr = progressOf(p, now), sug = goalSuggestion(p, now);
  var lines = ["PERSON GOAL: \"" + def.label + "\" — " + def.desc + " Companion focus: " + def.focus + "."];
  var rec = recommendedTarget(p, now);
  if (rec && def.timescale) lines.push("Recommended target weight (from their profile): " + rec.kg + " kg (range " + rec.minKg + "–" + rec.maxKg + " kg; " + (rec.method === "body-fat" ? "lean mass and a healthy body-fat range" : "BMI estimate") + ")." + (isOwnTarget(g, rec) ? " They chose their own target of " + num(g.targetKg) + " kg instead; respect their choice, and you may gently refer to the recommended figure where helpful." : ""));
  if (a.months) lines.push("Timescale: " + a.months + " months" + (a.targetKg ? " to " + a.targetKg + " kg" : "") + "; required pace " + a.pace.kgPerWeek + " kg/week (" + a.pace.pctPerWeek + "% of body weight), a daily gap of " + Math.abs(a.kcal) + " kcal" + (a.capped ? " (limited for safety)" : "") + "; pace check: " + a.pace.level + ".");
  if (t.ready) lines.push("Daily calorie goal (the ONLY calorie target to use): body burn " + t.burn + " + aim " + (a.kcal >= 0 ? "+" : "") + a.kcal + " (" + a.approach + ") + logged exercise = " + t.goal.actual + " kcal today" + (t.floored ? " (limited to the safe minimum " + t.minimum + ")" : "") + ".");
  if (pr) lines.push("Progress vs pace: started " + pr.startKg + " kg, now " + pr.currentKg + " kg after " + pr.weeks + " weeks; expected about " + pr.expectedKg + " kg — " + pr.status + ".");
  if (def.id === "support") lines.push("Health conditions: " + (conditionsOf(p) || "none recorded") + ". Nutrient priorities: " + ((a.priorities || []).join("; ") || "general healthy eating") + ". Always frame advice alongside their GP's advice.");
  lines.push("Frame your feedback by this goal, with encouraging, non-shaming language." + (sug ? " The app suggests a goal change: \"" + sug.text + "\" You may mention it as a suggestion only; the person decides." : " You may suggest a goal change only if clearly warranted (e.g. in the healthy range for 6+ weeks → Maintain; pace consistently unrealistic → a longer timescale); suggestion only, the person decides."));
  return lines.join("\n");
}
/** The calorie target text for prompts that used fixed targets. */
export function kcalTargetText(p) {
  var t = dayTable(p, isoDay(new Date()), null);
  return t.ready ? t.goal.actual + " kcal/day goal (" + aimText(t.aim) + ")" : "calorie goal not set yet (goal setup incomplete)";
}
/** The day's calorie goal (actual) as a number, for colouring totals; null until the goal setup is complete. */
export function goalKcal(p, date, doc) { var t = dayTable(p, date || isoDay(new Date()), doc); return t.ready ? t.goal.actual : null; }
export { BASELINE_FACTOR, toKg };
