// v2.42.0 (Architect night batch 23 Nov, PART 3 — JC decision): only three pills — MOVE UP · CONSOLIDATE · REDUCE — plus a
// greyed "Skipped" marker for a skipped week. Worked out on every Log save, for the following week, from the Progression
// choice, Session Quality and whether the logged sets met the ONE next target (nextTarget, PART 4). Accepted Companion
// feedback or "Set my next session" can refine it; the next Log save works it out from the rules again. Older stored
// statuses are only DISPLAYED as one of the three (no data rewrite).
import { measureOf, parseReps, entrySets } from "./exercise.js";
import { nextTarget } from "./nextTarget.js";
import { repRange, usesRepRange } from "./exerciseWhy.js";

export var PILLS = {
  "move up": { label: "Move Up", color: "#1d4ed8", bg: "#dbeafe" },
  "consolidate": { label: "Consolidate", color: "#6d28d9", bg: "#ede9fe" },
  "reduce": { label: "Reduce", color: "#b91c1c", bg: "#fee2e2" },
};
export var SKIPPED_PILL = { label: "Skipped", color: "#64748b", bg: "#f1f5f9" };
/** The Progression dropdown, exactly as JC asked. */
export var PROGRESSION = [["standard", "Standard Progression"], ["maintain", "Maintain"], ["reduce", "Reduce"]];

/** Any stored status → one of the three (legacy mapping; display only). */
export function pillOf(status) {
  var s = String(status || "").toLowerCase().trim();
  if (s === "move up" || s === "ready to move") return "move up";
  if (s === "reduce") return "reduce";
  return "consolidate";
}

var num = function(v) { var m = /-?\d+(?:[.,]\d+)?/.exec(String(v == null ? "" : v)); return m ? parseFloat(m[0].replace(",", ".")) : 0; };

/** Did the logged sets meet the target? Every set at or above the target's measures. No target: the top of the rep range
 *  on every set (JC to confirm); exercises without a rep range and no target never count as met. */
export function metTarget(sets, target, ex) {
  var s = (sets || []).filter(function(x) { return String(x.w == null ? "" : x.w).trim() !== "" || String(x.r == null ? "" : x.r).trim() !== ""; });
  if (!s.length) return false;
  if (target && (String(target.m1 || "") !== "" || String(target.m2 || "") !== "")) {
    return s.every(function(x) {
      return (String(target.m1 || "") === "" || num(x.w) >= num(target.m1)) && (String(target.m2 || "") === "" || num(x.r) >= num(target.m2));
    });
  }
  if (!usesRepRange(ex)) return false;
  var hi = repRange(ex).hi;
  return s.every(function(x) { return num(x.r) >= hi; });
}

/** The pill after a Log save. choice: "standard" | "maintain" | "reduce"; quality: { range, form } ("good" | "working"). */
export function pillAfterLog(choice, sets, quality, target, ex) {
  if (choice === "reduce") return "reduce";
  if (choice === "maintain" || choice === "hold") return "consolidate";
  if (!quality || quality.range !== "good" || quality.form !== "good") return "consolidate";
  return metTarget(sets, target, ex) ? "move up" : "consolidate";
}
/** Sets from a stored entry (for the checks above). */
export function setsOf(entry) { var s = entrySets(entry); return s.length ? s : parseReps(entry && entry.r).map(function(r) { return { w: entry.w, r: r }; }); }
export { nextTarget, measureOf };
