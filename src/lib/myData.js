// v2.16.7 P2: self-service data export (JSON) and deletion of a person's live data.
// Backups are not touched: they age out within 12 months (Privacy Notice §7). Each action is audited (no content).
import firebase, { DATA_ROOT, auth } from "./firebase.js";
import { auditLog } from "./audit.js";
import { isNative, nativeGoogleSignIn, nativeSignOut } from "./native.js";
import { isProtectedAccount, needsRecentSignIn, PROTECTED_MSG } from "./accountGuard.js";

import { collectMyData, deletionUpdate } from "./myDataCore.js";
export * from "./myDataCore.js";

async function rootSnapshot() { return (await firebase.database().ref(DATA_ROOT).once("value")).val() || {}; }
export async function exportMyData(person) {
  var data = collectMyData(await rootSnapshot(), person);
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "lifecare-my-data-" + person + "-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 5000);
  return data;
}
export async function deleteMyData(person) {
  var up = deletionUpdate(await rootSnapshot(), person);
  await firebase.database().ref(DATA_ROOT).update(up);
  return Object.keys(up).length;
}

/* v2.21.0 (Google Play account-deletion requirement; minimum compliant version until per-uid accounts, Step 5):
   "Delete my account" erases the person's live data, records it in the audit trail (no content), deletes this Google
   sign-in from Lifecare Companion (Firebase Authentication) and signs out. The Google account itself is not touched.
   v2.21.1 SAFETY: refused for the joint/admin account (accountGuard.js) BEFORE anything is erased; a sign-in older
   than 5 minutes is confirmed with Google first, so a failed confirmation never leaves the data gone but the account
   still there. */
async function reauthenticate(u) {
  if (isNative()) { await nativeGoogleSignIn(firebase, auth); return; }
  var p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
  await u.reauthenticateWithPopup(p);
}
export async function deleteMyAccount(person, opts) {
  var u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  if (await isProtectedAccount(u.uid)) throw new Error(PROTECTED_MSG);                        // never the admin account
  if (needsRecentSignIn(u.metadata && u.metadata.lastSignInTime, opts && opts.now)) await reauthenticate(u);
  var n = await deleteMyData(person);
  try { await auditLog("delete-account", person, n + " records"); } catch (e) { /* the deletion still goes ahead */ }
  try { await auth.currentUser.delete(); }
  catch (e) {
    if (e && e.code === "auth/requires-recent-login") { await reauthenticate(auth.currentUser); await auth.currentUser.delete(); }
    else throw e;
  }
  await nativeSignOut();
  try { await auth.signOut(); } catch (e) { /* already signed out after delete */ }
  return n;
}
