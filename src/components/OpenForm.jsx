import React from "react";
import { scrollOnMount } from "../lib/scrollIntoView.js";

// v2.8.0 "Open" pattern (F1 + F5): one form shell for every saved thing a user opens — a Progress week, a food list
// item, a meal selection. It always opens read-only; Edit makes it editable (Save / Cancel); the one destructive action
// sits inside the form, never in the list row.
// v2.13.0 button standard (JC, 11 Nov): Edit = deep blue · Remove = deep orange (take out of a week/meal/history)
// · Delete = red (permanently delete a list item or a measurement type) · Close/Cancel = grey. Short single-word
// labels; equal-width buttons that fit at 360px. Pass dangerKind="remove" or "delete" (default "delete").
var btn = { flex: 1, minWidth: 0, height: 38, padding: "0 6px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap", boxSizing: "border-box" };
var styles = {
  primary: Object.assign({}, btn, { background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none" }),
  delete: Object.assign({}, btn, { background: "#dc2626", color: "#fff", border: "1px solid #dc2626" }),
  remove: Object.assign({}, btn, { background: "#c2410c", color: "#fff", border: "1px solid #c2410c" }),
  grey: Object.assign({}, btn, { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }),
};

export default function OpenForm(props) {
  var editing = !!props.editing;
  return (<div ref={scrollOnMount} data-testid={props.testid || "open-form"} role="group" aria-label={props.title} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, margin: "6px 0 10px", boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", flex: 1, minWidth: 0 }}>{props.title}</div>
      <span data-testid="open-form-mode" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: editing ? "#1d4ed8" : "#475569", background: editing ? "#dbeafe" : "#f1f5f9", borderRadius: 4, padding: "2px 6px" }}>{editing ? "Editing" : "Viewing"}</span>
    </div>
    {props.subtitle && <div style={{ fontSize: 10, color: "#475569", marginBottom: 8 }}>{props.subtitle}</div>}
    {props.children}
    {props.message && <div data-testid="open-form-msg" role="status" style={{ marginTop: 8, padding: 8, borderRadius: 6, fontSize: 11, fontWeight: 600, background: props.message.charAt(0) === "✓" ? "#dcfce7" : props.message.charAt(0) === "⏳" ? "#e0f2fe" : "#fee2e2", color: props.message.charAt(0) === "✓" ? "#166534" : props.message.charAt(0) === "⏳" ? "#0c4a6e" : "#991b1b" }}>{props.message}</div>}
    {!props.hideActions && <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
      {!editing && props.onEdit && <button onClick={props.onEdit} style={styles.primary}>Edit</button>}
      {!editing && props.onDanger && <button data-kind={props.dangerKind === "remove" ? "remove" : "delete"} onClick={props.onDanger} style={props.dangerKind === "remove" ? styles.remove : styles.delete}>{props.dangerLabel || (props.dangerKind === "remove" ? "Remove" : "Delete")}</button>}
      {!editing && <button onClick={props.onClose} style={styles.grey}>Close</button>}
      {editing && <button onClick={props.onSave} disabled={props.busy} style={Object.assign({}, styles.primary, { opacity: props.busy ? 0.6 : 1 })}>{props.busy ? "Saving…" : (props.saveLabel || "Save")}</button>}
      {editing && <button onClick={props.onCancelEdit} disabled={props.busy} style={styles.grey}>Cancel</button>}
    </div>}
  </div>);
}

// Read-only / editable field row used inside OpenForm
export function Field(props) {
  return (<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 11 }}>
    <div style={{ width: 92, flexShrink: 0, fontSize: 10, fontWeight: 600, color: "#475569" }}>{props.label}</div>
    <div data-testid={props.testid} style={{ flex: 1, minWidth: 0, color: "#0f172a" }}>{props.children}</div>
  </div>);
}

export var inputStyle = { width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 };
