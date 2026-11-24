// v2.37.0 (Architect brief 23 Nov, PART 2): the reasons behind each exercise target, a status for every exercise,
// last week's Companion feedback, and Skip. Rules only (no AI). The progression rules themselves are unchanged (the
// Architect and JC revisit them at the week reset) — this module explains them.
import { getExerciseType, parseReps, fmtReps, latestEntry, measureOf, wkNum, sameExercise, tidyNotes, skippedWeek } from "./exercise.js";
import { targetHeadline } from "./nextTarget.js";
import { isCardioEx } from "./cardio.js";

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

/** The pill shown (v2.42.0, night batch P3): one of "move up" | "consolidate" | "reduce" — older stored statuses are mapped
 *  for display only (ready to move → move up; reduce → reduce; everything else → consolidate). */
export function displayStatus(ex) {
  if (!ex || ex.stopped) return "";
  var s = String(ex.status || "").toLowerCase().trim();
  return s === "move up" || s === "ready to move" ? "move up" : s === "reduce" ? "reduce" : "consolidate";
}

/** One plain line: why (technical ranges only — never an exact stack weight). */
export function whyLine(ex, status) {
  if (!ex || ex.stopped) return "";
  var t = targetHeadline(ex), rr = repRange(ex), reps = usesRepRange(ex);
  if (!latestEntry(ex.prog) && !t) return "First time: log your sets and the next step is worked out from them.";
  if (isCardioEx(ex)) {   // v2.48.1: cardio talks about effort, never range and form
    if (status === "move up") return "You reached " + (t || "your plan") + " and it felt Easy or About right: add a little — one thing at a time (time first), no more than 10% a week.";
    if (status === "reduce") return "Ease back a step and rebuild until it feels About right.";
    return t ? "Keep it here: reach " + t + " and when it feels Easy or About right, move up." : "Keep it steady until it feels Easy or About right, then add a little time (no more than 10% a week).";
  }
  if (status === "move up") return "Range and form Good and you hit " + (t ? t : reps ? rr.hi + " reps on every set" : "your target") + ": move up a small step (about 2.5–10% more load) and restart reps at the bottom of your range.";
  if (status === "reduce") return "Drop the load a step (about 5–10%) and rebuild with Good range and form.";
  if (t) return "Keep this load: reach " + t + " on every set with Good range and form, then move up.";
  return reps ? "Build towards " + rr.hi + " reps on every set with Good range and form, then move up." : "Keep it steady until it feels comfortable with Good range and form.";
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
