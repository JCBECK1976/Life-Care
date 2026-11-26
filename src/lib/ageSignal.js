// v2.35.0 (Architect, cyber review 18 Nov — UNDER-18 CONTROLS): at onboarding, ask the app store whether this
// account belongs to an adult, where the store can say (Google Play Age Signals API; Apple Declared Age Range,
// iOS 26+), through our small native plugin "LcAgeSignal". Only the yes/no for 18 is used; nothing is stored.
// If the store says under 18, the account is refused kindly. Otherwise the person still confirms "18 or over".
import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native.js";

var plugin = null;
function agePlugin() {
  if (import.meta.env.DEV && window.__lcAgeSignal) return window.__lcAgeSignal;   // tests: a stand-in for the store
  if (!isNative()) return null;
  return plugin || (plugin = registerPlugin("LcAgeSignal"));
}
/** What the store's answer means for us: "under18" | "adult" | "unknown". Pure (tested). */
export function readAgeSignal(r) {
  if (!r || !r.available || r.shared === false) return "unknown";
  var lo = typeof r.lower === "number" ? r.lower : null, hi = typeof r.upper === "number" ? r.upper : null;
  if (hi != null && hi < 18) return "under18";
  if (lo != null && lo >= 18) return "adult";
  return "unknown";
}
/** { verdict, source } — never throws; gives up after 6 s (the person then confirms their age as before). */
export async function storeAgeSignal(opts) {
  var p = agePlugin(); if (!p) return { verdict: "unknown", source: "none" };
  var ms = (opts && opts.timeoutMs) || 6000;
  try {
    var r = await Promise.race([p.check(), new Promise(function(res) { setTimeout(function() { res({ available: false, reason: "timeout" }); }, ms); })]);
    return { verdict: readAgeSignal(r), source: (r && r.source) || "none" };
  } catch (e) { return { verdict: "unknown", source: "none" }; }
}
