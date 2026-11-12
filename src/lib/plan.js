// v2.15.0: tracker constants and the pure plan helpers (no Firebase here, so tests can import them directly).
export var CATEGORIES = ["Feedback", "Defect", "Feature", "Task"];          // v2.15.0: + Task (ops/docs work)
export var STATUSES = ["New", "Triaged", "Planned", "In progress", "Blocked", "Done", "Won't do"];   // v2.15.0: + Blocked
export var CLOSED = ["Done", "Won't do"];
export function isOutstanding(e) { return CLOSED.indexOf(e.status) < 0; }
export var PRIORITIES = ["High", "Medium", "Low"];


// v2.15.0 B: the plan (docs/plan.json on main) is published with every main deploy as /Life-Care/plan.json; every
// environment reads that prod copy. Until the first release that publishes it, the copy on GitHub's main branch is
// used instead. On admin open the Tracker upserts plan items by id: plan-managed fields are overwritten, the admin
// note is kept, feedback and admin-added entries are never touched.
export var PLAN_URLS = ["/Life-Care/plan.json", "https://raw.githubusercontent.com/JCBECK1976/Life-Care/main/docs/plan.json"];
var PLAN_FIELDS = ["title", "category", "phase", "status", "priority", "tokenPct", "version", "planNotes", "order"];
export function planKey(id) { return "plan_" + String(id).replace(/[^A-Za-z0-9_-]/g, "_"); }
export function planEntry(item, existing, now, order) {
  var iso = (now || new Date()).toISOString();
  var managed = { title: String(item.title || item.id), category: CATEGORIES.indexOf(item.category) > 0 ? item.category : "Task",
    phase: String(item.phase || ""), status: STATUSES.indexOf(item.status) >= 0 ? item.status : "New",
    priority: PRIORITIES.indexOf(item.priority) >= 0 ? item.priority : "", tokenPct: typeof item.tokenPct === "number" ? item.tokenPct : null,
    version: String(item.version || ""), planNotes: String(item.notes || ""), order: typeof order === "number" ? order : 0 };
  var base = existing || { created: iso, note: "" };
  var changed = !existing || PLAN_FIELDS.some(function(f) { return (existing[f] == null ? null : existing[f]) !== managed[f]; });
  return { changed: changed, entry: Object.assign({}, base, managed, { id: planKey(item.id), planId: String(item.id), source: "plan", text: managed.title,
    ref: String(item.id), note: base.note || "", updated: changed ? iso : (base.updated || iso) }) };
}
export async function fetchPlan(fetcher) {
  var f = fetcher || window.fetch.bind(window);
  for (var i = 0; i < PLAN_URLS.length; i++) {
    try { var r = await f(PLAN_URLS[i], { cache: "no-store" }); if (!r.ok) continue; var j = await r.json(); if (j && Array.isArray(j.items)) return j; } catch (e) { /* try the next copy */ }
  }
  return null;
}
// Open token % per phase (plan items not Done / Won't do), in plan order.
export function phaseTotals(entries, phases) {
  var out = (phases || []).slice(); var by = {}; out.forEach(function(p) { by[p] = 0; });
  (entries || []).forEach(function(e) { if (e.source !== "plan" || !isOutstanding(e)) return; var p = e.phase || "—"; if (!(p in by)) { by[p] = 0; out.push(p); } by[p] += Number(e.tokenPct) || 0; });
  return out.filter(function(p) { return by[p] > 0; }).map(function(p) { return { phase: p, pct: Math.round(by[p] * 10) / 10 }; });
}
