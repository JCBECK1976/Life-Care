import { EXERCISE_DATABASE, EXERCISE_TYPES, PIN_WEIGHTS } from "../constants/exercise.js";

// Helper: look up exercise type from database or custom exercises
export function getExerciseType(name) {
  var found = EXERCISE_DATABASE.find(function(e) { return e.name === name; });
  return found ? found.type : "weights"; // default to weights for legacy exercises
}

export function getExerciseTypeConfig(typeName) {
  return EXERCISE_TYPES[typeName] || EXERCISE_TYPES.weights;
}

export function nextPin(w, customIncrements) {
  var kg = parseInt(w) || 0;
  if (customIncrements) {
    var steps = String(customIncrements).split(",").map(function(s) { return parseFloat(s.trim()); }).filter(function(n) { return !isNaN(n) && n > 0; }).sort(function(a,b) { return a - b; });
    if (steps.length > 0) {
      for (var i = 0; i < steps.length; i++) { if (steps[i] > kg) return steps[i]; }
      return kg + (steps[steps.length-1] - (steps.length > 1 ? steps[steps.length-2] : 0));
    }
  }
  for (var p = 0; p < PIN_WEIGHTS.length; p++) { if (PIN_WEIGHTS[p] > kg) return PIN_WEIGHTS[p]; }
  return kg + 7;
}

export function parseReps(str) { if (!str) return []; const s = String(str); if (s.includes("×")) { const p = s.split("×"); return Array(parseInt(p[1])||3).fill(parseInt(p[0])||0); } return s.split("/").map(n => parseInt(n)||0); }

export function fmtReps(arr) { if (!arr || arr.length === 0) return ""; if (arr.every(r => r === arr[0])) return arr[0] + "×" + arr.length; return arr.join("/"); }

export function autoStatus(newWeight, newReps, prevProg, notes) {
  var kg = parseInt(newWeight) || 0;
  var reps = parseReps(newReps);
  var prevEntry = prevProg && prevProg.length > 0 ? prevProg[prevProg.length - 1] : null;
  var prevKg = prevEntry ? (parseInt(prevEntry.w) || 0) : 0;
  
  // Notes no longer override - use Progression dropdown instead
  
  // Weight increased from previous
  if (kg > prevKg && prevEntry) return "moved up";
  
  // Weight decreased from previous
  if (kg < prevKg && prevEntry && kg > 0 && prevKg > 0) return "reduce";
  
  if (reps.length === 0) return "building";
  
  // Check all entries at this weight to find consecutive 15x3 sessions
  var sameWeightEntries = (prevProg || []).filter(function(p) { return (parseInt(p.w) || 0) === kg; });
  // Include current entry
  var allAtWeight = sameWeightEntries.concat([{ w: newWeight, r: newReps }]);
  
  // Count consecutive 15x3 from the end
  var consecutive15 = 0;
  for (var i = allAtWeight.length - 1; i >= 0; i--) {
    var pr = parseReps(allAtWeight[i].r);
    if (pr.length >= 3 && pr.every(function(r) { return r >= 15; })) {
      consecutive15++;
    } else {
      break;
    }
  }
  
  if (consecutive15 >= 2) return "ready to move";
  if (consecutive15 === 1) return "consolidating";
  
  // At same weight, not yet at 15x3 — check if reps are progressing
  if (reps.every(function(r) { return r >= 12; })) return "building";
  
  // Just moved up and struggling with reps (e.g. 10/10/7)
  if (sameWeightEntries.length <= 2 && reps.some(function(r) { return r < 12; })) return "consolidating";
  
  return "building";
}


// D2 (v2.6.1): weight and reps per set. New log entries carry sets: [{ w, r }] (w without "kg");
// older entries only have w ("16kg", set 1) and r ("10x3" etc.), which still read correctly.
export function entrySets(entry) {
  if (entry && Array.isArray(entry.sets) && entry.sets.length) return entry.sets.map(function(s) { return { w: String(s.w == null ? "" : s.w), r: String(s.r == null ? "" : s.r) }; });
  var reps = entry && entry.r ? parseReps(entry.r) : [];
  var w = entry && entry.w ? String(entry.w).replace("kg", "") : "";
  return (reps.length ? reps : [""]).map(function(r) { return { w: w, r: String(r) }; });
}
// Fill the log form (at least 3 sets) from an entry, repeating the last set if it had fewer.
export function logSetsFrom(entry, n) {
  var sets = entrySets(entry); var out = [];
  for (var i = 0; i < Math.max(n || 3, 3); i++) out.push(sets[i] || { w: sets.length ? sets[sets.length - 1].w : "", r: sets.length ? sets[sets.length - 1].r : "" });
  return out;
}
// True when an entry's sets used different weights (compared as numbers).
export function setsDiffer(entry) {
  if (!entry || !Array.isArray(entry.sets) || entry.sets.length < 2) return false;
  var w0 = parseFloat(entry.sets[0].w);
  return entry.sets.some(function(s) { return parseFloat(s.w) !== w0; });
}
// The weight to show for an entry: the range ("56–63kg") when sets differ, else the old single weight.
export function weightLabel(entry) {
  if (!entry) return "";
  if (setsDiffer(entry)) {
    var ws = entry.sets.map(function(s) { return parseFloat(s.w); }).filter(function(n) { return !isNaN(n); });
    return Math.min.apply(null, ws) + "–" + Math.max.apply(null, ws) + "kg";
  }
  return entry.w || "";
}
// One line for display and AI prompts: "16kg×10, 22kg×8, 22kg×8" when weights differ, else the old "16kg 10x3" style.
export function fmtEntry(entry) {
  if (!entry) return "";
  if (setsDiffer(entry)) return entry.sets.map(function(s) { return s.w + "kg×" + s.r; }).join(", ");
  return (entry.w || "") + " " + (entry.r || "");
}
// The sets to save from the form; a blank weight on a later set means "same as set 1".
export function setsToSave(logSets) {
  var w1 = String((logSets[0] && logSets[0].w) || "").trim();
  return logSets.map(function(s) { return { w: String(s.w || "").trim() || w1, r: String(s.r || "").trim() }; });
}

// v2.13.0 D20: after a Progress week is edited or removed, the card (current, reps, notes) and the status pill follow
// the designed logic: they come from the LATEST week only. Changing or removing an OLDER week changes none of them.
// If the latest week itself changed (or was removed), the card shows the new latest week and the status pill is
// cleared, exactly as when a new week is logged (the status is set by the AI session feedback, never recomputed here).
// `ex.prog` must already hold the change; `before` is the latest entry as it was before the change.
export function latestKey(e) { return e ? [e.wk, e.w, e.r, JSON.stringify(e.sets || null)].join("|") : ""; }
export function syncAfterProgChange(ex, before) {
  var prog = (ex.prog || []).slice().sort(function(a, b) { return (a.wk || 0) - (b.wk || 0); });
  var latest = prog.length ? prog[prog.length - 1] : null;
  if (latest && before && latestKey(latest) === latestKey(before)) return false;   // an older week: nothing on the card changes
  if (latest) { ex.current = latest.w; ex.reps = latest.r; ex.notes = latest.note || ""; }
  else { ex.current = ""; ex.reps = ""; ex.notes = ""; }
  ex.status = ""; delete ex.target;
  return true;
}

/* v2.16.0 D23: one source of truth for weeks in the Log form and the overwrite check.
   Weeks can be stored as numbers or strings, and prog is not always in week order. */
export function wkNum(e) { return parseInt(e && e.wk, 10) || 0; }
export function findWeekIdx(prog, wk) {
  var n = parseInt(wk, 10) || 0; if (!prog || !n) return -1;
  for (var i = 0; i < prog.length; i++) { if (wkNum(prog[i]) === n) return i; }
  return -1;
}
/** The person's latest logged entry BEFORE the current training week (null if none). */
export function previousEntry(prog, currentWeek) {
  var best = null;
  (prog || []).forEach(function(e) { var w = wkNum(e); if (w && w < currentWeek && (!best || w > wkNum(best))) best = e; });
  return best;
}

/* v2.16.0 F11: the Companion's per-exercise feedback is kept with the logged week it was about,
   with the person's Accept / Reject and note. Entries without it are unchanged (backward compatible). */
export function latestEntry(prog) {
  var best = null; (prog || []).forEach(function(e) { if (!best || wkNum(e) >= wkNum(best)) best = e; }); return best;
}
export function attachCompanion(ex, fbEx, when) {
  var e = ex && latestEntry(ex.prog); if (!e || !fbEx) return null;
  var keep = e.companion && e.companion.decision ? { decision: e.companion.decision, decisionNote: e.companion.decisionNote || "" } : {};
  e.companion = Object.assign({ verdict: String(fbEx.verdict || ""), recommendation: String(fbEx.recommendation || (fbEx.newStatus ? "Recommendation: " + fbEx.newStatus : "")), at: when || "" }, keep);
  return e;
}
export function setCompanionDecision(ex, decision, note, fbEx) {
  var e = ex && latestEntry(ex.prog); if (e && !e.companion && fbEx) attachCompanion(ex, fbEx, ""); // v2.16.4: feedback made before v2.16.0
  if (!e || !e.companion) return null;
  e.companion.decision = decision; e.companion.decisionNote = (note || "").trim();
  return e;
}

/* v2.16.4 F11b fix: names from the AI can differ slightly (case, spacing, "(cable)") — match tolerantly. */
export function sameExercise(a, b) {
  var n = function(x) { return String(x || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim(); };
  var x = n(a), y = n(b); return !!x && !!y && (x === y || x.indexOf(y) === 0 || y.indexOf(x) === 0);
}
/** Feedback for an entry that has none of its own: the stored session feedback for that person/day, if it was for this week. */
export function companionFromSession(sessionFeedback, person, day, exName, wk) {
  var fb = sessionFeedback && sessionFeedback[person + "_" + day];
  if (!fb || !fb.exercises || (parseInt(fb._feedbackWeek, 10) || 0) !== (parseInt(wk, 10) || -1)) return null;
  var e = fb.exercises.find(function(x) { return sameExercise(x.name, exName); });
  if (!e) return null;
  var c = { verdict: String(e.verdict || ""), recommendation: String(e.recommendation || (e.newStatus ? "Recommendation: " + e.newStatus : "")), at: fb._generatedAt || "" };
  if (e._decision) { c.decision = e._decision === "declined" ? "rejected" : e._decision; c.decisionNote = e._userNote || ""; }
  return c;
}

/* ---------- v2.20.0 progression chain (JC, Becks' Seated Cable Row): log → status → accept → next pre-fill ---------- */
// The measure that progresses for each exercise type.
export function measureOf(ex) {
  var t = (ex && ex.exType) || getExerciseType(ex && ex.name);
  if (/plate|\bpin\b/i.test(String((ex && ex.current) || ""))) return { key: "w", unit: "plate", label: "plate number" };   // v2.20.2: a stack counted by plate
  if (t === "weights") return { key: "w", unit: "kg", label: "weight" };
  if (t === "bodyweight") return { key: "r", unit: "reps", label: "reps" };
  if (t === "timed_hold" || t === "stretching") return { key: "r", unit: "seconds", label: "hold time" };
  if (t === "cardio" || t === "walking" || t === "sports") return { key: "w", unit: "minutes", label: "duration" };
  return { key: "w", unit: "kg", label: "weight" };
}
var num = function(v) { var m = /-?\d+(?:[.,]\d+)?/.exec(String(v == null ? "" : v)); var n = m ? parseFloat(m[0].replace(",", ".")) : NaN; return isFinite(n) ? n : 0; };   // the first number ("42kg", "Plate 7")
/** Custom increments from the exercise's progression notes ("increments: 2.5, 5" / "steps 45,47,49"), or null (pin stack). */
export function incrementsOf(ex) {
  var m = /(?:increments?|steps?|plates?|stack)\s*[:=]?\s*([\d.,\s]+)(?:kg)?/i.exec((ex && ex.progressionNotes) || "");
  return m && /\d/.test(m[1]) ? m[1] : null;
}
/** The next one and two steps up from a weight (custom increments, else the pin stack). */
export function nextSteps(w, ex) {
  var inc = incrementsOf(ex), a = nextPin(w, inc), b = nextPin(a, inc);
  return [a, b];
}
/** A concrete range for the progression message, by measure. */
export function progressionRange(ex, last) {
  var m = measureOf(ex);
  if (m.unit === "kg") {
    var w = num(last && last.w); if (!w) return null;
    var s = nextSteps(w, ex);
    return { unit: "kg", from: s[0], to: s[1], text: "Next: try " + s[0] + "–" + s[1] + " kg (the next 1–2 steps on your stack)" };
  }
  var reps = parseReps(last && last.r); var top = reps.length ? Math.max.apply(null, reps) : 0;
  if (!top) return null;
  var add = m.unit === "seconds" ? [5, 10] : m.unit === "minutes" ? [2, 5] : [2, 3];
  return { unit: m.unit, from: top + add[0], to: top + add[1], text: "Next: try " + (top + add[0]) + "–" + (top + add[1]) + " " + m.unit };
}
/** A concrete next weight from the Companion's targetWeight text, or null. "up from 42kg"/"next increment" → the next step
 *  above prevW (never the previous weight); "45–47kg" → 45 (bottom of the range); "49kg" → 49. */
export function resolveTargetWeight(text, prevW, ex) {
  var t = String(text || ""), p = num(prevW);
  var range = /(\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(\d+(?:\.\d+)?)\s*kg/i.exec(t);
  if (range) return num(range[1]);
  var cleaned = t.replace(/(?:up\s+)?from\s+\d+(?:\.\d+)?\s*kg/ig, "");
  var m = /(\d+(?:\.\d+)?)\s*kg/i.exec(cleaned);
  if (m) return num(m[1]);
  if (/increment|step|move up|go up|heavier|next/i.test(t) && p) return nextSteps(p, ex)[0];
  return null;
}
/** The value a person chose for their next progression ("47kg", "47 kg", "plate 8", "8"), or null. */
export function parseProgressionValue(note) {
  var m = /(\d+(?:\.\d+)?)\s*(kg|reps?|s|sec|seconds|mins?|minutes)?\b/i.exec(String(note || ""));
  return m ? num(m[1]) : null;
}
/** The bottom of the rep range for the next weight (the double-progression rules build 12 → 15). */
export function bottomReps(ex) {
  var m = /(\d+)\s*(?:–|-|to)\s*(\d+)\s*reps?/i.exec((ex && ex.progressionNotes) || "");
  return m ? parseInt(m[1], 10) : 12;
}
/** What the next log should pre-fill. Returns null when nothing has moved on (then the previous entry is used). Never the
 *  previous weight when the exercise is Ready to Move or a progression was accepted / set by the person. */
export function nextLogPrefill(ex, last) {
  if (!ex || !last) return null;
  var m = measureOf(ex); if (m.unit !== "kg" && m.unit !== "plate") {
    var _top = Math.max.apply(null, parseReps(last.r).concat([0]));
    if (ex.progressionValue != null && num(ex.progressionValue) > _top) return { w: last.w ? String(last.w).replace("kg", "") : "", r: String(ex.progressionValue), source: "your next " + m.label };
    return null;
  }
  var prevW = num(last.w), bottom = bottomReps(ex);
  if (ex.progressionValue != null && num(ex.progressionValue) > prevW) return { w: String(num(ex.progressionValue)), r: String(bottom), source: "your next " + (m.unit === "plate" ? "plate" : "weight") };   // a stale value (≤ last) is ignored
  var tw = ex.target ? resolveTargetWeight(ex.target, prevW, ex) : null;
  if (tw && tw > prevW) { var tr = /(\d+)\s*[x×]\s*\d+/.exec(ex.target.replace(/\d+(?:\.\d+)?\s*kg/ig, "")); return { w: String(tw), r: tr ? tr[1] : String(bottom), source: "accepted progression" }; }
  if (ex.status === "ready to move" && prevW) return { w: String(nextSteps(prevW, ex)[0]), r: String(bottom), source: "next step up" };
  return null;
}

/** The weight shown on the exercise card: the stored current weight if it is a weight, else the latest logged one (older
 *  data stored the Companion's sentence, e.g. "Next increment up from 42kg", as the weight). */
export function displayCurrent(ex) {
  var c = String((ex && ex.current) || "").trim();
  if (/^(\d+(\.\d+)?\s*(kg)?|BW)$/i.test(c) || !c) return c;
  var l = latestEntry(ex.prog); return l ? weightLabel(l) : c;
}

/* ---------- v2.20.2 (JC, beta): "My next weight" → Set applies it; one progression note per exercise per week ---------- */
var segs = function(notes) { return String(notes || "").split(/\s*;\s*/).map(function(x) { return x.trim(); }).filter(Boolean); };
/** Notes for display (and whenever the exercise is saved): repeated identical segments shown once, in order. */
export function tidyNotes(notes) {
  var seen = {}, out = [];
  segs(notes).forEach(function(x) { var k = x.toLowerCase(); if (!seen[k]) { seen[k] = 1; out.push(x); } });
  return out.join("; ");
}
/** The week's progression note, replaced (never appended): drops that week's "WkN accepted: …", "Progression: … (set by
 *  you, WkN)" and "WkN: next …" segments, then adds `line`. Other notes are kept (tidied). */
export function setWeekNote(notes, wk, line) {
  var w = String(wk);
  var keep = segs(tidyNotes(notes)).filter(function(x) {
    return !(new RegExp("^Wk" + w + "\\s+accepted:", "i").test(x) || new RegExp("^Progression:.*\\(set by you, Wk" + w + "\\)$", "i").test(x) || new RegExp("^Wk" + w + ":\\s*next\\b", "i").test(x));
  });
  keep.push(line);
  return keep.join("; ");
}
export function progressionNote(ex, wk, v, how) {
  var m = measureOf(ex), what = m.unit === "kg" ? "weight" : m.unit === "plate" ? "plate" : m.label;
  return "Wk" + wk + ": next " + what + " " + (m.unit === "plate" ? v : v + " " + m.unit) + " (" + (how || "set by you") + ")";
}
/** The exercise after the person sets their next value: the new target on the headline (reps at the bottom of the range),
 *  status Moved Up, the value recorded for the next log, one note line for the week. Returns a new object. */
export function applyNextValue(ex, v, wk) {
  var m = measureOf(ex), t = JSON.parse(JSON.stringify(ex)), sets = parseInt(ex.sets, 10) || 3, bottom = bottomReps(ex);
  if (m.unit === "kg") { t.current = v + "kg"; t.reps = bottom + "x" + sets; t.target = v + "kg x " + bottom + "x" + sets; }
  else if (m.unit === "plate") { t.current = "Plate " + v; t.reps = bottom + "x" + sets; t.target = "Plate " + v + " x " + bottom + "x" + sets; }
  else if (m.unit === "minutes") { t.current = String(v); t.target = String(v); }
  else { t.reps = v + "x" + sets; t.target = v + "x" + sets; }
  t.status = "moved up"; t.progressionValue = v; t.progressionSetWk = wk;
  t.notes = setWeekNote(ex.notes, wk, progressionNote(ex, wk, v, "set by you"));
  return t;
}
