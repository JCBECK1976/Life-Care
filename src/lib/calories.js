// v2.17.1 calorie model (docs/design/CALORIES.md, ADR 0013). Pure functions, tested with known inputs.
//  BMR       Katch-McArdle 370 + 21.6 × lean kg (rolling last 3–4 weigh-ins with body fat).
//            Fallbacks (labelled "estimate"): Mifflin-St Jeor from weight/height/age/sex; no weight → age/sex average.
//  Baseline  sedentary maintenance = BMR × 1.15.
//  Goal      baseline × (1 − deficit%), deficit% per person (default 20%). Safety floor: never below BMR.
//  Activity  credit NET of resting burn, so BMR is never counted twice:
//            a) total calories burned for the day (Google/Apple Health) → max(0, total − baseline); nothing added on top;
//            b) otherwise steps above a per-person basal allowance + logged exercise (MET − 1) × kg × hours;
//            c) × the person's activity adjustment % (R5, default 100%).
export var BASELINE_FACTOR = 1.15;
export var DEFAULT_DEFICIT_PCT = 20;
export var KCAL_PER_KG_KM = 0.5;          // walking cost above rest, kcal per kg per km
export var STRIDE_FACTOR = 0.415;         // stride ≈ height × 0.415
export var ALLOWANCE_MIN = 2000, ALLOWANCE_MAX = 3500;
// MET per exercise type (Compendium of Physical Activities, 2011/2024): resistance training 3.5–6.0 → 5.0 default;
// calisthenics/bodyweight moderate 3.8; general cardio (e.g. cycling/rowing/elliptical moderate) 7.0;
// static holds/core 2.8; stretching 2.3.
export var MET = { weights: 5.0, bodyweight: 3.8, cardio: 7.0, timed_hold: 2.8, stretching: 2.3 };
export var DEFAULT_MET = 5.0;
export var MIN_PER_SET = 3;               // ≈ 1 min working + 2 min rest, when a session length isn't recorded
var STONE_KG = 6.35029;
var START = new Date(2026, 6, 19);        // the app's training week 1 (calcWeek)

export function toKg(v) { var n = parseFloat(v); if (!isFinite(n) || n <= 0) return null; return n < 40 ? n * STONE_KG : n; }
function lastN(arr, n) { return (arr || []).filter(function(e) { return e && isFinite(parseFloat(e.v)); }).slice().sort(function(a, b) { return (a.wk || 0) - (b.wk || 0); }).slice(-n); }
function avg(xs) { return xs.length ? xs.reduce(function(s, x) { return s + x; }, 0) / xs.length : null; }
export function isoDay(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
export function weekDates(date) {
  var d = new Date(date || Date.now()); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - d.getDay());
  var out = []; for (var i = 0; i < 7; i++) { var x = new Date(d); x.setDate(d.getDate() + i); out.push(isoDay(x)); } return out;
}
export function trainingWeekOf(date) { var d = new Date(date); d.setHours(12, 0, 0, 0); return Math.floor((d - START) / (7 * 86400000)) + 1; }
export var WEEKDAY = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Rolling average of the last 3–4 weigh-ins with body fat: { weightKg, bodyFatPct, leanKg, n } or null. */
export function leanMass(body, n) {
  n = n || 4;
  var w = lastN(body && body.weight, n).map(function(e) { return toKg(e.v); }).filter(Boolean);
  var f = lastN(body && body.bodyFat, n).map(function(e) { return parseFloat(e.v); }).filter(function(x) { return x > 2 && x < 70; });
  if (w.length < 3 || f.length < 3) return null;
  var wk = avg(w), bf = avg(f);
  return { weightKg: wk, bodyFatPct: bf, leanKg: wk * (1 - bf / 100), n: Math.min(w.length, f.length) };
}
export function katchMcArdle(leanKg) { return Math.round(370 + 21.6 * leanKg); }
export function mifflin(kg, cm, age, male) { return Math.round(10 * kg + 6.25 * cm - 5 * age + (male ? 5 : -161)); }

export function weightKg(p) { var w = lastN(p && p.body && p.body.weight, 4).map(function(e) { return toKg(e.v); }).filter(Boolean); return w.length ? avg(w) : null; }
export function heightCm(p) {
  var h = String((p && p.profile && p.profile.height) || ""); var m;
  if ((m = /(\d+)\s*'\s*(\d+)?/.exec(h))) return Math.round((parseInt(m[1]) * 12 + (parseInt(m[2]) || 0)) * 2.54);
  var n = parseFloat(h); if (!isFinite(n) || n <= 0) return null; return n < 3 ? Math.round(n * 100) : Math.round(n);
}
export function ageOf(p, now) {
  var pr = (p && p.profile) || {};
  if (pr.dob) { var b = new Date(pr.dob), t = new Date(now || Date.now()); var a = t.getFullYear() - b.getFullYear(); if (t < new Date(t.getFullYear(), b.getMonth(), b.getDate())) a--; if (a > 0 && a < 120) return a; }
  var n = parseInt(pr.age, 10); return n > 0 && n < 120 ? n : null;
}
export function isMale(p) { return /^m/i.test(String((p && p.profile && p.profile.sex) || "")); }
// UK adult averages (ONS/HSE) for the last-resort estimate
var AVG = { male: { kg: 85, cm: 175 }, female: { kg: 72, cm: 162 } };

/** BMR with its method: katch (measured) | mifflin (estimate) | average (estimate). */
export function bmrOf(p, now) {
  var lean = leanMass(p && p.body);
  if (lean) return { bmr: katchMcArdle(lean.leanKg), method: "katch", estimate: false, lean: lean, weightKg: lean.weightKg };
  var male = isMale(p), age = ageOf(p, now) || 45, cm = heightCm(p), kg = weightKg(p);
  if (kg) return { bmr: mifflin(kg, cm || AVG[male ? "male" : "female"].cm, age, male), method: "mifflin", estimate: true, weightKg: kg, heightGuessed: !cm, ageGuessed: !ageOf(p, now) };
  var a = AVG[male ? "male" : "female"];
  return { bmr: mifflin(a.kg, a.cm, age, male), method: "average", estimate: true, weightKg: a.kg, ageGuessed: !ageOf(p, now) };
}

export function settingsOf(p) {
  var s = (p && p.calorieSettings) || {};
  var d = parseFloat(s.deficitPct);
  return { deficitPct: isFinite(d) && d >= 0 && d <= 40 ? d : DEFAULT_DEFICIT_PCT, adjPct: isFinite(parseFloat(s.adjPct)) ? parseFloat(s.adjPct) : 100, adjHistory: s.adjHistory || [] };
}

/** The person's daily plan: BMR, baseline, goal (floored), basal step allowance. */
export function planOf(p, now) {
  var b = bmrOf(p, now), s = settingsOf(p);
  var baseline = Math.round(b.bmr * BASELINE_FACTOR);
  var goalRaw = Math.round(baseline * (1 - s.deficitPct / 100));
  var goal = Math.max(goalRaw, b.bmr);
  var cm = heightCm(p) || AVG[isMale(p) ? "male" : "female"].cm;
  var stride = cm / 100 * STRIDE_FACTOR;                                      // metres per step
  var allowKcal = 0.15 * b.bmr - 0.10 * goal;                                  // the light movement already inside the baseline
  var perStep = stride / 1000 * KCAL_PER_KG_KM * b.weightKg;                   // kcal per step
  var allowance = Math.min(ALLOWANCE_MAX, Math.max(ALLOWANCE_MIN, Math.round(allowKcal / perStep)));
  return { bmr: b.bmr, method: b.method, estimate: b.estimate, bmrInfo: b, baseline: baseline, deficitPct: s.deficitPct, goalRaw: goalRaw, goal: goal, floored: goal > goalRaw,
    weightKg: b.weightKg, strideM: stride, kcalPerStep: perStep, stepAllowance: allowance, adjPct: s.adjPct };
}

/** Logged exercise on a date: sessions from the weekday's exercises that have an entry for that training week. */
export function exerciseOn(p, date) {
  var d = new Date(date + "T12:00:00"); var day = WEEKDAY[d.getDay()]; var wk = trainingWeekOf(d);
  var list = ((p && p.exercises && p.exercises[day]) || []);
  var done = [];
  list.forEach(function(ex) {
    var e = (ex.prog || []).find(function(x) { return (parseInt(x.wk, 10) || 0) === wk; });
    if (!e) return;
    var sets = Array.isArray(e.sets) && e.sets.length ? e.sets.length : (parseInt(ex.sets, 10) || String(e.r || "").split("/").length || 3);
    if (/×(\d+)$/.test(String(e.r || "")) && !(Array.isArray(e.sets) && e.sets.length)) sets = parseInt(/×(\d+)$/.exec(e.r)[1], 10) || sets;
    var minutes = parseFloat(e.duration) > 0 ? parseFloat(e.duration) : sets * MIN_PER_SET;
    done.push({ name: ex.name, type: ex.exType || "weights", met: MET[ex.exType || "weights"] || DEFAULT_MET, minutes: minutes });
  });
  return { day: day, week: wk, planned: list.filter(function(x) { return !x.stopped; }).length, done: done };
}
export function exerciseKcal(met, kg, minutes) { return Math.max(0, (met - 1) * kg * minutes / 60); }

/** The activity credit for one date (rounded kcal), with its parts and mode. */
export function dayCredit(p, date, plan) {
  plan = plan || planOf(p);
  var adj = plan.adjPct / 100;
  var g = p && p.googleDaily && p.googleDaily[date];
  var total = g && isFinite(parseFloat(g.kcal)) ? parseFloat(g.kcal) : null;
  if (total != null) {
    var c = Math.max(0, total - plan.baseline);
    return { mode: "total", totalBurned: Math.round(total), credit: Math.round(c * adj), steps: 0, exercise: 0, stepsCount: stepsOn(p, date) };
  }
  var steps = stepsOn(p, date);
  var stepsK = steps != null ? Math.max(0, steps - plan.stepAllowance) * plan.kcalPerStep : 0;
  var ex = exerciseOn(p, date);
  var exK = ex.done.reduce(function(s, x) { return s + exerciseKcal(x.met, plan.weightKg, x.minutes); }, 0);
  return { mode: "parts", credit: Math.round((stepsK + exK) * adj), steps: Math.round(stepsK * adj), exercise: Math.round(exK * adj), stepsCount: steps, sessions: ex.done.length };
}
export function stepsOn(p, date) { var s = p && p.dailyActivity && p.dailyActivity[date]; return s && isFinite(parseFloat(s.steps)) ? parseFloat(s.steps) : null; }

/** Everything the calorie line shows for a date. foodKcal from the eating record. */
export function dayBudget(p, date, foodKcal) {
  var plan = planOf(p); var c = dayCredit(p, date, plan);
  var target = plan.goal + c.credit;
  return { plan: plan, credit: c, target: target, food: Math.round(foodKcal || 0), left: Math.round(target - (foodKcal || 0)) };
}
/** The daily kcal limit the Eating section uses (goal + that day's activity credit). */
export function kcalLimit(p, fallback, who, date) { try { return dayBudget(p, date || isoDay(new Date()), 0).target; } catch (e) { return fallback; } }

/** Food kcal eaten on a date from the week's children doc (skipped items don't count). */
export function dayFoodKcal(doc, date) {
  var ch = (doc && doc.children) || {}; var t = 0;
  Object.keys(ch).forEach(function(id) { var c = ch[id]; if (c && c.date === date && c.tracked !== "skipped") t += (c.nutrition && parseFloat(c.nutrition.kcal)) || 0; });
  return Math.round(t);
}

/* ---------- R5: activity adjustment — suggestions and decisions (values + dates only) ---------- */
export function recordAdj(p, entry) {
  if (!p.calorieSettings) p.calorieSettings = {};
  var cs = p.calorieSettings;
  if (!cs.adjHistory) cs.adjHistory = [];
  cs.adjHistory.push(Object.assign({ date: isoDay(new Date()) }, entry));
  if (entry.kind === "manual" || entry.decision === "accepted") cs.adjPct = entry.value;
  return cs;
}
function daysSince(dateStr, now) { return Math.floor(((now || new Date()) - new Date(dateStr + "T12:00:00")) / 86400000); }

/**
 * Context line for the Body feedback prompt (R5). Tells the AI:
 * - the current adjustment and whether it may suggest a new one (not within 28 days of a decline, unless evidence differs meaningfully);
 * - a manual change not yet acknowledged → acknowledge once, explain, offer its recommended value + reason.
 */
export function r5PromptContext(p, now) {
  var s = settingsOf(p); var h = s.adjHistory;
  var lastDecline = h.slice().reverse().find(function(e) { return e.kind === "suggestion" && e.decision === "declined"; });
  var lastManual = h.slice().reverse().find(function(e) { return e.kind === "manual"; });
  var out = "\nACTIVITY CALORIE ADJUSTMENT (R5): the activity credit from Google Health is applied at " + s.adjPct + "%.";
  if (lastManual && !lastManual.acknowledged) out += " The user changed it themselves to " + lastManual.value + "% on " + lastManual.date + ": acknowledge this ONCE, explain the effect in one sentence, and offer your recommended value with the reason (field adjSuggestion).";
  else if (lastDecline && daysSince(lastDecline.date, now) < 28) out += " They declined your suggestion of " + lastDecline.value + "% on " + lastDecline.date + ": respect it, do NOT suggest again yet; quietly allow for the known accuracy gap in your advice.";
  else out += " After 3–4 weeks of data, compare the predicted weight change (from the calorie targets) with the actual trend; only if they differ meaningfully, suggest a new % with a one-sentence reason (field adjSuggestion). Otherwise omit adjSuggestion.";
  return out + ' Optional JSON field: "adjSuggestion": {"value": number 50-150, "reason": "one sentence"}.';
}
export function pendingSuggestion(p) {
  var h = settingsOf(p).adjHistory; var last = h[h.length - 1];
  return last && last.kind === "suggestion" && !last.decision ? last : null;
}
/** Apply what the AI returned: store a new suggestion; mark a manual change as acknowledged. */
export function applyAiAdj(p, adjSuggestion) {
  var h = settingsOf(p).adjHistory;
  var lastManual = h.slice().reverse().find(function(e) { return e.kind === "manual"; });
  if (lastManual && !lastManual.acknowledged) lastManual.acknowledged = isoDay(new Date());
  var v = adjSuggestion && parseFloat(adjSuggestion.value);
  if (v && v >= 50 && v <= 150 && v !== settingsOf(p).adjPct) recordAdj(p, { kind: "suggestion", value: Math.round(v), reason: String(adjSuggestion.reason || "").slice(0, 200) });
}
export function decideSuggestion(p, decision) {
  var s = pendingSuggestion(p); if (!s) return null;
  s.decision = decision; s.decidedOn = isoDay(new Date());
  if (decision === "accepted") p.calorieSettings.adjPct = s.value;
  return s;
}

