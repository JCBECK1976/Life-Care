import firebase, { DATA_ROOT } from "./firebase.js";

// ═══════════════════════════════════════════════════
// STORAGE HELPERS (bulletproof)
// ═══════════════════════════════════════════════════
/* v2.25.0 (Step 5, ADR 0012): in an individual account, a Visible family member's records come from THEIR store:
   window._lcMembers = { personKey: { uid, store, canWrite } } (lib/accounts.js loadHousehold). A key named for that
   person (journal_becks, mealplan:…:becks) is read from / written to their store; "dashboard:data" is merged (their
   person shown under their own key) and split again on save. Writes to a member only work with "log for me" (the
   database rules enforce it; without it the write is refused and their data is unchanged). */
var PERSON = /(^|[_:])([a-z][a-z0-9]*)(?=$|[_:])/g;
/* v2.27.3: the member a key belongs to, and the key as it is named in THEIR store (their view key → their real key). */
function memberFor(key) {
  var m = window._lcMembers; if (!m) return null;
  var t; PERSON.lastIndex = 0;
  while ((t = PERSON.exec(key))) {
    var mem = m[t[2]];
    if (mem) { var at = t.index + t[1].length; return { store: mem.store, canWrite: mem.canWrite, key: key.slice(0, at) + mem.realKey + key.slice(at + t[2].length) }; }
  }
  return null;
}
var clean = function(key) { return key.replace(/[.#$/\[\]]/g, "_"); };
export async function sGet(key) {
  try {
    if (key === "dashboard:data" && window._lcMembers) return await getMerged();
    var mem = memberFor(key);
    var snap = await firebase.database().ref(mem ? mem.store + "/" + clean(mem.key) : DATA_ROOT + "/" + clean(key)).once("value");
    return snap.exists() ? snap.val() : null;
  } catch(e) { return null; }
}

export async function sSet(key, val) {
  try {
    if (key === "dashboard:data" && window._lcMembers) { await setSplit(val); return; }
    var mem = memberFor(key);
    if (mem && !mem.canWrite) return;   // read-only member: never written
    await firebase.database().ref(mem ? mem.store + "/" + clean(mem.key) : DATA_ROOT + "/" + clean(key)).set(val);
  } catch(e) {}
}

async function getMerged() {
  var own = (await firebase.database().ref(DATA_ROOT + "/dashboard:data").once("value")).val();
  if (!own) return null;
  var d = JSON.parse(own);
  for (var k of Object.keys(window._lcMembers)) {
    var m = window._lcMembers[k];
    try { var v = (await firebase.database().ref(m.store + "/dashboard:data").once("value")).val(); var md = v ? JSON.parse(v) : null; if (md && md[m.realKey] && !d[k]) d[k] = md[m.realKey]; } catch (e) { /* not visible any more */ }
  }
  return JSON.stringify(d);
}
async function setSplit(val) {
  var d = JSON.parse(val); var own = {};
  Object.keys(d).forEach(function(k) { if (!window._lcMembers[k]) own[k] = d[k]; });
  await firebase.database().ref(DATA_ROOT + "/dashboard:data").set(JSON.stringify(own));
  for (var k of Object.keys(window._lcMembers)) {
    var m = window._lcMembers[k]; if (!m.canWrite || !d[k]) continue;
    try {
      var cur = (await firebase.database().ref(m.store + "/dashboard:data").once("value")).val(); var md = cur ? JSON.parse(cur) : { config: d.config };
      if (JSON.stringify(md[m.realKey]) === JSON.stringify(d[k])) continue;
      md[m.realKey] = d[k]; await firebase.database().ref(m.store + "/dashboard:data").set(JSON.stringify(md));
    } catch (e) { /* refused: their data unchanged */ }
  }
}
