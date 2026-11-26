import { useEffect, useRef, useState } from "react";
import { appLockOn, deviceUnlock, lockSettings, shouldLock, watchSignOutEverywhere } from "../lib/appLock.js";
import { signOut } from "./AuthGate.jsx";

// v2.33.0: the app lock screen. The app stays underneath (nothing you were typing is lost) but is hidden and can't be
// reached (inert) until the phone's fingerprint / face / PIN prompt is passed. Also watches for "Sign out everywhere".
const btn = { marginTop: 16, padding: "12px 20px", minHeight: 48, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", background: "#1e3a5f", color: "#fff" };

export default function AppLockGate({ user, children }) {
  const on = appLockOn();
  const [locked, setLocked] = useState(() => on && lockSettings().on);   // locked when the app opens
  const [msg, setMsg] = useState("");
  const hiddenAt = useRef(null);
  const asking = useRef(false);

  useEffect(() => watchSignOutEverywhere(user), [user]);

  useEffect(() => {
    if (!on) return undefined;
    const away = () => { if (hiddenAt.current == null) hiddenAt.current = Date.now(); };
    const back = () => { if (shouldLock(lockSettings(), hiddenAt.current, Date.now())) setLocked(true); hiddenAt.current = null; };
    const vis = () => { if (document.visibilityState === "hidden") away(); else back(); };
    document.addEventListener("visibilitychange", vis);
    document.addEventListener("pause", away);     // Capacitor: the app went to the background
    document.addEventListener("resume", back);
    return () => { document.removeEventListener("visibilitychange", vis); document.removeEventListener("pause", away); document.removeEventListener("resume", back); };
  }, [on]);

  const unlock = async () => {
    if (asking.current) return; asking.current = true; setMsg("");
    try { if (await deviceUnlock("Unlock Lifecare Companion")) setLocked(false); else setMsg("Not unlocked. Try again, or sign out."); }
    finally { asking.current = false; }
  };
  useEffect(() => { if (locked) unlock(); }, [locked]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (<>
    <div inert={locked ? "" : undefined} aria-hidden={locked || undefined} style={locked ? { visibility: "hidden" } : undefined}>{children}</div>
    {locked && <div className="boot" role="dialog" aria-modal="true" aria-labelledby="lock-title" data-testid="app-lock" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#f8fafc" }}>
      <img src={import.meta.env.BASE_URL + "brand/app-logo-640.webp"} alt="" width="160" height="160" />
      <h1 id="lock-title" style={{ fontSize: 20, margin: "12px 0 4px" }}>Lifecare Companion is locked</h1>
      <p style={{ margin: 0, color: "#334155", maxWidth: 320, textAlign: "center" }}>Use your fingerprint, face or phone PIN to open it.</p>
      <button type="button" style={btn} data-testid="app-unlock" onClick={unlock}>🔓 Unlock</button>
      {msg && <p role="alert" style={{ color: "#b91c1c" }}>{msg}</p>}
      <button type="button" style={{ ...btn, background: "#fff", color: "#1e3a5f", border: "1px solid #1e3a5f" }} onClick={signOut}>Sign out</button>
    </div>}
  </>);
}
