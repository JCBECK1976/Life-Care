import React from "react";
import firebase, { DATA_ROOT } from "../lib/firebase.js";
import { summarise } from "../lib/aiUsage.js";

// v2.14.0 item 9 (admin only): AI usage from the ledger — calls, tokens and estimated cost per day and per feature.
// Counts only; nothing anyone typed or photographed is in the ledger.
var fmt = function(n) { return n >= 10000 ? Math.round(n / 1000) + "k" : n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n); };
var usd = function(c) { return "$" + (c || 0).toFixed(c >= 1 ? 2 : 3); };
export default function AiUsageCard() {
  var _l = React.useState(null); var ledger = _l[0]; var setLedger = _l[1];
  var _o = React.useState(false); var open = _o[0]; var setOpen = _o[1];
  React.useEffect(function() { if (!open) return; firebase.database().ref(DATA_ROOT + "/ai_usage").once("value").then(function(s) { var v = s.val(); setLedger(v ? JSON.parse(v) : {}); }).catch(function() { setLedger({}); }); }, [open, setLedger]);
  var sm = ledger ? summarise(ledger, 14) : null;
  var th = { textAlign: "left", fontSize: 9, color: "#475569", fontWeight: 700, padding: "3px 4px", borderBottom: "1px solid #e2e8f0" };
  var td = { fontSize: 10, color: "#0f172a", padding: "3px 4px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" };
  return (<div data-testid="ai-usage" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
    <button onClick={function() { setOpen(!open); }} style={{ background: "none", border: "none", padding: 0, fontSize: 12, fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>{open ? "▲" : "▼"} 📊 AI usage</button>
    <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5, margin: "4px 0 6px" }}>Calls and tokens per day and feature (counts only, no content), with the estimated cost at list prices. Companion Energy is worked out from this.</div>
    {open && !sm && <div style={{ fontSize: 10, color: "#475569" }}>Loading…</div>}
    {open && sm && (<div style={{ overflowX: "auto" }}>
      {ledger.total ? <div data-testid="ai-usage-total" style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>All recorded: {ledger.total.n} calls · {usd(ledger.total.cost)}</div> : <div style={{ fontSize: 10, color: "#475569" }}>No AI calls recorded yet.</div>}
      {sm.byDay.length > 0 && (<table data-testid="ai-usage-days" style={{ borderCollapse: "collapse", width: "100%", marginBottom: 10 }}><thead><tr><th style={th}>Day</th><th style={th}>Calls</th><th style={th}>In</th><th style={th}>Out</th><th style={th}>Cached</th><th style={th}>Cost</th></tr></thead>
        <tbody>{sm.byDay.map(function(r) { return <tr key={r.day}><td style={td}>{r.day.slice(5)}</td><td style={td}>{r.n}</td><td style={td}>{fmt(r.in)}</td><td style={td}>{fmt(r.out)}</td><td style={td}>{fmt(r.cr)}</td><td style={td}>{usd(r.cost)}</td></tr>; })}</tbody></table>)}
      {sm.byFeature.length > 0 && (<table data-testid="ai-usage-features" style={{ borderCollapse: "collapse", width: "100%" }}><thead><tr><th style={th}>Feature (14 days)</th><th style={th}>Calls</th><th style={th}>In</th><th style={th}>Out</th><th style={th}>Cost</th></tr></thead>
        <tbody>{sm.byFeature.map(function(r) { return <tr key={r.feature}><td style={td}>{r.feature}</td><td style={td}>{r.n}</td><td style={td}>{fmt(r.in)}</td><td style={td}>{fmt(r.out)}</td><td style={td}>{usd(r.cost)}</td></tr>; })}</tbody></table>)}
    </div>)}
  </div>);
}
