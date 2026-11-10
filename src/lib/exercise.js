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
