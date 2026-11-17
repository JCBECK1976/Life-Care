import React, { useEffect, useState } from "react";
import { auth } from "../lib/firebase.js";
import { callFunction, APP_ID } from "../lib/platform.js";
import { isProtectedAccount } from "../lib/accountGuard.js";
import { accountsOn } from "../lib/accounts.js";
import { TIER_ORDER, TIER_NAMES } from "../constants/tiers.js";

// v2.25.0 (flag useAccounts): the admin invites a pilot test user by email with a plan (default Gold, free, never
// billed). The tester opens the link, signs in with that email and lands in their OWN account (never the shared data).
export default function PilotInviteCard() {
  var [admin, setAdmin] = useState(false);
  var [email, setEmail] = useState("");
  var [tier, setTier] = useState("gold");
  var [msg, setMsg] = useState("");
  var [busy, setBusy] = useState(false);
  useEffect(function() { var u = auth.currentUser; if (u) isProtectedAccount(u.uid).then(setAdmin); }, []);
  if (!accountsOn() || !admin) return null;
  var create = async function() {
    setBusy(true); setMsg("");
    try {
      var r = await callFunction("createPilotInvite", { appId: APP_ID, email: email.trim(), tier: tier }, await auth.currentUser.getIdToken());
      setMsg("✓ Invite for " + email.trim() + " (" + TIER_NAMES[tier] + "). Send them this link: " + location.origin + location.pathname + "?pilot=" + encodeURIComponent(r.code));
      setEmail("");
    } catch (e) { setMsg("Couldn't create the invite: " + ((e && e.message) || e) + (/fetch|network|404|HTTP/i.test(String(e && e.message)) ? " (the server functions aren't deployed yet: GO_LIVE_CHECKLIST)" : "")); }
    setBusy(false);
  };
  return (<div data-testid="pilot-invite" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginBottom: 14 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>🧪 Pilot test users</div>
    <div style={{ fontSize: 12, color: "#475569", margin: "4px 0 8px" }}>Invite a tester by email. They get their own account (empty, never your data) with the plan you choose, free.</div>
    <label htmlFor="pilot-email" style={{ fontSize: 12, fontWeight: 600 }}>Tester's email</label>
    <input id="pilot-email" type="email" value={email} onChange={function(e) { setEmail(e.target.value); }} placeholder="name@example.com" style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 14, borderRadius: 8, border: "1px solid #cbd5e1", marginTop: 4 }} />
    <label htmlFor="pilot-tier" style={{ fontSize: 12, fontWeight: 600, display: "block", marginTop: 8 }}>Plan</label>
    <select id="pilot-tier" value={tier} onChange={function(e) { setTier(e.target.value); }} style={{ display: "block", width: "100%", padding: "8px 10px", minHeight: 44, fontSize: 14, borderRadius: 8, border: "1px solid #cbd5e1", marginTop: 4 }}>
      {TIER_ORDER.map(function(t) { return <option key={t} value={t}>{TIER_NAMES[t]}</option>; })}
    </select>
    <button type="button" data-testid="pilot-create" disabled={busy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())} onClick={create} style={{ marginTop: 10, padding: "10px 14px", minHeight: 44, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Create invite</button>
    {msg && <div role="status" data-testid="pilot-msg" style={{ marginTop: 8, fontSize: 12, wordBreak: "break-all", color: "#0f172a" }}>{msg}</div>}
  </div>);
}
