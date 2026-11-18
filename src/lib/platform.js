// v2.16.3 Step 4: client feature flags for the Companion platform (ADR 0011). ALL OFF by default:
// with every flag off the app behaves exactly as before. Per device (localStorage "lc_flags"); nothing is live yet.
export var FLAGS = ["useAiProxy", "useAccounts", "showBuyEnergy", "useTiers", "useSteps", "useOnboarding"];   /* v2.22.0 useTiers: on for /build/ regardless (myPlan.js) */
/* v2.27.0: the go-live switches. A flag is on when the admin turned it on for everyone (platform/publicFlags — readable
   before sign-in, written by platform admins only, under the NEXT rules; until those rules are deployed nothing can read
   it, so beta and prod behave exactly as before) or on this device (localStorage "lc_flags", for testing). */
var remote = {};
export function flag(name) {
  if (remote[name] === true) return true;
  try { var f = JSON.parse(localStorage.getItem("lc_flags") || "{}"); return f[name] === true; } catch (e) { return false; }
}
export var GO_LIVE_ORDER = ["useAiProxy", "useAccounts", "useTiers", "useOnboarding", "useSteps", "showBuyEnergy"];
/** Read the switches once at start-up (gives up after 3 s so the app never waits on it). */
export function loadRemoteFlags(db) {
  return Promise.race([
    db.ref("platform/publicFlags").once("value").then(function(s) { remote = s.val() || {}; return remote; }).catch(function() { remote = {}; return remote; }),
    new Promise(function(res) { setTimeout(function() { res(remote); }, 3000); }),
  ]);
}
export function remoteFlags() { return Object.assign({}, remote); }
/** v2.23.0: the overnight-batch features (useSteps, useOnboarding, useAccounts) are ON for /build/ only; beta and prod
 *  stay off unless the flag is set on the device. */
export function buildFlag(name) { return (import.meta.env.VITE_APP_ENV === "build") || flag(name); }
export var APP_ID = "lifecare";
export var FUNCTIONS_BASE = "https://europe-west1-life-care-app-64d04.cloudfunctions.net/";

/** Callable protocol, no SDK: POST {data} with the Firebase ID token; the reply is {result} or {error}. */
export async function callFunction(name, data, idToken, fetchImpl) {
  var r = await (fetchImpl || window._origFetch || fetch)(FUNCTIONS_BASE + name, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken }, body: JSON.stringify({ data: data }) });
  var j = await r.json().catch(function() { return {}; });
  if (!r.ok || j.error) { var e = new Error((j.error && j.error.message) || ("HTTP " + r.status)); e.code = j.error && j.error.status; throw e; }
  return j.result;
}

/** App feature label (aiUsage.featureOf) → tier feature switch checked by the server. */
export function proxyFeature(f) { if (/^[a-z][A-Za-z]+$/.test(String(f || "")) && f !== "help") return f;   /* v2.22.0: already a plan feature (x-lc-feature) */
  var x = String(f || "").toLowerCase(); return x === "help" ? "help" : /photo|snap|food check/.test(x) ? "snap" : /meal/.test(x) ? "mealGenerator" : /balance/.test(x) ? "bodyBalance" : "aiFeedback"; }

/** Turn a Messages API request body into a proxy call and give back a Response the existing code understands. */
export async function viaProxy(body, feature, idToken, fetchImpl) {
  var req = JSON.parse(body);
  try {
    var result = await callFunction("aiProxy", { appId: APP_ID, feature: proxyFeature(feature), request: { max_tokens: req.max_tokens, system: req.system, messages: req.messages } }, idToken, fetchImpl);
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    var msg = e.code === "RESOURCE_EXHAUSTED" ? "Your credit balance is too low (Companion Energy is empty)" : String(e.message || e);
    return new Response(JSON.stringify({ type: "error", error: { type: "proxy_error", message: msg } }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}

/** v2.16.6 ADR 0012 (behind useAccounts): the person tabs after sign-in — own tab first, then household members.
 *  A Hidden member's tab is greyed: "[Name] keeps this private", no data. */
export function householdTabs(selfUid, members, profiles, privacy) {
  var others = Object.keys(members || {}).filter(function(u) { return u !== selfUid; })
    .sort(function(a, b) { return String(((profiles || {})[a] || {}).name || a).localeCompare(String(((profiles || {})[b] || {}).name || b)); });
  return [selfUid].concat(others).map(function(u) {
    var name = ((profiles || {})[u] || {}).name || "Member";
    var pv = (privacy || {})[u] || {};
    var hidden = u !== selfUid && pv.visible !== true;
    return { uid: u, name: name, self: u === selfUid, hidden: hidden, canLog: !hidden && u !== selfUid && pv.logForMe === true, note: hidden ? name + " keeps this private" : "" };
  });
}
