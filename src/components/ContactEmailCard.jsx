import React from "react";
import { btnAction, btnOpen, inputStyle } from "../constants/styles.js";
import { loadContactEmail, saveContactEmail, validEmail } from "../lib/contact.js";

// v2.14.1 (admin only): where 💬 Send Feedback emails go, also shown in the Privacy Policy. Stored in the database, not in
// the source. Empty = no email; feedback is still saved to the 📝 Tracker.
// v2.14.3: shows the saved address with Edit; Save closes the edit form and shows a brief "✓ Saved".
export default function ContactEmailCard() {
  var _s = React.useState(""); var saved = _s[0]; var setSaved = _s[1];
  var _v = React.useState(null); var draft = _v[0]; var setDraft = _v[1];   // null = not editing
  var _m = React.useState(""); var msg = _m[0]; var setMsg = _m[1];
  React.useEffect(function() { loadContactEmail().then(setSaved).catch(function() {}); }, [setSaved]);
  React.useEffect(function() { if (msg.charAt(0) !== "✓") return undefined; var t = setTimeout(function() { setMsg(""); }, 3000); return function() { clearTimeout(t); }; }, [msg]);
  var save = async function() {
    var v = draft.trim();
    if (v && !validEmail(v)) { setMsg("⚠️ That doesn't look like an email address"); return; }
    await saveContactEmail(v); setSaved(v); setDraft(null);
    setMsg(v ? "✓ Saved" : "✓ Saved: no email, feedback goes to the Tracker only");
  };
  return (<div data-testid="contact-email" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>📧 Feedback email</div>
    <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5, marginBottom: 8 }}>Feedback is always saved to the 📝 Tracker. If an address is set here, 💬 Send Feedback also opens the person's email app with a message to it filled in (they press Send there). Also shown as the contact in the Privacy Policy.</div>
    {draft === null ? (<div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <div data-testid="contact-email-value" style={{ flex: 1, minWidth: 0, fontSize: 12, color: saved ? "#0f172a" : "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{saved || "Not set (Tracker only)"}</div>
      <button onClick={function() { setDraft(saved); setMsg(""); }} style={btnOpen}>Edit</button>
    </div>) : (<div style={{ display: "flex", gap: 6 }}>
      <input aria-label="Feedback email" type="email" value={draft} onChange={function(e) { setDraft(e.target.value); setMsg(""); }} placeholder="name@example.com" style={Object.assign({}, inputStyle, { flex: 1, minWidth: 0 })} />
      <button onClick={save} style={Object.assign({}, btnAction, { padding: "8px 12px", fontSize: 12 })}>Save</button>
      <button onClick={function() { setDraft(null); setMsg(""); }} style={Object.assign({}, btnOpen, { height: "auto" })}>Cancel</button>
    </div>)}
    {msg && <div role="status" style={{ fontSize: 11, fontWeight: 600, marginTop: 6, color: msg.charAt(0) === "✓" ? "#166534" : "#991b1b" }}>{msg}</div>}
  </div>);
}
