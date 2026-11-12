import React from "react";
import { btnAction, inputStyle } from "../constants/styles.js";
import { loadContactEmail, saveContactEmail, validEmail } from "../lib/contact.js";

// v2.14.1 (admin only): where 💬 Send Feedback emails go, also shown in the Privacy Policy. Stored in the database, not in
// the source. Empty = no email; feedback is still saved to the 📝 Tracker.
export default function ContactEmailCard() {
  var _v = React.useState(""); var val = _v[0]; var setVal = _v[1];
  var _m = React.useState(""); var msg = _m[0]; var setMsg = _m[1];
  React.useEffect(function() { loadContactEmail().then(setVal).catch(function() {}); }, [setVal]);
  var save = async function() {
    var v = val.trim();
    if (v && !validEmail(v)) { setMsg("⚠️ That doesn't look like an email address"); return; }
    await saveContactEmail(v); setMsg(v ? "✓ Saved: feedback emails go to this address" : "✓ Cleared: feedback goes to the Tracker only");
  };
  return (<div data-testid="contact-email" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>📧 Feedback email</div>
    <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.5, marginBottom: 8 }}>Where 💬 Send Feedback emails go; also shown as the contact in the Privacy Policy. Leave empty for no email: feedback is still saved to the 📝 Tracker.</div>
    <div style={{ display: "flex", gap: 6 }}>
      <input aria-label="Feedback email" type="email" value={val} onChange={function(e) { setVal(e.target.value); setMsg(""); }} placeholder="name@example.com" style={Object.assign({}, inputStyle, { flex: 1 })} />
      <button onClick={save} style={Object.assign({}, btnAction, { padding: "8px 12px", fontSize: 12 })}>Save</button>
    </div>
    {msg && <div role="status" style={{ fontSize: 11, fontWeight: 600, marginTop: 6, color: msg.charAt(0) === "✓" ? "#166534" : "#991b1b" }}>{msg}</div>}
  </div>);
}
