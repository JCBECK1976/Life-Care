import React from "react";
import { dayTable, weekToDate } from "../lib/goals.js";
import { isoDay } from "../lib/calories.js";

// v2.53.0 / v2.54.0 (Architect night batch 25 Nov, PARTS 2–3): My Eating's Week Summary and Day Summary.
//   Two pills (left: average daily / the day's calories, green on or under the goal; right: Week to date ±kcal (±%)),
//   then a table: Day | Body Burn | Target Deficit (or Surplus) | Exercise Benefit | Goal | Actual | On Track.
//   Body Burn − Deficit (+ Surplus) + Exercise = Goal; Actual = calories logged; On Track = Actual − Goal. No planned/actual pairs.
var n = function(x) { return Math.round(x).toLocaleString("en-GB"); };
var signed = function(x) { return (x > 0 ? "+" : x < 0 ? "−" : "±") + n(Math.abs(x)); };
var DAYNAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var box = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "10px 12px", marginBottom: 12 };
var td = { padding: "4px 3px", borderTop: "1px solid #f1f5f9", textAlign: "right", whiteSpace: "nowrap" };
var thc = Object.assign({}, td, { borderTop: "none", color: "#475569", fontSize: 10, fontWeight: 700, whiteSpace: "normal", lineHeight: 1.2, verticalAlign: "bottom" });
var COL = { green: "#15803d", red: "#b91c1c" };

function Pill(props) {
  var tone = props.ok == null ? { background: "#f1f5f9", color: "#334155" } : props.ok ? { background: "#dcfce7", color: "#166534" } : { background: "#fee2e2", color: "#991b1b" };
  return <span data-testid={props.testid} data-ok={props.ok == null ? "" : String(props.ok)} style={Object.assign({ flex: "1 1 0", minWidth: 0, textAlign: "center", fontSize: 12, fontWeight: 700, padding: "6px 8px", borderRadius: 12 }, tone)}>{props.children}</span>;
}
/** Week to date through a day (inclusive): the days of the week up to it with eating logged. */
export function wtdThrough(p, doc, dates, upto) {
  var days = dates.filter(function(d) { return d <= upto; }).map(function(d) { return dayTable(p, d, doc); }).filter(function(t) { return t.ready && t.hasActual; });
  if (!days.length) return null;
  var eat = days.reduce(function(s, t) { return s + t.eating.actual; }, 0), goal = days.reduce(function(s, t) { return s + t.goal.actual; }, 0), diff = eat - goal;
  return { kcal: diff, pct: goal ? Math.round(diff / goal * 100) : 0, ok: diff <= 0, days: days.length };
}
/** The average daily calories over the days with eating logged so far (and their average goal). */
export function averageDaily(p, doc, dates, today) {
  var days = dates.filter(function(d) { return d <= today; }).map(function(d) { return dayTable(p, d, doc); }).filter(function(t) { return t.ready && t.hasActual; });
  if (!days.length) return null;
  var eat = days.reduce(function(s, t) { return s + t.eating.actual; }, 0) / days.length, goal = days.reduce(function(s, t) { return s + t.goal.actual; }, 0) / days.length;
  return { kcal: Math.round(eat), goal: Math.round(goal), ok: eat <= goal, days: days.length };
}
function wtdText(w) { return w ? "Week to date: " + signed(w.kcal) + " kcal (" + signed(w.pct) + "%)" : "Week to date: —"; }

function SummaryTable(props) {
  var rows = props.rows, today = props.today, surplus = rows[0] && rows[0].t.aim.kcal > 0;
  return (<div style={{ overflowX: "auto" }}><table data-testid={props.testid} style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", color: "#0f172a" }}>
    <thead><tr>
      <th scope="col" style={Object.assign({}, thc, { textAlign: "left" })}>Day</th>
      <th scope="col" style={thc}>Body<br />Burn</th>
      <th scope="col" style={thc} data-testid="sum-target-head">Target<br />{surplus ? "Surplus" : "Deficit"}</th>
      <th scope="col" style={thc}>Exercise<br />Benefit</th>
      <th scope="col" style={thc}>Goal</th>
      <th scope="col" style={thc}>Actual</th>
      <th scope="col" style={thc}>On<br />Track</th>
    </tr></thead>
    <tbody>{rows.map(function(r) {
      var t = r.t, future = r.d > today;
      return (<tr key={r.d} data-testid="sum-row" data-date={r.d}>
        <th scope="row" style={Object.assign({}, td, { textAlign: "left", fontWeight: 700 })}>{DAYNAME[new Date(r.d + "T12:00:00").getDay()].slice(0, 3)}</th>
        <td style={td} data-col="burn">{n(t.burn)}</td>
        <td style={td} data-col="target">{n(Math.abs(t.aim.kcal))}</td>
        <td style={td} data-col="exercise">{n(t.exercise.actual)}</td>
        <td style={Object.assign({}, td, { fontWeight: 700 })} data-col="goal">{n(t.goal.actual)}</td>
        <td style={td} data-col="actual">{future ? "—" : n(t.eating.actual)}</td>
        <td style={td} data-col="ontrack">{future || !t.hasActual ? "—" : <span style={{ color: COL[t.onTrack.colour] || "#475569", fontWeight: 700 }}>{signed(t.onTrack.kcal)}<span style={{ display: "block", fontSize: 9 }}>{signed(t.onTrack.pct)}%</span></span>}</td>
      </tr>);
    })}</tbody>
  </table></div>);
}

/** My Eating → Week. */
export function WeekSummary(props) {
  var p = props.data && props.data[props.who]; if (!p) return null;
  var now = props.now || new Date(), today = isoDay(now);
  var rows = props.dates.map(function(d) { return { d: d, t: dayTable(p, d, props.doc) }; });
  if (!rows[0].t.ready) return (<div data-testid="week-summary" style={box}><b style={{ fontSize: 12 }}>Week Summary</b><div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>Finish your goal setup and the app will work out your daily calorie goal.</div></div>);
  var avg = averageDaily(p, props.doc, props.dates, today);
  var w = props.dates.indexOf(today) >= 0 ? weekToDate(p, props.doc, now) : wtdThrough(p, props.doc, props.dates, props.dates[props.dates.length - 1]);
  var wtd = w && w.pct != null ? { kcal: w.kcal, pct: w.pct, ok: w.kcal <= 0 } : null;
  return (<div data-testid="week-summary" style={box}>
    <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Week Summary</div>
    <div style={{ height: 8 }} />
    <div style={{ display: "flex", gap: 8 }}>
      <Pill testid="sum-avg" ok={avg ? avg.ok : null}>Average daily calories: {avg ? n(avg.kcal) : "—"}</Pill>
      <Pill testid="sum-wtd" ok={wtd ? wtd.ok : null}>{wtdText(wtd)}</Pill>
    </div>
    <button type="button" data-testid="sum-toggle" aria-expanded={!!props.open} onClick={function() { props.setOpen(!props.open); }} style={{ marginTop: 8, padding: 0, border: "none", background: "none", color: "#1d4ed8", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 24 }}>{props.open ? "▾ Hide days" : "▸ Show days"}</button>
    {props.open && <SummaryTable rows={rows} today={today} testid="week-sum-table" />}
  </div>);
}

/** My Eating → each day. dayKcal = the day's calories (as the day header showed them). */
export function DaySummary(props) {
  var p = props.data && props.data[props.who]; if (!p) return null;
  var now = props.now || new Date(), today = isoDay(now), t = dayTable(p, props.date, props.doc);
  if (!t.ready) return (<div data-testid="day-summary" style={box}><b style={{ fontSize: 12 }}>Summary</b><div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>Finish your goal setup and the app will work out your daily calorie goal.</div></div>);
  var kcal = props.dayKcal != null ? props.dayKcal : t.eating.actual, w = wtdThrough(p, props.doc, props.dates, props.date);
  return (<div data-testid="day-summary" style={box}>
    <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Summary</div>
    <div style={{ height: 8 }} />
    <div style={{ display: "flex", gap: 8 }}>
      <Pill testid="sum-day" ok={kcal <= t.goal.actual}>Day Calories: {n(kcal)}</Pill>
      <Pill testid="sum-wtd" ok={w ? w.ok : null}>{wtdText(w)}</Pill>
    </div>
    <div style={{ marginTop: 8 }}><SummaryTable rows={[{ d: props.date, t: t }]} today={today} testid="day-sum-table" /></div>
  </div>);
}
