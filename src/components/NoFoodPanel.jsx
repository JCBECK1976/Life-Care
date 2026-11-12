import React from "react";
import { NO_FOOD_MSG } from "../lib/snap.js";

// v2.14.1: shown when a photo has no food in it. No rating, no nutrition; Confirm disabled; only Re-check (with an
// optional description) and Cancel work.
var grey = { flex: 1, padding: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer" };
export default function NoFoodPanel(props) {
  var _d = React.useState(props.desc || ""); var desc = _d[0]; var setDesc = _d[1];
  return (<div data-testid={props.testid || "no-food"}>
    <div role="alert" style={{ fontSize: 11, fontWeight: 600, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: 8, marginBottom: 8 }}>{NO_FOOD_MSG}</div>
    <input aria-label="Photo description" value={desc} onChange={function(e) { setDesc(e.target.value); }} placeholder="Optional: what is it? e.g. '28g protein bar'" style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, boxSizing: "border-box", marginBottom: 8 }} />
    <div style={{ display: "flex", gap: 6 }}>
      <button disabled style={{ flex: 1, padding: 8, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, opacity: 0.45, cursor: "not-allowed" }}>Confirm</button>
      <button disabled={props.busy} onClick={function() { props.onRecheck(desc); }} style={grey}>{props.busy ? "⏳…" : "Re-check"}</button>
      <button onClick={props.onCancel} style={grey}>Cancel</button>
    </div>
  </div>);
}
