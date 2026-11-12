import { useEffect, useState } from "react";
import firebase, { auth, DATA_ROOT } from "../lib/firebase.js";
import LoadingScreen from "./LoadingScreen.jsx";

// v2.6.0: nothing reads or writes the database until a Google account is signed in and has access.
const btn = { marginTop: 16, padding: "12px 20px", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", background: "#1e3a5f", color: "#fff" };
const isDenied = (e) => /permission[_ ]denied/i.test(String((e && (e.code || e.message)) || e));

export function signOut() { return auth.signOut(); }

export default function AuthGate({ children }) {
  const [s, setS] = useState({ phase: "checking" }); // checking | signedOut | ok | denied | error
  const [msg, setMsg] = useState("");

  useEffect(() => {
    auth.getRedirectResult().catch((e) => setMsg("Sign-in didn't work: " + (e.message || e)));
    return auth.onAuthStateChanged(async (user) => {
      if (!user) { setS({ phase: "signedOut" }); return; }
      setS({ phase: "checking" });
      try {
        await firebase.database().ref(DATA_ROOT).limitToFirst(1).once("value"); // access probe
        setS({ phase: "ok", user });
      } catch (e) {
        setS(isDenied(e) ? { phase: "denied", user } : { phase: "error", user, error: String(e.message || e) });
      }
    });
  }, []);

  const signIn = async () => {
    setMsg("");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
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
      <button style={btn} onClick={signIn}>Sign in with Google</button>
      {msg && <p role="alert" style={{ color: "#b91c1c" }}>{msg}</p>}
    </div>
  );
  return (
    <div className="boot" data-testid={s.phase === "denied" ? "access-denied" : "access-error"}>
      {logo}
      <p role="alert" style={{ color: "#b91c1c", fontWeight: 700 }}>
        {s.phase === "denied" ? "This Google account doesn't have access." : "Couldn't reach your data: " + s.error}
      </p>
      {s.phase === "error" && <button style={btn} onClick={() => window.location.reload()}>Try again</button>}
      <button style={{ ...btn, background: "#64748b" }} onClick={signOut}>Sign out</button>
    </div>
  );
}
