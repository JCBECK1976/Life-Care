import { useEffect, useState } from "react";
import firebase, { auth, DATA_ROOT } from "../lib/firebase.js";
import LoadingScreen from "./LoadingScreen.jsx";
import { isNative, nativeGoogleSignIn, nativeSignOut } from "../lib/native.js";
import { accountsOn, prepareAccount, sendEmailLink, completeEmailLink, appleSignIn } from "../lib/accounts.js";

// v2.6.0: nothing reads or writes the database until a Google account is signed in and has access.
const btn = { marginTop: 16, padding: "12px 20px", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", background: "#1e3a5f", color: "#fff" };
const isDenied = (e) => /permission[_ ]denied/i.test(String((e && (e.code || e.message)) || e));

export function signOut() { nativeSignOut(); return auth.signOut(); }

export default function AuthGate({ children }) {
  const [s, setS] = useState({ phase: "checking" }); // checking | signedOut | ok | denied | error
  const [msg, setMsg] = useState("");

  useEffect(() => {
    auth.getRedirectResult().catch((e) => setMsg("Sign-in didn't work: " + (e.message || e)));
    /* v2.25.0: coming back from an email sign-in link */
    if (accountsOn()) completeEmailLink(async () => window.prompt("Which email address did you use?")).catch((e) => setMsg("That sign-in link didn't work: " + (e.message || e)));
    return auth.onAuthStateChanged(async (user) => {
      if (!user) { setS({ phase: "signedOut" }); return; }
      setS({ phase: "checking" });
      var acc = { individual: false };
      try { acc = await prepareAccount(user); } catch (e) { /* stays on the shared data rules */ }
      try {
        await firebase.database().ref(DATA_ROOT).limitToFirst(1).once("value"); // access probe
        setS({ phase: "ok", user, individual: acc.individual });
      } catch (e) {
        setS(isDenied(e) ? { phase: "denied", user, individual: acc.individual } : { phase: "error", user, error: String(e.message || e) });
      }
    });
  }, []);

  const signIn = async () => {
    setMsg("");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      if (isNative()) { await nativeGoogleSignIn(firebase, auth); return; }   // v2.21.0: Android app — native Google account picker
      await auth.signInWithPopup(provider);
    } catch (e) {
      if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/web-storage-unsupported"].includes(e.code)) {
        await auth.signInWithRedirect(provider); // fallback for installed apps that block popups
      } else if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
        setMsg("Sign-in didn't work: " + (e.message || e));
      }
    }
  };

  if (s.phase === "ok") return children;
  if (s.phase === "checking") return <LoadingScreen />;
  const logo = <img src={import.meta.env.BASE_URL + "brand/app-logo-640.webp"} alt="Lifecare Companion" width="220" height="220" />;
  if (s.phase === "signedOut") return (
    <div className="boot" data-testid="sign-in">
      {logo}
      <p>Sign in to use Lifecare Companion™</p>
      <button style={btn} onClick={signIn}>{accountsOn() ? "Continue with Google" : "Sign in with Google"}</button>
      {accountsOn() && <MoreSignIn setMsg={setMsg} />}
      {msg && <p role="alert" style={{ color: "#b91c1c" }}>{msg}</p>}
    </div>
  );
  return (
    <div className="boot" data-testid={s.phase === "denied" ? "access-denied" : "access-error"}>
      {logo}
      <p role="alert" style={{ color: "#b91c1c", fontWeight: 700 }}>
        {s.phase === "denied" ? (s.individual ? "Your own account is ready, but personal accounts aren't switched on yet. Please try again later." : "This Google account doesn't have access.") : "Couldn't reach your data: " + s.error}
      </p>
      {s.phase === "error" && <button style={btn} onClick={() => window.location.reload()}>Try again</button>}
      <button style={{ ...btn, background: "#64748b" }} onClick={signOut}>Sign out</button>
    </div>
  );
}

/* v2.25.0 (flag useAccounts): Email link and Apple, plus the desktop hint. */
function MoreSignIn({ setMsg }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const alt = { ...btn, background: "#fff", color: "#1e3a5f", border: "1px solid #1e3a5f", marginTop: 10 };
  if (sent) return <p data-testid="email-link-sent" role="status" style={{ maxWidth: 320 }}>Check your inbox: we sent a sign-in link to <b>{email}</b>. Open it on this device.</p>;
  return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, maxWidth: 320, width: "100%" }}>
    <button style={alt} data-testid="apple-sign-in" onClick={() => appleSignIn().catch((e) => { if (!/cancel|closed/i.test(String(e.code || e.message))) setMsg("Apple sign-in didn't work: " + (e.message || e)); })}> Continue with Apple</button>
    <form onSubmit={async (e) => { e.preventDefault(); setMsg(""); try { await sendEmailLink(email.trim()); setSent(true); } catch (er) { setMsg("Couldn't send the link: " + (er.message || er)); } }} style={{ display: "flex", gap: 6, width: "100%", marginTop: 10 }}>
      <input type="email" required aria-label="Your email address" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, minWidth: 0, padding: "10px 12px", fontSize: 15, borderRadius: 10, border: "1px solid #cbd5e1" }} />
      <button type="submit" data-testid="email-link-send" style={{ ...btn, marginTop: 0, padding: "10px 14px" }}>Email me a link</button>
    </form>
    <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>On a computer? If Google asks for your phone, choose <b>Try another way</b>.</p>
  </div>);
}
