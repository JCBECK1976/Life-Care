// v2.25.0 (Step 5, ADR 0012; flag useAccounts — build only): individual accounts.
// - The shared joint/admin account keeps today's shared data (SHARED_ROOT). Any other account reads and writes ONLY its
//   own store, apps/lifecare/users/{uid}/store (same key layout as today, so the whole app works unchanged), switched
//   here at sign-in BEFORE anything is read. It never sees the shared household data.
// - Sign-in: Google (web popup / Android account picker), Email link (no password), Apple (client ready; JC enables
//   the providers in Firebase, GO_LIVE_CHECKLIST).
// - Invite links: ?join=<hid>.<code> (a Platinum family) and ?pilot=<code> (a pilot test user) are kept through sign-in.
import firebase, { auth, setDataRoot } from "./firebase.js";
import { buildFlag, APP_ID } from "./platform.js";
import { isProtectedAccount } from "./accountGuard.js";
import { isNative } from "./native.js";

export function accountsOn() { return buildFlag("useAccounts"); }
export function storeOf(uid) { return "apps/" + APP_ID + "/users/" + uid + "/store"; }

/** At sign-in: choose where this person's data lives. Returns { individual }. */
export async function prepareAccount(user) {
  window._lcIndividual = null;
  if (!user || !accountsOn() || await isProtectedAccount(user.uid)) { setDataRoot(null); return { individual: false }; }
  setDataRoot(storeOf(user.uid));
  window._lcIndividual = { uid: user.uid, name: user.displayName || (user.email || "").split("@")[0] || "Me" };
  await loadHousehold(user.uid).catch(function() { window._lcMembers = null; });
  return { individual: true };
}

/** v2.25.0: the family members whose data this person may see (Visible) and write ("log for me"), by person key.
 *  A member whose person key is the same as one of ours (e.g. two new accounts, both "jc") can't be shown side by
 *  side yet and is left out (GO_LIVE_CHECKLIST note). Hidden members are listed in window._lcHiddenMembers. */
export async function loadHousehold(uid) {
  window._lcMembers = null; window._lcHiddenMembers = [];
  var db = firebase.database(); var A = "apps/" + APP_ID;
  var hid = (await db.ref(A + "/memberOf/" + uid).once("value")).val(); if (!hid) return null;
  var h = (await db.ref(A + "/households/" + hid).once("value")).val(); if (!h) return null;
  var ownRaw = (await db.ref(storeOf(uid) + "/dashboard:data").once("value")).val();
  var mine = ownRaw ? Object.keys(JSON.parse(ownRaw)).filter(function(k) { return k !== "config"; }) : ["jc"];
  var out = {};
  for (var m of Object.keys(h.members || {})) {
    if (m === uid) continue;
    var pv = (await db.ref(A + "/users/" + m + "/privacy").once("value").catch(function() { return { val: function() { return null; } }; })).val() || {};
    var name = ((await db.ref(A + "/users/" + m + "/profile").once("value").catch(function() { return { val: function() { return null; } }; })).val() || {}).name || "Member";
    if (pv.visible !== true) { window._lcHiddenMembers.push(name); continue; }
    var raw = (await db.ref(storeOf(m) + "/dashboard:data").once("value").catch(function() { return { val: function() { return null; } }; })).val();
    var keys = raw ? Object.keys(JSON.parse(raw)).filter(function(k) { return k !== "config"; }) : [];
    keys.forEach(function(k) { if (mine.indexOf(k) < 0 && !out[k]) out[k] = { uid: m, store: storeOf(m), canWrite: pv.logForMe === true, name: name }; });
  }
  window._lcMembers = Object.keys(out).length ? out : null;
  return window._lcMembers;
}

/* ---------- invite links, kept through sign-in ---------- */
var INV = "lc_pending_invite";
export function captureInvite(search) {
  var q = new URLSearchParams(search || (typeof location !== "undefined" ? location.search : ""));
  var j = q.get("join"), p = q.get("pilot"), inv = null;
  if (j && /^[\w-]+\.[\w-]+$/.test(j)) inv = { kind: "family", hid: j.split(".")[0], code: j.split(".")[1] };
  else if (p && /^[\w-]+$/.test(p)) inv = { kind: "pilot", code: p };
  if (inv) { try { sessionStorage.setItem(INV, JSON.stringify(inv)); } catch (e) { /* ignore */ } }
  return inv;
}
export function pendingInvite() { try { return JSON.parse(sessionStorage.getItem(INV) || "null"); } catch (e) { return null; } }
export function clearInvite() {
  try { sessionStorage.removeItem(INV); } catch (e) { /* ignore */ }
  try { var u = new URL(location.href); u.searchParams.delete("join"); u.searchParams.delete("pilot"); history.replaceState(null, "", u.toString()); } catch (e) { /* ignore */ }
}

/* ---------- sign-in methods ---------- */
var EMAIL = "lc_email_for_link";
/** Email link: send a one-tap sign-in link (no password). */
export async function sendEmailLink(email) {
  var url = location.origin + location.pathname + location.search;
  await auth.sendSignInLinkToEmail(email, { url: url, handleCodeInApp: true });
  try { localStorage.setItem(EMAIL, email); } catch (e) { /* ignore */ }
}
/** Coming back from the email: finish signing in. Asks for the address if it was opened on another device. */
export async function completeEmailLink(askEmail) {
  if (!auth.isSignInWithEmailLink(location.href)) return false;
  var email = null; try { email = localStorage.getItem(EMAIL); } catch (e) { /* ignore */ }
  if (!email && askEmail) email = await askEmail();
  if (!email) return false;
  await auth.signInWithEmailLink(email, location.href);
  try { localStorage.removeItem(EMAIL); } catch (e) { /* ignore */ }
  try { var u = new URL(location.href); ["apiKey", "oobCode", "mode", "lang"].forEach(function(k) { u.searchParams.delete(k); }); history.replaceState(null, "", u.toString()); } catch (e) { /* ignore */ }
  return true;
}
/** Apple: web popup; in the native app, the system Apple sign-in (iOS) via the social-login plugin. */
export async function appleSignIn() {
  if (isNative()) {
    var SL = (await import("@capgo/capacitor-social-login")).SocialLogin;
    var raw = Math.random().toString(36).slice(2) + Date.now().toString(36);
    var r = await SL.login({ provider: "apple", options: { scopes: ["email", "name"], nonce: raw } });
    var tok = r && r.result && (r.result.idToken || (r.result.accessToken && r.result.accessToken.token));
    var cred = new firebase.auth.OAuthProvider("apple.com").credential({ idToken: tok, rawNonce: raw });
    return auth.signInWithCredential(cred);
  }
  var p = new firebase.auth.OAuthProvider("apple.com"); p.addScope("email"); p.addScope("name");
  return auth.signInWithPopup(p);
}
