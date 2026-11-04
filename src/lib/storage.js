import firebase, { DATA_ROOT } from "./firebase.js";

// ═══════════════════════════════════════════════════
// STORAGE HELPERS (bulletproof)
// ═══════════════════════════════════════════════════
export async function sGet(key) {
  try {
    var snap = await firebase.database().ref(DATA_ROOT + "/" + key.replace(/[.#$/\[\]]/g, "_")).once("value");
    return snap.exists() ? snap.val() : null;
  } catch(e) { return null; }
}

export async function sSet(key, val) {
  try {
    await firebase.database().ref(DATA_ROOT + "/" + key.replace(/[.#$/\[\]]/g, "_")).set(val);
  } catch(e) {}
}
