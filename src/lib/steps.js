// v2.23.0 (N6): steps from the phone's health store — the stepsSource interface.
//   healthConnect  Android (Health Connect; Samsung Health and Fit write into it)
//   healthKit      iOS (Apple Health) — same plugin, wired in Part 6 / J15
//   manual         typed by the person (existing Body/Exercise entries)
//   none           not connected
// We read ONLY daily step totals (+ daily active calories behind a separate toggle), for today and the last 7 days,
// when the app opens or comes back to the front. Only one total per day is stored, per person, at
// data[person].dailyActivity[YYYY-MM-DD] = { steps, activeKcal?, source, at }. Nothing else leaves the phone.
// The settings for THIS phone (which source, whose steps on the shared account, the calories toggle) are kept on the
// device (localStorage), because a phone belongs to one person.
import { useEffect } from "react";
import { isNative } from "./native.js";
import { planAllows } from "./myPlan.js";
import { buildFlag } from "./platform.js";
import { isoDay } from "./calories.js";

export var SOURCES = {
  healthConnect: { id: "healthConnect", label: "Health Connect", platform: "android" },
  healthKit: { id: "healthKit", label: "Apple Health", platform: "ios" },
  manual: { id: "manual", label: "Typed in", platform: "any" },
  none: { id: "none", label: "Not connected", platform: "any" },
};
export var DAYS = 8;   // today + the last 7 days
export var HC_PLAY_URL = "https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata";
var KEY = "lc_steps_device";

/* ---------- this phone's settings ---------- */
export function deviceSettings() {
  try { return Object.assign({ source: "none", person: "", activeCalories: false }, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return { source: "none", person: "", activeCalories: false }; }
}
export function saveDeviceSettings(patch) {
  var s = Object.assign(deviceSettings(), patch || {});
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode: works for this session only */ }
  return s;
}

/* ---------- the native health store (or a test stand-in in development) ---------- */
export async function getHealth() {
  if (import.meta.env.DEV && window.__lcHealth) return window.__lcHealth;
  if (!isNative()) return null;
  return (await import("@capgo/capacitor-health")).Health;
}
export function nativeSource() {
  try { var p = window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform(); } catch (e) { p = ""; }
  if (import.meta.env.DEV && window.__lcHealth) return window.__lcHealth.platform === "ios" ? "healthKit" : "healthConnect";
  return p === "ios" ? "healthKit" : p === "android" ? "healthConnect" : "none";
}

/** Can this phone connect? { ok, reason: "web" | "not-installed" | "update" | "unsupported" | "" } */
export async function availability(health) {
  if (!health) return { ok: false, reason: "web" };
  try {
    var r = await health.isAvailable();
    if (r && r.available) return { ok: true, reason: "" };
    var why = String((r && r.reason) || "").toLowerCase();
    return { ok: false, reason: /update/.test(why) ? "update" : /install|not.?available|provider/.test(why) ? "not-installed" : "unsupported" };
  } catch (e) { return { ok: false, reason: "not-installed" }; }
}
export function typesFor(activeCalories) { return activeCalories ? ["steps", "calories"] : ["steps"]; }

/** Ask the health store for permission (the system screen). Returns { ok, missing: [] }. */
export async function connect(health, activeCalories) {
  var types = typesFor(activeCalories);
  var r = await health.requestAuthorization({ read: types, write: [] });
  var granted = (r && r.readAuthorized) || [];
  return { ok: granted.indexOf("steps") >= 0, missing: types.filter(function(t) { return granted.indexOf(t) < 0; }) };
}

/** Daily totals for today + the last 7 days: { "YYYY-MM-DD": { steps, activeKcal? } } */
export async function readDays(health, activeCalories, now) {
  var end = new Date(now || Date.now());
  var start = new Date(end); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (DAYS - 1));
  var out = {};
  var q = async function(type, field) {
    var r = await health.queryAggregated({ dataType: type, startDate: start.toISOString(), endDate: end.toISOString(), bucket: "day", aggregation: "sum" });
    ((r && r.samples) || []).forEach(function(b) {
      var d = isoDay(new Date(b.startDate)); var v = Number(b.value);
      if (isFinite(v)) { out[d] = out[d] || {}; out[d][field] = Math.round(v); }
    });
  };
  await q("steps", "steps");
  if (activeCalories) { try { await q("calories", "activeKcal"); } catch (e) { /* not granted: steps only */ } }
  return out;
}

/** Pure: put daily totals on one person's record. Only that person; only daily totals. Returns true if anything changed. */
export function mergeDays(p, days, source, now) {
  if (!p) return false;
  p.dailyActivity = p.dailyActivity || {};
  var changed = false; var at = new Date(now || Date.now()).toISOString();
  Object.keys(days || {}).forEach(function(d) {
    var cur = p.dailyActivity[d] || {}; var v = days[d];
    var next = Object.assign({}, cur, { source: source });
    if (v.steps != null) next.steps = v.steps;
    if (v.activeKcal != null) next.activeKcal = v.activeKcal; else if (cur.source === source) delete next.activeKcal;
    if (cur.steps !== next.steps || cur.activeKcal !== next.activeKcal || cur.source !== next.source) { next.at = at; p.dailyActivity[d] = next; changed = true; }
  });
  return changed;
}
/** Pure: Disconnect + "delete stored totals": removes only what this source wrote. Returns how many days were removed. */
export function removeDays(p, source) {
  var n = 0; var da = (p && p.dailyActivity) || {};
  Object.keys(da).forEach(function(d) { if (da[d] && da[d].source === source) { delete da[d]; n++; } });
  return n;
}

/** The people whose steps a phone can hold on today's shared data (JC / Becks), by tab key. */
export function peopleOf(data) { return ["jc", "becks"].filter(function(k) { return data && data[k]; }).map(function(k) { return { key: k, name: (data[k].profile && data[k].profile.name) || (k === "jc" ? "JC" : "Becks") }; }); }

/** Read and store, if this phone is connected and the plan includes it. Returns { ok, days, person } or { skipped }. */
export async function syncSteps(data, saveData, opts) {
  if (!buildFlag("useSteps")) return { skipped: "flag" };
  var st = deviceSettings();
  if (st.source === "none" || st.source === "manual" || !st.person) return { skipped: "not connected" };
  if (!planAllows("healthSync")) return { skipped: "plan" };
  var health = (opts && opts.health) || await getHealth(); if (!health) return { skipped: "no health store" };
  var days = await readDays(health, st.activeCalories, opts && opts.now);
  var nd = JSON.parse(JSON.stringify(data));
  if (!nd[st.person]) return { skipped: "unknown person" };
  var changed = mergeDays(nd[st.person], days, SOURCES[st.source].label, opts && opts.now);
  saveDeviceSettings({ lastSync: Date.now() });
  if (changed) await saveData(nd);
  return { ok: true, days: Object.keys(days).length, person: st.person, changed: changed };
}

/** On app open and every time it comes back to the front. */
export function useStepsSync(data, saveData) {
  var ready = !!data;
  useEffect(function() {
    if (!ready) return undefined;
    var busy = false;
    var run = function() { if (busy || document.visibilityState === "hidden") return; busy = true; syncSteps(window._lcData || data, window._lcSaveData || saveData).catch(function() {}).then(function() { busy = false; }); };
    run();
    document.addEventListener("visibilitychange", run);
    window.addEventListener("lc-steps-sync", run);
    return function() { document.removeEventListener("visibilitychange", run); window.removeEventListener("lc-steps-sync", run); };
  }, [ready]);   // eslint-disable-line react-hooks/exhaustive-deps
}
