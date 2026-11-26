import React, { useEffect, useState } from "react";
import MarkdownText from "./MarkdownText.jsx";
import { GatePrompt } from "./PlanGate.jsx";
import { faqEntries, searchFaq } from "../lib/faq.js";

// v2.22.0: Help on Bronze — search the user guide (no AI). Asking the Companion is part of Silver.
export default function HelpFaq(props) {
  var [entries, setEntries] = useState(null);
  var [q, setQ] = useState("");
  useEffect(function() {
    var go = async function() {
      try { if (!window._appGuide) { var r = await fetch("APP_GUIDE.md", { cache: "no-cache" }); window._appGuide = r.ok ? await r.text() : ""; } setEntries(faqEntries(window._appGuide)); } catch (e) { setEntries([]); }
    };
    go();
  }, []);
  var hits = entries ? searchFaq(entries, q, 5) : [];
  var embedded = props && props.embedded;   // v2.38.0: inside Help's one scrolling list (all plans)
  return (<div data-testid="help-faq" style={embedded ? undefined : { padding: "8px 16px 12px", overflowY: "auto", flex: 1 }}>
    <label htmlFor="help-faq-search" style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Search the guide</label>
    <input id="help-faq-search" type="search" value={q} onChange={function(e) { setQ(e.target.value); }} placeholder="e.g. add a food, change my goal" style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 4, padding: "10px 12px", fontSize: 14, border: "1px solid #cbd5e1", borderRadius: 8 }} />
    {entries === null && <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>Loading the guide…</div>}
    {entries && q.trim() && hits.length === 0 && <div role="status" style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>Nothing found: try other words.</div>}
    {hits.map(function(e, i) { return <details key={e.section + e.title} open={i === 0} data-testid="faq-entry" data-ai-ok={/privacy|your data|^ ?settings$/i.test(e.section + " " + e.title) ? "" : undefined} style={{ marginTop: 8, border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", background: "#fff" }}>
      <summary style={{ fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}>{e.title}{e.section && <span style={{ fontWeight: 400, color: "#475569" }}> · {e.section}</span>}</summary>
      <div style={{ fontSize: 12, color: "#0f172a", marginTop: 6 }}><MarkdownText text={e.body} /></div>
    </details>; })}
    {!embedded && <GatePrompt feature="aiHelp" style={{ marginTop: 12 }} />}
  </div>);
}
