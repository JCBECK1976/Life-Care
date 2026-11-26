import { useEffect, useState } from "react";
import { auth } from "../lib/firebase.js";
import { signOut } from "./AuthGate.jsx";
import { appLockOn, deviceUnlock, LOCK_AFTER, lockAvailable, lockSettings, saveLockSettings, signOutEverywhere } from "../lib/appLock.js";

// Settings: who is signed in (email masked) and Sign out (v2.6.0).
// v2.33.0 (flag useAppLock): Lock the app (fingerprint / face / phone PIN) and Sign out everywhere.
export function maskEmail(email) {
  const [name, domain] = String(email || "").split("@");
  if (!domain) return "Signed in";
  return name.slice(0, 2) + "•••@" + domain;
}
const plain = { width: "100%", minHeight: 44, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f1f5f9", color: "#334155", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const note = { fontSize: 12, color: "#475569", lineHeight: 1.5 };

function LockSettings() {
  const [avail, setAvail] = useState(null);
  const [s, setS] = useState(lockSettings);
  const [msg, setMsg] = useState("");
  useEffect(() => { lockAvailable().then(setAvail); }, []);
  const save = (x) => { saveLockSettings(x); setS(x); };
  const toggle = async () => {
    setMsg("");
    if (s.on) { save({ ...s, on: false }); setMsg("The app lock is off on this phone."); return; }
    if (await deviceUnlock("Turn on the app lock")) { save({ ...s, on: true }); setMsg("✓ The app lock is on for this phone."); }
    else setMsg("Not turned on: the phone didn't confirm it's you.");
  };
  if (!avail) return null;
  const kind = avail.biometry === "face" ? "face" : avail.biometry === "fingerprint" ? "fingerprint" : "phone PIN";
  return (<div data-testid="app-lock-settings" style={{ borderTop: "1px solid #e2e8f0", marginTop: 10, paddingTop: 10 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Lock the app</div>
    {!avail.available ? <div style={note} data-testid="app-lock-unavailable">{avail.reason === "web" ? "The app lock is in the Android and iPhone apps." : "Set up a screen lock (PIN, fingerprint or face) on this phone first, then come back here."}</div> : <>
      <div style={note}>Ask for your {kind} (or your phone PIN) when the app opens and after it has been in the background. This phone only.</div>
      <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, fontSize: 14, cursor: "pointer" }}>
        <input type="checkbox" role="switch" data-testid="app-lock-toggle" checked={s.on} onChange={toggle} style={{ width: 22, height: 22 }} /> Lock the app
      </label>
      {s.on && <label style={{ ...note, display: "flex", alignItems: "center", gap: 8 }}>Lock after
        <select data-testid="app-lock-after" value={s.minutes} onChange={(e) => save({ ...s, minutes: Number(e.target.value) })} style={{ minHeight: 44, fontSize: 14, borderRadius: 8, border: "1px solid #cbd5e1", padding: "4px 8px" }}>
          {LOCK_AFTER.map((m) => <option key={m} value={m}>{m === 0 ? "straight away" : m === 1 ? "1 minute" : m + " minutes"} in the background</option>)}
        </select></label>}
    </>}
    {msg && <div role="status" style={{ ...note, marginTop: 4 }}>{msg}</div>}
  </div>);
}

function SignOutEverywhere() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const go = async () => {
    if (!window.confirm("Sign out of Lifecare Companion on every phone, tablet and computer, including this one? You can sign in again with Google.")) return;
    setBusy(true); setMsg("");
    try { await signOutEverywhere(); } catch (e) { setBusy(false); setMsg("✗ Couldn't sign out everywhere: " + String((e && e.message) || e).slice(0, 100)); }
  };
  return (<div style={{ marginTop: 8 }}>
    <button type="button" data-testid="sign-out-everywhere" disabled={busy} onClick={go} style={plain}>{busy ? "Signing out…" : "Sign out everywhere"}</button>
    <div style={{ ...note, fontSize: 11, marginTop: 4 }}>Use this if a phone is lost or you signed in on someone else's computer.</div>
    {msg && <div role="alert" style={{ ...note, color: "#b91c1c" }}>{msg}</div>}
  </div>);
}

export default function AccountCard() {
  const user = auth.currentUser;
  const lock = appLockOn();
  return (
    <div data-testid="account-card" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🔐 Account</div>
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>Signed in with Google as <strong>{maskEmail(user && user.email)}</strong></div>
      <button onClick={signOut} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Sign out</button>
      {lock && <SignOutEverywhere />}
      {lock && <LockSettings />}
    </div>
  );
}
