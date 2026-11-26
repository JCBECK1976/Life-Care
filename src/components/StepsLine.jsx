import React from "react";
import { buildFlag } from "../lib/platform.js";
import { stepsDay, stepsSetUp, stepsText, stepsWeek } from "../lib/stepsView.js";

// v2.60.0 (Architect, 26 Nov "Show steps in the day"): steps on My Exercise (each day + the week) and Home → My Day.
// Read-only (what the steps sync already stored). Shown with the steps feature (useSteps: on /build/; off on beta/prod).
export function stepsShown() { return buildFlag("useSteps"); }
var DAY3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var link = { background: "none", border: "none", padding: "0 0 0 6px", color: "#1d4ed8", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "underline", minHeight: 24 };

/** Settings → the steps card (where steps are connected). */
export function openStepsSettings() {
  if (window._lcGo) window._lcGo("admin");
  setTimeout(function() { var el = document.querySelector('[data-testid="steps-card"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: "center" }); }, 250);
}

/** "👣 Steps 6,240 steps · +180 kcal" — "—" when none that day; "Connect my steps" when never set up. */
export function StepsDay(props) {
  if (!stepsShown()) return null;
  var d = stepsDay(props.p, props.date), setUp = stepsSetUp(props.p);
  return (<div data-testid={props.testid || "steps-day"} style={Object.assign({ fontSize: 11, color: "#334155", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }, props.style)}>
    <span aria-hidden="true">👣</span><b style={{ marginRight: 4 }}>Steps</b>
    <span data-testid="steps-value">{d ? stepsText(d) : "—"}</span>
    {!setUp && <button type="button" data-testid="steps-connect" onClick={openStepsSettings} style={link}>Connect my steps</button>}
  </div>);
}

/** My Exercise → the week: each day's steps, the week total and the daily average. */
export function StepsWeek(props) {
  if (!stepsShown()) return null;
  var w = stepsWeek(props.p, props.now), setUp = stepsSetUp(props.p);
  var k = function(x) { return x >= 10000 ? (x / 1000).toFixed(1).replace(/\.0$/, "") + "k" : Math.round(x).toLocaleString("en-GB"); };
  return (<div data-testid="steps-week" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", marginBottom: 10 }}>
    <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
      <b style={{ fontSize: 12, color: "#0f172a" }}><span aria-hidden="true">👣 </span>Steps this week</b>
      {w.count > 0 ? <span data-testid="steps-week-total" style={{ fontSize: 11, color: "#334155" }}>{w.total.toLocaleString("en-GB")} total · {w.avg.toLocaleString("en-GB")} a day on average</span>
        : <span style={{ fontSize: 11, color: "#475569" }}>—{!setUp && <button type="button" data-testid="steps-connect" onClick={openStepsSettings} style={link}>Connect my steps</button>}</span>}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 2, textAlign: "center" }}>
      {w.days.map(function(d, i) { return (<div key={d.date} data-testid="steps-week-day" data-date={d.date} style={{ fontSize: 10, color: d.future ? "#64748b" : "#0f172a" }}>
        <div style={{ fontWeight: 700, color: "#475569" }}>{DAY3[i]}</div>
        <div data-testid="steps-week-value" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{d.steps != null ? k(d.steps) : "—"}</div>
      </div>); })}
    </div>
  </div>);
}
