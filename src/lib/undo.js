// v2.30.1 (FINAL DROP Part 6): Undo after deletes and removals of a person's records.
// When a "Delete…/Remove…/Stop…" confirmation is accepted, the NEXT save of the person's records (App saveData) keeps the
// record as it was and shows "Deleted · Undo" for 8 seconds. Undo only applies if nothing else was saved since, so it
// can never overwrite a later change. Lists kept elsewhere (e.g. shopping) keep their own confirmation.
var pending = null, seq = 0;
export function armFromConfirm(msg) { var m = /^\s*(Delete|Remove|Stop)\b/i.exec(String(msg || "")); pending = m ? { verb: m[1].toLowerCase(), at: Date.now() } : null; }
export function takePending() { var p = pending; pending = null; return p && Date.now() - p.at < 5000 ? p : null; }
/** Every save of the person's records calls this: an older Undo offer is no longer valid. */
export function noteSave() { seq++; }
export function offerUndo(label, restore) {
  var my = ++seq;
  window.dispatchEvent(new CustomEvent("lc-undo", { detail: { label: label, restore: async function() { if (my !== seq) return false; await restore(); return true; } } }));
}
export function undoLabel(p) { return p.verb === "stop" ? "Stopped." : p.verb === "remove" ? "Removed." : "Deleted."; }
/** Wrap window.confirm once, so accepted delete confirmations arm the Undo. */
export function installUndo() {
  if (typeof window === "undefined" || window._lcUndoInstalled) return; window._lcUndoInstalled = true;
  var oc = window.confirm;
  window.confirm = function(m) { var r = oc.call(window, m); if (r) armFromConfirm(m); else pending = null; return r; };
}
