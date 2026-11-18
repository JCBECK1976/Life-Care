// v2.25.0 (Step 5, ADR 0012; flag useAccounts — build only): individual accounts.
// - The shared joint/admin account keeps today's shared data (SHARED_ROOT). Any other account reads and writes ONLY its
//   own data, apps/lifecare/users/{uid}/data/{area} (v2.28.0, ADR 0018: split by area; the family's shared lists in
//   households/{hid}/shared/{area}, or users/{uid}/shared without a family — lib/storage.js does the mapping), switched
//   here at sign-in BEFORE anything is read. It never sees the shared household data.
// - Sign-in: Google (web popup / Android account picker), Email link (no password), Apple (client ready; JC enables
//   the providers in Firebase, GO_LIVE_CHECKLIST).
// - Invite links: ?join=<hid>.<code> (a Platinum family) and ?pilot=<code> (a pilot test user) are kept through sign-in.
import firebase, { auth, setDataRoot } from "./firebase.js";
import { buildFlag, APP_ID } from "./platform.js";
import { isProtectedAccount } from "./accountGuard.js";
import { isNative } from "./native.js";

export function accountsOn() { return buildFlag("useAccounts"); }
export function storeOf(uid) { return "apps/" + APP_ID + "/users/" + uid + "/data"; }   // v2.28.0: the person's areas
export function familyRootOf(uid, hid) { return hid ? "apps/" + APP_ID + "/households/" + hid + "/shared" : "apps/" + APP_ID + "/users/" + uid + "/shared"; }

/** At sign-in: choose where this person's data lives. Returns { individual }. */
export async function prepareAccount(user) {
  window._lcIndividual = null;
  if (!user || !accountsOn() || await isProtectedAccount(user.uid)) { setDataRoot(null); return { individual: false }; }
  setDataRoot(storeOf(user.uid));
  window._lcIndividual = { uid: user.uid, name: user.displayName || (user.email || "").split("@")[0] || "Me" };
  var hid = null; try { hid = (await firebase.database().ref("apps/" + APP_ID + "/memberOf/" + user.uid).once("value")).val(); } catch (e) { hid = null; }
  window._lcFamilyRoot = familyRootOf(user.uid, hid);   // the family's shared lists (a family of one when not in a family)
  await loadHousehold(user.uid).catch(function() { window._lcMembers = null; });
  return { individual: true };
}

/** v2.25.0 / v2.27.3: the family members whose data this person may see (Visible) and write ("log for me").
 *  window._lcMembers = { viewKey: { uid, store, canWrite, name, realKey } }, ordered by name (own tab first, then them).
 *  Every NEW account keeps its own person under "jc" in its own store, so a member whose key clashes with one already
 *  in use gets a unique view key ("m" + part of their account id); storage.js translates it back on every read/write.
 *  Hidden members: window._lcHiddenMembers = [{ name }] — only their name and privacy switch are read (both allowed by the
 *  rules); their data is never requested. window._lcHouseholdReads lists what was read (tests check it). */
export function viewKeyFor(uid) { return "m" + String(uid).toLowerCase().replace(/[^a-z0-9]/g, ""); }   // the whole id: prefixes can clash
export async function loadHousehold(uid) {
  window._lcMembers = null; window._lcHiddenMembers = []; window._lcHouseholdReads = [];
  var db = firebase.database(); var A = "apps/" + APP_ID;
  var read = async function(p) { window._lcHouseholdReads.push(p); try { return (await db.ref(p).once("value")).val(); } catch (e) { return null; } };
  var hid = await read(A + "/memberOf/" + uid); if (!hid) return null;
  var h = await read(A + "/households/" + hid); if (!h) return null;
  var personsIn = async function(root) {   // the person keys in someone's areas (from whichever areas can be read)
    var ks = {};
    for (var a of ["settings", "exercise", "body", "eating", "health"]) { var v = await read(root + "/" + a + "/dashboard_data"); if (v) Object.keys(JSON.parse(v)).forEach(function(k) { ks[k] = true; }); }
    return Object.keys(ks);
  };
  var ownKeys = await personsIn(storeOf(uid));
  var used = {}; (ownKeys.length ? ownKeys : ["jc"]).forEach(function(k) { used[k] = true; });
  var vis = [];
  for (var m of Object.keys(h.members || {})) {
    if (m === uid) continue;
    var pv = (await read(A + "/users/" + m + "/privacy")) || {};
    var name = ((await read(A + "/users/" + m + "/profile")) || {}).name || "Member";
    if (pv.visible !== true) { window._lcHiddenMembers.push({ name: name }); continue; }
    vis.push({ uid: m, name: name, canWrite: pv.logForMe === true || Object.values(pv.logAreas || {}).some(function(x) { return x === true; }) });   // v2.28.1: per-area log-for-me (the rules decide per area)
  }
  vis.sort(function(x, y) { return x.name.localeCompare(y.name); });
  window._lcHiddenMembers.sort(function(x, y) { return x.name.localeCompare(y.name); });
  var out = {};
  for (var v of vis) {
    var keys = await personsIn(storeOf(v.uid));
    keys.forEach(function(k) {
      var view = used[k] ? viewKeyFor(v.uid) + (keys.length > 1 ? k : "") : k;
      for (var n = 2; used[view]; n++) view = viewKeyFor(v.uid) + "x" + n;   // never two people on one key
      used[view] = true;
      out[view] = { uid: v.uid, root: storeOf(v.uid), canWrite: v.canWrite, name: v.name, realKey: k };
    });
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
