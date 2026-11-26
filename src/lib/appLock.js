// v2.33.0 (Architect, cyber review 18 Nov): optional APP LOCK, "Sign out everywhere", and "confirm it's you" before
// Delete my account and Download my data. Build only (flag useAppLock); with it off nothing changes.
//   • The lock uses the phone's own fingerprint / face / PIN (Android BiometricPrompt, iPhone LocalAuthentication)
//     through our small native plugin "LcAppLock". It is a setting of THIS device (localStorage), never synced.
//   • It locks when the app opens and after it has been in the background for the chosen time (default 5 minutes).
//   • On the web there is no lock (the browser has no fingerprint prompt we can rely on); confirming is done with Google.
import { registerPlugin } from "@capacitor/core";
import firebase, { auth, DATA_ROOT } from "./firebase.js";
import { isNative, nativeGoogleSignIn, nativeSignOut } from "./native.js";
import { buildFlag, callFunction } from "./platform.js";
import { needsRecentSignIn } from "./accountGuard.js";

export function appLockOn() { return buildFlag("useAppLock"); }

var KEY = "lc_app_lock";
export var LOCK_AFTER = [0, 1, 5, 15, 30];   // minutes in the background; 0 = as soon as you leave the app
export function lockSettings() {
  try { var s = JSON.parse(localStorage.getItem(KEY) || "{}"); return { on: s.on === true, minutes: LOCK_AFTER.indexOf(s.minutes) >= 0 ? s.minutes : 5 }; }
  catch (e) { return { on: false, minutes: 5 }; }
}
export function saveLockSettings(s) { try { localStorage.setItem(KEY, JSON.stringify({ on: !!s.on, minutes: s.minutes })); } catch (e) { /* private mode */ } }
/** Lock now? Only when it's on and the app was away for at least the chosen minutes. */
export function shouldLock(s, hiddenAt, now) { return !!(s && s.on) && hiddenAt != null && now - hiddenAt >= s.minutes * 60000; }

var plugin = null;
function lockPlugin() {
  if (import.meta.env.DEV && window.__lcAppLock) return window.__lcAppLock;   // tests: a stand-in for the phone
  if (!isNative()) return null;
  return plugin || (plugin = registerPlugin("LcAppLock"));
}
/** { available, biometry: "face" | "fingerprint" | "none", reason } — "none" still means the phone's PIN works. */
export async function lockAvailable() {
  var p = lockPlugin(); if (!p) return { available: false, biometry: "none", reason: "web" };
  try { var r = await p.isAvailable(); return { available: !!(r && r.available), biometry: (r && r.biometry) || "none", reason: (r && r.reason) || "" }; }
  catch (e) { return { available: false, biometry: "none", reason: "no plugin" }; }
}
/** The phone's own prompt (fingerprint / face, or the phone's PIN). true only when the person passed it. */
export async function deviceUnlock(reason) {
  var p = lockPlugin(); if (!p) return false;
  try { var r = await p.authenticate({ reason: reason || "Unlock Lifecare Companion" }); return !!(r && r.ok); } catch (e) { return false; }
}

/** Confirm with Google (a fresh sign-in of the same account). */
export async function googleConfirm() {
  if (import.meta.env.DEV && window.__lcReauth) return window.__lcReauth();   // tests
  var u = auth.currentUser; if (!u) throw new Error("Not signed in");
  if (isNative()) { await nativeGoogleSignIn(firebase, auth); return true; }
  var p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
  await u.reauthenticateWithPopup(p); return true;
}

/** "Confirm it's you" before Delete my account / Download my data (flag on). In the apps: the phone's fingerprint, face
 *  or PIN. Otherwise: Google, unless this device signed in during the last 5 minutes. Throws when not confirmed. */
export async function confirmItsYou(why, opts) {
  if (!appLockOn()) return "off";
  var a = await lockAvailable();
  if (a.available) { if (await deviceUnlock(why)) return "device"; throw new Error("Not confirmed, so nothing was done."); }
  var u = auth.currentUser;
  if (u && !needsRecentSignIn(u.metadata && u.metadata.lastSignInTime, opts && opts.now)) return "recent";
  try { await googleConfirm(); return "google"; } catch (e) { throw new Error("Not confirmed with Google, so nothing was done."); }
}

/* ---------- Sign out everywhere ----------
   The server revokes every sign-in (refresh tokens) and sets a marker; open copies of the app see the marker and sign
   out at once. The joint account keeps its marker in the shared store; a personal account in its own profile. */
function markerRef(u) {
  return window._lcIndividual ? firebase.database().ref("apps/lifecare/users/" + u.uid + "/profile/signedOutAt")
    : firebase.database().ref(DATA_ROOT + "/security:signedOutAt");
}
export async function signOutEverywhere() {
  var u = auth.currentUser; if (!u) throw new Error("Not signed in");
  var server = true;
  try { await callFunction("signOutEverywhere", { appId: "lifecare" }, await u.getIdToken()); } catch (e) { server = false; }
  await markerRef(u).set(Date.now());   // the server sets it too for a personal account; this covers the joint one
  await nativeSignOut();
  await auth.signOut();
  return { server: server };
}
/** Signs this copy out when "Sign out everywhere" happened after it signed in. Returns the unsubscribe. */
export function watchSignOutEverywhere(u) {
  if (!appLockOn() || !u) return function() {};
  var ref = markerRef(u), started = null;
  var check = async function(snap) {
    var at = Number(snap.val()); if (!at) return;
    if (started == null) { try { started = Date.parse((await u.getIdTokenResult()).authTime); } catch (e) { return; } }
    if (Math.floor(at / 1000) * 1000 > started) { await nativeSignOut(); await auth.signOut(); }   // authTime is in whole seconds
  };
  ref.on("value", check, function() { /* not readable: nothing to do */ });
  return function() { ref.off("value", check); };
}
