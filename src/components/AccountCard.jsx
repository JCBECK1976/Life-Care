import { auth } from "../lib/firebase.js";
import { signOut } from "./AuthGate.jsx";

// Settings: who is signed in (email masked) and Sign out (v2.6.0).
export function maskEmail(email) {
  const [name, domain] = String(email || "").split("@");
  if (!domain) return "Signed in";
  return name.slice(0, 2) + "•••@" + domain;
}

export default function AccountCard() {
  const user = auth.currentUser;
  return (
    <div data-testid="account-card" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🔐 Account</div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Signed in with Google as <strong>{maskEmail(user && user.email)}</strong></div>
      <button onClick={signOut} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Sign out</button>
    </div>
  );
}
