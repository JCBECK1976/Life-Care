// v2.21.1 SAFETY (JC, 17 Nov): the joint/admin account must never be deletable from the app. The live database rules
// are locked to its UID (database.rules.json); if that Google sign-in were deleted, signing in again would create a NEW
// UID and lock JC and Becks out of all their data. Database rules can't stop a person deleting their own sign-in, so
// this guard is enforced in the deletion code (deleteMyAccount) and on the server (functions deleteAccount), not only
// in the UI.
import firebase from "./firebase.js";

// The UID the live rules are locked to (also in database.rules.json — a test keeps the two in step).
export var LOCKED_UIDS = ["3iEIfsbZlaUMwUiGY6Lro4jAQef1"];
export var RECENT_SIGN_IN_MS = 5 * 60 * 1000;
export var PROTECTED_MSG = "This account can't be deleted here: contact the developer.";

/** True for the rules-locked UID, any UID in platform/admins, and (dev/emulator only) the test admin. Unknown → protected. */
export async function isProtectedAccount(uid) {
  if (!uid) return true;
  if (LOCKED_UIDS.indexOf(uid) >= 0) return true;
  if (import.meta.env.DEV && uid === "test-uid-jc") return true;   // the emulator rules' locked test UID
  try { var v = (await firebase.database().ref("platform/admins/" + uid).once("value")).val(); if (v === true) return true; }
  catch (e) { /* platform/ isn't readable under today's rules: the locked-UID list decides */ }
  return false;
}
/** A deletion needs a sign-in within the last 5 minutes. */
export function needsRecentSignIn(lastSignInTime, now) {
  var t = Date.parse(lastSignInTime || ""); if (!isFinite(t)) return true;
  return (now || Date.now()) - t > RECENT_SIGN_IN_MS;
}
