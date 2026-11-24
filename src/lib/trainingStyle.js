// v2.43.0 (Architect night batch 23 Nov, PART 5 — Silver+): style-aware Companion progression.
//   Settings → "My training style" per person, optionally per exercise: focus (rep range) and pace.
//   A rules-only pattern detector over the last 4 weeks (an OBSERVATION for the Companion, never a verdict),
//   flags for unsound choices (the Companion must say so kindly), and the instant advice shown when the person
//   uses "Set my next session". TECHNICAL RANGES ONLY — never an exact equipment weight.
import { latestEntry, wkNum, parseReps, measureOf, sameExercise } from "./exercise.js";
import { repRange, usesRepRange } from "./exerciseWhy.js";
import { isSkippedEntry } from "./nextTarget.js";
import { isCardioEx, effortLabel } from "./cardio.js";

// v2.47.0 (Architect brief 24 Nov, P2): the CARDIO style — Focus and Pace; "" = not chosen (the app behaves as before).
export var CARDIO_FOCUS = [
  ["", "Not chosen (as now)", ""],
  ["endurance", "Endurance", "Go longer at a steady pace."],
  ["fitness", "Fitness-speed", "Same time, but faster or at a higher level."],
  ["fatburn", "Fat burn", "Moderate effort, for longer."],
  ["intervals", "Intervals", "Short hard bursts with recovery in between."],
];
export var CARDIO_PACE = [["", "Not chosen (as now)"], ["steady", "Steady small steps"], ["consolidate", "Consolidate a week, then move"], ["bigger", "Bigger jumps when ready"]];
/** The person's cardio style: { focus, pace } ("" = not chosen). Stored as person.trainingStyle.cardio. */
export function cardioStyleFor(person) { var c = (person && person.trainingStyle && person.trainingStyle.cardio) || {}; return { focus: c.focus || "", pace: c.pace || "", cardio: true }; }
/** The style that applies to this exercise: cardio for cardio exercises, otherwise the strength style. */
export function styleForEx(person, ex) { return isCardioEx(ex) ? cardioStyleFor(person) : styleFor(person, ex && ex.name); }
export function cardioLabel(style) {
  var f = CARDIO_FOCUS.find(function(o) { return o[0] === (style && style.focus); }) || CARDIO_FOCUS[0];
  var p = CARDIO_PACE.find(function(o) { return o[0] === (style && style.pace); }) || CARDIO_PACE[0];
  return (f[0] ? f[1] + " (" + f[2].replace(/\.$/, "").toLowerCase() + ")" : "focus not chosen") + " · " + (p[0] ? p[1] : "pace not chosen");
}

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
  var word = isCardioEx(ex) ? "time" : "load";   // v2.47.0: cardio — the first measure is the time
  if (l1 > l0 && l0 > 0) return { key: "rising-load", text: word + " up about " + Math.round((l1 - l0) / l0 * 100) + "% over " + done.length + " logged weeks" };
  if (l1 < l0) return { key: "falling-load", text: word + " down about " + Math.round((l0 - l1) / l0 * 100) + "% over " + done.length + " logged weeks" };
  if (r1 > r0) return { key: "rising-reps", text: isCardioEx(ex) ? "same time, distance rising (" + r0 + " → " + r1 + ")" : "same load, reps rising (lowest set " + r0 + " → " + r1 + ")" };
  if (done.length >= 3) return { key: "plateau", text: (isCardioEx(ex) ? "same time and distance for " : "same load and reps for ") + ""+ + done.length + " logged weeks" };
  return { key: "steady", text: "steady at the same " + word + (skips ? ", " + skips + " skipped" : "") };
}

/** Things the Companion must not simply agree with (said kindly). */
export function unsoundFlags(ex, style) {
  var out = [], e = latestEntry(ex && ex.prog);
  if (isCardioEx(ex)) {   // v2.47.0: cardio — effort, and jumps over 10% in either measure
    if (e && e.effort === "hard") out.push("last session felt Very hard — adding more now is unsound");
    var tc = ex && ex.next, lw0 = e ? num(e.w) : 0, lr0 = e ? num(e.r) : 0;
    if (tc && num(tc.m1) && lw0 && (num(tc.m1) - lw0) / lw0 > 0.10) out.push("the next time target is more than 10% up (" + Math.round((num(tc.m1) - lw0) / lw0 * 100) + "%)");
    if (tc && num(tc.m2) && lr0 && (num(tc.m2) - lr0) / lr0 > 0.10) out.push("the next distance/level target is more than 10% up (" + Math.round((num(tc.m2) - lr0) / lr0 * 100) + "%)");
    if (tc && num(tc.m1) > lw0 && num(tc.m2) > lr0 && lw0 && lr0) out.push("the next target changes two things at once");
    return out;
  }
  if (e && (e.goodForm === "working" || e.fullRange === "working")) out.push("last log had " + (e.goodForm === "working" ? "form" : "range") + " Working towards — adding load now is unsound");
  if (detectPattern(ex, style).key === "failed") out.push("repeated sets below the range — a bigger load would be unsound");
  var t = ex && ex.next, lw = e ? load(e) : 0;
  if (t && num(t.m1) && lw && (num(t.m1) - lw) / lw > 0.10) out.push("the next target is a jump of more than 10% (" + Math.round((num(t.m1) - lw) / lw * 100) + "%)");
  return out;
}

/** Instant rules-based advice for "Set my next session" (empty = looks sensible). m1/m2 are the two measures typed. */
export function setAdvice(ex, m1, m2, style, reason) {
  if (isCardioEx(ex)) return cardioAdvice(ex, m1, m2, style, reason);
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
/** v2.47.0: cardio "Set my next session" advice — ONE variable at a time (time first, then speed/level, as the focus
 *  says), weekly increases of 10% or less, and lower than last time needs a reason. */
export function cardioAdvice(ex, m1, m2, style, reason) {
  var out = [], e = latestEntry(ex && ex.prog), f = style && style.focus;
  var lw = e ? num(e.w) : 0, lr = e ? num(e.r) : 0, w = num(m1), r = num(m2);
  var hasW = String(m1 || "").trim() !== "", hasR = String(m2 || "").trim() !== "";
  var upW = hasW && lw > 0 && w > lw, upR = hasR && lr > 0 && r > lr;
  if (upW && upR) out.push("You've changed two things at once. Change one at a time — " + (f === "fitness" ? "keep the time the same and go a bit faster or a level up." : "add time first, then speed or level.") + "");
  if (upW && (w - lw) / lw > 0.10) out.push("That's about " + Math.round((w - lw) / lw * 100) + "% more time than last time — keep weekly increases to 10% or less.");
  if (upR && (r - lr) / lr > 0.10) out.push("That's about " + Math.round((r - lr) / lr * 100) + "% more than last time — keep weekly increases to 10% or less.");
  if (!upR && upW && f === "fitness") out.push("With Fitness-speed, keep the time the same and go faster or a level up instead.");
  if (!upW && upR && (f === "endurance" || f === "fatburn")) out.push("With " + (f === "endurance" ? "Endurance" : "Fat burn") + ", add time first, then speed or level.");
  if (((hasW && lw > 0 && w < lw) || (hasR && lr > 0 && r < lr)) && !String(reason || "").trim()) out.push("That's lower than last time. Fine if it's on purpose — add the reason in the note so your Companion knows.");
  return out;
}
/** The pill after "Set my next session": heavier → Move Up; lighter → Reduce; otherwise Consolidate. */
export function pillAfterSet(ex, m1, m2) {
  if (isCardioEx(ex)) {   // v2.47.0: cardio — more of either measure → Move Up, less → Reduce
    var ec = latestEntry(ex && ex.prog), a = ec ? num(ec.w) : 0, b = ec ? num(ec.r) : 0, x = num(m1), y = num(m2);
    var up = (String(m1 || "").trim() !== "" && a && x > a) || (String(m2 || "").trim() !== "" && b && y > b);
    var down = (String(m1 || "").trim() !== "" && a && x < a) || (String(m2 || "").trim() !== "" && b && y < b);
    return up ? "move up" : down ? "reduce" : "consolidate";
  }
  var e = latestEntry(ex && ex.prog), lw = e ? load(e) : 0, w = num(m1);
  if (!lw || String(m1 || "").trim() === "") return "consolidate";
  return w > lw ? "move up" : w < lw ? "reduce" : "consolidate";
}
/** The AI context line for one exercise. */
export function styleContext(ex, person) {
  if (isCardioEx(ex)) {   // v2.47.0: cardio
    var cs = cardioStyleFor(person), cp = detectPattern(ex, cs), cf = unsoundFlags(ex, cs), le = latestEntry(ex && ex.prog);
    return " [CARDIO STYLE: " + cardioLabel(cs) + "; change ONE variable at a time (time first, then speed/level), 10% or less a week]" + (le && le.effort ? " [LAST EFFORT: " + effortLabel(le.effort) + "]" : "") + " [PATTERN (observation, last 4 weeks): " + cp.text + "]" + (cf.length ? " [UNSOUND — say so kindly: " + cf.join("; ") + "]" : "");
  }
  var st = styleFor(person, ex && ex.name), p = detectPattern(ex, st), f = unsoundFlags(ex, st);
  var rr = usesRepRange(ex) ? styleRange(ex, st) : null;
  return " [STYLE: " + styleLabel(st) + (rr ? "; reps " + rr.lo + "–" + rr.hi : "") + "; step " + paceStep(st) + "] [PATTERN (observation, last 4 weeks): " + p.text + "]" + (f.length ? " [UNSOUND — say so kindly: " + f.join("; ") + "]" : "");
}
