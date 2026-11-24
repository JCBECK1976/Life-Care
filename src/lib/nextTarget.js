// v2.41.0 (Architect night batch 23 Nov, PART 4): ONE next target per exercise —
//   ex.next = { m1, m2, source: "set by you" | "Companion" | "rules", setAt }
// m1 = the first measure (weight in kg, plate number, level…), m2 = the second (reps per set, seconds, minutes). The card
// headline, the Log pre-fill, the pill check and the AI context all read nextTarget(ex). Older exercises are read from
// what they stored (a value the person set, or a Companion target with an explicit number); targets the app worked out
// by itself ("next increment", the next step on a stack) are IGNORED — the card says "Set my next session" instead.
// Nothing stored is deleted or rewritten.
import { measureOf, parseReps, wkNum, skippedWeek } from "./exercise.js";

var num = function(v) { var m = /-?\d+(?:[.,]\d+)?/.exec(String(v == null ? "" : v)); var n = m ? parseFloat(m[0].replace(",", ".")) : NaN; return isFinite(n) ? n : 0; };
var firstRep = function(r) { var a = parseReps(r); return a.length ? a[0] : 0; };

/** Legacy entries saved with no weight and no reps at all (e.g. 0 kg 0×3) count as skipped (display only). */
export function isZeroEntry(e) { return !!e && !e.skipped && skippedWeek(e); }
export function isSkippedEntry(e) { return skippedWeek(e); }

/** An explicit weight in a Companion target text ("45–47kg" → 45, "49kg x 10x3" → 49); never from "up from 42kg"/"next increment". */
export function explicitWeight(text) {
  var t = String(text || "").replace(/(?:up\s+)?from\s+\d+(?:\.\d+)?\s*kg/ig, "");
  var range = /(\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(\d+(?:\.\d+)?)\s*kg/i.exec(t); if (range) return num(range[1]);
  var m = /(\d+(?:\.\d+)?)\s*kg/i.exec(t); return m ? num(m[1]) : null;
}
var repsIn = function(text) { var m = /(?:kg|plate\s*\d+)?\s*x\s*(\d+)\s*(?:x|×)\s*\d+/i.exec(String(text || "")) || /(\d+)\s*reps?/i.exec(String(text || "")); return m ? num(m[1]) : 0; };

/** The next target, or null. */
export function nextTarget(ex) {
  if (!ex) return null;
  if (ex.next && (String(ex.next.m1 || "") !== "" || String(ex.next.m2 || "") !== "")) return ex.next;
  var u = measureOf(ex).unit, weighted = u === "kg" || u === "plate";
  if (ex.progressionValue != null && ex.progressionSetWk) {   // v2.20.x "Set" on the card: set by the person
    return weighted ? { m1: String(num(ex.progressionValue)), m2: String(firstRep(ex.reps) || ""), source: "set by you", setAt: "Wk" + ex.progressionSetWk, legacy: true }
      : u === "minutes" ? { m1: String(num(ex.progressionValue)), m2: "", source: "set by you", setAt: "Wk" + ex.progressionSetWk, legacy: true }   // v2.43.0: duration is the first measure, as in the Log form
      : { m1: "", m2: String(num(ex.progressionValue)), source: "set by you", setAt: "Wk" + ex.progressionSetWk, legacy: true };
  }
  // an older stored target counts only if the person typed it (the app's own stack weights look the same once stored, e.g.
  // "32kg x 12x3", so they can't be told apart: everything not set by the person is ignored — brief P4b)
  if (ex.target && ex._userOverride) {
    var w = weighted ? explicitWeight(ex.target) : null;
    if (weighted && w) return { m1: String(w), m2: String(repsIn(ex.target) || firstRep(ex.reps) || ""), source: "set by you", setAt: "", legacy: true };
    if (u === "minutes" && /\d/.test(String(ex.target))) return { m1: String(num(ex.target)), m2: "", source: "set by you", setAt: "", legacy: true };
    if (!weighted && /\d/.test(String(ex.target))) return { m1: "", m2: String(firstRep(ex.target) || num(ex.target)), source: "set by you", setAt: "", legacy: true };
  }
  return null;
}
/** True when an older target was worked out by the app (not the person, no explicit number): ignored; "Set my next session". */
export function autoDerivedTarget(ex) {
  if (!ex || nextTarget(ex)) return false;
  return !!(ex.target && String(ex.target).trim()) || ex.status === "ready to move";
}

/** The card headline from the target (else null → the card shows the last logged values as before). */
export function targetHeadline(ex) {
  var t = nextTarget(ex); if (!t) return null;
  var u = measureOf(ex).unit, sets = parseInt(ex.sets, 10) || 3;
  var a = t.m1 !== "" && t.m1 != null ? (u === "plate" ? "Plate " + t.m1 : u === "kg" ? t.m1 + "kg" : u === "minutes" ? t.m1 + " min" : t.m1) : "";
  var b = t.m2 !== "" && t.m2 != null ? (u === "minutes" ? t.m2 + " km" : t.m2 + "×" + sets) : "";
  return [a, b].filter(Boolean).join(" · ");
}
/** What the Log form pre-fills from the target: { w, r, source } — a blank measure falls back to the last entry. */
export function prefillFrom(ex, last) {
  var t = nextTarget(ex); if (!t) return null;
  var lw = last ? String(last.w || "").replace(/kg$/i, "").replace(/^Plate\s*/i, "") : "", lr = last ? String(firstRep(last.r) || "") : "";
  return { w: t.m1 !== "" && t.m1 != null ? String(t.m1) : lw, r: t.m2 !== "" && t.m2 != null ? String(t.m2) : lr, source: t.source };
}
/** A new target written by the app (Companion accept, Set my next session). */
export function makeTarget(m1, m2, source, when) { return { m1: m1 == null ? "" : String(m1), m2: m2 == null ? "" : String(m2), source: source, setAt: when || new Date().toISOString() }; }

/** For the AI: what was LOGGED (last weeks, never targets) and the NEXT TARGET (not done yet), per session day. */
export function aiExerciseContext(ex, weeks) {
  var logged = (ex.prog || []).slice().sort(function(a, b) { return wkNum(a) - wkNum(b); }).slice(-(weeks || 8)).map(function(p) {
    if (isSkippedEntry(p)) return "Wk" + p.wk + ": SKIPPED" + (p.note ? " (why: " + p.note + ")" : "");
    var q = p.fullRange || p.goodForm ? " [range " + (p.fullRange === "good" ? "Good" : "Working towards") + ", form " + (p.goodForm === "good" ? "Good" : "Working towards") + "]" : "";
    return "Wk" + p.wk + ": " + (p.w || "") + " " + (p.r || "") + q + (p.note ? " (" + p.note + ")" : "");
  });
  var t = nextTarget(ex);
  return "LOGGED (done): " + (logged.join("; ") || "nothing yet") + " | NEXT TARGET (not done yet): " + (t ? (targetHeadline(ex) + " (" + t.source + ")") : "none set");
}
