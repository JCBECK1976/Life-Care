// v2.16.3 Step 4: client feature flags for the Companion platform (ADR 0011). ALL OFF by default:
// with every flag off the app behaves exactly as before. Per device (localStorage "lc_flags"); nothing is live yet.
export var FLAGS = ["useAiProxy", "useAccounts", "showBuyEnergy"];
export function flag(name) {
  try { var f = JSON.parse(localStorage.getItem("lc_flags") || "{}"); return f[name] === true; } catch (e) { return false; }
}
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
export function proxyFeature(f) { var x = String(f || "").toLowerCase(); return x === "help" ? "help" : /photo|snap|food check/.test(x) ? "snap" : /meal/.test(x) ? "mealGenerator" : /balance/.test(x) ? "bodyBalance" : "aiFeedback"; }

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
