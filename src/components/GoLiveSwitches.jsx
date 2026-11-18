import React, { useEffect, useState } from "react";
import firebase, { auth } from "../lib/firebase.js";
import { isProtectedAccount } from "../lib/accountGuard.js";
import { GO_LIVE_ORDER, remoteFlags } from "../lib/platform.js";

// v2.27.0: the go-live switches, for the admin (GO_LIVE_CHECKLIST section E — flip them IN ORDER, checking each one).
// They apply to everyone on every device (platform/publicFlags), after the next database rules are deployed.
var INFO = {
  useAiProxy: ["AI through our server", "AI calls go through the server (Vertex AI, EU), with plan, consent and Energy checks. Needs the functions deployed."],
  useAccounts: ["Individual accounts", "Google / Apple / Email link sign-in; each person their own data; family invites; pilot testers."],
  useTiers: ["Plans", "Bronze / Silver / Gold / Platinum Family, gating and Settings → My Plan."],
  useOnboarding: ["Onboarding + consent", "18+, Terms/Privacy and the separate choices for new accounts."],
  useSteps: ["Steps from Health Connect", "Settings → Connect my steps in the Android app."],
  showBuyEnergy: ["Buying", "Upgrade and the £5 top-up through Google Play."],
};
export default function GoLiveSwitches() {
  var [admin, setAdmin] = useState(false);
  var [f, setF] = useState(remoteFlags());
  var [msg, setMsg] = useState("");
  useEffect(function() { var u = auth.currentUser; if (u) isProtectedAccount(u.uid).then(setAdmin); }, []);
  if (!admin) return null;
  var set = async function(k, v) {
    setMsg(""); var before = f; var n = Object.assign({}, f); n[k] = v; setF(n);   // shown straight away
    try { await firebase.database().ref("platform/publicFlags/" + k).set(v); setMsg((v ? "✓ On" : "Off") + ": " + INFO[k][0] + ". Everyone gets it the next time they open the app."); }
    catch (e) { setF(before); setMsg("Couldn't change it: " + ((e && e.message) || e) + " (needs the next database rules deployed and your account in platform/admins — GO_LIVE_CHECKLIST)."); }
  };
  return (<div data-testid="go-live-switches" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginBottom: 14 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>🚦 Go-live switches (everyone)</div>
    <div style={{ fontSize: 12, color: "#475569", margin: "4px 0 6px" }}>Turn on <b>in this order</b>, checking each one first (GO_LIVE_CHECKLIST, section E). Turning one off again is the rollback.</div>
    {GO_LIVE_ORDER.map(function(k, i) { return (<label key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: "1px solid #f1f5f9", fontSize: 13, minHeight: 44 }}>
      <input type="checkbox" data-testid={"golive-" + k} checked={f[k] === true} onChange={function(e) { set(k, e.target.checked); }} style={{ width: 20, height: 20, marginTop: 2 }} />
      <span><b>{i + 1}. {INFO[k][0]}</b> <code style={{ fontSize: 11, color: "#475569" }}>{k}</code><br /><span style={{ color: "#475569", fontSize: 12 }}>{INFO[k][1]}</span></span></label>); })}
    {msg && <div role="status" data-testid="golive-msg" style={{ fontSize: 12, marginTop: 6, color: "#0f172a" }}>{msg}</div>}
  </div>);
}
