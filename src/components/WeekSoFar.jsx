import React from "react";
import { sGet } from "../lib/storage.js";
import { weekKey } from "../lib/children.js";
import { weekSoFar } from "../lib/weekSoFar.js";
import { dayFoodKcal, isoDay } from "../lib/calories.js";
import CalorieCard from "./CalorieCard.jsx";

// v2.17.1 Home: today's calorie line + "Week so far: Plan vs Actual" (between My Day and My Journal).
var COL = { green: ["#dcfce7", "#166534", "✓ On track"], amber: ["#fef3c7", "#92400e", "! Slightly off"], red: ["#fee2e2", "#991b1b", "✕ Off track"], none: ["#f1f5f9", "#475569", "—"] };
var SHORT = { sunday: "Sun", monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat" };
export default function WeekSoFar(props) {
  var who = props.who, p = props.data && props.data[who];
  var [doc, setDoc] = React.useState(null);
  var [open, setOpen] = React.useState(false);
  React.useEffect(function() {
    var live = true; var now = new Date(); var sun = new Date(now); sun.setHours(12, 0, 0, 0); sun.setDate(sun.getDate() - sun.getDay());
    sGet(weekKey(who, sun)).then(function(raw) { if (!live) return; try { setDoc(raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : { children: {} }); } catch (e) { setDoc({ children: {} }); } });
    return function() { live = false; };
  }, [who, props.refresh]);
  if (!p || !doc) return null;
  var w = weekSoFar(p, doc, new Date()); var c = COL[w.rag];
  var today = isoDay(new Date());
  return (<div>
    <CalorieCard testid="calorie-home" title="Today" data={props.data} who={who} saveData={props.saveData} date={today} foodKcal={dayFoodKcal(doc, today)} />
    <div data-testid="week-so-far" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 14, padding: "10px 14px" }}>
      <button type="button" aria-expanded={open} onClick={function() { setOpen(!open); }} style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", flex: 1 }}>Week so far: Plan vs Actual</span>
          <span data-testid="wsf-overall" style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: c[0], color: c[1] }}>{w.overall == null ? "—" : w.overall + "% · " + c[2]}</span>
          <span aria-hidden="true" style={{ fontSize: 10, color: "#475569" }}>{open ? "▲" : "▼"}</span>
        </div>
        <div data-testid="wsf-explain" style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>{w.explain}</div>
      </button>
      <div data-testid="wsf-today" style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Today (in progress): {w.today.food} of {w.today.target} kcal{w.today.exPlanned ? " · exercise " + (w.today.exDone ? "logged" : "not logged yet") : ""}</div>
      {open && (<table data-testid="wsf-days" style={{ width: "100%", fontSize: 11, marginTop: 8, borderCollapse: "collapse" }}><tbody>
        {w.days.map(function(d) { var r = COL[d.eatRag]; return (<tr key={d.date} style={{ borderTop: "1px solid #f1f5f9" }}>
          <td style={{ padding: "3px 0", fontWeight: 600 }}>{SHORT[d.weekday]}</td>
          <td>{d.food ? d.food + " / " + d.target + " kcal" : "not logged"}</td>
          <td><span style={{ padding: "0 6px", borderRadius: 8, background: r[0], color: r[1], fontWeight: 600 }}>{d.food ? r[2] : "—"}</span></td>
          <td>{d.exPlanned ? (d.exDone ? "✓ trained" : "✕ missed") : "rest day"}</td>
        </tr>); })}
      </tbody></table>)}
    </div>
  </div>);
}
