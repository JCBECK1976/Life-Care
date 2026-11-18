import React, { useEffect, useRef, useState } from "react";

// v2.30.1: the "Deleted · Undo" bar (lib/undo.js). Bottom of the screen, above the chat button; 8 seconds.
export default function UndoToast() {
  var [t, setT] = useState(null);
  var timer = useRef(null);
  useEffect(function() {
    var on = function(e) { clearTimeout(timer.current); setT({ label: e.detail.label, restore: e.detail.restore }); timer.current = setTimeout(function() { setT(null); }, 8000); };
    window.addEventListener("lc-undo", on);
    return function() { window.removeEventListener("lc-undo", on); clearTimeout(timer.current); };
  }, []);
  if (!t) return null;
  var undo = async function() {
    if (t.busy) return; setT(Object.assign({}, t, { busy: true }));
    var ok = await t.restore();
    clearTimeout(timer.current); setT({ label: ok ? "Restored ✓" : "Can't undo: something else was saved since.", done: true });
    timer.current = setTimeout(function() { setT(null); }, 3000);
  };
  return (<div role="status" aria-live="polite" data-testid="undo-toast" style={{ position: "fixed", left: 16, right: 16, bottom: 88, zIndex: 2600, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
    <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, background: "#0f172a", color: "#fff", borderRadius: 10, padding: "8px 8px 8px 14px", fontSize: 14, boxShadow: "0 6px 20px rgba(15,23,42,0.3)", maxWidth: 420, width: "100%" }}>
      <span style={{ flex: 1 }}>{t.label}</span>
      {!t.done && <button type="button" data-testid="undo-btn" onClick={undo} disabled={t.busy} style={{ minHeight: 44, minWidth: 64, padding: "6px 14px", borderRadius: 8, border: "1px solid #93c5fd", background: "transparent", color: "#bfdbfe", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Undo</button>}
      {!t.done && <button type="button" aria-label="Dismiss" onClick={function() { clearTimeout(timer.current); setT(null); }} style={{ minHeight: 44, minWidth: 44, borderRadius: 8, border: "none", background: "transparent", color: "#cbd5e1", fontSize: 18, cursor: "pointer" }}>×</button>}
    </div>
  </div>);
}
