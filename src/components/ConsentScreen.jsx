import React from "react";
import LegalViewer from "./LegalViewer.jsx";
import { CHOICES, LEGAL_LABEL, saveConsent } from "../lib/consent.js";
// v2.16.7 P9: first-use explicit consent, granular, plus acceptance of the pilot Privacy Notice + Terms (P8).
// Shown when pilotConsent is on and there is no consent for the current legal version (asked again on a new version).
export default function ConsentScreen(props) {
  var [ch, setCh] = React.useState(Object.assign({ ai: false, photos: false, health: false }, props.current || {}));
  var [agree, setAgree] = React.useState(false);
  var [view, setView] = React.useState(null);
  var [busy, setBusy] = React.useState(false);
  var row = { display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12, color: "#0f172a" };
  return (<div role="dialog" aria-modal="true" aria-labelledby="consent-title" data-testid="consent-screen" style={{ position: "fixed", inset: 0, zIndex: 130, background: "#f1f5f9", overflowY: "auto" }}>
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h2 id="consent-title" style={{ fontSize: 18, margin: "8px 0 4px", color: "#0f172a" }}>Before you start{props.name ? ", " + props.name : ""}</h2>
      <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5, marginBottom: 10 }}>Lifecare Companion keeps health and fitness data you enter. We only use it with your permission. Choose what you're happy with; you can change it any time in Settings.</div>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "4px 12px" }}>
        {CHOICES.map(function(c) { return (<label key={c.k} style={row}>
          <input type="checkbox" data-testid={"consent-" + c.k} checked={!!ch[c.k]} onChange={function(e) { var n = Object.assign({}, ch); n[c.k] = e.target.checked; setCh(n); }} style={{ marginTop: 2, width: 18, height: 18 }} />
          <span><b>{c.label}</b><br /><span style={{ color: "#475569", fontSize: 11 }}>{c.hint}</span></span>
        </label>); })}
      </div>
      <div style={{ fontSize: 11, color: "#334155", margin: "12px 0 6px" }}>{LEGAL_LABEL}:</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button type="button" onClick={function() { setView("privacy"); }} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #bfdbfe", background: "#fff", color: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}>Read the Privacy Notice</button>
        <button type="button" onClick={function() { setView("terms"); }} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #bfdbfe", background: "#fff", color: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}>Read the Terms</button>
      </div>
      <label style={Object.assign({}, row, { borderBottom: "none" })}>
        <input type="checkbox" data-testid="consent-agree" checked={agree} onChange={function(e) { setAgree(e.target.checked); }} style={{ marginTop: 2, width: 18, height: 18 }} />
        <span>I have read the <b>Privacy Notice</b> and agree to the <b>Terms of Use</b> ({LEGAL_LABEL}). I agree to my health data being used as described, for the choices ticked above.</span>
      </label>
      <button type="button" disabled={!agree || busy} data-testid="consent-continue" onClick={async function() { setBusy(true); var c = await saveConsent(props.person, ch); props.onDone(c); }} style={{ width: "100%", marginTop: 8, padding: 12, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, color: "#fff", background: agree ? "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" : "#94a3b8", cursor: agree ? "pointer" : "not-allowed" }}>Continue</button>
      {!agree && <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>Tick the agreement to continue.</div>}
    </div>
    {view && <LegalViewer which={view} onClose={function() { setView(null); }} />}
  </div>);
}
