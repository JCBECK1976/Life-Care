import React from "react";
import { GOALS, ACTIVITY, MONTHS_MIN, MONTHS_MAX, DEFAULT_MONTHS, goalDef, recommendedTarget, isOwnTarget, currentKg, healthyRange, paceCheck, targetAllowed, conditionsOf, setupMissing, typicalBurn } from "../lib/goals.js";
import { bmrOf, heightCm, ageOf, isMale, isoDay } from "../lib/calories.js";
import WeightInput from "./WeightInput.jsx";
import { unitOf } from "../lib/weight.js";

// v2.18.0 mandatory goal setup (new users at onboarding; existing people once on their next visit until complete).
// Writes: goal { id, months, targetKg, recommendedKg, targetSource: recommended|own, setAt, startKg }, profile.sex/age/height/activityLevel (+ profile.weightKg when
// there are no weigh-ins), healthConditions (for "Support my health"). Targets aren't calculated until it's complete.
var lab = { display: "block", fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 4 };
var inp = { width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 };
var COL = { green: ["#dcfce7", "#166534"], amber: ["#fef3c7", "#92400e"], red: ["#fee2e2", "#991b1b"] };

export default function GoalSetup(props) {
  var data = props.data, who = props.who, p = (data && data[who]) || {}, pr = p.profile || {}, g = p.goal || {};
  var hasWeighIns = ((p.body && p.body.weight) || []).length > 0;
  var [f, setF] = React.useState(function() {
    var kg = currentKg(p);
    return { id: g.id || "", months: g.months || DEFAULT_MONTHS, own: g.targetSource === "own" ? String(g.targetKg || "") : "", changing: g.targetSource === "own", sex: /^m/i.test(pr.sex || "") ? "Male" : /^f/i.test(pr.sex || "") ? "Female" : "",
      age: ageOf(p) || "", height: heightCm(p) || "", weightKg: kg ? Math.round(kg * 10) / 10 : "", activity: pr.activityLevel || "", conditions: p.healthConditions || conditionsOf(p) || "", unit: unitOf(p) };   /* v2.32.3: weight unit */
  });
  var [msg, setMsg] = React.useState("");
  var set = function(k, v) { setF(function(q) { var o = Object.assign({}, q); o[k] = v; return o; }); };
  var def = goalDef(f.id);
  // a draft person with the form's values, to preview the pace check
  var draft = JSON.parse(JSON.stringify(p));
  draft.profile = Object.assign({}, draft.profile, { sex: f.sex, age: f.age, height: f.height ? f.height + "cm" : "", activityLevel: f.activity, weightKg: hasWeighIns ? undefined : parseFloat(f.weightKg) || undefined });
  if (!hasWeighIns) draft.body = Object.assign({}, draft.body, { weight: [] });
  var cm = parseFloat(f.height) || null, kg = hasWeighIns ? currentKg(p) : parseFloat(f.weightKg) || null;
  var range = healthyRange(cm);
  // v2.18.1: the app recommends the target; the person accepts it or changes it
  var rec = recommendedTarget(draft);
  var ownKg = f.changing ? parseFloat(f.own) || null : null;
  var tgt = ownKg || (rec ? rec.kg : null);
  var own = isOwnTarget({ targetSource: ownKg ? "own" : "recommended", targetKg: ownKg }, rec);
  var pace = def && def.timescale && kg && tgt && kg > tgt && f.sex && f.activity ? paceCheck({ currentKg: kg, targetKg: tgt, months: f.months, burn: typicalBurn(draft), bmr: bmrOf(draft).bmr, male: isMale(draft) }) : null;
  var blocked = ownKg && cm && !targetAllowed(ownKg, cm);

  var save = async function() {
    if (blocked) { setMsg("That target is below a healthy weight (BMI 18.5). Please choose " + range.minKg + " kg or more."); return; }
    var nd = JSON.parse(JSON.stringify(data)); var q = nd[who];
    q.profile = Object.assign({}, q.profile, { sex: f.sex, age: f.age ? String(f.age) : "", height: f.height ? f.height + "cm" : "", activityLevel: f.activity, weightUnit: f.unit });
    if (!hasWeighIns && f.weightKg) q.profile.weightKg = parseFloat(f.weightKg);
    if (f.id === "support") q.healthConditions = f.conditions.trim();
    var start = hasWeighIns ? currentKg(p) : parseFloat(f.weightKg);
    var same = g.id === f.id && g.months === f.months && (g.targetKg || null) === (tgt || null);
    q.goal = Object.assign({}, same ? g : {}, { id: f.id, setAt: same && g.setAt ? g.setAt : isoDay(new Date()), startKg: same && g.startKg ? g.startKg : (start ? Math.round(start * 10) / 10 : null) });
    if (def && def.timescale) { q.goal.months = f.months; if (tgt) { q.goal.targetKg = tgt; q.goal.targetSource = own ? "own" : "recommended"; } if (rec) q.goal.recommendedKg = rec.kg; } else { delete q.goal.months; delete q.goal.targetKg; delete q.goal.targetSource; if (rec) q.goal.recommendedKg = rec.kg; }
    var missing = setupMissing(q);
    if (missing.length) { setMsg("Still needed: " + missing.join(", ") + "."); return; }
    await props.saveData(nd);
    if (props.onDone) props.onDone();
  };

  return (<div role="dialog" aria-modal="true" aria-labelledby="goal-setup-title" data-testid="goal-setup" style={{ position: "fixed", inset: 0, zIndex: 125, background: "#f1f5f9", overflowY: "auto" }}>
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 40px" }}>
      <h2 id="goal-setup-title" style={{ fontSize: 18, margin: "0 0 4px", color: "#0f172a" }}>{props.name ? props.name + ", what" : "What"} would you like to work towards?</h2>
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>Your goal sets your daily calorie goal and how your Companion frames its feedback. You can change it any time in My Profile. This is wellness guidance, not medical advice.</div>

      <fieldset style={{ border: "none", padding: 0, margin: "0 0 12px" }}><legend style={lab}>My goal</legend>
        {GOALS.map(function(x) { var on = f.id === x.id; return (<label key={x.id} style={{ display: "flex", gap: 8, padding: 10, marginBottom: 6, borderRadius: 8, cursor: "pointer", background: on ? "#eff6ff" : "#fff", border: "1px solid " + (on ? "#1d4ed8" : "#e2e8f0") }}>
          <input type="radio" name="goal" value={x.id} checked={on} onChange={function() { set("id", x.id); }} />
          <span><b style={{ fontSize: 13, color: "#0f172a" }}>{x.label}</b><br /><span style={{ fontSize: 11, color: "#475569" }}>{x.desc}</span></span>
        </label>); })}
      </fieldset>

      {def && def.timescale && (<div data-testid="goal-timescale" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, marginBottom: 12 }}>
        <label style={lab} htmlFor="goal-months">Timescale: <span data-testid="goal-months-value">{f.months} months</span></label>
        <input id="goal-months" type="range" min={MONTHS_MIN} max={MONTHS_MAX} step="1" value={f.months} onChange={function(e) { set("months", parseInt(e.target.value, 10)); }} style={{ width: "100%" }} />
        {rec && (<div data-testid="goal-recommend" style={{ marginTop: 8, padding: 8, borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12, color: "#0f172a" }}>
          <div>Your Companion recommends: <b data-testid="goal-recommend-kg">{rec.kg} kg</b> (range {rec.minKg}–{rec.maxKg} kg){rec.estimate ? " — estimate" : ""}</div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{rec.why}</div>
          {!f.changing ? (<div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}><span data-testid="goal-target-accepted" style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>✓ Using the recommended target</span>
            <button type="button" onClick={function() { set("changing", true); set("own", String(rec.kg)); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Change</button></div>)
          : (<div style={{ marginTop: 6 }}><div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}><div style={{ flex: 1 }}><WeightInput id="goal-target" label="My target weight" kg={parseFloat(f.own) || null} unit={f.unit} onUnit={function(u) { set("unit", u); }} onChange={function(k) { set("own", k ? String(Math.round(k * 10) / 10) : ""); }} /></div>
            <button type="button" onClick={function() { set("changing", false); set("own", ""); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #166534", background: "#fff", color: "#166534", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Accept recommendation</button></div>
            {own && !blocked && <div data-testid="goal-own-note" style={{ marginTop: 4, padding: 6, borderRadius: 6, background: "#fef3c7", color: "#92400e", fontSize: 11 }}>This isn't your Companion's recommendation based on your profile.</div>}</div>)}
        </div>)}
        {blocked && <div data-testid="goal-bmi-block" role="alert" style={{ fontSize: 11, color: "#991b1b", marginTop: 4 }}>That's below a healthy weight for your height (BMI 18.5). Please choose {range.minKg} kg or more.</div>}
        {pace && (<div data-testid="goal-pace" data-level={pace.level} style={{ marginTop: 8, padding: 8, borderRadius: 6, background: COL[pace.level][0], color: COL[pace.level][1], fontSize: 11, lineHeight: 1.5 }}>
          {pace.level === "green" ? "✓ A healthy, sustainable pace: about " + pace.kgPerWeek + " kg a week." : (pace.level === "amber" ? "! A brisk pace" : "✕ That pace is too fast to be healthy") + " — about " + pace.kgPerWeek + " kg a week" + (pace.reasons.length ? " (" + pace.reasons.join("; ") + ")" : "") + ". A steadier pace is easier to keep up:"}
          {pace.alternatives.length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>{pace.alternatives.map(function(a) { return <button key={a.label} type="button" onClick={function() { set("months", a.months); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid currentColor", background: "#fff", color: "inherit", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{a.label}: {a.months} months</button>; })}</div>}
        </div>)}
      </div>)}

      {f.id === "support" && (<div style={{ marginBottom: 12 }}><label style={lab} htmlFor="goal-conditions">My health conditions (also in My Health)</label>
        <textarea id="goal-conditions" value={f.conditions} onChange={function(e) { set("conditions", e.target.value); }} style={Object.assign({}, inp, { minHeight: 50 })} placeholder="e.g. High cholesterol, prediabetes" />
        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>At least one condition is needed for this goal. Always alongside your GP's advice.</div></div>)}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div><label style={lab} htmlFor="goal-sex">Sex</label><select id="goal-sex" value={f.sex} onChange={function(e) { set("sex", e.target.value); }} style={inp}><option value="">Choose…</option><option>Female</option><option>Male</option></select></div>
        <div><label style={lab} htmlFor="goal-age">Age</label><input id="goal-age" type="number" inputMode="numeric" value={f.age} onChange={function(e) { set("age", e.target.value); }} style={inp} /></div>
        <div><label style={lab} htmlFor="goal-height">Height (cm)</label><input id="goal-height" type="number" inputMode="numeric" value={f.height} onChange={function(e) { set("height", e.target.value); }} style={inp} /></div>
        <div style={{ gridColumn: "1 / -1" }}><WeightInput id="goal-weight" label="Current weight" kg={parseFloat(f.weightKg) || null} unit={f.unit} onUnit={function(u) { set("unit", u); }} disabled={hasWeighIns} onChange={function(k) { set("weightKg", k ? String(Math.round(k * 10) / 10) : ""); }} />{hasWeighIns && <div style={{ fontSize: 10, color: "#475569" }}>From your latest weigh-in.</div>}</div>
      </div>

      <fieldset style={{ border: "none", padding: 0, margin: "0 0 12px" }}><legend style={lab}>Typical activity level (used on days without step data)</legend>
        {Object.keys(ACTIVITY).map(function(k) { return (<label key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 12, fontSize: 12 }}><input type="radio" name="activity" value={k} checked={f.activity === k} onChange={function() { set("activity", k); }} />{ACTIVITY[k].label}</label>); })}
      </fieldset>

      {msg && <div role="alert" style={{ fontSize: 12, color: "#991b1b", marginBottom: 8 }}>{msg}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={save} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#1e3a8a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save my goal</button>
        {props.onLater && <button type="button" onClick={props.onLater} style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 13, cursor: "pointer" }}>{props.laterLabel || "Later"}</button>}
      </div>
      {props.onLater && !props.editing && <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>Until this is done the app won't work out your calorie goal.</div>}
    </div>
  </div>);
}
