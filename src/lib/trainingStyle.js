// v2.43.0 (Architect night batch 23 Nov, PART 5 — Silver+): style-aware Companion progression.
//   Settings → "My training style" per person, optionally per exercise: focus (rep range) and pace.
//   A rules-only pattern detector over the last 4 weeks (an OBSERVATION for the Companion, never a verdict),
//   flags for unsound choices (the Companion must say so kindly), and the instant advice shown when the person
//   uses "Set my next session". TECHNICAL RANGES ONLY — never an exact equipment weight.
import { latestEntry, wkNum, parseReps, measureOf, sameExercise } from "./exercise.js";
import { repRange, usesRepRange } from "./exerciseWhy.js";
import { isSkippedEntry } from "./nextTarget.js";

export var FOCUS = [
  ["mixed", "Mixed (your current ranges)"],
  ["strength", "Strength · 6–8 reps"],
  ["muscle", "Muscle · 8–12 reps"],
  ["endurance", "Endurance · 12–15+ reps"],
];
export var PACE = [
  ["steady", "Steady small steps"],
  ["consolidate", "Consolidate a week, then move"],
  ["bigger", "Bigger jumps when ready"],
];
var RANGES = { strength: { lo: 6, hi: 8 }, muscle: { lo: 8, hi: 12 }, endurance: { lo: 12, hi: 15 } };
var DEFAULT = { focus: "mixed", pace: "steady" };

/** The person's style for an exercise: a per-exercise choice wins over the person's general one; default Mixed + Steady. */
export function styleFor(person, exName) {
  var ts = (person && person.trainingStyle) || {};
  var base = { focus: ts.focus || DEFAULT.focus, pace: ts.pace || DEFAULT.pace };
  var per = ts.perExercise || {};
  var key = Object.keys(per).find(function(k) { return sameExercise(k, exName); });
  return key ? { focus: per[key].focus || base.focus, pace: per[key].pace || base.pace, perExercise: true } : base;
}
/** The rep range for an exercise under a style (Mixed = the exercise's own range, as today). */
export function styleRange(ex, style) {
  var f = style && style.focus;
  return RANGES[f] ? RANGES[f] : repRange(ex);
}
export function styleLabel(style) {
  var f = FOCUS.find(function(o) { return o[0] === (style && style.focus); }) || FOCUS[0];
  var p = PACE.find(function(o) { return o[0] === (style && style.pace); }) || PACE[0];
  return f[1] + " · " + p[1];
}
/** The pace as a technical step size for the Companion. */
export function paceStep(style) {
  var p = style && style.pace;
  return p === "bigger" ? "5–10% when ready" : p === "consolidate" ? "2.5–5%, after repeating the target for a week" : "2.5–5%";
}

var num = function(v) { var m = /-?\d+(?:[.,]\d+)?/.exec(String(v == null ? "" : v)); return m ? parseFloat(m[0].replace(",", ".")) : 0; };
var setReps = function(e) { var s = Array.isArray(e.sets) && e.sets.length ? e.sets.map(function(x) { return num(x.r); }) : parseReps(e.r); return s.filter(function(x) { return x > 0; }); };
var load = function(e) { var s = Array.isArray(e.sets) && e.sets.length ? e.sets.map(function(x) { return num(x.w); }) : [num(e.w)]; return Math.max.apply(null, s.concat([0])); };

/** The 4-week pattern for an exercise: { key, text }. An observation for the Companion, never a verdict. */
export function detectPattern(ex, style, weeks) {
  var all = (ex && ex.prog || []).slice().sort(function(a, b) { return wkNum(a) - wkNum(b); });
  var lastWk = all.length ? wkNum(all[all.length - 1]) : 0;
  var win = all.filter(function(e) { return wkNum(e) > lastWk - (weeks || 4); });
  var skips = win.filter(isSkippedEntry).length;
  var done = win.filter(function(e) { return !isSkippedEntry(e); });
  if (done.length < 2) return skips >= 2 ? { key: "skips", text: skips + " of the last " + win.length + " weeks skipped" } : { key: "new", text: "not enough logged weeks yet to see a pattern" };
  var lo = usesRepRange(ex) ? styleRange(ex, style).lo : 0, hi = usesRepRange(ex) ? styleRange(ex, style).hi : 0;
  var failed = lo ? done.filter(function(e) { return setReps(e).some(function(r) { return r < lo; }); }).length : 0;
  var first = done[0], last = done[done.length - 1];
  var l0 = load(first), l1 = load(last), r0 = Math.min.apply(null, setReps(first).concat([999])), r1 = Math.min.apply(null, setReps(last).concat([999]));
  if (failed >= 2) return { key: "failed", text: "sets below the " + lo + "–" + hi + " range in " + failed + " of the last " + done.length + " logged weeks" };
  if (l1 > l0 && l0 > 0) return { key: "rising-load", text: "load up about " + Math.round((l1 - l0) / l0 * 100) + "% over " + done.length + " logged weeks" };
  if (l1 < l0) return { key: "falling-load", text: "load down about " + Math.round((l0 - l1) / l0 * 100) + "% over " + done.length + " logged weeks" };
  if (r1 > r0) return { key: "rising-reps", text: "same load, reps rising (lowest set " + r0 + " → " + r1 + ")" };
  if (done.length >= 3) return { key: "plateau", text: "same load and reps for " + done.length + " logged weeks" };
  return { key: "steady", text: "steady at the same load" + (skips ? ", " + skips + " skipped" : "") };
}

/** Things the Companion must not simply agree with (said kindly). */
export function unsoundFlags(ex, style) {
  var out = [], e = latestEntry(ex && ex.prog);
  if (e && (e.goodForm === "working" || e.fullRange === "working")) out.push("last log had " + (e.goodForm === "working" ? "form" : "range") + " Working towards — adding load now is unsound");
  if (detectPattern(ex, style).key === "failed") out.push("repeated sets below the range — a bigger load would be unsound");
  var t = ex && ex.next, lw = e ? load(e) : 0;
  if (t && num(t.m1) && lw && (num(t.m1) - lw) / lw > 0.10) out.push("the next target is a jump of more than 10% (" + Math.round((num(t.m1) - lw) / lw * 100) + "%)");
  return out;
}

/** Instant rules-based advice for "Set my next session" (empty = looks sensible). m1/m2 are the two measures typed. */
export function setAdvice(ex, m1, m2, style, reason) {
  var out = [], e = latestEntry(ex && ex.prog), u = measureOf(ex).unit;
  var lw = e ? load(e) : 0, w = num(m1);
  if ((u === "kg" || u === "plate") && String(m1 || "").trim() !== "" && lw > 0) {
    var pct = (w - lw) / lw * 100;
    if (pct > 10) out.push("That's about " + Math.round(pct) + "% more than last time — more than the usual 2.5–10% step. A smaller step keeps your form and range Good.");
    else if (pct > 0 && pct < 2.5) out.push("That's under 2.5% more — fine if your equipment has small steps; otherwise it may not feel different.");
    else if (pct < 0 && !String(reason || "").trim()) out.push("That's lower than last time (" + lw + (u === "kg" ? " kg" : "") + "). Fine if it's on purpose — add the reason in the note so your Companion knows.");
  }
  if (usesRepRange(ex) && String(m2 || "").trim() !== "") {
    var r = styleRange(ex, style), n = num(m2);
    if (n < r.lo || n > r.hi) out.push(n + " reps is outside your " + r.lo + "–" + r.hi + " range" + (style && style.focus && style.focus !== "mixed" ? " (" + (FOCUS.find(function(o) { return o[0] === style.focus; }) || FOCUS[0])[1].split(" · ")[0] + ")" : "") + ".");
  }
  return out;
}
/** The pill after "Set my next session": heavier → Move Up; lighter → Reduce; otherwise Consolidate. */
export function pillAfterSet(ex, m1) {
  var e = latestEntry(ex && ex.prog), lw = e ? load(e) : 0, w = num(m1);
  if (!lw || String(m1 || "").trim() === "") return "consolidate";
  return w > lw ? "move up" : w < lw ? "reduce" : "consolidate";
}
/** The AI context line for one exercise. */
export function styleContext(ex, person) {
  var st = styleFor(person, ex && ex.name), p = detectPattern(ex, st), f = unsoundFlags(ex, st);
  var rr = usesRepRange(ex) ? styleRange(ex, st) : null;
  return " [STYLE: " + styleLabel(st) + (rr ? "; reps " + rr.lo + "–" + rr.hi : "") + "; step " + paceStep(st) + "] [PATTERN (observation, last 4 weeks): " + p.text + "]" + (f.length ? " [UNSOUND — say so kindly: " + f.join("; ") + "]" : "");
}
