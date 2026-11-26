// v2.28.2: Firebase App Check in the native apps. Android: Play Integrity (debug provider in debug builds) through our own
// small native plugin (LcAppCheckPlugin) — the web Firebase SDK inside the app uses it as a "custom provider".
// iOS (v2.29.0): App Attest through the same plugin name. Off until the app is registered in Firebase (isConfigured);
// the server only REQUIRES App Check when ENFORCE_APP_CHECK=true (go-live checklist).
import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native.js";

export async function startNativeAppCheck(firebase, deps) {
  if (!(deps && deps.native) && !isNative()) return { on: false, reason: "web" };
  var plugin = (deps && deps.plugin) || registerPlugin("LcAppCheck");
  var c; try { c = await plugin.isConfigured(); } catch (e) { return { on: false, reason: "no plugin" }; }
  if (!c || !c.configured) return { on: false, reason: "not configured" };
  await import("firebase/compat/app-check");
  firebase.appCheck().activate(new firebase.appCheck.CustomProvider({
    getToken: async function() { var t = await plugin.getToken({ forceRefresh: false }); return { token: t.token, expireTimeMillis: t.expireTimeMillis }; },
  }), true);
  return { on: true, provider: c.provider };
}
