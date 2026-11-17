import React, { useState } from "react";
import firebase, { auth } from "../lib/firebase.js";
import { callFunction, APP_ID } from "../lib/platform.js";
import { accountsOn, pendingInvite, clearInvite } from "../lib/accounts.js";
import { loadPlan } from "../lib/myPlan.js";

// v2.25.0 (Step 5, ADR 0012): accepting an invite after signing in.
//  Family (?join=<hid>.<code>): the signed-in email must match the invite (the server checks) → join the Platinum
//  family → choose visibility (default Hidden) and "Household members can log for me" (only when Visible).
//  Pilot (?pilot=<code>): a test user set up by the admin, with the plan the admin chose (default Gold).
var page = { position: "fixed", inset: 0, zIndex: 150, background: "#f1f5f9", overflowY: "auto" };
var box = { maxWidth: 480, margin: "0 auto", padding: 16 };
var cardS = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "4px 12px", marginTop: 10 };
var row = { display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#0f172a", minHeight: 44 };
var btnP = { width: "100%", marginTop: 12, padding: 12, minHeight: 48, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" };
var btn2 = Object.assign({}, btnP, { background: "#fff", color: "#1e3a5f", border: "1px solid #1e3a5f" });

export default function InviteScreen() {
  var [inv, setInv] = useState(pendingInvite());
  var [step, setStep] = useState("ask");          // ask | privacy | done
  var [busy, setBusy] = useState(false);
  var [err, setErr] = useState("");
  var [visible, setVisible] = useState(false);
  var [logForMe, setLogForMe] = useState(false);
  var u = auth.currentUser;
  if (!accountsOn() || !inv || !u) return null;
  var close = function() { clearInvite(); setInv(null); };
  var call = async function(name, data) { return callFunction(name, Object.assign({ appId: APP_ID }, data), await u.getIdToken()); };
  var join = async function() {
    setBusy(true); setErr("");
    try {
      if (inv.kind === "family") { await call("acceptInvite", { hid: inv.hid, code: inv.code }); setStep("privacy"); }
      else { await call("acceptPilotInvite", { code: inv.code }); await loadPlan(); setStep("done"); }
    } catch (e) { setErr(String((e && e.message) || e)); } finally { setBusy(false); }
  };
  var savePrivacy = async function() {
    setBusy(true); setErr("");
    try {
      await firebase.database().ref("apps/" + APP_ID + "/users/" + u.uid + "/privacy").set({ visible: visible, logForMe: visible && logForMe });
      await loadPlan(); setStep("done");
    } catch (e) { setErr(String((e && e.message) || e)); } finally { setBusy(false); }
  };

  return (<div role="dialog" aria-modal="true" aria-labelledby="inv-title" data-testid="invite-screen" style={page}><div style={box}>
    {step === "ask" && <>
      <h2 id="inv-title" style={{ fontSize: 20, margin: "8px 0 6px", color: "#0f172a" }}>{inv.kind === "family" ? "Join a Platinum Family plan" : "You're invited to test Lifecare Companion"}</h2>
      <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
        You're signed in as <b data-testid="invite-email">{u.email}</b>. {inv.kind === "family" ? "The invite must have been sent to this address." : "The invite must have been sent to this address; your test plan is set by the developer, free of charge."}
      </div>
      {inv.kind === "family" && <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55, marginTop: 8 }}>Joining gives you every Platinum feature, sharing the family's Companion Energy. <b>Your data stays private unless you choose to share it</b> (next step). Being in a family never gives the owner access to your data.</div>}
      {err && <div role="alert" data-testid="invite-error" style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 13, color: "#991b1b" }}>{err}{/email/i.test(err) ? " Sign out and sign in with the invited address." : ""}</div>}
      <button type="button" data-testid="invite-join" disabled={busy} style={btnP} onClick={join}>{busy ? "Joining…" : inv.kind === "family" ? "Join the family" : "Accept the invite"}</button>
      <button type="button" data-testid="invite-not-now" style={btn2} onClick={close}>Not now</button>
    </>}
    {step === "privacy" && <>
      <h2 id="inv-title" style={{ fontSize: 20, margin: "8px 0 6px", color: "#0f172a" }}>Sharing with your family</h2>
      <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>You've joined. Choose what the other members can see. You can change this any time.</div>
      <div role="radiogroup" aria-label="Who can see my data" style={cardS}>
        <label style={row}><input type="radio" name="inv-vis" data-testid="vis-hidden" checked={!visible} onChange={function() { setVisible(false); setLogForMe(false); }} style={{ width: 20, height: 20, marginTop: 2 }} /><span><b>Hidden</b> (recommended)<br /><span style={{ fontSize: 12, color: "#475569" }}>Others see your name greyed out with "keeps this private". No data.</span></span></label>
        <label style={Object.assign({}, row, { borderBottom: "none" })}><input type="radio" name="inv-vis" data-testid="vis-visible" checked={visible} onChange={function() { setVisible(true); }} style={{ width: 20, height: 20, marginTop: 2 }} /><span><b>Visible</b><br /><span style={{ fontSize: 12, color: "#475569" }}>Family members can see your data.</span></span></label>
      </div>
      <label style={Object.assign({}, row, { borderBottom: "none", opacity: visible ? 1 : 0.55 })}>
        <input type="checkbox" data-testid="log-for-me" disabled={!visible} checked={visible && logForMe} onChange={function(e) { setLogForMe(e.target.checked); }} style={{ width: 20, height: 20, marginTop: 2 }} />
        <span><b>Household members can log for me</b><br /><span style={{ fontSize: 12, color: "#475569" }}>Lets them add entries for you, e.g. after a joint workout. Only when Visible.</span></span></label>
      {err && <div role="alert" style={{ marginTop: 8, fontSize: 13, color: "#991b1b" }}>{err}</div>}
      <button type="button" data-testid="privacy-save" disabled={busy} style={btnP} onClick={savePrivacy}>Save and continue</button>
    </>}
    {step === "done" && <>
      <h2 id="inv-title" style={{ fontSize: 20, margin: "8px 0 6px", color: "#0f172a" }}>{inv.kind === "family" ? "Welcome to the family" : "You're all set"}</h2>
      <div data-testid="invite-done" style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>{inv.kind === "family" ? (visible ? "Your data is visible to the family" + (logForMe ? ", and they can log for you." : ".") : "Your data is hidden from the family.") : "Your test plan is active. Thank you for helping!"}</div>
      <button type="button" data-testid="invite-continue" style={btnP} onClick={close}>Continue</button>
    </>}
  </div></div>);
}
