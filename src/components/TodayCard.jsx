import React from "react";
import { sGet } from "../lib/storage.js";
import { weekKey } from "../lib/children.js";
import { isoDay } from "../lib/calories.js";
import PlanActual from "./PlanActual.jsx";

// v2.18.0 Home "Today": the Planned | Actual table with "Week to date" and earlier days
// (replaces v2.17's calorie line and the "Week so far" box).
export default function TodayCard(props) {
  var who = props.who;
  var [doc, setDoc] = React.useState(null);
  React.useEffect(function() {
    var live = true; var now = new Date(); var sun = new Date(now); sun.setHours(12, 0, 0, 0); sun.setDate(sun.getDate() - sun.getDay());
    sGet(weekKey(who, sun)).then(function(raw) { if (!live) return; try { setDoc(raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : { children: {} }); } catch (e) { setDoc({ children: {} }); } });
    return function() { live = false; };
  }, [who, props.refresh]);
  if (!props.data || !props.data[who] || !doc) return null;
  return <PlanActual testid="today-card" title="Today" data={props.data} who={who} saveData={props.saveData} date={isoDay(new Date())} doc={doc} showWeek showEarlier showSuggestions onSetup={props.onSetup} />;
}
