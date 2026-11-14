export const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff" };

export const labelStyle = { fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" };

export const btnP = (on = true) => ({ width: "100%", padding: 12, background: on ? "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" : "#e2e8f0", color: on ? "#fff" : "#475569", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: on ? "pointer" : "default", letterSpacing: 0.3 });

export const btnS = { padding: "8px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#475569", cursor: "pointer" };

// ═══════════════════════════════════════════════════
// STANDARD BUTTON STYLES (app version: see constants/version.js)
// ═══════════════════════════════════════════════════
// Actions (deep blue gradient, white text)
export const btnAction = { padding: "4px 10px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 };

export const btnActionLg = { padding: "8px 16px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };

// Edits on existing content
export const btnEdit = { padding: "4px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, color: "#475569", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 };

// v2.13.3 shared OUTLINED buttons (JC): one shape for Open, 📷 Snap, 👁 Progress and 📋 Log — same border weight,
// radius, padding and text weight; each in its own colour family (outline + text). An open panel's button stays filled.
var outline = function(text, border, bg) { return { padding: "4px 10px", background: bg, border: "1px solid " + border, borderRadius: 6, fontSize: 10, color: text, cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3, flexShrink: 0, whiteSpace: "nowrap", boxSizing: "border-box" }; };
export const btnOpen = outline("#2563eb", "#93c5fd", "#eff6ff");          // blue
export const btnSnap = btnOpen;                                              // 📷 Snap = exactly the Open style
export const btnProgress = outline("#6d28d9", "#c4b5fd", "#f5f3ff");      // violet
export const btnLog = outline("#15803d", "#86efac", "#f0fdf4");           // green
export const btnFilledOn = Object.assign({}, btnOpen, { background: "#1e3a5f", border: "1px solid #1e3a5f", color: "#fff" });   // open state ("✕ Progress")
export const btnPortion = { padding: "4px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 10, color: "#1d4ed8", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 };

export const btnStop = { padding: "4px 10px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 10, color: "#b91c1c", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 };

export const btnDelete = { padding: "4px 10px", background: "#fee2e2", color: "#b91c1c", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 };

// Muted (grey, inside content cards — matches Activities Log/Progress style)
export const btnMuted = { padding: "4px 8px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, cursor: "pointer", fontWeight: 600, color: "#475569", display: "inline-flex", alignItems: "center", gap: 2 };

// Close/Clear
export const btnClose = { padding: "4px 10px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 };

export const btnClear = { padding: "4px 10px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 };
