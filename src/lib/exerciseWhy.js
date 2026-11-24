// v2.37.0 (Architect brief 23 Nov, PART 2): the reasons behind each exercise target, a status for every exercise,
// last week's Companion feedback, and Skip. Rules only (no AI). The progression rules themselves are unchanged (the
// Architect and JC revisit them at the week reset) — this module explains them.
import { getExerciseType, parseReps, fmtReps, latestEntry, measureOf, nextSteps, wkNum, sameExercise, tidyNotes, skippedWeek } from "./exercise.js";

var num = function(v) { var m = /-?\d+(?:[.,]\d+)?/.exec(String(v == null ? "" : v)); return m ? parseFloat(m[0].replace(",", ".")) : 0; };

/** The rep range the double-progression rules use: "10–15 reps" in the progression notes, else 12–15 (as autoStatus). */
export function repRange(ex) {
  var m = /(\d+)\s*(?:–|-|to)\s*(\d+)\s*reps?/i.exec((ex && ex.progressionNotes) || "");
  return m ? { lo: parseInt(m[1], 10), hi: parseInt(m[2], 10) } : { lo: 12, hi: 15 };
}
/** Exercises where reps build inside a range (weights, plate stacks, bodyweight reps). */
export function usesRepRange(ex) {
  var t = (ex && ex.exType) || getExerciseType(ex && ex.name);
  return t === "weights" || t === "bodyweight" || measureOf(ex).unit === "plate";
}
/** "Range 12–15" / "Hold time: builds a few seconds at a time" / "Duration: builds a few minutes at a time". */
export function rangeLabel(ex) {
  if (usesRepRange(ex)) { var r = repRange(ex); return "Range " + r.lo + "–" + r.hi; }
  var u = measureOf(ex).unit;
  return u === "seconds" ? "Hold time: builds 5–10 s at a time" : u === "minutes" ? "Duration: builds 2–5 min at a time" : "";
}

export function isSkipped(e) { return skippedWeek(e); }   // v2.41.0: incl. legacy all-zero weeks
/** How many of the latest logged weeks in a row were skipped. */
export function skipStreak(prog) {
  var s = (prog || []).slice().sort(function(a, b) { return wkNum(a) - wkNum(b); }), n = 0;
  for (var i = s.length - 1; i >= 0 && isSkipped(s[i]); i--) n++;
  return n;
}
/** A skipped week: zeros, marked skipped, an optional note. It never moves the status, the weight or the target. */
export function skipEntry(ex, wk, note) {
  var sets = (ex && ex.sets) || 3;
  return { wk: wk, w: "0kg", r: fmtReps(Array(sets).fill(0)), sets: [], skipped: true, note: String(note || "").trim() };
}

var below = function(ex, e) { if (!usesRepRange(ex) || !e) return false; var r = parseReps(e.r); var lo = repRange(ex).lo; return r.length > 0 && r.some(function(x) { return x > 0 && x < lo; }); };

/** The status shown on the card: the stored one, or — when logging cleared it (status waits for Companion feedback) —
 *  one worked out from the logged sets; "building back up" when the last sets were below the range. */
export function displayStatus(ex, auto) {
  if (!ex || ex.stopped) return "";
  var last = latestEntry(ex.prog);
  // v2.38.1: only when nothing more specific was set — a Companion / rules status (Ready to Move, Consolidating,
  // Maintaining, Moved Up, Reduce) is kept as it is
  if (last && below(ex, last) && (!ex.status || ex.status === "building")) return "building back up";
  if (ex.status) return ex.status;
  if (!last) return "building";
  var prior = (ex.prog || []).filter(function(e) { return e !== last && !isSkipped(e); });
  return (auto && auto(last.w, last.r, prior, "")) || "building";
}

/** One plain line: why this is the target. e.g. "Moved up to 29 kg: reps restart at the bottom of your range (12) and
 *  build to 15" / "Below range (8/8/6): stay at 29 kg, aim for 12/12/12; drop one step if form slips". */
export function whyLine(ex, status) {
  if (!ex || ex.stopped) return "";
  var last = latestEntry(ex.prog), m = measureOf(ex);
  if (!last) return "First time: log your sets and the next step is worked out from them.";
  var kg = m.unit === "kg", w = num(last.w), wTxt = kg ? w + " kg" : m.unit === "plate" ? "plate " + w : "";
  var reps = parseReps(last.r), sets = ex.sets || reps.length || 3;
  if (!usesRepRange(ex)) {
    var top = reps.length ? Math.max.apply(null, reps) : 0;
    if (status === "ready to move") return "Done comfortably at " + top + " " + m.unit + ": add a little next time.";
    return "Building at " + top + " " + m.unit + ": add a little when it feels steady.";
  }
  var rr = repRange(ex), at = wTxt ? " at " + wTxt : "", aim = Array(sets).fill(rr.lo).join("/"), full = Array(sets).fill(rr.hi).join("/");
  switch (status) {
    case "building back up": return "Below range (" + reps.join("/") + "): stay" + at + ", aim for " + aim + "; drop one step if form slips.";
    case "moved up": return "Moved up" + (wTxt ? " to " + wTxt : "") + ": reps restart at the bottom of your range (" + rr.lo + ") and build to " + rr.hi + ".";
    case "ready to move": return (reps.length && reps.every(function(x) { return x >= rr.hi; }) ? full + " twice" + at : "Your Companion suggests it" + at) + ": time to move up a small step (about 2.5–10% more load), reps back to the bottom of your range.";   // v2.41.0: a technical range, never a stack weight
    case "consolidating": return reps.length && reps.every(function(x) { return x >= rr.hi; }) ? full + " once" + at + ": repeat it to confirm, then move up." : "Settling in" + at + ": keep the weight and build towards " + rr.hi + " on every set.";
    case "reduce": return "Weight lowered" + (wTxt ? " to " + wTxt : "") + ": build back to " + rr.hi + " before moving on.";
    case "maintaining": return "Maintaining" + at + ": keep it steady.";
    default: return "Building" + at + ": add a rep where you can, up to " + rr.hi + " on every set.";
  }
}

/** Gentle check-in after 3 skips in a row (never criticism). */
export function skipCheckIn(ex) {
  return skipStreak(ex && ex.prog) >= 3 ? "You've skipped " + ex.name + " three weeks running — that's fine. If it isn't working for you, you could swap it for something easier (tap its name) or ask your Companion for an alternative." : "";
}

/** The progression note the person or the app wrote for a week ("Wk18: next weight 70 kg (set by you)"). */
export function weekNote(ex, wk) {
  var t = tidyNotes((ex && ex.notes) || ""); if (!t) return "";
  var re = new RegExp("\\bWk" + wk + "\\b");
  return t.split("; ").filter(function(x) { return re.test(x); }).join("; ");
}

/** That day's per-exercise Companion recommendations for a week (accepted or not), from the entries they're kept with,
 *  or from the stored session feedback when it was for that week. */
export function weekFeedback(exList, wk, sessionFb) {
  var out = [];
  (exList || []).forEach(function(ex) {
    var e = (ex.prog || []).find(function(p) { return wkNum(p) === wk && p.companion; });
    var c = e && e.companion;
    if (!c && sessionFb && sessionFb.exercises && (parseInt(sessionFb._feedbackWeek, 10) || 0) === wk) {
      var f = sessionFb.exercises.find(function(x) { return sameExercise(x.name, ex.name); });
      if (f) c = { verdict: String(f.verdict || ""), recommendation: String(f.recommendation || (f.newStatus ? "Recommendation: " + f.newStatus : "")), decision: f._decision === "declined" ? "rejected" : (f._decision || "") };
    }
    if (c && (c.recommendation || c.verdict)) out.push({ name: ex.name, recommendation: c.recommendation || c.verdict, decision: c.decision || "" });
  });
  return out;
}

/** Link stored session feedback to the week + exercise it was about, where the entry has none yet (additive: nothing is
 *  overwritten). Returns how many were linked per person. Mutates `data`. */
export function linkSessionFeedback(data, sessionFeedback) {
  var counts = {};
  Object.keys(sessionFeedback || {}).forEach(function(key) {
    var fb = sessionFeedback[key], cut = key.indexOf("_"); if (cut < 0 || !fb || !fb.exercises) return;
    var person = key.slice(0, cut), day = key.slice(cut + 1), wk = parseInt(fb._feedbackWeek, 10) || 0;
    var list = data && data[person] && data[person].exercises && data[person].exercises[day];
    if (!wk || !Array.isArray(list)) return;
    fb.exercises.forEach(function(f) {
      var ex = list.find(function(x) { return sameExercise(x.name, f.name); }); if (!ex) return;
      var e = (ex.prog || []).find(function(p) { return wkNum(p) === wk && !isSkipped(p); });
      if (!e || e.companion) return;
      e.companion = { verdict: String(f.verdict || ""), recommendation: String(f.recommendation || (f.newStatus ? "Recommendation: " + f.newStatus : "")), at: fb._generatedAt || "" };
      if (f._decision) { e.companion.decision = f._decision === "declined" ? "rejected" : f._decision; e.companion.decisionNote = f._userNote || ""; }
      counts[person] = (counts[person] || 0) + 1;
    });
  });
  return counts;
}
