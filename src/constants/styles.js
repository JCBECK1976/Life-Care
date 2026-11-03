export const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff" };

export const labelStyle = { fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" };

export const btnP = (on = true) => ({ width: "100%", padding: 12, background: on ? "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" : "#e2e8f0", color: on ? "#fff" : "#94a3b8", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: on ? "pointer" : "default", letterSpacing: 0.3 });

export const btnS = { padding: "8px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#475569", cursor: "pointer" };

// ═══════════════════════════════════════════════════
// STANDARD BUTTON STYLES v1.374.2
// ═══════════════════════════════════════════════════
// Actions (deep blue gradient, white text)
export const btnAction = { padding: "4px 10px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 };

export const btnActionLg = { padding: "8px 16px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };

// Edits on existing content
export const btnEdit = { padding: "4px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, color: "#94a3b8", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 };

export const btnPortion = { padding: "4px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 10, color: "#2563eb", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 };

export const btnStop = { padding: "4px 10px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 10, color: "#dc2626", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 };

export const btnDelete = { padding: "4px 10px", background: "#fee2e2", color: "#dc2626", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 };

// Muted (grey, inside content cards — matches Activities Log/Progress style)
export const btnMuted = { padding: "4px 8px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, cursor: "pointer", fontWeight: 600, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 2 };

// Close/Clear
export const btnClose = { padding: "4px 10px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 };

export const btnClear = { padding: "4px 10px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 };
