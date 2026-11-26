import React, { useState } from "react";
import { HRT_TYPES, HRT_ROUTES, HRT_ACTIONS, ymd, niceDate, hrtCurrent, hrtLine } from "../lib/pilot.js";

// v2.30.0 (Part 5b, flag usePilotFeatures): the HRT log — a RECORD ONLY. Never sent to the AI (the GP summary lists it
// as recorded, without AI), and every AI request carries the rule that the Companion never advises about HRT.
var card = { background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", padding: 12 };
var inp = { display: "block", width: "100%", boxSizing: "border-box", marginTop: 4, padding: "8px 10px", minHeight: 44, border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" };
var lab = { display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginTop: 8 };
var btnMain = { width: "100%", padding: 12, minHeight: 48, marginTop: 12, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" };
var EMPTY = function() { return { d: ymd(), action: "started", product: "", type: "", route: "", dose: "", notes: "" }; };

export default function HrtLog({ p, data, activeTab, saveData }) {
  var [f, setF] = useState(EMPTY());
  var [open, setOpen] = useState(false);
  var [busy, setBusy] = useState(false);
  var [msg, setMsg] = useState("");
  var events = (Array.isArray(p.hrt) ? p.hrt : []).slice().sort(function(a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; });
  var current = hrtCurrent(p.hrt);
  var set = function(k, v) { var n = Object.assign({}, f); n[k] = v; setF(n); };
  var save = async function() {
    if (busy) return;
    if (!f.product.trim() && f.action !== "note") { setMsg("Please enter the product name (as on the box or prescription)."); return; }
    setBusy(true);
    try {
      var nd = JSON.parse(JSON.stringify(data)); var e = { id: Date.now().toString(36), d: f.d || ymd(), action: f.action };
      ["product", "type", "route", "dose", "notes"].forEach(function(k) { var v = String(f[k] || "").trim().slice(0, 300); if (v) e[k] = v; });
      nd[activeTab].hrt = (Array.isArray(nd[activeTab].hrt) ? nd[activeTab].hrt : []).concat([e]);
      await saveData(nd);
      setF(EMPTY()); setOpen(false); setMsg("✓ Added to your HRT record.");
    } catch (er) { setMsg("Couldn't save: " + ((er && er.message) || er)); }
    setBusy(false);
  };
  var del = async function(e) {
    var nd = JSON.parse(JSON.stringify(data));
    nd[activeTab].hrt = (nd[activeTab].hrt || []).filter(function(x) { return !(x.id === e.id && x.d === e.d && x.action === e.action); });
    await saveData(nd);
    setMsg("Entry deleted.");
  };

  return (<div style={card} data-testid="hrt">
    <div role="note" data-testid="hrt-record-only" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 10, fontSize: 12, color: "#0f172a", lineHeight: 1.45 }}>
      <b>Your record only.</b> Keep track of what you use and when it changed, to share with your GP or nurse. The Companion never gives advice about HRT — please ask your GP, nurse or pharmacist.</div>
    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 12 }}>Current HRT</div>
    {current.length === 0 ? <div style={{ fontSize: 12, color: "#475569", padding: "6px 0" }}>Nothing recorded as current.</div>
      : current.map(function(e) { return (<div key={e.id + e.d} data-testid="hrt-current" style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#0f172a" }}><b>{hrtLine(e)}</b><div style={{ fontSize: 11, color: "#475569" }}>since {niceDate(e.d)}{e.notes ? " · " + e.notes : ""}</div></div>); })}
    {!open && <button type="button" data-testid="hrt-add" onClick={function() { setOpen(true); setMsg(""); }} style={btnMain}>+ Add to my HRT record</button>}
    {open && <div style={{ marginTop: 10, background: "#f8fafc", borderRadius: 10, padding: 10, border: "1px solid #e2e8f0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <label style={lab}>Date<input type="date" data-testid="hrt-date" value={f.d} max={ymd()} onChange={function(e) { set("d", e.target.value); }} style={inp} /></label>
        <label style={lab}>What happened<select data-testid="hrt-action" value={f.action} onChange={function(e) { set("action", e.target.value); }} style={inp}>{Object.keys(HRT_ACTIONS).map(function(k) { return (<option key={k} value={k}>{HRT_ACTIONS[k]}</option>); })}</select></label>
      </div>
      <label style={lab}>Product (as on the box or prescription)<input data-testid="hrt-product" value={f.product} onChange={function(e) { set("product", e.target.value); }} maxLength={300} style={inp} /></label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <label style={lab}>Type<select data-testid="hrt-type" value={f.type} onChange={function(e) { set("type", e.target.value); }} style={inp}><option value="">—</option>{HRT_TYPES.map(function(t) { return (<option key={t}>{t}</option>); })}</select></label>
        <label style={lab}>How it's taken<select data-testid="hrt-route" value={f.route} onChange={function(e) { set("route", e.target.value); }} style={inp}><option value="">—</option>{HRT_ROUTES.map(function(t) { return (<option key={t}>{t}</option>); })}</select></label>
      </div>
      <label style={lab}>Dose (as prescribed)<input data-testid="hrt-dose" value={f.dose} onChange={function(e) { set("dose", e.target.value); }} maxLength={300} placeholder="e.g. 50 micrograms, twice a week" style={inp} /></label>
      <label style={lab}>Notes (optional)<textarea data-testid="hrt-notes" value={f.notes} onChange={function(e) { set("notes", e.target.value); }} rows={2} maxLength={300} style={inp} /></label>
      <button type="button" data-testid="hrt-save" disabled={busy} aria-busy={busy} onClick={save} style={Object.assign({}, btnMain, { opacity: busy ? 0.6 : 1 })}>{busy ? "Saving…" : "Save"}</button>
      <button type="button" onClick={function() { setOpen(false); setF(EMPTY()); }} style={{ width: "100%", marginTop: 8, padding: 10, minHeight: 44, borderRadius: 8, border: "1px solid #94a3b8", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0f172a" }}>Cancel</button>
    </div>}
    {msg && <div role="status" aria-live="polite" data-testid="hrt-msg" style={{ fontSize: 12, marginTop: 8, color: "#0f172a" }}>{msg}</div>}
    {events.length > 0 && <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>History</div>
      {events.map(function(e) { return (<div key={e.id + e.d + e.action} data-testid="hrt-event" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>
        <div><span style={{ fontWeight: 600, color: "#475569" }}>{niceDate(e.d)}</span> <b>{HRT_ACTIONS[e.action]}</b>{e.product ? ": " + hrtLine(e) : ""}{e.notes ? <div style={{ color: "#475569" }}>{e.notes}</div> : null}</div>
        <button type="button" aria-label={"Delete " + HRT_ACTIONS[e.action] + " " + (e.product || "") + " " + niceDate(e.d)} data-testid="hrt-del" onClick={function() { if (confirm("Delete this HRT entry?")) del(e); }} style={{ minHeight: 44, minWidth: 44, padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>🗑 Delete</button></div>); })}
    </div>}
  </div>);
}
