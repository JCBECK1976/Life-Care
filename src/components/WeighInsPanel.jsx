import React, { useState } from "react";
import { planAllows } from "../lib/myPlan.js";
import { deviceSettings, saveDeviceSettings, getHealth, nativeSource } from "../lib/steps.js";
import { alsoRecorded, connectWeighIns, manualCount, stLabel, syncWeighIns, weighInsOn } from "../lib/weighIns.js";
import { trainingWeekOf } from "../lib/calories.js";
import { SCALES_APPS } from "./HealthSetup.jsx";

// v2.32.0 (flag useWeighIns): My Body → Weigh In. (1) "Do you use smart scales or a weight app?" on the phone app;
// (2) after 3 typed weigh-ins with no import, ONE gentle tip — never again once dismissed; (3) the imported readings,
// with "also recorded" when a typed weigh-in for that week is the one used.
var card = { borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13, color: "#0f172a", lineHeight: 1.5 };
var btn = { padding: "8px 14px", minHeight: 44, borderRadius: 8, border: "1px solid #1e3a5f", background: "#fff", color: "#1e3a5f", fontWeight: 700, fontSize: 13, cursor: "pointer" };
var btnP = Object.assign({}, btn, { background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none" });
var nice = function(d) { try { return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); } catch (e) { return d; } };

export default function WeighInsPanel({ p, data, activeTab, saveData }) {
  var [st, setSt] = useState(deviceSettings());
  var [busy, setBusy] = useState(false);
  var [msg, setMsg] = useState("");
  if (!weighInsOn() || !p) return null;
  var phone = nativeSource() !== "none";
  var mine = st.weighIns && st.person === activeTab;
  var tips = p.tips || {};
  var days = Object.keys(p.weighIns || {}).sort().reverse().slice(0, 7);
  var setTip = async function(k) { var nd = JSON.parse(JSON.stringify(window._lcData || data)); nd[activeTab].tips = Object.assign({}, nd[activeTab].tips || {}, { [k]: true }); await (window._lcSaveData || saveData)(nd); };
  var yes = async function() {
    if (busy) return; setBusy(true); setMsg("");
    try {
      if (!planAllows("healthSync")) { setMsg("Importing weigh-ins is part of Silver and up (Settings → My Plan)."); return; }
      var health = await getHealth(); if (!health) { setMsg("Open Lifecare Companion on your phone to connect your scales."); return; }
      var r = await connectWeighIns(health);
      if (!r.ok) { setMsg("Weight wasn't allowed. You can allow it in " + (nativeSource() === "healthKit" ? "the Health app → Apps → Lifecare Companion." : "Health Connect → App permissions → Lifecare Companion.")); return; }
      setSt(saveDeviceSettings({ weighIns: true, person: st.person || activeTab }));
      var s = await syncWeighIns(window._lcData || data, window._lcSaveData || saveData, { health: health });
      setMsg(s.ok && s.latest ? "✓ Found weigh-ins from " + s.latest.source + "." : "No weigh-ins yet: turn on " + (nativeSource() === "healthKit" ? "Apple Health" : "Health Connect") + " sync in your scales app, then open Lifecare Companion again.");
    } catch (e) { setMsg(String((e && e.message) || e)); } finally { setBusy(false); }
  };
  var ask = !mine && phone && !tips.scalesAsk;
  var tip = !mine && !ask && !tips.scalesTip && manualCount(p) >= 3 && days.length === 0;
  return (<div data-testid="weighins-panel">
    {ask && <div data-testid="scales-ask" style={Object.assign({}, card, { background: "#eff6ff", border: "1px solid #bfdbfe" })}>
      <b>Do you use smart scales or a weight app?</b> <span style={{ color: "#475569" }}>(for example {SCALES_APPS})</span>
      <div style={{ fontSize: 12, color: "#475569" }}>If they share with {nativeSource() === "healthKit" ? "Apple Health" : "Health Connect"}, your weigh-ins can arrive here automatically. We'll ask your permission first.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <button type="button" data-testid="scales-yes" disabled={busy} style={btnP} onClick={yes}>{busy ? "Checking…" : "Yes, connect them"}</button>
        <button type="button" data-testid="scales-no" style={btn} onClick={function() { setTip("scalesAsk"); }}>Not now</button>
      </div></div>}
    {tip && <div data-testid="scales-tip" role="note" style={Object.assign({}, card, { background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", gap: 8, alignItems: "flex-start" })}>
      <div style={{ flex: 1 }}>💡 <b>Use smart scales?</b> Connect them and your weigh-ins arrive automatically.
        {phone ? <div><button type="button" data-testid="scales-tip-connect" disabled={busy} style={Object.assign({}, btn, { marginTop: 6 })} onClick={yes}>Connect my scales</button></div>
          : <div style={{ fontSize: 12, color: "#475569" }}>In the Lifecare Companion phone app: Settings → Connect my health data.</div>}</div>
      <button type="button" data-testid="scales-tip-dismiss" aria-label="Dismiss this tip" onClick={function() { setTip("scalesTip"); }} style={{ minWidth: 44, minHeight: 44, border: "none", background: "transparent", fontSize: 18, color: "#475569", cursor: "pointer" }}>×</button>
    </div>}
    {msg && <div role="status" data-testid="scales-msg" style={{ fontSize: 12, marginBottom: 8 }}>{msg}</div>}
    {days.length > 0 && <div data-testid="weighins-list" style={Object.assign({}, card, { background: "#f0fdf4", border: "1px solid #bbf7d0" })}>
      <div style={{ fontWeight: 700 }}>⚖️ Weigh-ins from your scales</div>
      {days.map(function(d) { var r = p.weighIns[d]; var also = alsoRecorded(p, trainingWeekOf(new Date(d + "T12:00:00")));
        return (<div key={d} data-testid="weighin-row" style={{ fontSize: 12, padding: "4px 0", borderTop: "1px solid #dcfce7" }}>
          <b>{nice(d)}</b> {r.time ? "· " + r.time + " " : ""}· {stLabel(r.kg)} ({r.kg} kg){r.fatPct != null ? " · " + r.fatPct + "%" : ""} <span style={{ color: "#475569" }}>· from {r.source}</span>
          {also && also.day === d && <div data-testid="also-recorded" style={{ color: "#475569" }}>Also recorded — your typed weigh-in for week {trainingWeekOf(new Date(d + "T12:00:00"))} is the one used.</div>}
        </div>); })}
    </div>}
  </div>);
}
