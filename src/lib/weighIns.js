// v2.32.0 (Architect, 18 Nov — AUTOMATIC WEIGH-INS, flag useWeighIns, build only): the steps source becomes a health
// source with a separate switch "Import my weigh-ins" (Silver and up). Reads ONLY weight and body fat:
//   Android: Health Connect READ_WEIGHT + READ_BODY_FAT · iPhone: HealthKit bodyMass + bodyFatPercentage. Never writes.
// - On open / resume: the last 30 days on the first connect, then the last 8.
// - ONE reading per person per day: the earliest of the day (the morning weigh-in), with its body fat and the app it
//   came from ("from Fitdays"): data[person].weighIns["YYYY-MM-DD"] = { kg, fatPct?, source, time, at }.
// - Every screen, chart, the rolling Katch-McArdle BMR, goals and feedback read the weekly series body.weight /
//   body.bodyFat ([{ wk, v }], weight in the app's stone format — see stCode). Each training week gets the LATEST imported day of that week, marked
//   { wk, v, src, day } — unless the person typed a weigh-in for that week: manual entries always win, and the import
//   is shown as "also recorded".
// - Disconnect stops the import and can delete the imported readings; typed ones are never touched.
import { buildFlag } from "./platform.js";
import { planAllows } from "./myPlan.js";
import { deviceSettings, saveDeviceSettings, getHealth } from "./steps.js";
import { isoDay, trainingWeekOf } from "./calories.js";

export var WEIGH_TYPES = ["weight", "bodyFat"];
export var FIRST_DAYS = 30, LATER_DAYS = 8;
export function weighInsOn() { return buildFlag("useWeighIns"); }

/** The app a reading came from, in words people know. */
var APPS = [[/fitdays/i, "Fitdays"], [/renpho/i, "Renpho"], [/withings|healthmate|health mate/i, "Withings"], [/eufy|eufylife/i, "Eufy"], [/garmin/i, "Garmin"],
  [/fitbit/i, "Fitbit"], [/samsung|shealth/i, "Samsung Health"], [/google\.android\.apps\.fitness|google fit/i, "Google Fit"], [/zepp|huami|mi fit/i, "Zepp"], [/com\.apple\.health|^health$/i, "Apple Health"]];
export function sourceLabel(name) {
  var s = String(name || "").trim(); if (!s) return "your scales app";
  for (var i = 0; i < APPS.length; i++) if (APPS[i][0].test(s)) return APPS[i][1];
  return /^[a-z]+(\.[a-z0-9_]+)+$/i.test(s) ? s.split(".").pop().replace(/^./, function(c) { return c.toUpperCase(); }) : s;
}

/** Ask for weight + body fat (the system screen). { ok, fat } */
export async function connectWeighIns(health) {
  var r = await health.requestAuthorization({ read: WEIGH_TYPES, write: [] });
  var g = (r && r.readAuthorized) || [];
  return { ok: g.indexOf("weight") >= 0, fat: g.indexOf("bodyFat") >= 0 };
}

/** Pure: samples → one reading per local day (the earliest weight of the day, its body fat if recorded that day). */
export function perDay(weights, fats) {
  var out = {};
  (weights || []).slice().sort(function(a, b) { return a.startDate < b.startDate ? -1 : 1; }).forEach(function(s) {
    var v = Number(s.value); if (!(v > 20 && v < 400)) return;
    var dt = new Date(s.startDate), d = isoDay(dt);
    if (out[d]) return;   // the earliest of the day already
    out[d] = { kg: Math.round(v * 10) / 10, source: sourceLabel(s.sourceName || s.sourceId), time: String(dt.toTimeString()).slice(0, 5) };
  });
  var fatByDay = {};
  (fats || []).slice().sort(function(a, b) { return a.startDate < b.startDate ? -1 : 1; }).forEach(function(s) {
    var v = Number(s.value); if (v > 0 && v <= 1) v = v * 100;   // a fraction on some phones
    if (!(v > 2 && v < 70)) return; var d = isoDay(new Date(s.startDate)); if (fatByDay[d] == null) fatByDay[d] = Math.round(v * 10) / 10;
  });
  Object.keys(out).forEach(function(d) { if (fatByDay[d] != null) out[d].fatPct = fatByDay[d]; });
  return out;
}

/** Read the health store for the last `days` days. */
export async function readWeighIns(health, days, now) {
  var end = new Date(now || Date.now()), start = new Date(end); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
  var q = async function(type) { try { var r = await health.readSamples({ dataType: type, startDate: start.toISOString(), endDate: end.toISOString(), limit: 1000, ascending: true }); return (r && r.samples) || []; } catch (e) { return []; } };
  return perDay(await q("weight"), await q("bodyFat"));
}

/** The app's weight format (as the Fitdays photo import): stones, then the pounds digits after the dot — 14st 6.8lb → 14.68.
 *  The weekly series (body.weight) is in this format for everyone, so imports use it too; the daily record keeps kg. */
export var STONE_KG = 6.35029;
export function stCode(kg) {
  var stF = kg / STONE_KG, st = Math.floor(stF), lb = Math.round((stF - st) * 14 * 10) / 10;
  if (lb >= 14) { st += 1; lb = Math.round((lb - 14) * 10) / 10; }
  return parseFloat(st + "." + lb.toFixed(1).replace(".", ""));
}
export function stLabel(kg) { var stF = kg / STONE_KG, st = Math.floor(stF), lb = Math.round((stF - st) * 14 * 10) / 10; if (lb >= 14) { st += 1; lb -= 14; } return st + "st " + lb.toFixed(1) + "lb"; }
var isImported = function(e) { return !!(e && e.src); };
/** Pure: put readings on one person; rebuild the imported weekly entries. Manual weekly entries are never changed. */
export function mergeWeighIns(p, readings, now) {
  if (!p) return false;
  p.weighIns = p.weighIns || {}; p.body = p.body || {}; p.body.weight = p.body.weight || []; p.body.bodyFat = p.body.bodyFat || [];
  var changed = false, at = new Date(now || Date.now()).toISOString();
  Object.keys(readings || {}).forEach(function(d) {
    var cur = p.weighIns[d], r = readings[d];
    if (!cur || cur.kg !== r.kg || cur.fatPct !== r.fatPct || cur.source !== r.source) { p.weighIns[d] = Object.assign({}, r, { at: at }); changed = true; }
  });
  // the latest imported day of each training week → that week's value (unless a typed weigh-in exists for the week)
  var byWeek = {};
  Object.keys(p.weighIns).sort().forEach(function(d) { byWeek[trainingWeekOf(new Date(d + "T12:00:00"))] = d; });
  ["weight", "bodyFat"].forEach(function(series) {
    var arr = p.body[series];
    Object.keys(byWeek).forEach(function(wkS) {
      var wk = Number(wkS), d = byWeek[wkS], r = p.weighIns[d];
      var v = series === "weight" ? stCode(r.kg) : r.fatPct; if (v == null) return;   // the series' own format (stones)
      var i = arr.findIndex(function(e) { return e.wk === wk; });
      if (i >= 0 && !isImported(arr[i])) return;   // a typed weigh-in wins
      var next = { wk: wk, v: v, src: r.source, day: d };
      if (i >= 0) { if (arr[i].v !== v || arr[i].day !== d || arr[i].src !== r.source) { arr[i] = next; changed = true; } }
      else { arr.push(next); changed = true; }
    });
    arr.sort(function(a, b) { return a.wk - b.wk; });
  });
  return changed;
}

/** For a week with a typed weigh-in, the import that was "also recorded" (or null). */
export function alsoRecorded(p, wk) {
  var man = ((p && p.body && p.body.weight) || []).find(function(e) { return e.wk === wk && !isImported(e); });
  if (!man) return null;
  var days = Object.keys((p && p.weighIns) || {}).filter(function(d) { return trainingWeekOf(new Date(d + "T12:00:00")) === wk; }).sort();
  return days.length ? Object.assign({ day: days[days.length - 1] }, p.weighIns[days[days.length - 1]]) : null;
}
/** Pure: Disconnect + delete: removes imported readings and imported weekly entries only. Returns how many days. */
export function removeWeighIns(p) {
  if (!p) return 0;
  var n = Object.keys(p.weighIns || {}).length; delete p.weighIns;
  if (p.body) ["weight", "bodyFat"].forEach(function(s) { if (Array.isArray(p.body[s])) p.body[s] = p.body[s].filter(function(e) { return !isImported(e); }); });
  return n;
}
/** Typed weigh-ins (for the "use smart scales?" tip). */
export function manualCount(p) { return ((p && p.body && p.body.weight) || []).filter(function(e) { return !isImported(e) && e.v !== "" && e.v != null; }).length; }

/** Read and store, if this phone imports weigh-ins and the plan includes it. */
export async function syncWeighIns(data, saveData, opts) {
  if (!weighInsOn()) return { skipped: "flag" };
  var st = deviceSettings();
  if (!st.weighIns || !st.person) return { skipped: "not connected" };
  if (!planAllows("healthSync")) return { skipped: "plan" };
  var health = (opts && opts.health) || await getHealth(); if (!health) return { skipped: "no health store" };
  var days = st.weighLastSync ? LATER_DAYS : FIRST_DAYS;
  var readings = await readWeighIns(health, days, opts && opts.now);
  var nd = JSON.parse(JSON.stringify(data));
  if (!nd[st.person]) return { skipped: "unknown person" };
  var changed = mergeWeighIns(nd[st.person], readings, opts && opts.now);
  saveDeviceSettings({ weighLastSync: Date.now() });
  if (changed) await saveData(nd);
  var ds = Object.keys(readings).sort();
  return { ok: true, readings: ds.length, person: st.person, changed: changed, latest: ds.length ? Object.assign({ day: ds[ds.length - 1] }, readings[ds[ds.length - 1]]) : null };
}
