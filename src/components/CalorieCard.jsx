import React from "react";
import { DEFAULT_DEFICIT_PCT, dayBudget, decideSuggestion, pendingSuggestion, recordAdj } from "../lib/calories.js";

// v2.17.1 calorie line (docs/design/CALORIES.md): Goal · Food · Activity · Left for one date, with
// "How this is calculated", the deficit % and the activity adjustment (R5). Shown on My Eating (day) and Home.
var box = { background: "#fff7ed", borderRadius: 10, padding: 10, border: "1px solid #fed7aa", marginBottom: 10 };
var btn = { padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid #cbd5e1", background: "#fff", color: "#334155" };
var n = function(x) { return Math.round(x).toLocaleString("en-GB"); };
var METHOD = { katch: "Katch-McArdle from your lean mass", mifflin: "estimate (Mifflin-St Jeor from weight, height, age, sex)", average: "estimate (average for your age and sex — add a weigh-in for a better figure)" };

export default function CalorieCard(props) {
  var data = props.data, who = props.who, p = data && data[who];
  var [open, setOpen] = React.useState(false);
  var [edit, setEdit] = React.useState(null);   // "deficit" | "adj"
  var [val, setVal] = React.useState("");
  var [msg, setMsg] = React.useState("");
  if (!p) return null;
  var b = dayBudget(p, props.date, props.foodKcal || 0); var pl = b.plan; var c = b.credit;
  var pending = pendingSuggestion(p);
  var save = async function(mutate, ok) { var nd = JSON.parse(JSON.stringify(data)); if (!nd[who].calorieSettings) nd[who].calorieSettings = {}; mutate(nd[who]); await props.saveData(nd); setMsg(ok); setTimeout(function() { setMsg(""); }, 3000); };
  var actText = c.mode === "total" ? "Activity +" + n(c.credit) + " (from " + n(c.totalBurned) + " kcal burned)" : "Activity +" + n(c.credit) + " (steps: +" + n(c.steps) + " · exercise: +" + n(c.exercise) + ")";
  return (<div data-testid={props.testid || "calorie-card"} style={box}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "#9a3412", marginBottom: 4 }}>🔥 {props.title || "Calories"}</div>
    <div data-testid="calorie-line" style={{ fontSize: 12, color: "#0f172a", lineHeight: 1.6 }}>
      <b>Goal {n(pl.goal)}</b> · Food {n(b.food)} · {actText} · <b data-testid="calorie-left" style={{ color: b.left < 0 ? "#b91c1c" : "#15803d" }}>Left {n(b.left)}</b>
    </div>
    {c.mode !== "total" && <div data-testid="step-allowance" style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>Your first ~{n(pl.stepAllowance)} steps are already in your goal.</div>}
    {pl.floored && <div data-testid="calorie-floor" style={{ fontSize: 10, color: "#9a3412", marginTop: 2 }}>Goal limited to your BMR ({n(pl.bmr)} kcal) — a {pl.deficitPct}% deficit would be {n(pl.goalRaw)}.</div>}
    {pl.estimate && <div style={{ fontSize: 10, color: "#9a3412", marginTop: 2 }}>BMR is an estimate.</div>}
    <button type="button" aria-expanded={open} onClick={function() { setOpen(!open); }} style={Object.assign({}, btn, { marginTop: 6, border: "none", background: "none", padding: 0, color: "#1d4ed8" })}>{open ? "▲" : "▼"} How this is calculated</button>
    {open && (<div data-testid="calorie-how" style={{ fontSize: 10, color: "#334155", lineHeight: 1.6, marginTop: 4 }}>
      <div>BMR {n(pl.bmr)} kcal — {METHOD[pl.method]}{pl.method === "katch" ? " (" + Math.round(pl.bmrInfo.lean.leanKg) + " kg lean, last " + pl.bmrInfo.lean.n + " weigh-ins)" : ""}.</div>
      <div>× 1.15 for daily life = baseline {n(pl.baseline)} kcal.</div>
      <div>− {pl.deficitPct}% deficit = goal {n(pl.goalRaw)}{pl.floored ? " → limited to your BMR, " + n(pl.goal) : ""} kcal.</div>
      <div>Activity is added net of resting burn: {c.mode === "total" ? "total burned " + n(c.totalBurned) + " − baseline " + n(pl.baseline) : "steps above " + n(pl.stepAllowance) + " (stride " + pl.strideM.toFixed(2) + " m, 0.5 kcal per kg per km)" + (c.stepsCount != null ? " — " + n(c.stepsCount) + " steps today" : " — no steps recorded") + " + exercise (MET − 1) × " + Math.round(pl.weightKg) + " kg × hours"}{pl.adjPct !== 100 ? ", at " + pl.adjPct + "%" : ""}.</div>
    </div>)}
    <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #fed7aa", fontSize: 11, color: "#334155", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <span>Deficit: <b data-testid="deficit">{pl.deficitPct}%</b></span>
      <span>Activity adjustment: <b data-testid="adj-pct">{pl.adjPct}%</b></span>
      {!edit && <button type="button" style={btn} onClick={function() { setEdit("deficit"); setVal(String(pl.deficitPct)); }}>Change deficit</button>}
      {!edit && <button type="button" style={btn} onClick={function() { setEdit("adj"); setVal(String(pl.adjPct)); }}>Change adjustment</button>}
      {edit && (<span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
        <input aria-label={edit === "deficit" ? "Deficit %" : "Activity adjustment %"} type="number" value={val} onChange={function(e) { setVal(e.target.value); }} style={{ width: 60, padding: 4, border: "1px solid #cbd5e1", borderRadius: 4 }} />%
        <button type="button" style={btn} onClick={async function() {
          var v = Math.round(parseFloat(val));
          if (edit === "deficit") { if (!(v >= 0 && v <= 40)) { setMsg("Choose 0–40%"); return; } setEdit(null); await save(function(pp) { pp.calorieSettings.deficitPct = v; }, "✓ Deficit set to " + v + "%"); }
          else { if (!(v >= 50 && v <= 150)) { setMsg("Choose 50–150%"); return; } setEdit(null); await save(function(pp) { recordAdj(pp, { kind: "manual", value: v }); }, "✓ Adjustment set to " + v + "%"); }
        }}>Save</button>
        <button type="button" style={btn} onClick={function() { setEdit(null); }}>Cancel</button></span>)}
    </div>
    {pending && (<div data-testid="adj-suggestion" style={{ marginTop: 6, padding: 8, borderRadius: 6, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 11, color: "#1e293b" }}>
      <b>Companion suggests {pending.value}%</b>{pending.reason ? " — " + pending.reason : ""}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button type="button" style={Object.assign({}, btn, { background: "#166534", color: "#fff", border: "none" })} onClick={function() { save(function(pp) { decideSuggestion(pp, "accepted"); }, "✓ Adjustment set to " + pending.value + "%"); }}>Accept</button>
        <button type="button" style={btn} onClick={function() { save(function(pp) { decideSuggestion(pp, "declined"); }, "Kept at " + pl.adjPct + "%"); }}>Decline</button>
      </div>
    </div>)}
    {msg && <div role="status" style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: msg.charAt(0) === "✓" ? "#166534" : "#475569" }}>{msg}</div>}
  </div>);
}
export { DEFAULT_DEFICIT_PCT };
