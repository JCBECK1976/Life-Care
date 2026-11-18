import React, { useEffect, useState } from "react";
import { LIMITS, fromKgText, fromStLb, toStLb } from "../lib/weight.js";

// v2.32.3 (Architect, 18 Nov — WEIGH-IN ENTRY): unit-aware weight boxes, used everywhere weight is typed or edited
// (My Body weigh-in incl. the photo, history edit, goal setup, the "check this weigh-in" fix).
//   stones users: "st" + "lb" (lb 0–13.9, one decimal) · kg users: one "kg" box (one decimal) · a small "st/lb | kg"
//   switch (saved as the person's unit by the caller). Numeric keypads. Gives the caller kg (or null while invalid).
var box = { width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 16 };
var small = { fontSize: 11, color: "#475569" };
export default function WeightInput({ kg, unit, onUnit, onChange, id, label, disabled }) {
  var u = unit === "kg" ? "kg" : "st";
  var init = function() { if (kg > 0) { var s = toStLb(kg); return { st: String(s.st), lb: s.lb.toFixed(1).replace(/\.0$/, ""), kg: (Math.round(kg * 10) / 10).toFixed(1) }; } return { st: "", lb: "", kg: "" }; };
  var [t, setT] = useState(init);
  var [touched, setTouched] = useState(false);
  useEffect(function() { if (!touched) setT(init()); }, [kg]);   // eslint-disable-line react-hooks/exhaustive-deps
  var valueOf = function(x) { return u === "kg" ? fromKgText(x.kg) : x.st === "" ? null : fromStLb(x.st, x.lb); };
  var change = function(patch) { var x = Object.assign({}, t, patch); setT(x); setTouched(true); if (onChange) onChange(valueOf(x)); };
  var err = touched && (u === "kg" ? (t.kg !== "" && fromKgText(t.kg) == null ? "Between " + LIMITS.kg[0] + " and " + LIMITS.kg[1] + " kg, one decimal (e.g. 80.4)." : "")
    : (t.st !== "" && fromStLb(t.st, t.lb) == null ? "Stones " + LIMITS.st[0] + "–" + LIMITS.st[1] + " (whole number), pounds 0–13.9 (one decimal)." : ""));
  var switchTo = function(nu) {
    if (nu === u) return;
    var k = valueOf(t);   // carry the value across
    if (k) { var s = toStLb(k); setT({ st: String(s.st), lb: s.lb.toFixed(1).replace(/\.0$/, ""), kg: (Math.round(k * 10) / 10).toFixed(1) }); }
    if (onUnit) onUnit(nu);
  };
  var pre = id || "wt";
  return (<div data-testid={pre} role="group" aria-label={label || "Weight"}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{label || "Weight"}</span>
      <span role="group" aria-label="Weight unit" style={{ display: "inline-flex", border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden" }}>
        {[["st", "st/lb"], ["kg", "kg"]].map(function(o) { var on = u === o[0]; return (<button key={o[0]} type="button" data-testid={pre + "-unit-" + o[0]} aria-pressed={on} disabled={disabled} onClick={function() { switchTo(o[0]); }}
          style={{ minHeight: 32, minWidth: 48, padding: "2px 10px", border: "none", background: on ? "#1e3a5f" : "#fff", color: on ? "#fff" : "#0f172a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{o[1]}</button>); })}
      </span>
    </div>
    {u === "st" ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <label style={small}>st<input id={pre + "-st"} data-testid={pre + "-st"} aria-label="Stones" type="text" inputMode="numeric" pattern="[0-9]*" disabled={disabled} value={t.st} onChange={function(e) { change({ st: e.target.value.replace(/[^0-9]/g, "") }); }} placeholder="14" style={box} /></label>
      <label style={small}>lb<input id={pre + "-lb"} data-testid={pre + "-lb"} aria-label="Pounds" type="text" inputMode="decimal" disabled={disabled} value={t.lb} onChange={function(e) { change({ lb: e.target.value.replace(/[^0-9.]/g, "") }); }} placeholder="6.8" style={box} /></label>
    </div> : <label style={small}>kg<input id={pre + "-kg"} data-testid={pre + "-kg"} aria-label="Kilograms" type="text" inputMode="decimal" disabled={disabled} value={t.kg} onChange={function(e) { change({ kg: e.target.value.replace(/[^0-9.]/g, "") }); }} placeholder="80.4" style={box} /></label>}
    {err && <div role="alert" data-testid={pre + "-err"} style={{ fontSize: 11, color: "#b91c1c", marginTop: 4 }}>{err}</div>}
  </div>);
}
