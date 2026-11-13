import React from "react";
import { calcTarget, decideSuggestion, pendingSuggestion, recordAdj, settingsOf } from "../lib/calories.js";

// v2.16.2 R6 + R5: the calorie target from measured burn, shown next to the current targets.
// Labelled "calculated (not active)" until the admin switches it on for this person (Settings, default OFF).
// The person can change the activity adjustment % (R5) and accept/decline the Companion's suggestion.
var box = { background: "#fff7ed", borderRadius: 10, padding: 12, border: "1px solid #fed7aa", marginBottom: 10 };
var btn = { padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid #cbd5e1", background: "#fff", color: "#334155" };

export default function CalorieCard(props) {
  var data = props.data, who = props.who, p = data && data[who];
  var [editing, setEditing] = React.useState(false);
  var [val, setVal] = React.useState("");
  var [msg, setMsg] = React.useState("");
  if (!p) return null;
  var s = settingsOf(p);
  var c = calcTarget(p, new Date());
  var pending = pendingSuggestion(p);
  var save = async function(mutate, okMsg) {
    var nd = JSON.parse(JSON.stringify(data)); mutate(nd[who]); await props.saveData(nd);
    setMsg(okMsg); setTimeout(function() { setMsg(""); }, 3000);
  };
  return (<div data-testid="calorie-card" style={box}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#9a3412", flex: 1 }}>🔥 Calorie target from measured burn</div>
      <span data-testid="calorie-status" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", padding: "2px 6px", borderRadius: 4, background: s.r6Active ? "#dcfce7" : "#f1f5f9", color: s.r6Active ? "#166534" : "#475569" }}>{s.r6Active ? "Active" : "Calculated (not active)"}</span>
    </div>
    {!c ? <div style={{ fontSize: 11, color: "#475569" }}>Needs at least 3 weigh-ins with body fat % to calculate.</div> : (<div>
      <div data-testid="calorie-target" style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{c.target} kcal/day{c.estimate ? <span style={{ fontSize: 10, fontWeight: 600, color: "#9a3412" }}> · estimate</span> : null}</div>
      <div data-testid="calorie-label" style={{ fontSize: 11, color: "#334155", lineHeight: 1.5, marginTop: 2 }}>{c.label}{!c.estimate ? " · −" + c.deficit + " deficit" : ""}</div>
      {c.estimate && <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>No Google Health calories for this week yet, so this uses BMR × 1.2.</div>}
      <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>Lean mass {Math.round(c.lean.leanKg)} kg from your last {c.lean.n} weigh-ins · BMR {c.bmr} kcal (Katch-McArdle).</div>
    </div>)}
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #fed7aa", fontSize: 11, color: "#334155" }}>
      <b>Activity adjustment:</b> <span data-testid="adj-pct">{s.adjPct}%</span> of the activity credit.{" "}
      {!editing ? <button type="button" style={btn} onClick={function() { setVal(String(s.adjPct)); setEditing(true); }}>Change</button> : (<span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
        <input aria-label="Activity adjustment %" type="number" min="50" max="150" value={val} onChange={function(e) { setVal(e.target.value); }} style={{ width: 64, padding: 4, border: "1px solid #cbd5e1", borderRadius: 4 }} />%
        <button type="button" style={btn} onClick={async function() { var v = Math.round(parseFloat(val)); if (!(v >= 50 && v <= 150)) { setMsg("Choose 50–150%"); return; } setEditing(false); await save(function(pp) { recordAdj(pp, { kind: "manual", value: v }); }, "✓ Adjustment set to " + v + "%"); }}>Save</button>
        <button type="button" style={btn} onClick={function() { setEditing(false); }}>Cancel</button></span>)}
    </div>
    {pending && (<div data-testid="adj-suggestion" style={{ marginTop: 8, padding: 8, borderRadius: 6, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 11, color: "#1e293b" }}>
      <b>Companion suggests {pending.value}%</b>{pending.reason ? " — " + pending.reason : ""}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button type="button" style={Object.assign({}, btn, { background: "#166534", color: "#fff", border: "none" })} onClick={function() { save(function(pp) { decideSuggestion(pp, "accepted"); }, "✓ Adjustment set to " + pending.value + "%"); }}>Accept</button>
        <button type="button" style={btn} onClick={function() { save(function(pp) { decideSuggestion(pp, "declined"); }, "Kept at " + s.adjPct + "%"); }}>Decline</button>
      </div>
    </div>)}
    {msg && <div role="status" style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: msg.charAt(0) === "✓" ? "#166534" : "#475569" }}>{msg}</div>}
  </div>);
}
