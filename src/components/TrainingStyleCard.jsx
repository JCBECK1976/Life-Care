import React, { useState } from "react";
import { FOCUS, PACE, styleFor, styleLabel } from "../lib/trainingStyle.js";
import { planAllows, gateText } from "../lib/myPlan.js";

// v2.43.0 (night batch P5a, Silver+): Settings → "My training style", per person, optionally per exercise. It guides the
// Companion's progression advice and the "Set my next session" checks. Default: Mixed (your current ranges) · Steady.
var sel = { width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 12, background: "#fff", color: "#0f172a", boxSizing: "border-box" };
var lab = { display: "block", fontSize: 11, fontWeight: 600, color: "#334155", margin: "8px 0 4px" };

export default function TrainingStyleCard(props) {
  var data = props.data, who = props.activeTab, person = (data && data[who]) || {};
  var [exName, setExName] = useState("");
  var names = [];
  Object.keys(person.exercises || {}).forEach(function(d) { (person.exercises[d] || []).forEach(function(e) { if (e && e.name && names.indexOf(e.name) < 0 && !e.stopped) names.push(e.name); }); });
  names.sort();
  var ts = person.trainingStyle || {};
  var cur = exName ? styleFor(person, exName) : { focus: ts.focus || "mixed", pace: ts.pace || "steady" };
  var own = exName && ts.perExercise && ts.perExercise[exName];
  var allowed = planAllows("aiFeedback");

  function save(field, value) {
    var nd = JSON.parse(JSON.stringify(data)), p = nd[who], t = Object.assign({}, p.trainingStyle || {});
    if (exName) { var per = Object.assign({}, t.perExercise || {}); per[exName] = Object.assign({}, per[exName] || { focus: cur.focus, pace: cur.pace }); per[exName][field] = value; t.perExercise = per; }
    else t[field] = value;
    p.trainingStyle = t; props.saveData(nd);
  }
  function clearOwn() {
    var nd = JSON.parse(JSON.stringify(data)), t = Object.assign({}, nd[who].trainingStyle || {}), per = Object.assign({}, t.perExercise || {});
    delete per[exName]; t.perExercise = per; nd[who].trainingStyle = t; props.saveData(nd);
  }

  return (
    <div data-testid="training-style" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>🏋️ My training style</div>
      <div style={{ fontSize: 10, color: "#475569", marginBottom: 6, lineHeight: 1.4 }}>How your Companion suggests your next step: the rep range you work in and how fast you like to move up. It only ever suggests ranges (e.g. 2.5–5% more), never an exact weight.</div>
      {!allowed ? <div data-testid="training-style-gate" style={{ fontSize: 11, color: "#475569", background: "#f8fafc", borderRadius: 8, padding: 8 }}>{gateText("aiFeedback")}</div> : (<>
        <label style={lab} htmlFor="ts-exercise">For</label>
        <select id="ts-exercise" value={exName} onChange={function(e) { setExName(e.target.value); }} style={sel}>
          <option value="">All my exercises</option>
          {names.map(function(n) { return <option key={n} value={n}>{n}</option>; })}
        </select>
        <label style={lab} htmlFor="ts-focus">Focus</label>
        <select id="ts-focus" value={cur.focus} onChange={function(e) { save("focus", e.target.value); }} style={sel}>
          {FOCUS.map(function(o) { return <option key={o[0]} value={o[0]}>{o[1]}</option>; })}
        </select>
        <label style={lab} htmlFor="ts-pace">Pace</label>
        <select id="ts-pace" value={cur.pace} onChange={function(e) { save("pace", e.target.value); }} style={sel}>
          {PACE.map(function(o) { return <option key={o[0]} value={o[0]}>{o[1]}</option>; })}
        </select>
        <div data-testid="training-style-now" style={{ fontSize: 10, color: "#475569", marginTop: 8 }}>{exName ? (own ? exName + ": its own style — " : exName + ": uses your general style — ") : "Now: "}{styleLabel(cur)}</div>
        {own && <button type="button" onClick={clearOwn} style={{ marginTop: 6, padding: "4px 10px", fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", color: "#334155", cursor: "pointer", minHeight: 24 }}>Use my general style for {exName}</button>}
      </>)}
    </div>
  );
}
