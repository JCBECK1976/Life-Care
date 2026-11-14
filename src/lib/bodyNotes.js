// v2.17.1: "My Notes" on weigh-ins and measurements, as one context line for every companion that sees body data,
// so it can allow for them (e.g. "birthday week", "after a long flight"). Pure; tested directly.
var LABEL = { weight: "weigh-in", bodyFat: "weigh-in", muscleMass: "weigh-in", muscleRate: "weigh-in", skeletalMuscle: "weigh-in", visceralFat: "weigh-in", subcutFat: "weigh-in", bmr: "weigh-in", bodyWater: "weigh-in", boneMass: "weigh-in", bodyAge: "weigh-in", bmi: "weigh-in" };
export function bodyNotes(p, max) {
  var out = {}; var add = function(wk, what, note) { var k = wk + "|" + what + "|" + note; if (note && !out[k]) out[k] = { wk: wk, what: what, note: note }; };
  Object.keys((p && p.body) || {}).forEach(function(f) { (p.body[f] || []).forEach(function(e) { if (e && e.note) add(e.wk, LABEL[f] || f, String(e.note).trim()); }); });
  var m = (p && p.measurements) || {};
  if (!Array.isArray(m)) Object.keys(m).forEach(function(f) { (m[f] || []).forEach(function(e) { if (e && e.note) add(e.wk, f.replace(/([A-Z])/g, " $1").toLowerCase() + " measurement", String(e.note).trim()); }); });
  return Object.keys(out).map(function(k) { return out[k]; }).sort(function(a, b) { return (b.wk || 0) - (a.wk || 0); }).slice(0, max || 8);
}
export function bodyNotesCtx(p) {
  var n = bodyNotes(p); if (!n.length) return "";
  return "Their own notes on body records (allow for these when reading the numbers, e.g. a birthday week or illness): " + n.map(function(x) { return "Wk" + x.wk + " " + x.what + ": \"" + x.note.slice(0, 120) + "\""; }).join("; ") + ".";
}
