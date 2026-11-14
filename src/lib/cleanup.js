// v2.16.5 (JC approved, 14 Nov): one-off, idempotent cleanup on load. Removes ONLY the old Google token keys
// (expired; tokens now stay on the device since v2.16.2). Nothing else is touched.
import firebase, { DATA_ROOT } from "./firebase.js";
export var OLD_TOKEN_KEYS = ["google_token_jc", "google_token_becks"];
export function removeOldGoogleTokens(db) {
  var d = db || firebase.database();
  return Promise.all(OLD_TOKEN_KEYS.map(function(k) { return d.ref(DATA_ROOT + "/" + k).remove().catch(function() {}); }));
}
