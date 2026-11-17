// v2.16.7 P2: self-service data export (JSON) and deletion of a person's live data.
// Backups are not touched: they age out within 12 months (Privacy Notice §7). Each action is audited (no content).
import firebase, { DATA_ROOT, auth } from "./firebase.js";
import { auditLog } from "./audit.js";
import { isNative, nativeGoogleSignIn, nativeSignOut } from "./native.js";

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
   "Delete my account" erases the person's live data (as deleteMyData), records it in the audit trail (no content),
   deletes this Google sign-in from Lifecare Companion (Firebase Authentication) and signs out. The Google account itself
   is not touched. If Firebase asks for a recent sign-in, the person confirms with Google once and it carries on. */
export async function deleteMyAccount(person) {
  var n = await deleteMyData(person);
  try { await auditLog("delete-account", person, n + " records"); } catch (e) { /* the deletion still goes ahead */ }
  var u = auth.currentUser;
  if (u) {
    try { await u.delete(); }
    catch (e) {
      if (e && e.code === "auth/requires-recent-login") {
        if (isNative()) { await nativeGoogleSignIn(firebase, auth); }
        else { var p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" }); await u.reauthenticateWithPopup(p); }
        await auth.currentUser.delete();
      } else throw e;
    }
  }
  await nativeSignOut();
  try { await auth.signOut(); } catch (e) { /* already signed out after delete */ }
  return n;
}
