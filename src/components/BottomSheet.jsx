import React, { useState } from "react";
import { useDialog } from "../lib/a11y.js";

// v2.30.1 (FINAL DROP Part 6): bottom-sheet pickers — big rows within thumb reach instead of the small native list.
// <BottomSheet> is the panel (focus kept inside, Escape / Back / the backdrop close it); <SheetSelect> is a drop-in for a
// <select>: a button showing the current choice that opens the sheet. Long lists get a search box.
export function BottomSheet({ open, title, onClose, children, testId }) {
  var ref = useDialog(open, onClose);
  if (!open) return null;
  return (<div style={{ position: "fixed", inset: 0, zIndex: 3100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.35)" }} />
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} data-testid={testId || "sheet"} style={{ position: "relative", width: "100%", maxWidth: 520, maxHeight: "75vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: "16px 16px 0 0", boxShadow: "0 -6px 24px rgba(15,23,42,0.25)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 2, background: "#cbd5e1", margin: "8px auto 4px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 12px 8px 16px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{title}</div>
        <button type="button" aria-label="Close" onClick={onClose} style={{ minWidth: 44, minHeight: 44, border: "none", background: "transparent", fontSize: 22, color: "#475569", cursor: "pointer" }}>×</button>
      </div>
      <div style={{ overflowY: "auto", padding: "0 8px 12px" }}>{children}</div>
    </div>
  </div>);
}

/** options: [{ value, label, disabled? }] */
export function SheetSelect({ value, options, onChange, label, title, testId, style }) {
  var [open, setOpen] = useState(false);
  var [q, setQ] = useState("");
  var cur = options.find(function(o) { return o.value === value; });
  var shown = q ? options.filter(function(o) { return String(o.label).toLowerCase().indexOf(q.toLowerCase()) >= 0; }) : options;
  var pick = function(o) { if (o.disabled) return; setOpen(false); setQ(""); if (o.value !== value) onChange(o.value); };
  return (<>
    <button type="button" aria-haspopup="dialog" aria-label={label + ": " + (cur ? cur.label : "choose")} data-testid={testId} onClick={function() { setOpen(true); }}
      style={Object.assign({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, minHeight: 44, padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", fontSize: 13, color: "#0f172a", cursor: "pointer", textAlign: "left", minWidth: 0 }, style)}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cur ? cur.label : "Choose…"}</span><span aria-hidden="true" style={{ color: "#475569" }}>▾</span>
    </button>
    <BottomSheet open={open} title={title || label} onClose={function() { setOpen(false); setQ(""); }} testId={testId ? testId + "-sheet" : undefined}>
      {options.length > 12 && <input type="search" aria-label={"Search " + (title || label)} value={q} onChange={function(e) { setQ(e.target.value); }} placeholder="Search" style={{ width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 12px", margin: "0 0 8px", border: "1px solid #cbd5e1", borderRadius: 10, fontSize: 15 }} />}
      <div role="listbox" aria-label={title || label}>
        {shown.map(function(o) { var on = o.value === value; return (<button key={String(o.value)} type="button" role="option" aria-selected={on} aria-disabled={o.disabled || undefined} data-testid={testId ? testId + "-opt" : undefined} onClick={function() { pick(o); }}
          style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", minHeight: 56, padding: "10px 12px", marginBottom: 4, border: "none", borderRadius: 10, background: on ? "#eff6ff" : "transparent", color: o.disabled ? "#64748b" : "#0f172a", fontSize: 15, fontWeight: on ? 700 : 500, textAlign: "left", cursor: o.disabled ? "default" : "pointer" }}>
          <span>{o.label}</span>{on && <span aria-hidden="true" style={{ color: "#2563eb" }}>✓</span>}</button>); })}
        {!shown.length && <div style={{ padding: 12, fontSize: 13, color: "#475569" }}>Nothing matches.</div>}
      </div>
    </BottomSheet>
  </>);
}

export default SheetSelect;
