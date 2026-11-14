// Pure one-off clean-ups (no Firebase import, so tests can load them directly).
// v2.17.2 (JC, 14 Nov): one-off, idempotent: drop the old kcal deficit and the R6 admin switch from each person's
// calorieSettings (replaced by deficitPct in v2.17.1). Nothing else is touched. Returns true if anything changed.
export function stripOldCalorieSettings(d) {
  var changed = false;
  Object.keys(d || {}).forEach(function(k) {
    var cs = k !== "config" && d[k] && d[k].calorieSettings;
    if (!cs || typeof cs !== "object") return;
    ["r6Active", "deficit"].forEach(function(f) { if (Object.prototype.hasOwnProperty.call(cs, f)) { delete cs[f]; changed = true; } });
  });
  return changed;
}
