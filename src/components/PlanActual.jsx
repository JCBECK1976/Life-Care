import React from "react";
import { dayTable, weekToDate, aimText, goalSuggestion, ACTIVITY } from "../lib/goals.js";
import { weekDates, isoDay, decideSuggestion, pendingSuggestion, recordAdj } from "../lib/calories.js";

// v2.18.0 the Planned | Actual table (docs/design/CALORIES.md §7): Home "Today", each My Eating day, and the week view.
export var FOOTNOTE = "Actual includes eating selections stored in the day which need to be kept up to date, plus any exercises logged when completed";
var n = function(x) { return Math.round(x).toLocaleString("en-GB"); };
var signed = function(x) { return (x > 0 ? "+" : x < 0 ? "−" : "±") + n(Math.abs(x)); };
var btn = { padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid #cbd5e1", background: "#fff", color: "#334155" };
var td = { padding: "4px 6px", borderTop: "1px solid #f1f5f9", textAlign: "right", whiteSpace: "nowrap" };
var th = Object.assign({}, td, { textAlign: "left", whiteSpace: "normal", color: "#334155" });
var COL = { green: "#15803d", red: "#b91c1c", none: "#475569" };
var DAYNAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function OnTrack(props) { var o = props.t.onTrack; return <b data-testid="pa-ontrack-value" style={{ color: COL[o.colour] }}>{signed(o.kcal)} kcal ({signed(o.pct)}%)</b>; }

/** The table body for one day (also used for each earlier day). */
export function DayRows(props) {
  var t = props.t, a = t.aim;
  return (<table data-testid={props.testid || "pa-table"} style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", color: "#0f172a" }}>
    <thead><tr><td style={Object.assign({}, th, { borderTop: "none" })}></td><th style={Object.assign({}, td, { borderTop: "none", color: "#475569", fontSize: 11 })}>Planned</th><th style={Object.assign({}, td, { borderTop: "none", color: "#475569", fontSize: 11 })}>Actual</th></tr></thead>
    <tbody>
      <tr data-testid="pa-burn"><th scope="row" style={th}>Body burn <span style={{ color: "#475569", fontSize: 10 }}>(BMR + daily living)</span></th><td style={td}>{n(t.burn)}</td><td style={td}>{n(t.burn)}</td></tr>
      <tr data-testid="pa-aim"><th scope="row" style={th}>Aim: {aimText(a)}</th><td style={td}>{signed(a.kcal)}</td><td style={td}>{signed(a.kcal)}</td></tr>
      <tr data-testid="pa-exercise"><th scope="row" style={th}>Exercise</th><td style={td}>+{n(t.exercise.planned)}</td><td style={td}>+{n(t.exercise.actual)}</td></tr>
      <tr data-testid="pa-goal" style={{ background: "#f8fafc" }}><th scope="row" style={Object.assign({}, th, { fontWeight: 800 })}>Goal</th><td style={Object.assign({}, td, { fontWeight: 800 })}>{n(t.goal.planned)}</td><td style={Object.assign({}, td, { fontWeight: 800 })}>{n(t.goal.actual)}</td></tr>
      <tr data-testid="pa-eating"><th scope="row" style={th}>Eating</th><td style={td}>{n(t.eating.planned)}</td><td style={td}>{n(t.eating.actual)}</td></tr>
      <tr data-testid="pa-ontrack"><th scope="row" style={th}>On track</th><td style={td} colSpan={2}><OnTrack t={t} /></td></tr>
    </tbody>
  </table>);
}

export default function PlanActual(props) {
  var data = props.data, who = props.who, p = data && data[who];
  var [early, setEarly] = React.useState(false);
  var [how, setHow] = React.useState(false);
  var [edit, setEdit] = React.useState(false);
  var [val, setVal] = React.useState("");
  var [msg, setMsg] = React.useState("");
  if (!p) return null;
  var now = props.now || new Date();
  var t = dayTable(p, props.date, props.doc);
  var box = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "10px 12px", marginBottom: 12 };
  if (!t.ready) return (<div data-testid={props.testid || "plan-actual"} style={box}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{props.title || "Today"}</div>
    <div data-testid="pa-setup-needed" style={{ fontSize: 12, color: "#334155", marginBottom: 6 }}>Finish your goal setup and the app will work out your daily calorie goal.</div>
    {props.onSetup && <button type="button" style={btn} onClick={props.onSetup}>Set up my goal</button>}
  </div>);
  var save = async function(mutate, ok) { var nd = JSON.parse(JSON.stringify(data)); mutate(nd[who]); await props.saveData(nd); setMsg(ok); setTimeout(function() { setMsg(""); }, 3000); };
  var wtd = props.showWeek ? weekToDate(p, props.doc, now) : null;
  var today = isoDay(now);
  var earlier = props.showEarlier ? weekDates(now).filter(function(d) { return d < today; }) : [];
  var sug = props.showSuggestions ? goalSuggestion(p, now) : null;
  var pending = props.showSuggestions ? pendingSuggestion(p) : null;
  return (<div data-testid={props.testid || "plan-actual"} style={box}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", flex: 1 }}>{props.title || "Today"}</span>
      {wtd && wtd.pct != null && <span data-testid="wtd-pill" style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: wtd.colour === "green" ? "#dcfce7" : "#fee2e2", color: wtd.colour === "green" ? "#166534" : "#991b1b" }}>Week to date {signed(wtd.pct)}%</span>}
    </div>
    <DayRows t={t} />
    {t.floored && <div data-testid="calorie-floor" style={{ fontSize: 10, color: "#9a3412", marginTop: 2 }}>Goal limited to your safe minimum ({n(t.minimum)} kcal).</div>}
    {t.estimate && <div style={{ fontSize: 10, color: "#9a3412", marginTop: 2 }}>BMR is an estimate — add a weigh-in with body fat % for a better figure.</div>}
    {earlier.length > 0 && <button type="button" aria-expanded={early} onClick={function() { setEarly(!early); }} style={Object.assign({}, btn, { marginTop: 6, border: "none", background: "none", padding: 0, color: "#1d4ed8" })}>{early ? "▾ Hide earlier days this week" : "▸ Show earlier days this week"}</button>}
    {early && <div data-testid="pa-earlier">{earlier.map(function(d) { var dt = dayTable(p, d, props.doc); return (<div key={d} style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>{DAYNAME[new Date(d + "T12:00:00").getDay()]}{dt.hasActual ? "" : " — not logged"}</div>
      <DayRows t={dt} testid="pa-table-earlier" /></div>); })}</div>}
    <div data-testid="pa-footnote" style={{ fontSize: 10, color: "#475569", marginTop: 6, fontStyle: "italic" }}>{FOOTNOTE}</div>
    <button type="button" aria-expanded={how} onClick={function() { setHow(!how); }} style={Object.assign({}, btn, { marginTop: 4, border: "none", background: "none", padding: 0, color: "#1d4ed8" })}>{how ? "▾" : "▸"} How this is calculated</button>
    {how && (<div data-testid="calorie-how" style={{ fontSize: 10, color: "#334155", lineHeight: 1.6, marginTop: 4 }}>
      <div>BMR {n(t.bmr)} kcal ({t.method === "katch" ? "from your lean mass" : "estimate"}). Body burn = BMR × {t.measured ? "1.15 (step data today)" : (ACTIVITY[t.activity].factor + " (" + ACTIVITY[t.activity].label.toLowerCase() + ")")} = {n(t.burn)}.</div>
      <div>Aim {signed(t.aim.kcal)} kcal: {t.aim.approach}{t.aim.pace ? " — about " + t.aim.pace.kgPerWeek + " kg a week" : ""}{t.aim.capped ? " (limited for safety)" : ""}.</div>
      <div>Exercise: {t.exercise.mode === "total" ? "device total " + n(t.exercise.totalBurned || 0) + " − body burn" : "steps above " + n(t.stepAllowance) + " (+" + n(t.exercise.steps) + ") + logged exercise (+" + n(t.exercise.logged) + "), net of resting"}{t.adjPct !== 100 ? ", at " + t.adjPct + "%" : ""}. Planned = that day's planned exercises.</div>
      <div>Safe minimum {n(t.minimum)} kcal (90% of BMR, at least 1,200 women / 1,500 men).</div>
      <div style={{ marginTop: 4 }}>Activity adjustment: <b data-testid="adj-pct">{t.adjPct}%</b>{" "}
        {!edit ? <button type="button" style={btn} onClick={function() { setEdit(true); setVal(String(t.adjPct)); }}>Change adjustment</button>
          : <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><input aria-label="Activity adjustment %" type="number" value={val} onChange={function(e) { setVal(e.target.value); }} style={{ width: 60, padding: 4, border: "1px solid #cbd5e1", borderRadius: 4 }} />%
            <button type="button" style={btn} onClick={async function() { var v = Math.round(parseFloat(val)); if (!(v >= 50 && v <= 150)) { setMsg("Choose 50–150%"); return; } setEdit(false); await save(function(pp) { recordAdj(pp, { kind: "manual", value: v }); }, "✓ Adjustment set to " + v + "%"); }}>Save</button>
            <button type="button" style={btn} onClick={function() { setEdit(false); }}>Cancel</button></span>}
      </div>
    </div>)}
    {sug && (<div data-testid="goal-suggestion" style={{ marginTop: 8, padding: 8, borderRadius: 6, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 11, color: "#1e293b" }}>
      {sug.text}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button type="button" style={Object.assign({}, btn, { background: "#166534", color: "#fff", border: "none" })} onClick={function() { save(function(pp) { pp.goal = Object.assign({}, pp.goal, sug.to, { setAt: isoDay(new Date()) }); if (sug.to.id === "maintain") { delete pp.goal.months; delete pp.goal.targetKg; } }, "✓ Goal updated"); }}>Accept</button>
        <button type="button" style={btn} onClick={function() { save(function(pp) { pp.goal = Object.assign({}, pp.goal); pp.goal.dismissed = Object.assign({}, pp.goal.dismissed); pp.goal.dismissed[sug.key] = isoDay(new Date()); }, "Kept your goal"); }}>Not now</button>
      </div></div>)}
    {pending && (<div data-testid="adj-suggestion" style={{ marginTop: 8, padding: 8, borderRadius: 6, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 11, color: "#1e293b" }}>
      <b>Your Companion suggests an activity adjustment of {pending.value}%</b>{pending.reason ? " — " + pending.reason : ""}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button type="button" style={Object.assign({}, btn, { background: "#166534", color: "#fff", border: "none" })} onClick={function() { save(function(pp) { decideSuggestion(pp, "accepted"); }, "✓ Adjustment set to " + pending.value + "%"); }}>Accept</button>
        <button type="button" style={btn} onClick={function() { save(function(pp) { decideSuggestion(pp, "declined"); }, "Kept at " + t.adjPct + "%"); }}>Decline</button>
      </div></div>)}
    {msg && <div role="status" style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: msg.charAt(0) === "✓" ? "#166534" : "#475569" }}>{msg}</div>}
  </div>);
}

/** v2.18.0 My Eating week view: the same Planned | Actual figures, one row per day, with Week to date and the footnote. */
export function WeekPlanActual(props) {
  var p = props.data && props.data[props.who]; if (!p) return null;
  var now = props.now || new Date(); var today = isoDay(now);
  var rows = props.dates.map(function(d) { return { d: d, t: dayTable(p, d, props.doc) }; });
  if (!rows[0].t.ready) return (<div data-testid="week-plan-actual" style={{ fontSize: 12, color: "#334155", marginBottom: 10 }}>Finish your goal setup and the app will work out your daily calorie goal.</div>);
  var wtd = weekToDate(p, props.doc, now);
  var showWtd = props.dates.indexOf(today) >= 0 && wtd.pct != null;
  return (<div data-testid="week-plan-actual" style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "8px 10px", marginBottom: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", flex: 1 }}>Planned vs Actual</span>
      {showWtd && <span data-testid="wtd-pill" style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: wtd.colour === "green" ? "#dcfce7" : "#fee2e2", color: wtd.colour === "green" ? "#166534" : "#991b1b" }}>Week to date {signed(wtd.pct)}%</span>}
    </div>
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", color: "#0f172a" }}>
      <thead><tr><th scope="col" style={Object.assign({}, th, { borderTop: "none" })}>Day</th><th scope="col" style={Object.assign({}, td, { borderTop: "none" })}>Goal P / A</th><th scope="col" style={Object.assign({}, td, { borderTop: "none" })}>Eating P / A</th><th scope="col" style={Object.assign({}, td, { borderTop: "none" })}>On track</th></tr></thead>
      <tbody>{rows.map(function(r) { var t = r.t; var future = r.d > today; return (<tr key={r.d} data-testid="wpa-row">
        <th scope="row" style={th}>{DAYNAME[new Date(r.d + "T12:00:00").getDay()].slice(0, 3)}</th>
        <td style={td}>{n(t.goal.planned)} / {future ? "—" : n(t.goal.actual)}</td>
        <td style={td}>{n(t.eating.planned)} / {future ? "—" : n(t.eating.actual)}</td>
        <td style={td}>{future || !t.hasActual ? "—" : <OnTrack t={t} />}</td></tr>); })}</tbody>
    </table></div>
    <div data-testid="pa-footnote" style={{ fontSize: 10, color: "#475569", marginTop: 6, fontStyle: "italic" }}>{FOOTNOTE}</div>
  </div>);
}
