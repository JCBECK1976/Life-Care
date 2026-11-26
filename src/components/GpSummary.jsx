import React, { useState } from "react";
import { GatePrompt } from "./PlanGate.jsx";
import { planAllows, usePlan } from "../lib/myPlan.js";
import { GP_AREAS, GP_NOTE, ymd, addDays, niceDate, gpFacts, gpPrompt, gpDocument, symptomsAllowed } from "../lib/pilot.js";
import { makePdf, sharePdf } from "../lib/pdf.js";
import { SkeletonLines } from "./Skeleton.jsx";

// v2.30.0 (Part 5c, flag usePilotFeatures; Silver and up, uses Energy): a factual summary of the person's OWN records for a
// GP appointment. The AI only describes what was recorded (no diagnosis, no advice, nothing about medication or HRT —
// those are listed as recorded, never sent to the AI). The person reviews and can edit it before saving or sharing.
var card = { background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #e2e8f0", borderTop: "none", padding: 12 };
var inp = { display: "block", width: "100%", boxSizing: "border-box", marginTop: 4, padding: "8px 10px", minHeight: 44, border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontFamily: "inherit" };
var btnMain = { width: "100%", padding: 12, minHeight: 48, marginTop: 12, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" };
var btn2 = { flex: 1, minWidth: 120, padding: 10, minHeight: 44, borderRadius: 8, border: "1px solid #94a3b8", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#0f172a" };
var note = { marginTop: 10, padding: 10, borderRadius: 8, background: "#fffbeb", border: "1px solid #fcd34d", fontSize: 12, color: "#0f172a", lineHeight: 1.45 };

function DocView({ doc, testid }) {
  return (<div data-testid={testid} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginTop: 10, background: "#fff" }}>
    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{doc.title}</div>
    <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>{doc.period}</div>
    {doc.sections.slice(1).map(function(s) { return (<div key={s.h} style={{ marginTop: 8 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a5f" }}>{s.h}</div>{s.lines.map(function(l, i) { return (<div key={i} style={{ fontSize: 12, color: "#334155", padding: "2px 0" }}>{l}</div>); })}</div>); })}
    <div role="note" style={note}>{doc.note}</div>
  </div>);
}

export default function GpSummary({ p, data, activeTab, saveData }) {
  usePlan();
  var today = ymd();
  var [from, setFrom] = useState(addDays(today, -89));
  var [to, setTo] = useState(today);
  var sym = symptomsAllowed();
  var [areas, setAreas] = useState(GP_AREAS.filter(function(a) { return !a.needs || sym; }).map(function(a) { return a.k; }));
  var [busy, setBusy] = useState(false);
  var [err, setErr] = useState("");
  var [draft, setDraft] = useState(null);   // { facts, text } while reviewing
  var [msg, setMsg] = useState("");
  var [openSaved, setOpenSaved] = useState(null);
  var saved = (Array.isArray(p.gpSummaries) ? p.gpSummaries : []).slice().reverse();
  var name = (p.profile && p.profile.name) || "me";
  if (!planAllows("gpSummary")) return (<div style={card} data-testid="gp"><div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>GP prep summary</div>
    <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>A clear summary of your own records to take to a GP appointment.</div><GatePrompt feature="gpSummary" /></div>);

  var prepare = async function() {
    if (busy) return;
    if (!areas.length) { setErr("Choose at least one area."); return; }
    if (from > to) { setErr("The start date is after the end date."); return; }
    setBusy(true); setErr(""); setMsg("");
    try {
      var facts = gpFacts(p, from, to, areas); var pr = gpPrompt(facts); var text = "";
      var aiAreas = ["symptoms", "vitals", "weight", "notes"].filter(function(k) { return facts[k] && (k === "symptoms" ? facts[k].days : facts[k].length); });
      if (aiAreas.length) {
        var resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-lc-feature": "gpSummary", "Content-Type": "application/json", "x-api-key": await window.ensureApiKey(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 700, system: pr.system, messages: [{ role: "user", content: pr.user }] }) });
        var r = await resp.json();
        if (r.error) throw new Error(r.error.message || "Your Companion couldn't answer just now");
        text = (r.content || []).map(function(b) { return b.text || ""; }).join("").trim();
      } else text = "No symptoms, readings, weight or notes were recorded in this period.";
      setDraft({ facts: facts, text: text });
    } catch (e) { setErr(window.aiErrorMsg ? window.aiErrorMsg(e, "Couldn't prepare the summary: " + ((e && e.message) || e)) : String(e)); }
    setBusy(false);
  };
  var doc = draft ? gpDocument(name, draft.facts, draft.text) : null;
  var save = async function() {
    if (busy || !draft) return; setBusy(true);
    try {
      var nd = JSON.parse(JSON.stringify(data));
      nd[activeTab].gpSummaries = (Array.isArray(nd[activeTab].gpSummaries) ? nd[activeTab].gpSummaries : []).concat([{ at: new Date().toISOString(), from: from, to: to, areas: areas, doc: doc }]).slice(-20);
      await saveData(nd); setDraft(null); setMsg("✓ Saved. You'll find it under Saved summaries.");
    } catch (e) { setErr("Couldn't save: " + ((e && e.message) || e)); }
    setBusy(false);
  };
  var pdf = async function(d) {
    try { var how = await sharePdf(makePdf(d), "GP-summary-" + ymd() + ".pdf", d.title); if (how === "downloaded") setMsg("✓ PDF downloaded."); }
    catch (e) { setErr("Couldn't make the PDF: " + ((e && e.message) || e)); }
  };
  var del = async function(i) {
    var nd = JSON.parse(JSON.stringify(data)); var list = nd[activeTab].gpSummaries || []; list.splice(list.length - 1 - i, 1);
    await saveData(nd); setOpenSaved(null); setMsg("Summary deleted.");
  };

  return (<div style={card} data-testid="gp">
    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>GP prep summary</div>
    <div style={{ fontSize: 12, color: "#475569", margin: "2px 0 8px" }}>A clear, factual summary of your own records to take to a GP appointment. You check it before saving or sharing. Uses about 5 Companion Energy.</div>
    {!draft && <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>From<input type="date" data-testid="gp-from" value={from} max={today} onChange={function(e) { setFrom(e.target.value); }} style={inp} /></label>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>To<input type="date" data-testid="gp-to" value={to} max={today} onChange={function(e) { setTo(e.target.value); }} style={inp} /></label>
      </div>
      <div role="group" aria-label="Quick periods" style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {[[1, 29], [3, 89], [6, 182]].map(function(m) { return (<button key={m[0]} type="button" data-testid={"gp-last-" + m[0]} onClick={function() { setFrom(addDays(today, -m[1])); setTo(today); }} style={{ minHeight: 44, padding: "4px 12px", borderRadius: 8, border: "1px solid #94a3b8", background: "#fff", fontSize: 12, cursor: "pointer", color: "#0f172a" }}>Last {m[0]} month{m[0] > 1 ? "s" : ""}</button>); })}
      </div>
      <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: 8, marginTop: 10, padding: "4px 10px 8px" }}>
        <legend style={{ fontSize: 12, fontWeight: 600, color: "#334155", padding: "0 4px" }}>Include</legend>
        {GP_AREAS.filter(function(a) { return !a.needs || sym; }).map(function(a) { return (<label key={a.k} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, fontSize: 13, color: "#0f172a" }}>
          <input type="checkbox" data-testid={"gp-area-" + a.k} checked={areas.indexOf(a.k) >= 0} onChange={function(e) { setAreas(e.target.checked ? areas.concat([a.k]) : areas.filter(function(x) { return x !== a.k; })); }} style={{ width: 20, height: 20 }} />{a.l}</label>); })}
      </fieldset>
      <button type="button" data-testid="gp-prepare" disabled={busy} aria-busy={busy} onClick={prepare} style={Object.assign({}, btnMain, { opacity: busy ? 0.6 : 1 })}>{busy ? "Preparing…" : "Prepare summary"}</button>
    </>}
    {busy && !draft && <SkeletonLines lines={6} label="Preparing your summary…" testId="gp-skeleton" />}
    {draft && <div data-testid="gp-review">
      <div role="status" style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>Check your summary</div>
      <div style={{ fontSize: 12, color: "#475569" }}>Change anything that isn't right before you save or share it. Nothing is saved yet.</div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginTop: 8 }}>Summary of my records
        <textarea data-testid="gp-text" value={draft.text} onChange={function(e) { setDraft({ facts: draft.facts, text: e.target.value }); }} rows={10} style={Object.assign({}, inp, { minHeight: 180, lineHeight: 1.45 })} /></label>
      <DocView doc={doc} testid="gp-doc" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button type="button" data-testid="gp-save" disabled={busy} onClick={save} style={Object.assign({}, btnMain, { marginTop: 0, flex: 2, minWidth: 160 })}>Save summary</button>
        <button type="button" data-testid="gp-pdf" onClick={function() { pdf(doc); }} style={btn2}>Share / PDF</button>
        <button type="button" data-testid="gp-discard" onClick={function() { setDraft(null); }} style={btn2}>Discard</button>
      </div>
    </div>}
    {err && <div role="alert" data-testid="gp-err" style={{ fontSize: 12, marginTop: 8, color: "#b91c1c" }}>{err}</div>}
    {msg && <div role="status" aria-live="polite" data-testid="gp-msg" style={{ fontSize: 12, marginTop: 8, color: "#0f172a" }}>{msg}</div>}
    {!draft && saved.length > 0 && <div style={{ marginTop: 16, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Saved summaries</div>
      {saved.map(function(s, i) { return (<div key={s.at} data-testid="gp-saved" style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#0f172a" }}><b>{niceDate(s.from)} – {niceDate(s.to)}</b><br /><span style={{ color: "#475569" }}>made {niceDate(String(s.at).slice(0, 10))}</span></span>
          <span style={{ display: "flex", gap: 6 }}>
            <button type="button" aria-expanded={openSaved === i} onClick={function() { setOpenSaved(openSaved === i ? null : i); }} style={Object.assign({}, btn2, { minWidth: 64, flex: "none", minHeight: 44, padding: "4px 10px", fontSize: 12 })}>{openSaved === i ? "Hide" : "View"}</button>
            <button type="button" onClick={function() { pdf(s.doc); }} style={Object.assign({}, btn2, { minWidth: 64, flex: "none", minHeight: 44, padding: "4px 10px", fontSize: 12 })}>PDF</button>
            <button type="button" aria-label={"Delete the summary for " + niceDate(s.from) + " to " + niceDate(s.to)} onClick={function() { if (confirm("Delete this summary?")) del(i); }} style={{ minHeight: 44, minWidth: 44, padding: "4px 10px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 12, cursor: "pointer" }}>🗑</button>
          </span></div>
        {openSaved === i && <><div style={{ fontSize: 12, color: "#334155", whiteSpace: "pre-wrap", marginTop: 6 }}>{(s.doc.sections[0] || { lines: [] }).lines.join("\n")}</div><DocView doc={s.doc} testid="gp-saved-doc" /></>}
      </div>); })}
    </div>}
    <div style={{ fontSize: 11, color: "#475569", marginTop: 10 }}>{GP_NOTE}</div>
  </div>);
}

