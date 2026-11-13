// v2.16.2 R6 / R4 / R5: calorie target from measured burn. Pure functions (tested directly).
// R6: BMR by Katch-McArdle (370 + 21.6 × lean mass kg) from a rolling average of the last 3–4 weigh-ins.
// R4: Google Health daily TOTAL calories burned, per Sun–Sat week. Activity credit = total − BMR (never below 0).
// R5: per-person activity adjustment % (default 100) applied to the credit.
// Target = BMR + credit × adjustment − deficit. No Google data → BMR × 1.2, labelled as an estimate.
// Nothing here changes what the app uses until the admin switches R6 on for that person (default OFF).

export var DEFAULT_DEFICIT = 500;      // kcal/day — JC to confirm (HANDOVER question)
export var NO_DATA_FACTOR = 1.2;
var STONE_KG = 6.35029;

/** Weight entries are stored in stone (Body section). Values ≥ 40 are taken as kg already. */
export function toKg(v) { var n = parseFloat(v); if (!isFinite(n) || n <= 0) return null; return n < 40 ? n * STONE_KG : n; }

function lastN(arr, n) {
  return (arr || []).filter(function(e) { return e && isFinite(parseFloat(e.v)); }).slice().sort(function(a, b) { return (a.wk || 0) - (b.wk || 0); }).slice(-n);
}
function avg(xs) { return xs.length ? xs.reduce(function(s, x) { return s + x; }, 0) / xs.length : null; }

/** Rolling average of the last 3–4 weigh-ins: { weightKg, bodyFatPct, leanKg, n } or null if not enough data. */
export function leanMass(body, n) {
  n = n || 4;
  var w = lastN(body && body.weight, n).map(function(e) { return toKg(e.v); }).filter(Boolean);
  var f = lastN(body && body.bodyFat, n).map(function(e) { return parseFloat(e.v); }).filter(function(x) { return x > 2 && x < 70; });
  if (w.length < 3 || f.length < 3) return null;
  var wk = avg(w), bf = avg(f);
  return { weightKg: wk, bodyFatPct: bf, leanKg: wk * (1 - bf / 100), n: Math.min(w.length, f.length) };
}
export function katchMcArdle(leanKg) { return Math.round(370 + 21.6 * leanKg); }

/** Sunday–Saturday week containing `date` (local), as YYYY-MM-DD strings. */
export function weekDates(date) {
  var d = new Date(date || Date.now()); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - d.getDay());
  var out = [];
  for (var i = 0; i < 7; i++) { var x = new Date(d); x.setDate(d.getDate() + i); out.push(isoDay(x)); }
  return out;
}
export function isoDay(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

export function settingsOf(p) {
  var s = (p && p.calorieSettings) || {};
  return { r6Active: !!s.r6Active, deficit: isFinite(parseFloat(s.deficit)) ? parseFloat(s.deficit) : DEFAULT_DEFICIT,
    adjPct: isFinite(parseFloat(s.adjPct)) ? parseFloat(s.adjPct) : 100, adjHistory: s.adjHistory || [] };
}

/**
 * The calculated target for one person for the week containing `date`.
 * googleDaily: { "YYYY-MM-DD": { kcal } } (daily TOTAL calories burned).
 * Returns { estimate, bmr, lean, days: [{date, burned, credit}], avgBurned, avgCredit, adjPct, deficit, target, label } or null.
 */
export function calcTarget(p, date) {
  var lean = leanMass(p && p.body);
  if (!lean) return null;
  var s = settingsOf(p);
  var bmr = katchMcArdle(lean.leanKg);
  var gd = (p && p.googleDaily) || {};
  var days = weekDates(date).map(function(d) { var g = gd[d]; var burned = g && isFinite(parseFloat(g.kcal)) ? Math.round(parseFloat(g.kcal)) : null; return { date: d, burned: burned, credit: burned == null ? null : Math.max(0, burned - bmr) }; })
    .filter(function(x) { return x.burned != null; });
  if (!days.length) {
    var est = Math.round(bmr * NO_DATA_FACTOR);
    return { estimate: true, bmr: bmr, lean: lean, days: [], adjPct: s.adjPct, deficit: s.deficit, target: Math.round(est - s.deficit),
      label: "Estimate: BMR " + bmr + " kcal (from body composition) × " + NO_DATA_FACTOR + " = " + est + " kcal · −" + s.deficit + " deficit" };
  }
  var avgBurned = Math.round(avg(days.map(function(x) { return x.burned; })));
  var avgCredit = Math.round(avg(days.map(function(x) { return x.credit; })) * s.adjPct / 100);
  return { estimate: false, bmr: bmr, lean: lean, days: days, avgBurned: avgBurned, avgCredit: avgCredit, adjPct: s.adjPct, deficit: s.deficit,
    target: Math.round(bmr + avgCredit - s.deficit),
    label: avgBurned + " kcal burned · " + bmr + " deducted for your BMR (from body composition) · +" + avgCredit + " kcal from activity" + (s.adjPct !== 100 ? " (at " + s.adjPct + "%)" : "") };
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

/** The daily kcal limit the Eating section uses: the calculated target only when R6 is active for the person. */
export function kcalLimit(p, fallback) {
  var s = settingsOf(p); if (!s.r6Active) return fallback;
  var c = calcTarget(p, new Date()); return c ? c.target : fallback;
}
