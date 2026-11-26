import React from "react";
import { analyzeSnap } from "../lib/snapCheck.js";
import { NO_FOOD_MSG, gramsLine, noFood } from "../lib/snap.js";
import { planAllows } from "../lib/myPlan.js";
import { GatePrompt } from "./PlanGate.jsx";
import PersonTabs from "./PersonTabs.jsx";
import { eatCategoryFor } from "../lib/eatShare.js";

// v2.59.0 (Architect brief 26 Nov, PART 4): Home's quick Snap. The top row is the Companion Energy box + a white Snap
// tile (as tall as the Energy box, shaped like the mood buttons). Snap opens the panel directly below that row: the
// yellow "Additional Information" box with the optional details, Take photo → the result in the same place with
// "Add to:" (today's category, by time of day), the person on a shared account, and Confirm / Re-check / Cancel.
// Confirm adds a NEW row in today's chosen category ("Added to today's lunch" + Undo). The photo is never stored.
export var HOME_SNAP_CATS = [["b", "Breakfast"], ["l", "Lunch"], ["d", "Dinner"], ["ds", "Desserts"], ["dr", "Drinks"], ["o", "Snacks"]];
var TODAYS = { b: "breakfast", l: "lunch", d: "dinner", ds: "desserts", dr: "drinks", o: "snacks" };
var TIP = "💡 Additional Information – for improved accuracy, you may provide any known weight, calories or portion sizes to help your companion analysis";
var RETIP = "💡 Re-check – for improved accuracy, you may provide any known weight, calories or portion sizes to help your companion analysis";
export var SNAP_GAP = 8;   // = the gap between the My Eating and My Exercises boxes

var yellow = { marginBottom: 8, padding: 6, border: "2px solid #f59e0b", background: "#fffbeb", borderRadius: 8 };
var tipText = { fontSize: 10, color: "#78350f", fontWeight: 600, marginBottom: 4 };
var detailInput = { width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #f59e0b", borderRadius: 8, fontSize: 12 };
var btn = { minHeight: 44, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" };
var primary = Object.assign({}, btn, { flex: 1, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none" });
var muted = Object.assign({}, btn, { flex: 1, background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" });

export default function HomeSnap(props) {
  var _o = React.useState(false), open = _o[0], setOpen = _o[1];
  var _d = React.useState(""), desc = _d[0], setDesc = _d[1];
  var _b = React.useState(false), busy = _b[0], setBusy = _b[1];
  var _r = React.useState(null), res = _r[0], setRes = _r[1];
  var _e = React.useState(""), err = _e[0], setErr = _e[1];
  var _c = React.useState(function() { return eatCategoryFor(new Date()); }), cat = _c[0], setCat = _c[1];
  var _w = React.useState(null), whoSel = _w[0], setWho = _w[1];
  var _t = React.useState(null), toast = _t[0], setToast = _t[1];
  var _g = React.useState(false), gate = _g[0], setGate = _g[1];
  var fileRef = React.useRef(null), panelRef = React.useRef(null), tileRef = React.useRef(null);
  var people = props.people || [], who = whoSel || props.activeKey;
  React.useEffect(function() { if (open && panelRef.current) panelRef.current.focus(); }, [open]);
  React.useEffect(function() { if (!toast) return; var t = setTimeout(function() { setToast(null); }, 8000); return function() { clearTimeout(t); }; }, [toast, setToast]);

  var reset = function() { setDesc(""); setBusy(false); setRes(null); setErr(""); fileRef.current = null; setWho(null); setCat(eatCategoryFor(new Date())); };
  var close = function() { setOpen(false); reset(); if (tileRef.current) tileRef.current.focus(); };
  var tap = function() {
    if (!planAllows("snap")) { setGate(!gate); setOpen(false); return; }
    setGate(false); if (open) { close(); return; } reset(); setOpen(true);
  };
  var check = async function(file, deep) {
    setBusy(true); setErr("");
    try { setRes(await analyzeSnap(file, desc, deep)); }
    catch (e) { setErr(window.aiErrorMsg ? window.aiErrorMsg(e) : "Your Companion couldn't check the photo just now."); }
    setBusy(false);
  };
  var onFile = function(e) { var f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; fileRef.current = f; check(f, false); };
  var confirm = async function() {
    if (!res || noFood(res)) return;
    setBusy(true);
    try {
      var done = await props.addSnapToToday(who, cat, res, desc);
      setOpen(false); reset();
      setToast({ text: "Added to today's " + TODAYS[cat] + (people.length > 1 ? " for " + (people.find(function(p) { return p.key === who; }) || { name: who }).name : ""), undo: done.undo });
      if (tileRef.current) tileRef.current.focus();
    } catch (e) { setErr("Couldn't add it: " + String(e.message || e).slice(0, 80)); setBusy(false); }
  };

  return (<>
    <div data-testid="home-top-row" style={{ display: "flex", gap: SNAP_GAP, alignItems: "stretch", marginBottom: 10 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>{props.energy}</div>{/* no Energy box (Bronze): the tile keeps its place on the right */}
      <button ref={tileRef} type="button" data-testid="home-snap-tile" aria-label="Snap a photo of your food" aria-expanded={open} aria-controls="home-snap-panel" onClick={tap}
        style={{ width: 92, minHeight: props.energy ? undefined : 64, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, background: "#fff", border: "1px solid " + (open ? "#1e3a5f" : (props.accentBorder || "#e2e8f0")), borderRadius: 12, cursor: "pointer", padding: 4 }}>
        <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>📷</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Snap</span>
      </button>
    </div>
    {gate && <GatePrompt feature="snap" style={{ marginBottom: 10 }} />}
    {open && (<div id="home-snap-panel" ref={panelRef} tabIndex={-1} role="region" aria-label="Snap your food" data-testid="home-snap-panel"
      onKeyDown={function(e) { if (e.key === "Escape") close(); }}
      style={{ background: "#faf5ff", border: "1px solid #ddd6fe", borderRadius: 12, padding: 10, marginBottom: 10, outline: "none" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
        <b style={{ flex: 1, fontSize: 13, color: "#0f172a" }}>{res ? (noFood(res) ? "📷 No food found" : res._deep ? "🔎 Re-check deep dive — re-assessed outcome" : "📷 " + (res.name || "Food")) : "📷 Snap a photo of your food"}</b>
        <button type="button" aria-label="Close Snap" onClick={close} style={{ minWidth: 44, minHeight: 36, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#334155", cursor: "pointer" }}>✕ Close</button>
      </div>
      {busy && <div role="status" style={{ fontSize: 12, fontWeight: 600, color: "#1e3a5f", marginBottom: 6 }}>⏳ Your Companion is looking at your photo…</div>}
      {err && <div role="alert" style={{ fontSize: 12, color: "#991b1b", marginBottom: 6 }}>{err}</div>}
      {!res && !busy && (<div data-testid="home-snap-pre">
        <div data-testid="home-snap-hint" style={yellow}><div style={tipText}>{TIP}</div>
          <input aria-label="Photo description" value={desc} onChange={function(e) { setDesc(e.target.value); }} placeholder="Optional: size and detail, e.g. 'large plate', '2 sausages', '28g bar'" style={detailInput} /></div>
        <div style={{ display: "flex", gap: 6 }}>
          <label style={Object.assign({}, primary, { textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" })}>📷 Take photo<input data-testid="home-snap-file" type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} /></label>
          <button type="button" onClick={close} style={muted}>Cancel</button>
        </div>
      </div>)}
      {res && !busy && (<div data-testid="home-snap-result">
        {noFood(res) ? <div role="alert" data-testid="home-snap-no-food" style={{ fontSize: 12, fontWeight: 600, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: 8, marginBottom: 6 }}>{NO_FOOD_MSG}</div>
          : <div data-testid="home-snap-values" style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, marginBottom: 6 }}><span><b>{res.kcal}</b> kcal</span><span><b>{res.protein || 0}g</b> prot</span><span><b>{res.satFat || 0}g</b> s/fat</span><span><b>{res.addedSugar || 0}g</b> added sugar</span></div>}
        {!noFood(res) && gramsLine(res) && <div style={{ fontSize: 11, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>Assumed: {gramsLine(res)} — {res.kcal} kcal</div>}
        <div data-testid="home-snap-recheck-hint" style={yellow}><div style={tipText}>{RETIP}</div>
          <input aria-label="Photo description" value={desc} onChange={function(e) { setDesc(e.target.value); }} placeholder="Optional: add detail, e.g. '28g bar', 'small bowl', 'half eaten'" style={detailInput} /></div>
        {!noFood(res) && (<div style={{ marginBottom: 8 }}>
          <div id="home-snap-addto" style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Add to:</div>
          <div role="radiogroup" aria-labelledby="home-snap-addto" data-testid="home-snap-cats" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {HOME_SNAP_CATS.map(function(c) { var on = cat === c[0]; return <button key={c[0]} type="button" role="radio" aria-checked={on} onClick={function() { setCat(c[0]); }}
              style={{ minHeight: 36, padding: "4px 10px", borderRadius: 18, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid " + (on ? "#1e3a5f" : "#cbd5e1"), background: on ? "#1e3a5f" : "#fff", color: on ? "#fff" : "#334155" }}>{c[1]}</button>; })}
          </div>
          {people.length > 1 && (<div data-testid="home-snap-person" style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>For:</div>
            <div style={{ display: "flex", background: "#1e3a5f", borderRadius: 8, padding: 2 }}><PersonTabs testId="home-snap-person-tabs" people={people} activeKey={who} rowStyle={{ gap: 0 }}
              tabStyle={{ flex: 1, minHeight: 36, padding: "6px 10px", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              activeStyle={{ background: "#fff", color: "#0f172a" }} inactiveStyle={{ background: "transparent", color: "rgba(255,255,255,0.85)" }}
              onSelect={function(k) { setWho(k); }} /></div>
          </div>)}
        </div>)}
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" data-testid="home-snap-confirm" onClick={confirm} disabled={noFood(res)} style={Object.assign({}, primary, noFood(res) ? { opacity: 0.45, cursor: "not-allowed" } : {})}>Confirm</button>
          <button type="button" onClick={function() { if (fileRef.current) check(fileRef.current, true); }} style={muted}>↻ Re-check</button>
          <button type="button" onClick={close} style={muted}>Cancel</button>
        </div>
      </div>)}
    </div>)}
    {toast && <div role="status" aria-live="polite" data-testid="home-snap-toast" style={{ position: "fixed", left: 12, right: 12, bottom: "calc(84px + env(safe-area-inset-bottom))", zIndex: 1200, maxWidth: 520, margin: "0 auto", background: "#0f172a", color: "#fff", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
      <span style={{ flex: 1 }}>✓ {toast.text}</span>
      {toast.undo && <button type="button" onClick={async function() { var u = toast.undo; setToast(null); await u(); }} style={{ background: "#fff", color: "#0f172a", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 700, cursor: "pointer", minHeight: 36 }}>Undo</button>}
    </div>}
  </>);
}
