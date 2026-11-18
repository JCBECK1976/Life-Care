import React, { useEffect, useRef, useState } from "react";
import { SYMPTOMS, SCALE, ymd, addDays, niceDate, upsertCheckIn, trendStats, trendText } from "../lib/pilot.js";

// v2.30.0 (Part 5a, flag usePilotFeatures): the daily symptom check-in (0–3 + notes) and its trends. All plans; no AI.
var card = { background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", padding: 12 };
var btnMain = { width: "100%", padding: 12, minHeight: 48, marginTop: 10, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" };
var COLORS = ["#e2e8f0", "#fde68a", "#fb923c", "#dc2626"];

export default function SymptomCheckIn({ p, data, activeTab, saveData, setFormMsg }) {
  var [d, setD] = useState(ymd());
  var [s, setS] = useState({});
  var [n, setN] = useState("");
  var [busy, setBusy] = useState(false);
  var [range, setRange] = useState(30);
  var [msg, setMsg] = useState("");
  var list = Array.isArray(p.symptoms) ? p.symptoms : [];
  var existing = list.find(function(x) { return x.d === d; });
  var loaded = useRef("");
  useEffect(function() {   // load that day's check-in (once per day/person) so it can be changed
    var key = activeTab + "|" + d; if (loaded.current === key) return; loaded.current = key;
    setS(existing ? Object.assign({}, existing.s) : {}); setN(existing && existing.n ? existing.n : ""); setMsg("");
  }, [activeTab, d, existing]);
  var today = ymd();
  var save = async function() {
    if (busy) return; setBusy(true);
    try {
      var nd = JSON.parse(JSON.stringify(data));
      nd[activeTab].symptoms = upsertCheckIn(nd[activeTab].symptoms, { d: d, s: s, n: n });
      await saveData(nd);
      setMsg("✓ Check-in saved for " + niceDate(d) + "."); if (setFormMsg) { setFormMsg("Saved ✓"); setTimeout(function() { setFormMsg(""); }, 2000); }
    } catch (e) { setMsg("Couldn't save: " + ((e && e.message) || e)); }
    setBusy(false);
  };
  var from = addDays(today, -(range - 1));
  var st = trendStats(list, from, today);
  var text = trendText(st, from, today);
  var days = []; for (var i = range - 1; i >= 0; i--) days.push(addDays(today, -i));
  var byDay = {}, avgDay = {}; st.totals.forEach(function(t) { byDay[t.d] = t.t; avgDay[t.d] = t.n ? t.t / t.n : 0; });
  var maxT = Math.max(6, Math.max.apply(null, st.totals.map(function(t) { return t.t; }).concat([0])));
  var bw = 300 / days.length;

  return (<div style={card} data-testid="symptoms">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Daily check-in</div>
      <label style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>Day
        <input type="date" data-testid="sym-date" value={d} max={today} onChange={function(e) { if (e.target.value) setD(e.target.value); }} style={{ padding: "6px 8px", minHeight: 44, border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }} /></label>
    </div>
    <div style={{ fontSize: 12, color: "#475569", margin: "4px 0 8px" }}>How much has each one bothered you today? {existing ? "You can change today's answers." : ""}</div>
    {SYMPTOMS.map(function(sym) { var v = s[sym.k]; return (<div key={sym.k} style={{ padding: "6px 0", borderTop: "1px solid #f1f5f9" }}>
      <div id={"sym-l-" + sym.k} style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{sym.l}</div>
      <div role="radiogroup" aria-labelledby={"sym-l-" + sym.k} style={{ display: "flex", gap: 6 }}>
        {SCALE.map(function(lab, val) { var on = v === val; return (<button key={val} type="button" role="radio" aria-checked={on} data-testid={"sym-" + sym.k + "-" + val}
          onClick={function() { var ns = Object.assign({}, s); if (on) delete ns[sym.k]; else ns[sym.k] = val; setS(ns); }}
          style={{ flex: 1, minHeight: 44, padding: "4px 2px", borderRadius: 8, fontSize: 12, fontWeight: on ? 700 : 500, cursor: "pointer", border: on ? "2px solid #1e3a5f" : "1px solid #cbd5e1", background: on ? COLORS[val] : "#fff", color: "#0f172a" }}>{lab}</button>); })}
      </div></div>); })}
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginTop: 10 }}>Notes (optional)
      <textarea data-testid="sym-notes" value={n} onChange={function(e) { setN(e.target.value); }} rows={2} maxLength={1000} placeholder="Anything else about today" style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 4, padding: 8, border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }} /></label>
    <button type="button" data-testid="sym-save" disabled={busy} aria-busy={busy} onClick={save} style={Object.assign({}, btnMain, { opacity: busy ? 0.6 : 1 })}>{busy ? "Saving…" : existing ? "Update check-in" : "Save check-in"}</button>
    {msg && <div role="status" aria-live="polite" data-testid="sym-msg" style={{ fontSize: 12, marginTop: 6, color: "#0f172a" }}>{msg}</div>}

    <div style={{ marginTop: 16, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Trends</div>
        <div role="group" aria-label="Period" style={{ display: "flex", gap: 6 }}>
          {[14, 30, 90].map(function(r) { return (<button key={r} type="button" aria-pressed={range === r} data-testid={"sym-range-" + r} onClick={function() { setRange(r); }} style={{ minHeight: 44, minWidth: 48, padding: "4px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: "1px solid #94a3b8", background: range === r ? "#1e3a5f" : "#fff", color: range === r ? "#fff" : "#0f172a", fontWeight: 600 }}>{r} days</button>); })}
        </div>
      </div>
      <p data-testid="sym-trend-text" style={{ fontSize: 12, color: "#334155", margin: "6px 0" }}>{text}</p>
      <figure style={{ margin: 0 }}>
        <svg viewBox="0 0 300 90" width="100%" role="img" aria-label={"Daily total symptom score, last " + range + " days. " + text} data-testid="sym-chart" style={{ display: "block", background: "#f8fafc", borderRadius: 8 }}>
          {days.map(function(day, i) { var t = byDay[day]; if (t == null) return null; var h = Math.max(2, t / maxT * 78); return (<rect key={day} x={i * bw + 0.5} y={84 - h} width={Math.max(1, bw - 1)} height={h} rx={1} fill={avgDay[day] >= 2 ? "#dc2626" : avgDay[day] >= 1 ? "#fb923c" : "#2563eb"}><title>{niceDate(day) + ": total " + t + ", average " + Math.round(avgDay[day] * 10) / 10}</title></rect>); })}
          <line x1="0" y1="84.5" x2="300" y2="84.5" stroke="#94a3b8" strokeWidth="1" />
        </svg>
        <figcaption style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Daily total of all scores ({niceDate(from)} – today). Colour = that day's average: blue under mild, orange mild to moderate, red moderate or worse. Days without a check-in are blank.</figcaption>
      </figure>
      {st.days > 0 && <table data-testid="sym-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8 }}>
        <caption style={{ textAlign: "left", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>Each symptom, last {range} days (0 none – 3 severe)</caption>
        <thead><tr style={{ color: "#475569", textAlign: "left" }}><th scope="col" style={{ padding: 4 }}>Symptom</th><th scope="col" style={{ padding: 4 }}>Average</th><th scope="col" style={{ padding: 4 }}>Highest</th><th scope="col" style={{ padding: 4 }}>Moderate+ days</th></tr></thead>
        <tbody>{st.per.filter(function(x) { return x.n; }).map(function(x) { return (<tr key={x.k} style={{ borderTop: "1px solid #f1f5f9" }}><th scope="row" style={{ padding: 4, textAlign: "left", fontWeight: 500 }}>{x.l}</th><td style={{ padding: 4 }}>{x.avg}</td><td style={{ padding: 4 }}>{SCALE[x.max]}</td><td style={{ padding: 4 }}>{x.modPlus} of {x.n}</td></tr>); })}</tbody>
      </table>}
    </div>
  </div>);
}
