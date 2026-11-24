import React, { useState } from "react";
import { latestEntry, measureOf, getExerciseType, getExerciseTypeConfig, sameExercise, setWeekNote } from "../lib/exercise.js";
import { makeTarget, prefillFrom, targetHeadline } from "../lib/nextTarget.js";
import { setAdvice, pillAfterSet, styleFor } from "../lib/trainingStyle.js";

// v2.43.0 (night batch P5e): "Set my next session" under each recommendation in the session feedback, above its note box.
// Two boxes for the exercise's measures + Set. On Set: instant rules-based advice (a jump outside 2.5–10%, reps outside the
// range, lower than last time without a reason); the person can keep their choice. It becomes the ONE next target
// (source "set by you") → the card headline → the Log pre-fill, and sets the pill (heavier = Move Up, lighter = Reduce).
var box = { width: "100%", padding: 6, border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 12, boxSizing: "border-box" };
var small = { padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", minHeight: 24 };

/** Which boxes an exercise gets: [{ key: "m1"|"m2", label }]. */
export function measureBoxes(ex) {
  var u = measureOf(ex).unit, cfg = getExerciseTypeConfig((ex && ex.exType) || getExerciseType(ex && ex.name));
  if (u === "kg") return [{ key: "m1", label: "Weight (kg)" }, { key: "m2", label: "Reps" }];
  if (u === "plate") return [{ key: "m1", label: "Plate" }, { key: "m2", label: "Reps" }];
  var out = [];
  if (cfg.metric1 && cfg.metric1 !== "none" && cfg.metric1Label) out.push({ key: "m1", label: cfg.metric1Label });
  if (cfg.metric2 && cfg.metric2 !== "none" && cfg.metric2Label) out.push({ key: "m2", label: cfg.metric2Label });
  return out;
}

export default function SetNextSession(props) {
  var data = props.data, who = props.activeTab, day = props.day, wk = props.currentWeek;
  var list = (data && data[who] && data[who].exercises && data[who].exercises[day]) || [];
  var ex = list.find(function(e) { return sameExercise(e.name, props.name); });
  var init = (function() { if (!ex) return { m1: "", m2: "" }; var last = latestEntry(ex.prog), pf = prefillFrom(ex, last); if (pf) return { m1: pf.w, m2: pf.r }; return { m1: last ? String(last.w || "").replace(/kg$/i, "").replace(/^Plate\s*/i, "") : "", m2: last ? String(parseInt(last.r, 10) || "") : "" }; })();
  var [v, setV] = useState(init);
  var [advice, setAdviceList] = useState(null);
  var [done, setDone] = useState("");
  if (!ex || ex.stopped) return null;
  var boxes = measureBoxes(ex);
  if (!boxes.length) return null;
  var style = styleFor(data[who], ex.name);
  var reason = function() { var n = props.noteId && document.getElementById(props.noteId); return n ? n.value : ""; };

  async function commit() {
    var nd = JSON.parse(JSON.stringify(data)), l = nd[who].exercises[day], i = l.findIndex(function(e) { return sameExercise(e.name, ex.name); });
    if (i < 0) return;
    var t = l[i];
    t.next = makeTarget(v.m1, v.m2, "set by you");
    t.status = pillAfterSet(t, v.m1); t.statusSource = "set by you";
    var head = targetHeadline(t);
    t.notes = setWeekNote(t.notes, wk, "Wk" + wk + ": next session " + head + " (set by you)");
    await props.saveData(nd);
    setAdviceList(null); setDone(head);
  }
  function onSet() {
    if (!String(v.m1 || "").trim() && !String(v.m2 || "").trim()) return;
    var a = setAdvice(ex, v.m1, v.m2, style, reason());
    if (a.length) setAdviceList(a); else commit();
  }

  return (
    <div data-testid="set-next" style={{ marginTop: 6, padding: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#1e3a5f", marginBottom: 4 }}>Set my next session</div>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
        {boxes.map(function(b) { var id = "set-next-" + b.key + "-" + props.idx + "-" + day; return (
          <div key={b.key} style={{ flex: 1, minWidth: 0 }}>
            <label htmlFor={id} style={{ display: "block", fontSize: 10, color: "#475569", marginBottom: 2 }}>{b.label}</label>
            <input id={id} inputMode="decimal" value={v[b.key]} onChange={function(e) { var o = Object.assign({}, v); o[b.key] = e.target.value; setV(o); setAdviceList(null); setDone(""); }} style={box} />
          </div>); })}
        <button type="button" onClick={onSet} style={Object.assign({}, small, { background: "#1e3a5f", color: "#fff", border: "none" })}>Set</button>
      </div>
      {advice && <div data-testid="set-next-advice" role="status" style={{ marginTop: 6, padding: 8, background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 8, fontSize: 11, color: "#7c2d12" }}>
        {advice.map(function(a, k) { return <div key={k} style={{ marginBottom: 4 }}>{a}</div>; })}
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <button type="button" onClick={commit} style={Object.assign({}, small, { background: "#fff", color: "#7c2d12", border: "1px solid #fdba74" })}>Keep my choice</button>
          <button type="button" onClick={function() { setAdviceList(null); }} style={Object.assign({}, small, { background: "#fff", color: "#334155", border: "1px solid #cbd5e1" })}>Change it</button>
        </div>
      </div>}
      {done && <div data-testid="set-next-done" role="status" style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: "#0c4a6e" }}>✓ Next session: {done} (set by you) — it's on the card and fills in your next Log.</div>}
    </div>
  );
}
