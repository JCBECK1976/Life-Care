import React, { useState } from "react";
import { BottomSheet } from "./BottomSheet.jsx";
import WeightInput from "./WeightInput.jsx";
import { readings } from "../lib/weight.js";

// v2.32.3: "⚠ Check this weigh-in" → choose which weight the old number meant (e.g. 14.11 = 14st 1.1lb or 14st 11.0lb),
// or type it; saved as kg + the legacy string (ADR 0019), so it is never ambiguous again.
export default function WeightFix({ entry, unit, onUnit, onSave, onClose }) {
  var opts = readings(entry);
  var [kg, setKg] = useState(null);
  var [busy, setBusy] = useState(false);
  return (<BottomSheet open={true} title={"Check week " + entry.wk + "'s weigh-in"} onClose={onClose} testId="weight-fix">
    <div style={{ fontSize: 13, color: "#334155", padding: "0 4px 8px" }}>The stored number <b>{String(entry.v)}</b> could mean either of these. Which did you weigh?</div>
    <div role="radiogroup" aria-label="Which weight" style={{ padding: "0 4px" }}>
      {opts.map(function(o, i) { var on = kg === o.kg; return (<label key={i} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "6px 10px", marginBottom: 6, borderRadius: 10, border: on ? "2px solid #1e3a5f" : "1px solid #cbd5e1", background: on ? "#eff6ff" : "#fff", fontSize: 15, cursor: "pointer" }}>
        <input type="radio" name="wfix" data-testid={"weight-fix-opt-" + i} checked={on} onChange={function() { setKg(o.kg); }} style={{ width: 20, height: 20 }} /> <b>{o.label}</b> <span style={{ color: "#475569", fontSize: 12 }}>({(Math.round(o.kg * 10) / 10).toFixed(1)} kg)</span></label>); })}
    </div>
    <div style={{ padding: "6px 4px" }}>
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>Or type it:</div>
      <WeightInput id="wfix" label="Weight" kg={kg} unit={unit} onUnit={onUnit} onChange={function(k) { setKg(k); }} />
    </div>
    <button type="button" data-testid="weight-fix-save" disabled={!kg || busy} onClick={async function() { setBusy(true); try { await onSave(kg); } finally { setBusy(false); } }}
      style={{ width: "100%", minHeight: 48, marginTop: 8, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", fontWeight: 700, fontSize: 15, opacity: kg ? 1 : 0.5, cursor: kg ? "pointer" : "default" }}>Save this weigh-in</button>
  </BottomSheet>);
}
