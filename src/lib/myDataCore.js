// v2.16.7 P2: pure helpers for export/deletion (no Firebase import, so they can be tested directly).
export var SHARED_BY_PERSON = ["feedback_results", "feedback_history", "eat_feedback", "body_feedback", "meas_feedback", "health_feedback", "help_history", "qa_history", "meal_defaults"];
var esc = function(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
/** Keys that belong to one person: <x>_<p>, <x>:<p>, <x>:<p>:<y>, <x>:<y>:<p>, comment_<p>_…, session_fb_<p>_… */
export function personKeyMatcher(person) { return new RegExp("(^|[_:])" + esc(person) + "($|[_:])"); }
export function isPersonKey(key, person) { return key !== "dashboard:data" && SHARED_BY_PERSON.indexOf(key) < 0 && key !== "session_feedback_all" && personKeyMatcher(person).test(key); }
var parse = function(v) { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch (e) { return v; } };

/** Everything for one person from a snapshot of the data root (pure, tested). */
export function collectMyData(root, person, now) {
  var out = { exportedAt: new Date(now || Date.now()).toISOString(), person: person, about: "Lifecare Companion — your data (JSON). Photos are never stored, so none are included.", record: null, items: {}, feedback: {} };
  var dash = parse(root["dashboard:data"]); if (dash && dash[person]) out.record = dash[person];
  Object.keys(root).forEach(function(k) { if (isPersonKey(k, person)) out.items[k] = parse(root[k]); });
  SHARED_BY_PERSON.forEach(function(k) { var v = parse(root[k]); if (v && typeof v === "object" && v[person] != null) out.feedback[k] = v[person]; });
  var sf = parse(root.session_feedback_all);
  if (sf && typeof sf === "object") Object.keys(sf).forEach(function(k) { if (k.indexOf(person + "_") === 0) { out.feedback.session_feedback_all = out.feedback.session_feedback_all || {}; out.feedback.session_feedback_all[k] = sf[k]; } });
  return out;
}

/** The same shape with every value emptied (keeps the app working), the name kept. */
export function emptied(v) {
  if (Array.isArray(v)) return [];
  if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function(k) { o[k] = emptied(v[k]); }); return o; }
  return typeof v === "string" ? "" : typeof v === "number" ? 0 : typeof v === "boolean" ? false : v;
}
/** The database update that erases one person's live data (pure, tested). */
export function deletionUpdate(root, person) {
  var up = {};
  var dash = parse(root["dashboard:data"]);
  if (dash && dash[person]) { var name = dash[person].profile && dash[person].profile.name; var e = emptied(dash[person]); if (e.profile) e.profile.name = name || ""; dash[person] = e; up["dashboard:data"] = JSON.stringify(dash); }
  Object.keys(root).forEach(function(k) { if (isPersonKey(k, person)) up[k] = null; });
  SHARED_BY_PERSON.forEach(function(k) { var v = parse(root[k]); if (v && typeof v === "object" && v[person] != null) { delete v[person]; up[k] = JSON.stringify(v); } });
  var sf = parse(root.session_feedback_all);
  if (sf && typeof sf === "object") { var ch = false; Object.keys(sf).forEach(function(k) { if (k.indexOf(person + "_") === 0) { delete sf[k]; ch = true; } }); if (ch) up.session_feedback_all = JSON.stringify(sf); }
  return up;
}

