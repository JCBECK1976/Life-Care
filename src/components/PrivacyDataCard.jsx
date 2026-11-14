import React from "react";
import LegalViewer from "./LegalViewer.jsx";
import { CHOICES, LEGAL_LABEL, consentActive, loadConsent, saveConsent } from "../lib/consent.js";
import { deleteMyData, exportMyData } from "../lib/myData.js";
import { auditLog, loadAudit } from "../lib/audit.js";

// v2.16.7 P2 / P8 / P9: Settings → Privacy & your data. Download my data is always available.
// The pilot items (legal docs, consent choices, delete my data) appear only while the pilotConsent flag is on.
var card = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 };
var btn = { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#0f172a" };
export default function PrivacyDataCard(props) {
  var who = props.person, pilot = consentActive();
  var [msg, setMsg] = React.useState("");
  var [view, setView] = React.useState(null);
  var [c, setC] = React.useState(null);
  var [confirmDel, setConfirmDel] = React.useState("");
  var [audit, setAudit] = React.useState(null);
  React.useEffect(function() { if (pilot) loadConsent(who).then(setC); }, [who, pilot]);
  var say = function(t) { setMsg(t); setTimeout(function() { setMsg(""); }, 4000); };
  return (<div data-testid="privacy-data-card" style={card}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🔒 Privacy & your data — {props.name}</div>
    <button style={btn} data-testid="export-my-data" onClick={async function() { try { await exportMyData(who); auditLog("export", who, "JSON download"); say("✓ Your data was downloaded as a JSON file"); } catch (e) { say("✗ Couldn't export: " + String(e.message || e).slice(0, 60)); } }}>⬇ Download my data (JSON)</button>
    <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>Everything recorded for {props.name}, in a portable file. Photos are never stored, so none are included.</div>
    {pilot && (<div>
      <div style={{ fontSize: 11, color: "#334155", margin: "10px 0 4px" }}>{LEGAL_LABEL}{c && c.at ? " · accepted " + c.at.slice(0, 10) : ""}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={btn} onClick={function() { setView("privacy"); }}>Privacy Notice</button>
        <button style={btn} onClick={function() { setView("terms"); }}>Terms of Use</button>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", margin: "10px 0 2px" }}>Your choices</div>
      {CHOICES.map(function(o) { return (<label key={o.k} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, padding: "3px 0" }}>
        <input type="checkbox" data-testid={"choice-" + o.k} checked={!!(c && c[o.k])} onChange={async function(e) { var n = Object.assign({ ai: false, photos: false, health: false }, c || {}); n[o.k] = e.target.checked; var saved = await saveConsent(who, n); window._lcConsent = saved; setC(saved); auditLog("consent", who, o.k + (e.target.checked ? " on" : " off")); say("✓ Saved"); }} style={{ width: 18, height: 18 }} />{o.label}</label>); })}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", margin: "12px 0 2px" }}>Delete my data</div>
      <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5 }}>Erases {props.name}'s records from the live app now. Backups are deleted as they age out, within 12 months. This can't be undone; download your data first if you want a copy. Type DELETE to confirm.</div>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <input aria-label="Type DELETE to confirm" value={confirmDel} onChange={function(e) { setConfirmDel(e.target.value); }} style={{ flex: 1, padding: 6, border: "1px solid #fecaca", borderRadius: 6 }} />
        <button disabled={confirmDel !== "DELETE"} data-testid="delete-my-data" style={Object.assign({}, btn, { color: "#fff", background: confirmDel === "DELETE" ? "#dc2626" : "#fca5a5", border: "none" })} onClick={async function() { var n = await deleteMyData(who); auditLog("delete-data", who, n + " keys"); setConfirmDel(""); say("✓ " + props.name + "'s data was deleted from the live app"); }}>Delete</button>
      </div>
    </div>)}
    {props.isAdmin && (<div style={{ marginTop: 12 }}>
      <button style={btn} onClick={async function() { setAudit(await loadAudit(20)); }}>Show audit trail (admin)</button>
      {audit && <ul data-testid="audit-list" style={{ fontSize: 10, color: "#334155", paddingLeft: 16, margin: "6px 0 0" }}>{audit.length ? audit.map(function(a, i) { return <li key={i}>{a.at.slice(0, 16).replace("T", " ")} · {a.action} · {a.person} · {a.target} · {a.account}</li>; }) : <li>No entries yet.</li>}</ul>}
    </div>)}
    {msg && <div role="status" style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: msg.charAt(0) === "✓" ? "#166534" : "#991b1b" }}>{msg}</div>}
    {view && <LegalViewer which={view} onClose={function() { setView(null); }} />}
  </div>);
}
