// v2.49.0 (Architect night batch 24 Nov, PART 1b/1c): a new exercise's measures hold NUMBERS only (+ unit); anything the
// Companion writes in words goes to the progression notes. Older exercises whose measures were filled with sentences are
// DISPLAYED sensibly (the measure as "—", the words shown as a note) — nothing stored is rewritten.
import { getExerciseTypeConfig, isProse, latestEntry } from "./exercise.js";

export { isProse };
var firstNum = function(v) { var m = /\d+(?:[.,]\d+)?/.exec(String(v == null ? "" : v)); return m ? m[0].replace(",", ".") : ""; };

/** A number (+ the stored unit) for the field, or "" — never words. which: "m1" | "m2". */
export function measureValue(v, type, which) {
  if (typeof v === "number" && isFinite(v)) v = String(v);
  var n = firstNum(v); if (!n) return "";
  if (which === "m1" && (type || "weights") === "weights") return n + "kg";
  return n;
}
/** The Companion's answer → { type, sets, m1, m2, progression, notes } with numeric measures; prose moves to the notes. */
export function fromGenerated(info, fallbackType) {
  var type = info && info.exerciseType && getExerciseTypeConfig(info.exerciseType) && info.exerciseType || fallbackType || "";
  var cfg = getExerciseTypeConfig(type || "weights");
  var extra = [];
  ["metric1", "metric2"].forEach(function(k, i) { var v = info && info[k]; if (v != null && isProse(v)) extra.push((i === 0 ? cfg.metric1Label : cfg.metric2Label || "Plan") + ": " + String(v).trim()); });
  var sets = parseInt(info && info.sets, 10);
  return {
    type: type,
    sets: isFinite(sets) && sets > 0 && sets < 20 ? sets : cfg.defaultSets,
    m1: measureValue(info && info.metric1, type, "m1"),
    m2: measureValue(info && info.metric2, type, "m2"),
    progression: [String((info && info.progressionNotes) || "").trim()].concat(extra).filter(Boolean).join(" · "),
    notes: String((info && info.equipmentNotes) || "").trim(),
  };
}
/** Display a stored measure: "—" when it holds words. */
export function showMeasure(v) { return isProse(v) ? "—" : (v == null ? "" : String(v)); }
/** The words found in an exercise's measures (older data), to show as a note. */
export function measureProse(ex) {
  return [ex && ex.current, ex && ex.reps].filter(function(v) { return isProse(v) && !/next increment|up from|next step/i.test(String(v)); }).map(function(v) { return String(v).trim(); }).join(" · ");   // the old app-worked target text stays hidden (v2.41.0)
}
/** v2.49.0: a cardio card's headline from the latest log (else the planned values): "20 min · 0.8 km"; words → "—". */
export function cardioHeadline(ex) {
  var l = latestEntry(ex && ex.prog), w = l ? l.w : ex && ex.current, r = l ? l.r : ex && ex.reps;
  var a = isProse(w) ? "—" : firstNum(w) ? firstNum(w) + " min" : "—";
  var b = isProse(r) ? "—" : firstNum(r) && Number(firstNum(r)) ? firstNum(r) + " km" : "";
  return b ? a + " · " + b : a;
}
