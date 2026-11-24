import React, { useState } from "react";
import { FOCUS, PACE, CARDIO_FOCUS, CARDIO_PACE, styleFor, styleLabel, cardioStyleFor } from "../lib/trainingStyle.js";
import { planAllows, gateText } from "../lib/myPlan.js";

// v2.43.0 (night batch P5a, Silver+): "My training style", per person, optionally per exercise. It guides the Companion's
// progression advice and the "Set my next session" checks. Default: Mixed (your current ranges) · Steady.
// v2.46.0 (Architect brief 24 Nov, P1): lives in My Profile (Home → ▼ My Profile, after the goal) and in the full set-up's
// Exercise step — no longer in Settings. Same stored values (person.trainingStyle), so no data change.
var sel = { width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 12, background: "#fff", color: "#0f172a", boxSizing: "border-box" };
var lab = { display: "block", fontSize: 11, fontWeight: 600, color: "#334155", margin: "8px 0 4px" };
import { isCardioEx as isCardioType } from "../lib/cardio.js";

function Strength(props) {
  var data = props.data, who = props.activeTab, person = (data && data[who]) || {};
  var [exName, setExName] = useState("");
  var names = [];
  Object.keys(person.exercises || {}).forEach(function(d) { (person.exercises[d] || []).forEach(function(e) { if (e && e.name && names.indexOf(e.name) < 0 && !e.stopped && !isCardioType(e)) names.push(e.name); }); });
  names.sort();
  var ts = person.trainingStyle || {};
  var cur = exName ? styleFor(person, exName) : { focus: ts.focus || "mixed", pace: ts.pace || "steady" };
  var own = exName && ts.perExercise && ts.perExercise[exName];
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
  return (<section data-testid="training-style-strength" aria-labelledby="ts-strength-h" style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8, marginTop: 6 }}>
    <h4 id="ts-strength-h" style={{ fontSize: 12, margin: 0, color: "#0f172a" }}>Strength</h4>
    <div style={{ fontSize: 10, color: "#475569", margin: "2px 0 4px" }}>The rep range you work in and how fast you like to move up.</div>
    <label style={lab} htmlFor="ts-exercise">For</label>
    <select id="ts-exercise" value={exName} onChange={function(e) { setExName(e.target.value); }} style={sel}>
      <option value="">All my strength exercises</option>
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
  </section>);
}

// v2.47.0 (brief 24 Nov P2): Cardio — Focus and Pace (not chosen = as before). Stored as person.trainingStyle.cardio.
function Cardio(props) {
  var data = props.data, who = props.activeTab, person = (data && data[who]) || {};
  var cur = cardioStyleFor(person);
  var f = CARDIO_FOCUS.find(function(o) { return o[0] === cur.focus; }) || CARDIO_FOCUS[0];
  function save(field, value) {
    var nd = JSON.parse(JSON.stringify(data)), t = Object.assign({}, nd[who].trainingStyle || {});
    t.cardio = Object.assign({}, t.cardio || {}); t.cardio[field] = value; nd[who].trainingStyle = t; props.saveData(nd);
  }
  return (<section data-testid="training-style-cardio" aria-labelledby="ts-cardio-h" style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8, marginTop: 10 }}>
    <h4 id="ts-cardio-h" style={{ fontSize: 12, margin: 0, color: "#0f172a" }}>Cardio</h4>
    <div style={{ fontSize: 10, color: "#475569", margin: "2px 0 4px" }}>How your walks, runs, bikes and rows build up: one thing at a time, no more than 10% a week.</div>
    <label style={lab} htmlFor="ts-cardio-focus">Focus</label>
    <select id="ts-cardio-focus" value={cur.focus} onChange={function(e) { save("focus", e.target.value); }} style={sel}>
      {CARDIO_FOCUS.map(function(o) { return <option key={o[0]} value={o[0]}>{o[1]}</option>; })}
    </select>
    {f[2] && <div data-testid="ts-cardio-focus-why" style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>{f[2]}</div>}
    <label style={lab} htmlFor="ts-cardio-pace">Pace</label>
    <select id="ts-cardio-pace" value={cur.pace} onChange={function(e) { save("pace", e.target.value); }} style={sel}>
      {CARDIO_PACE.map(function(o) { return <option key={o[0]} value={o[0]}>{o[1]}</option>; })}
    </select>
  </section>);
}

export default function TrainingStyleCard(props) {
  var allowed = planAllows("aiFeedback");
  return (
    <div data-testid="training-style" style={Object.assign({ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 12, marginTop: 8, marginBottom: 8 }, props.style || {})}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>🏋️ My training style</div>
      <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, lineHeight: 1.4 }}>How your Companion suggests your next step. It only ever suggests ranges (e.g. 2.5–5% more), never an exact weight.</div>
      {!allowed ? <div data-testid="training-style-gate" style={{ fontSize: 11, color: "#475569", background: "#f8fafc", borderRadius: 8, padding: 8 }}>{gateText("aiFeedback")}</div>
        : <><Strength data={props.data} activeTab={props.activeTab} saveData={props.saveData} /><Cardio data={props.data} activeTab={props.activeTab} saveData={props.saveData} /></>}
    </div>
  );
}
