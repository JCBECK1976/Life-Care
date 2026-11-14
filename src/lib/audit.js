// v2.16.7 P2: audit trail of significant changes — who / what / when, NO content.
// Stored under <root>/audit/<pushId>: { at, account (masked), person, action, target, version }. Kept 2 years (P10).
import firebase, { DATA_ROOT, auth } from "./firebase.js";
import { maskEmail } from "./tracker.js";
import { APP_VERSION } from "../constants/version.js";

export var AUDIT_ACTIONS = ["consent", "export", "delete-data", "restore", "r6-switch", "privacy"];
export function auditEntry(action, person, target, email, now) {
  return { at: new Date(now || Date.now()).toISOString(), account: maskEmail(email || ""), person: String(person || ""), action: String(action), target: String(target || "").slice(0, 80), version: APP_VERSION };
}
export function auditLog(action, person, target) {
  try {
    var u = auth.currentUser;
    return firebase.database().ref(DATA_ROOT + "/audit").push(auditEntry(action, person, target, u && u.email)).catch(function() {});
  } catch (e) { return Promise.resolve(); }
}
export async function loadAudit(n) {
  var s = await firebase.database().ref(DATA_ROOT + "/audit").orderByKey().limitToLast(n || 50).once("value");
  var v = s.val() || {}; return Object.keys(v).map(function(k) { return v[k]; }).reverse();
}
