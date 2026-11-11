import React from "react";
import { handleApiError } from "../lib/api.js";
import { parseReading, readingPrompt } from "../lib/measureReading.js";

// v2.13.0 F10: the camera button on a body-measurement Log form works like 📷 Snap.
// Optional description first → take a photo (tape measure, scale screen…) → the AI reads the value → result panel with
// the description editable + Confirm / Re-check (deep dive) / Cancel. NOTHING is saved here: Confirm only fills the
// Log form's value (the person still presses Save). The photo is kept in memory for a Re-check and never stored.
var btn = { flex: 1, minWidth: 0, height: 38, padding: "0 4px", whiteSpace: "nowrap", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer", boxSizing: "border-box" };
var blue = Object.assign({}, btn, { background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none" });
var grey = Object.assign({}, btn, { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" });

export default function MeasureSnap(props) {
  var _s = React.useState(null); var st = _s[0]; var setSt = _s[1];          // null | { stage: "pre"|"busy"|"result", desc, result, first, msg }
  var fileRef = React.useRef(null);
  var unit = props.unit || "cm";

  var analyse = async function(file, desc, deep) {
    fileRef.current = file;
    setSt({ stage: "busy", desc: desc, first: deep && st ? st.result : null });
    try {
      var b64 = await new Promise(function(res, rej) { var r = new FileReader(); r.onload = function() { res(String(r.result).split(",")[1]); }; r.onerror = function() { rej(new Error("Couldn't read the photo")); }; r.readAsDataURL(file); });
      var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, temperature: 0, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: file.type || "image/jpeg", data: b64 } }, { type: "text", text: readingPrompt({ label: props.label, unit: unit, desc: desc, previous: props.previous, deep: deep }) }] }] }) });
      var result = await resp.json(); var apiErr = handleApiError(result); if (apiErr) throw new Error(apiErr);
      var txt = ""; (result.content || []).forEach(function(c) { if (c.text) txt += c.text; });
      var r = parseReading(txt); r._deep = !!deep;
      setSt(function(prev) { return { stage: "result", desc: desc, result: r, first: prev && prev.first }; });
    } catch (e) { setSt({ stage: "pre", desc: desc, msg: "⚠️ " + (window.isEnergyEmpty && window.isEnergyEmpty(e) ? window.energyEmptyMsg : String(e.message || e).substring(0, 120)) }); }
  };
  var cancel = function() { fileRef.current = null; setSt(null); };

  if (!st) return (<button type="button" data-testid="meas-snap" aria-label="Snap a photo of the measurement" onClick={function() { setSt({ stage: "pre", desc: "" }); }} style={{ padding: "4px 8px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", color: "#1e3a5f", alignSelf: "flex-end", whiteSpace: "nowrap" }}>📷 Snap</button>);

  var setDesc = function(v) { setSt(Object.assign({}, st, { desc: v })); };
  var descInput = <input aria-label="Measurement photo description" value={st.desc || ""} onChange={function(e) { setDesc(e.target.value); }} placeholder="Optional, e.g. 'tape at nipple level', 'reading in inches'" style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 11, marginBottom: 6 }} />;
  return (<div data-testid="meas-snap-panel" style={{ flexBasis: "100%", marginTop: 8, padding: 10, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8 }}>
    {st.stage === "busy" && <div style={{ fontSize: 11, color: "#1e3a5f", fontWeight: 600 }}>⏳ Reading your photo…</div>}
    {st.stage === "pre" && (<div data-testid="meas-snap-pre">
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>📷 Snap the {props.label.toLowerCase()} measurement</div>
      {descInput}
      {st.msg && <div role="alert" style={{ fontSize: 11, color: "#991b1b", fontWeight: 600, marginBottom: 6 }}>{st.msg}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        <label style={Object.assign({}, blue, { display: "inline-flex", alignItems: "center", justifyContent: "center" })}>Photo<input type="file" accept="image/*" capture="environment" data-testid="meas-snap-file" onChange={function(e) { var f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) analyse(f, st.desc, false); }} style={{ display: "none" }} /></label>
        <button type="button" onClick={cancel} style={grey}>Cancel</button>
      </div>
    </div>)}
    {st.stage === "result" && (<div data-testid="meas-snap-result">
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{st.result._deep ? "🔎 Re-check deep dive" : "📷 " + props.label}</div>
      <div data-testid="meas-snap-value" style={{ fontSize: 16, fontWeight: 800, color: st.result.value != null ? "#0f172a" : "#991b1b", marginBottom: 2 }}>{st.result.value != null ? st.result.value + " " + unit : "Couldn't read a value"}</div>
      {st.result.reading && <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{st.result.reading}{st.result.confidence ? " (" + st.result.confidence + " confidence)" : ""}</div>}
      {st.result._deep && st.first && st.first.value != null && <div data-testid="meas-snap-compare" style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>First check: {st.first.value} {unit}{st.first.value === st.result.value ? " (same)" : ""}</div>}
      {descInput}
      <div data-testid="meas-snap-actions" style={{ display: "flex", gap: 6 }}>
        <button type="button" disabled={st.result.value == null} onClick={function() { props.onConfirm(st.result.value); cancel(); }} style={Object.assign({}, blue, { opacity: st.result.value == null ? 0.5 : 1 })}>Confirm</button>
        <button type="button" onClick={function() { if (fileRef.current) analyse(fileRef.current, st.desc, true); }} style={grey}>Re-check</button>
        <button type="button" onClick={cancel} style={grey}>Cancel</button>
      </div>
    </div>)}
  </div>);
}
