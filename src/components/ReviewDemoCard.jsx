import React, { useEffect, useState } from "react";
import { auth } from "../lib/firebase.js";
import { callFunction, APP_ID } from "../lib/platform.js";
import { isProtectedAccount } from "../lib/accountGuard.js";
import { accountsOn } from "../lib/accounts.js";

// v2.31.2 (Architect, 18 Nov): admin — the store-review demo account. Its own account, made-up data (one synthetic
// person), Gold, no family. The server refuses the joint account, admins, family members and any account with its own
// data. Use the email of a Google account made only for store review; do this BEFORE that account first signs in.
export default function ReviewDemoCard() {
  var [admin, setAdmin] = useState(false);
  var [email, setEmail] = useState("");
  var [msg, setMsg] = useState("");
  var [busy, setBusy] = useState(false);
  useEffect(function() { var u = auth.currentUser; if (u) isProtectedAccount(u.uid).then(setAdmin); }, []);
  if (!accountsOn() || !admin) return null;
  var ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  var create = async function() {
    if (busy) return; setBusy(true); setMsg("");
    try {
      var r = await callFunction("createReviewDemo", { appId: APP_ID, email: email.trim() }, await auth.currentUser.getIdToken());
      setMsg("✓ Review demo account " + (r.created ? "created" : "refreshed") + " for " + r.email + " — made-up data, Gold, no family. Put this email in the store's app-access notes (the password lives in the store console only).");
    } catch (e) { setMsg("Couldn't create it: " + ((e && e.message) || e) + (/fetch|network|404|HTTP/i.test(String(e && e.message)) ? " (the server functions aren't deployed yet: GO_LIVE_CHECKLIST)" : "")); }
    setBusy(false);
  };
  return (<div data-testid="review-demo" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginBottom: 14 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>🧾 Store review demo account</div>
    <div style={{ fontSize: 12, color: "#475569", margin: "4px 0 8px" }}>For Google Play and App Store reviewers: its own account with made-up data (never yours), Gold, no family. Use a Google account made only for review, before it first signs in.</div>
    <label htmlFor="demo-email" style={{ fontSize: 12, fontWeight: 600 }}>Review account's email</label>
    <input id="demo-email" type="email" value={email} onChange={function(e) { setEmail(e.target.value); }} placeholder="review account email" style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "8px 10px", minHeight: 44, fontSize: 14, borderRadius: 8, border: "1px solid #cbd5e1", marginTop: 4 }} />
    <button type="button" data-testid="demo-create" disabled={busy || !ok} onClick={create} style={{ marginTop: 10, padding: "10px 14px", minHeight: 44, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: busy || !ok ? "default" : "pointer", opacity: busy || !ok ? 0.6 : 1 }}>{busy ? "Creating…" : "Create review demo account"}</button>
    {msg && <div role="status" data-testid="demo-msg" style={{ marginTop: 8, fontSize: 12, wordBreak: "break-word", color: "#0f172a" }}>{msg}</div>}
  </div>);
}
