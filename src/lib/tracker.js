import firebase, { DATA_ROOT } from "./firebase.js";
import { APP_ENV, APP_VERSION } from "../constants/version.js";
import { CATEGORIES, PRIORITIES, STATUSES, fetchPlan, planEntry, planKey } from "./plan.js";
export { CATEGORIES, CLOSED, PLAN_URLS, PRIORITIES, STATUSES, fetchPlan, isOutstanding, phaseTotals, planEntry, planKey } from "./plan.js";

// v2.14.0 item 10: Feedback, Defect & Feature tracker, under DATA_ROOT/tracker/<id>. Text only: no screenshots or images.
// Every "Send Feedback" also saves an entry (Category "Feedback", Status "New"); the admin triages it in Settings → 📝 Tracker.
// "name@example.com" → "n***@e***.com": enough to tell accounts apart, not the address itself.
export function maskEmail(email) {
  var m = /^([^@]+)@([^.]+)\.(.+)$/.exec(String(email || "")); if (!m) return email ? "***" : "";
  return m[1].charAt(0) + "***@" + m[2].charAt(0) + "***." + m[3];
}
export function newId(now) { var d = now || new Date(); return "t" + d.getTime().toString(36) + Math.random().toString(36).slice(2, 6); }

export function feedbackEntry(o) {
  var now = o.now || new Date();
  return { id: o.id || newId(now), created: now.toISOString(), updated: now.toISOString(), version: APP_VERSION, env: APP_ENV,
    account: maskEmail(o.email), person: o.person || "", kind: o.kind || "", text: String(o.text || "").slice(0, 4000),
    category: "Feedback", status: "New", priority: "", note: "", ref: "", source: "feedback" };
}
export function adminEntry(o) {
  var now = o.now || new Date();
  return { id: newId(now), created: now.toISOString(), updated: now.toISOString(), version: APP_VERSION, env: APP_ENV,
    account: maskEmail(o.email), person: o.person || "", kind: "", text: String(o.text || "").slice(0, 4000),
    category: o.category === "Feature" || o.category === "Task" ? o.category : "Defect", status: STATUSES.indexOf(o.status) >= 0 ? o.status : "New",
    priority: PRIORITIES.indexOf(o.priority) >= 0 ? o.priority : "", note: String(o.note || "").slice(0, 2000), ref: String(o.ref || "").slice(0, 80), source: "admin" };
}

var ref = function(id) { return firebase.database().ref(DATA_ROOT + "/tracker" + (id ? "/" + id : "")); };
export function currentEmail() { try { var u = firebase.auth().currentUser; return u ? u.email : ""; } catch (e) { return ""; } }
export async function saveEntry(e) { await ref(e.id).set(e); return e; }
export async function removeEntry(id) { await ref(id).remove(); }
export async function loadEntries() { var v = (await ref().once("value")).val() || {}; return Object.keys(v).map(function(k) { return v[k]; }).sort(function(a, b) { return String(b.created).localeCompare(String(a.created)); }); }

// Returns { written, total } or null when no plan could be read.
export async function syncPlan(fetcher) {
  var plan = await fetchPlan(fetcher); if (!plan) return null;
  var cur = (await ref().once("value")).val() || {}; var written = 0; var now = new Date();
  for (var i = 0; i < plan.items.length; i++) {
    var it = plan.items[i]; if (!it || !it.id) continue;
    var r = planEntry(it, cur[planKey(it.id)], now, i);
    if (r.changed) { await saveEntry(r.entry); written++; }
  }
  return { written: written, total: plan.items.length, updated: plan.updated || "", phases: Array.isArray(plan.phases) ? plan.phases : [] };
}
