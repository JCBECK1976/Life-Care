import React from "react";
import { HowItWorksDialog } from "./HowItWorks.jsx";
import { COLOUR_THEMES } from "../constants/themes.js";
import { btnP, btnS, btnMuted, btnClose } from "../constants/styles.js";
import { sSet } from "../lib/storage.js";
import { planAllows, usePlan } from "../lib/myPlan.js";
import { setupComplete } from "../lib/goals.js";
import { buildFlag } from "../lib/platform.js";
import { loadSetup, saveSetup, stepsFor, emptySetup, checklist, SECTIONS, SECTION_NAME, VISITS, TIPS, PATHS } from "../lib/setupGuide.js";

// v2.38.0 (Architect brief 23 Nov, PART 5c): the set-up that follows the choice in onboarding (and Settings → Set-up
// guide): the guide once, colour, health (quick); + a guided first visit to each section (full); the "Finish setting up"
// checklist on Home (explore); first-visit tips in sections that were skipped. Saved after every step (resumable).
var card = { background: "#fff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 12, margin: "0 0 12px", fontSize: 12, color: "#0f172a" };
var small = { fontSize: 11, color: "#475569" };

export default function SetupGuide(props) {
  usePlan();
  var who = props.who, p = props.p || {};
  var [s, setS] = React.useState(null);
  var [held, setHeld] = React.useState(false);   // onboarding is still showing (its health step): wait
  var on = buildFlag("useOnboarding");
  React.useEffect(function() {
    if (!on) return undefined;
    var live = true;
    var load = function() { loadSetup(who).then(function(x) { if (!live) return; var pick = window._lcSetupChoice; if (pick && !x.path) { window._lcSetupChoice = ""; x = Object.assign(emptySetup(), { path: pick, done: x.done || {} }); saveSetup(who, x); } setS(x); }); };
    load();
    var onPick = function(e) { var path = e.detail && e.detail.path; if (!path) return; setHeld(!!e.detail.wait); window._lcSetupChoice = ""; var x = Object.assign(emptySetup(), { path: path, guideSeen: !!(s && s.guideSeen), done: (s && s.done) || {} }); if (e.detail.healthDone) x.done.health = true; saveSetup(who, x).then(function() { if (live) setS(x); }); };
    var onHealth = function() { setHeld(false); loadSetup(who).then(function(x) { x.done = Object.assign({}, x.done, { health: true }); saveSetup(who, x).then(function() { if (live) setS(x); }); }); };
    window.addEventListener("lc-setup-choice", onPick);
    window.addEventListener("lc-setup-health-done", onHealth);
    return function() { live = false; window.removeEventListener("lc-setup-choice", onPick); window.removeEventListener("lc-setup-health-done", onHealth); };
  }, [who, on]);   // eslint-disable-line react-hooks/exhaustive-deps
  var save = function(patch) { var x = Object.assign({}, s, patch); setS(x); saveSetup(who, x); return x; };
  var steps = s ? stepsFor(s.path) : [];
  var step = s && s.path && !s.finished ? steps[s.step] : null;
  var next = function(patch) { var n = (s.step || 0) + 1; save(Object.assign({}, patch || {}, n >= steps.length ? { step: n, finished: true } : { step: n })); };

  // explore: the goal setup waits until a goal feature (My Body, My Exercise, My Eating) is first opened
  var exploring = !!(s && s.path === "explore");
  React.useEffect(function() { if (props.onHold) props.onHold(exploring && !(s && s.goalAsked)); }, [exploring, s && s.goalAsked]);   // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(function() {
    if (!exploring || s.goalAsked || setupComplete(p)) return;
    if (["body", "weights", "meals"].indexOf(props.section) >= 0) { save({ goalAsked: true }); if (props.openGoal) props.openGoal(); }
  }, [props.section, exploring]);   // eslint-disable-line react-hooks/exhaustive-deps
  // full: each section visit opens that section
  var visit = step && step.indexOf("visit:") === 0 ? step.slice(6) : "";
  React.useEffect(function() { if (visit && props.section !== visit && props.go) props.go(visit); }, [visit]);   // eslint-disable-line react-hooks/exhaustive-deps

  var waitGoal = !!s && (s.path === "quick" || s.path === "full") && (!setupComplete(p) || props.goalOpen);   // profile + goal first (GoalSetup)
  React.useEffect(function() { if (step === "guide" && s && s.guideSeen && !waitGoal) next(); }, [step, s && s.guideSeen, waitGoal]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!on || !s || !s.path || held) return null;
  var out = [];
  // the guide: once, after the profile (quick/full) or straight away (explore)
  if (!s.guideSeen && !waitGoal && (step === "guide" || exploring)) {
    out.push(<HowItWorksDialog key="hiw" onClose={function() { if (step === "guide") next({ guideSeen: true }); else save({ guideSeen: true }); }} />);
  }
  var head = function(title) { return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 }}><b style={{ fontSize: 13 }}>{title}</b><span style={small}>Set-up · step {(s.step || 0) + 1} of {steps.length}</span></div>; };
  var stop = <button type="button" data-testid="setup-stop" onClick={function() { var sk = Object.assign({}, s.skipped); steps.slice(s.step).forEach(function(x) { if (x.indexOf("visit:") === 0) sk[x.slice(6)] = true; }); save({ finished: true, skipped: sk }); }} style={Object.assign({}, btnMuted, { marginLeft: "auto" })}>Stop the set-up</button>;
  if (step === "colour" && !waitGoal) out.push(<section key="colour" data-testid="setup-colour" aria-label="Set-up: colour" style={card}>
    {head("Pick a colour")}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{Object.entries(COLOUR_THEMES).map(function(pr) { return <button key={pr[0]} type="button" data-testid={"setup-colour-" + pr[0]} onClick={async function() { if (props.setColour) props.setColour(pr[0]); await sSet("user_colour_" + who, pr[0]); next({ done: Object.assign({}, s.done, { colour: true }) }); }} style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid " + pr[1].accent, background: pr[1].light, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{pr[1].label}</button>; })}</div>
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}><button type="button" data-testid="setup-skip" onClick={function() { next(); }} style={btnS}>Skip</button>{stop}</div>
  </section>);
  if (step === "health" && !waitGoal) {
    var paid = planAllows("healthSync");
    out.push(<section key="health" data-testid="setup-health" aria-label="Set-up: health data" style={card}>
      {head("Connect your health data")}
      {s.done.health ? <div>✓ Already connected during sign-up.</div>
        : paid ? <div>Steps (and weigh-ins from smart scales) can come in by themselves. In the Android or iPhone app: <b>Settings → Connect my health data</b>. It's optional.</div>
        : <div data-testid="setup-health-tier">Connecting health data is part of <b>Silver</b> (🔒 See plans in Settings → My Plan). You can type everything in by hand meanwhile.</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}><button type="button" data-testid="setup-next" onClick={function() { next(); }} style={Object.assign({}, btnP(true), { width: "auto", padding: "8px 14px", fontSize: 12 })}>{steps[s.step + 1] ? "Next" : "Finish"}</button>{stop}</div>
    </section>);
  }
  if (visit && !waitGoal && props.section === visit) {
    var i = SECTIONS.indexOf(visit), after = SECTIONS[i + 1];
    out.push(<section key={"v" + visit} data-testid="setup-visit" aria-label={"First visit: " + SECTION_NAME[visit]} style={card}>
      {head("First visit: " + SECTION_NAME[visit])}
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>{VISITS[visit].map(function(t, k) { var o = typeof t === "string" ? { text: t } : t; var locked = o.tier && !planAllows(o.tier); return <li key={k}>{o.text}{locked ? <span data-testid="setup-visit-tier" style={small}> (part of Gold — 🔒 See plans)</span> : null}</li>; })}</ul>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" data-testid="setup-next" onClick={function() { next(); }} style={Object.assign({}, btnP(true), { width: "auto", padding: "8px 14px", fontSize: 12 })}>{after ? "Next: " + SECTION_NAME[after] + " ›" : "Finish"}</button>
        <button type="button" data-testid="setup-skip" onClick={function() { next({ skipped: Object.assign({}, s.skipped, { [visit]: true }) }); }} style={btnS}>Skip this section</button>{stop}
      </div>
    </section>);
  }
  // explore: the checklist on Home
  if (exploring && !s.hidden && props.section === "overview" && s.guideSeen) {
    var items = checklist(p, s, { colour: props.colour });
    if (!items.every(function(x) { return x.done; })) out.push(<section key="chk" data-testid="setup-checklist" aria-labelledby="setup-chk-title" style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b id="setup-chk-title" style={{ fontSize: 13 }}>Finish setting up</b>
        <button type="button" aria-label="Hide the set-up checklist" onClick={function() { save({ hidden: true }); }} style={Object.assign({}, btnClose, { padding: "2px 8px" })}>✕</button></div>
      <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>{items.map(function(x) { return <li key={x.k} data-testid={"setup-item-" + x.k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
        <span aria-hidden="true" style={{ color: x.done ? "#15803d" : "#94a3b8", fontWeight: 700 }}>{x.done ? "✓" : "○"}</span>
        <span style={{ flex: 1, color: x.done ? "#475569" : "#0f172a", textDecoration: x.done ? "line-through" : "none" }}>{x.label}<span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{x.done ? " — done" : " — to do"}</span></span>
        {!x.done && <button type="button" onClick={function() { if (x.k === "food" || x.k === "health") save({ done: Object.assign({}, s.done, { [x.k]: true }) }); if (x.go === "goal") { if (props.openGoal) props.openGoal(); } else if (props.go) props.go(x.go); }} style={btnMuted}>Go</button>}
      </li>; })}</ul>
    </section>);
  }
  // first-visit tips in a section that was skipped (or, exploring, not visited yet)
  var sec = props.section;
  if (TIPS[sec] && !s.tipsDone[sec] && !visit && (s.skipped[sec] || (exploring && sec !== "overview")) && !(exploring && !s.guideSeen)) out.push(<section key={"t" + sec} data-testid="setup-tips" aria-label={"Tips for " + SECTION_NAME[sec]} style={Object.assign({}, card, { borderColor: "#e2e8f0" })}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontSize: 12 }}>Tips for {SECTION_NAME[sec]}</b>
      <button type="button" aria-label={"Dismiss the tips for " + SECTION_NAME[sec]} data-testid="setup-tips-close" onClick={function() { save({ tipsDone: Object.assign({}, s.tipsDone, { [sec]: true }) }); }} style={Object.assign({}, btnClose, { padding: "2px 8px" })}>✕</button></div>
    <ul style={{ margin: "4px 0 0", paddingLeft: 18, lineHeight: 1.5 }}>{TIPS[sec].map(function(t, k) { return <li key={k}>{t}</li>; })}</ul>
  </section>);
  return out.length ? <>{out}</> : null;
}

/** "How would you like to get started?" — onboarding (after the mandatory steps) and Settings → Set-up guide. */
export function SetupChoice(props) {
  return (<div data-testid="setup-choice" role="radiogroup" aria-label="How would you like to get started?">
    {Object.keys(PATHS).map(function(k) { return (<button key={k} type="button" data-testid={"ob-path-" + k} onClick={function() { props.onChoose(k); }}
      style={{ display: "block", width: "100%", textAlign: "left", padding: 12, marginTop: 8, borderRadius: 10, border: "1px solid #bfdbfe", background: "#fff", cursor: "pointer" }}>
      <b style={{ fontSize: 14, color: "#0f172a" }}>{PATHS[k].label}</b><br /><span style={{ fontSize: 12, color: "#475569" }}>{PATHS[k].hint}</span></button>); })}
  </div>);
}

/** Settings → Set-up guide: existing users can pick a path any time (flag useOnboarding). */
export function SetupGuideCard() {
  var [open, setOpen] = React.useState(false);
  var [msg, setMsg] = React.useState("");
  if (!buildFlag("useOnboarding")) return null;
  return (<div data-testid="setup-guide-card" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>🧭 Set-up guide</div>
    <div style={small}>Go through setting up again: explore yourself, a quick set-up or a full guided tour.</div>
    {!open ? <button type="button" data-testid="setup-guide-open" onClick={function() { setOpen(true); setMsg(""); }} style={Object.assign({}, btnMuted, { marginTop: 8 })}>Open the set-up guide</button>
      : <SetupChoice onChoose={function(k) { window.dispatchEvent(new CustomEvent("lc-setup-choice", { detail: { path: k } })); setOpen(false); setMsg("✓ " + PATHS[k].label + " — it starts on Home."); if (window._lcGo) window._lcGo("overview"); }} />}
    {msg && <div role="status" style={Object.assign({}, small, { marginTop: 6 })}>{msg}</div>}
  </div>);
}
