import firebase, { DATA_ROOT } from "./firebase.js";
import { locate, cleanKey, splitDash, joinDash, DASH, DASH_CONFIG, AREAS } from "./areas.js";
import { newAccountData } from "../constants/defaultData.js";

// ═══════════════════════════════════════════════════
// STORAGE HELPERS (bulletproof)
// ═══════════════════════════════════════════════════
// The shared joint account (data / data_build): one flat folder of keys, exactly as always.
// v2.28.0 (ADR 0018) — an INDIVIDUAL account (window._lcIndividual, lib/accounts.js):
//   its own records:   apps/lifecare/users/{uid}/data/{area}/{key}         (DATA_ROOT)
//   family-shared:     apps/lifecare/households/{hid}/shared/{area}/{key}  (window._lcFamilyRoot; users/{uid}/shared alone)
//   "dashboard:data" is assembled from each area's dashboard_data part and written back area by area (only what changed).
//   A Visible family member (window._lcMembers = { viewKey: { uid, root, canWrite, realKey } }) is read from THEIR areas;
//   an area they keep private simply can't be read (the rules refuse it) and shows as empty. Writes to a member only
//   work for the areas where they allowed "log for me" (the rules enforce it).
var individual = function() { return !!(window._lcIndividual && window._lcFamilyRoot); };
var PERSON = /(^|[_:])([a-z][a-z0-9]*)(?=$|[_:])/g;
/* The member a key belongs to, and the key as it is named in THEIR data (their view key → their real key). */
function memberFor(key) {
  var m = window._lcMembers; if (!m) return null;
  var t; PERSON.lastIndex = 0;
  while ((t = PERSON.exec(key))) {
    var mem = m[t[2]];
    if (mem) { var at = t.index + t[1].length; return { root: mem.root, canWrite: mem.canWrite, key: key.slice(0, at) + mem.realKey + key.slice(at + t[2].length) }; }
  }
  return null;
}
var clean = cleanKey;
var db = function() { return firebase.database(); };
/** Where a key lives in an individual account: the full path. */
function pathOf(key) {
  var l = locate(key);
  if (l.scope === "family") return window._lcFamilyRoot + "/" + l.area + "/" + clean(key);
  var mem = memberFor(key);
  return (mem ? mem.root : DATA_ROOT) + "/" + l.area + "/" + clean(mem ? mem.key : key);
}

export async function sGet(key) {
  try {
    if (!individual()) { var snap0 = await db().ref(DATA_ROOT + "/" + clean(key)).once("value"); return snap0.exists() ? snap0.val() : null; }
    if (key === "dashboard:data") return await getDash();
    var snap = await db().ref(pathOf(key)).once("value");
    return snap.exists() ? snap.val() : null;
  } catch(e) { return null; }
}

export async function sSet(key, val) {
  try {
    if (!individual()) { await db().ref(DATA_ROOT + "/" + clean(key)).set(val); return; }
    if (key === "dashboard:data") { await setDash(val); return; }
    var mem = locate(key).scope === "own" ? memberFor(key) : null;
    if (mem && !mem.canWrite) return;   // read-only member: never written
    await db().ref(pathOf(key)).set(val);
  } catch(e) {}
}

/** v2.28.0: the keys between two keys (the app's prefix scans: comments, meal plans) → { key: value }. */
export async function sScan(start, end) {
  var out = {};
  try {
    if (!individual()) { var s0 = await db().ref(DATA_ROOT).orderByKey().startAt(start).endAt(end).once("value"); return s0.val() || {}; }
    var p = pathOf(start); var folder = p.slice(0, p.lastIndexOf("/"));
    var s = await db().ref(folder).orderByKey().startAt(clean(start)).endAt(clean(end)).once("value");
    return s.val() || {};
  } catch (e) { return out; }
}

/* ---------- dashboard:data, area by area ---------- */
var lastWritten = {};   // area → the JSON last read/written, so only changed areas are written
async function readParts(root) {
  var parts = {};
  await Promise.all(AREAS.map(async function(a) {
    try { var v = (await db().ref(root + "/" + a + "/" + DASH).once("value")).val(); if (v) parts[a] = v; } catch (e) { /* that area is private */ }
  }));
  try { var c = (await db().ref(root + "/settings/" + DASH_CONFIG).once("value")).val(); if (c) parts._config = c; } catch (e) { /* none */ }
  return parts;
}
async function getDash() {
  var parts = await readParts(DATA_ROOT);
  if (!Object.keys(parts).length) return null;
  Object.keys(parts).forEach(function(a) { lastWritten[a] = parts[a]; });
  var d = joinDash(parts);
  var blank = newAccountData("x").jc;   // the shape every screen expects
  for (var k of Object.keys(window._lcMembers || {})) {
    var m = window._lcMembers[k];
    var md = joinDash(await readParts(m.root));
    var person = md[m.realKey];
    if (!person || d[k]) continue;
    // an area the member keeps private can't be read: its fields are shown empty, never missing
    Object.keys(blank).forEach(function(f) { if (person[f] === undefined) person[f] = JSON.parse(JSON.stringify(blank[f])); });
    d[k] = person;
  }
  return JSON.stringify(d);
}
async function setDash(val) {
  var d = JSON.parse(val); var own = { config: d.config };
  Object.keys(d).forEach(function(k) { if (k !== "config" && !(window._lcMembers && window._lcMembers[k])) own[k] = d[k]; });
  var parts = splitDash(own); var up = {};
  Object.keys(parts).forEach(function(a) {
    if (a === "_config") { if (lastWritten._config !== parts._config) up["settings/" + DASH_CONFIG] = parts._config; return; }
    if (lastWritten[a] !== parts[a]) up[a + "/" + DASH] = parts[a];
  });
  if (Object.keys(up).length) { await db().ref(DATA_ROOT).update(up); Object.keys(parts).forEach(function(a) { lastWritten[a] = parts[a]; }); }
  // a member's person: written back to THEIR areas (each area only works with their "log for me" for it)
  for (var k of Object.keys(window._lcMembers || {})) {
    var m = window._lcMembers[k]; if (!m.canWrite || !d[k]) continue;
    var cur = joinDash(await readParts(m.root));
    var mine = {}; mine[m.realKey] = d[k];
    var mp = splitDash(mine);
    for (var a of Object.keys(mp)) {
      if (a === "_config") continue;
      var before = {}; before[m.realKey] = {}; Object.keys(cur[m.realKey] || {}).forEach(function(f) { before[m.realKey][f] = cur[m.realKey][f]; });
      var was = splitDash(before)[a];
      if (was === mp[a]) continue;
      try { await db().ref(m.root + "/" + a + "/" + DASH).set(mp[a]); } catch (e) { /* refused for that area: their data unchanged */ }
    }
  }
}

/** v2.28.0: an individual account's own records as today's flat key map (for "Download my data"). */
export async function flatSnapshot() {
  if (!individual()) { return (await db().ref(DATA_ROOT).once("value")).val() || {}; }
  var out = {}; var dash = await getDashOwnOnly();
  if (dash) out["dashboard:data"] = dash;
  var own = (await db().ref(DATA_ROOT).once("value")).val() || {};
  Object.keys(own).forEach(function(a) { Object.keys(own[a] || {}).forEach(function(k) { if (k !== DASH && k !== DASH_CONFIG) out[k] = own[a][k]; }); });
  return out;
}
async function getDashOwnOnly() { var parts = await readParts(DATA_ROOT); return Object.keys(parts).length ? JSON.stringify(joinDash(parts)) : null; }
