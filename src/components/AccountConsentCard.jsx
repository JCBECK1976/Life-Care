import React, { useEffect, useRef, useState } from "react";
import { OPTINS, TERMS_VERSION, accountConsent, consentApplies, saveAccountConsent } from "../lib/accountConsent.js";
import { usePlan } from "../lib/myPlan.js";

// v2.24.0: Settings → Privacy & your data → My privacy choices (individual accounts). Each opt-in can be withdrawn
// (or given) at any time; withdrawing switches its features off straight away, in the app and on the server.
export default function AccountConsentCard() {
  usePlan();
  var ref = useRef(null);
  var [msg, setMsg] = useState("");
  var [local, setLocal] = useState(null);   // shown straight away while saving
  useEffect(function() { var on = function() { setLocal(null); }; window.addEventListener("lc-consent-changed", on); return function() { window.removeEventListener("lc-consent-changed", on); }; }, []);
  useEffect(function() {
    var on = function() { setTimeout(function() { if (ref.current && ref.current.scrollIntoView) ref.current.scrollIntoView({ block: "start" }); }, 50); };
    window.addEventListener("lc-open-privacy", on);
    if (window._lcOpenPrivacy) { window._lcOpenPrivacy = false; on(); }
    return function() { window.removeEventListener("lc-open-privacy", on); };
  }, []);
  if (!consentApplies()) return null;
  var c = local || accountConsent() || {};
  var toggle = async function(k, v) {
    var n = { ai: c.ai, photos: c.photos, health: c.health, bodyBalance: c.bodyBalance }; n[k] = v;
    if (k === "ai" && !v) { n.photos = false; n.bodyBalance = false; } if (k === "photos" && !v) n.bodyBalance = false;
    setLocal(n);
    await saveAccountConsent(n);
    setMsg(v ? "✓ Turned on." : "Turned off. The features that need it are off now; nothing you've recorded is deleted.");
  };
  return (<div ref={ref} data-testid="account-consent" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginBottom: 14 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>🔐 My privacy choices</div>
    <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>Terms and Privacy accepted ({TERMS_VERSION}). Change any choice at any time.</div>
    {OPTINS.map(function(o) { var dis = (o.k === "photos" && !c.ai) || (o.k === "bodyBalance" && (!c.ai || !c.photos)); return (<label key={o.k} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: "1px solid #f1f5f9", fontSize: 13, minHeight: 44, opacity: dis ? 0.55 : 1 }}>
      <input type="checkbox" data-testid={"withdraw-" + o.k} disabled={dis} checked={c[o.k] === true} onChange={function(e) { toggle(o.k, e.target.checked); }} style={{ width: 20, height: 20, marginTop: 2 }} />
      <span><b>{o.label}</b><br /><span style={{ color: "#475569", fontSize: 12 }}>{o.hint}</span></span></label>); })}
    {msg && <div role="status" aria-live="polite" data-testid="consent-msg" style={{ fontSize: 12, marginTop: 6, color: "#0f172a" }}>{msg}</div>}
  </div>);
}
