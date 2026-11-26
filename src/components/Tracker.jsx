import React from "react";
import OpenForm, { Field, inputStyle } from "./OpenForm.jsx";
import { btnOpen } from "../constants/styles.js";
import { CATEGORIES, CLOSED, PRIORITIES, STATUSES, adminEntry, currentEmail, isOutstanding, loadEntries, phaseTotals, removeEntry, saveEntry, syncPlan } from "../lib/tracker.js";

// v2.14.0 item 10 (admin only): 📝 Tracker — feedback from "Send Feedback" plus defects and features the admin adds.
// The standard Open form: read-only → Edit (category, status, priority, admin note, link/ref) → Save, or Remove.
// v2.15.0 B: also the PLAN. Opening the Tracker reads plan.json and upserts its items ("managed by plan": only the admin
// note can be edited here; status etc. change in docs/plan.json). Filters: Category, Phase, Status (default
// Outstanding = everything not Done / Won't do), Priority. Open Token % per phase is totalled above the list.
var CAT_COLOUR = { Feedback: "#2563eb", Defect: "#dc2626", Feature: "#15803d", Task: "#7c3aed" };
var sel = Object.assign({}, inputStyle, { width: "auto", maxWidth: "48%", padding: "4px 6px", fontSize: 11 });
var day = function(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
var STATUS_FILTERS = ["Outstanding", "Completed", "All"].concat(STATUSES);
var statusMatch = function(f, e) { return f === "All" || (f === "Outstanding" ? isOutstanding(e) : f === "Completed" ? CLOSED.indexOf(e.status) >= 0 : e.status === f); };
var pct = function(v) { return typeof v === "number" ? v + "%" : "—"; };

export default function Tracker(props) {
  var _e = React.useState(null); var items = _e[0]; var setItems = _e[1];
  var _x = React.useState(false); var expanded = _x[0]; var setExpanded = _x[1];
  var _f = React.useState({ cat: "All", phase: "All", status: "Outstanding", prio: "All" }); var filt = _f[0]; var setFilt = _f[1];
  var _o = React.useState(null); var open = _o[0]; var setOpen = _o[1];          // { id, editing, draft, msg } | { add: true, draft }
  var _p = React.useState(null); var planInfo = _p[0]; var setPlanInfo = _p[1];  // null | "busy" | { total, written, updated, phases } | "none"
  var reload = React.useCallback(function() { return loadEntries().then(setItems).catch(function() { setItems([]); }); }, [setItems]);
  React.useEffect(function() { reload(); }, [reload]);
  var expand = function() {
    var next = !expanded; setExpanded(next); setOpen(null);
    if (next && planInfo !== "busy") { setPlanInfo("busy"); syncPlan().then(function(r) { setPlanInfo(r || "none"); return reload(); }).catch(function() { setPlanInfo("none"); }); }
  };
  var all = items || [];
  var phases = (planInfo && planInfo.phases && planInfo.phases.length ? planInfo.phases : []).slice();
  all.forEach(function(e) { if (e.phase && phases.indexOf(e.phase) < 0) phases.push(e.phase); });
  var list = all.filter(function(e) { return (filt.cat === "All" || e.category === filt.cat) && (filt.phase === "All" || e.phase === filt.phase) && statusMatch(filt.status, e) && (filt.prio === "All" || e.priority === filt.prio); })
    .sort(function(a, b) { var pa = a.source === "plan", pb = b.source === "plan"; if (pa !== pb) return pa ? 1 : -1; if (pa) return phases.indexOf(a.phase) - phases.indexOf(b.phase) || (a.order || 0) - (b.order || 0); return String(b.created).localeCompare(String(a.created)); });
  var newCount = all.filter(function(e) { return e.status === "New" && e.source !== "plan"; }).length;
  var totals = phaseTotals(all, phases);
  var draftOf = function(e) { return { category: e.category, status: e.status, priority: e.priority || "", note: e.note || "", ref: e.ref || "", text: e.text || "" }; };
  var select = function(label, value, options, onChange, blank) { return <select aria-label={label} value={value} onChange={function(ev) { onChange(ev.target.value); }} style={sel}>{blank ? <option value="">—</option> : null}{options.map(function(o) { return <option key={o} value={o}>{o}</option>; })}</select>; };

  var renderOpen = function(e) {
    var ed = open.editing; var d = open.draft; var setD = function(p) { setOpen(Object.assign({}, open, { draft: Object.assign({}, d, p), msg: "" })); };
    var plan = e.source === "plan";
    var onSave = async function() {
      var next = plan ? Object.assign({}, e, { note: d.note.trim().slice(0, 2000), updated: new Date().toISOString() })
        : Object.assign({}, e, { category: d.category, status: d.status, priority: d.priority, note: d.note.trim().slice(0, 2000), ref: d.ref.trim().slice(0, 80), text: e.source === "admin" ? d.text.trim().slice(0, 4000) : e.text, updated: new Date().toISOString() });
      await saveEntry(next); await reload(); setOpen({ id: e.id, editing: false, draft: draftOf(next), msg: "✓ Saved" });
    };
    var ro = function(v) { return v || "—"; };
    return (<OpenForm testid="tracker-open-form" title={plan ? e.planId + " · " + e.category : e.category + " · " + day(e.created)} subtitle={plan ? "Managed by plan (docs/plan.json): only the admin note can be edited here." : ed ? "Change anything, then Save." : (e.source === "feedback" ? "From Send Feedback" : "Added by the admin")} editing={ed} message={open.msg}
      onEdit={function() { setOpen(Object.assign({}, open, { editing: true, draft: draftOf(e), msg: "" })); }}
      onCancelEdit={function() { setOpen({ id: e.id, editing: false, draft: draftOf(e), msg: "" }); }}
      onSave={onSave} onClose={function() { setOpen(null); }}
      dangerKind="remove" onDanger={plan ? null : async function() { if (!confirm("Remove this " + e.category.toLowerCase() + " from the tracker?")) return; await removeEntry(e.id); setOpen(null); await reload(); }}>
      {plan && <Field label="Title" testid="tr-title">{e.title}</Field>}
      <Field label="Category" testid="tr-category">{ed && !plan ? select("Category", d.category, CATEGORIES, function(v) { setD({ category: v }); }) : e.category}</Field>
      {plan && <Field label="Phase" testid="tr-phase">{ro(e.phase)}</Field>}
      <Field label="Status" testid="tr-status">{ed && !plan ? select("Status", d.status, STATUSES, function(v) { setD({ status: v }); }) : e.status}</Field>
      <Field label="Priority" testid="tr-priority">{ed && !plan ? select("Priority", d.priority, PRIORITIES, function(v) { setD({ priority: v }); }, true) : ro(e.priority)}</Field>
      {plan && <Field label="Token %" testid="tr-token">{pct(e.tokenPct)}</Field>}
      {plan && e.version && <Field label="Version" testid="tr-version">{e.version}</Field>}
      {plan ? <Field label="Plan notes" testid="tr-plan-notes"><span style={{ whiteSpace: "pre-wrap" }}>{ro(e.planNotes)}</span></Field>
        : <Field label="Text" testid="tr-text">{ed && e.source === "admin" ? <textarea aria-label="Text" value={d.text} onChange={function(ev) { setD({ text: ev.target.value }); }} style={Object.assign({}, inputStyle, { minHeight: 50 })} /> : <span style={{ whiteSpace: "pre-wrap" }}>{e.text}</span>}</Field>}
      {!plan && <Field label="From" testid="tr-from">{[e.kind === "bug" ? "Bug report" : e.kind === "feature" ? "Feature request" : "", e.person, e.account, e.env, e.version].filter(Boolean).join(" · ")}</Field>}
      <Field label="Admin note" testid="tr-note">{ed ? <textarea aria-label="Admin note" value={d.note} onChange={function(ev) { setD({ note: ev.target.value }); }} style={Object.assign({}, inputStyle, { minHeight: 40 })} /> : (e.note || "—")}</Field>
      {!plan && <Field label="Link / ref" testid="tr-ref">{ed ? <input aria-label="Link or ref" value={d.ref} onChange={function(ev) { setD({ ref: ev.target.value }); }} placeholder="e.g. D20 or v2.13.0" style={inputStyle} /> : (e.ref || "—")}</Field>}
    </OpenForm>);
  };

  var renderAdd = function() {
    var d = open.draft; var setD = function(p) { setOpen(Object.assign({}, open, { draft: Object.assign({}, d, p), msg: "" })); };
    return (<OpenForm testid="tracker-add-form" title="Add a defect, feature or task" editing={true} message={open.msg}
      onSave={async function() { if (!d.text.trim()) { setOpen(Object.assign({}, open, { msg: "Describe it first" })); return; } await saveEntry(adminEntry({ email: currentEmail(), person: props.person, category: d.category, status: d.status, priority: d.priority, note: d.note, ref: d.ref, text: d.text.trim() })); setOpen(null); await reload(); }}
      onCancelEdit={function() { setOpen(null); }}>
      <Field label="Category">{select("Category", d.category, ["Defect", "Feature", "Task"], function(v) { setD({ category: v }); })}</Field>
      <Field label="Status">{select("Status", d.status, STATUSES, function(v) { setD({ status: v }); })}</Field>
      <Field label="Priority">{select("Priority", d.priority, PRIORITIES, function(v) { setD({ priority: v }); }, true)}</Field>
      <Field label="Text"><textarea aria-label="Text" value={d.text} onChange={function(ev) { setD({ text: ev.target.value }); }} style={Object.assign({}, inputStyle, { minHeight: 50 })} /></Field>
      <Field label="Admin note"><textarea aria-label="Admin note" value={d.note} onChange={function(ev) { setD({ note: ev.target.value }); }} style={Object.assign({}, inputStyle, { minHeight: 40 })} /></Field>
      <Field label="Link / ref"><input aria-label="Link or ref" value={d.ref} onChange={function(ev) { setD({ ref: ev.target.value }); }} placeholder="e.g. D20 or v2.13.0" style={inputStyle} /></Field>
    </OpenForm>);
  };

  var th = { textAlign: "left", fontSize: 9, color: "#475569", fontWeight: 700, padding: "3px 4px", borderBottom: "1px solid #e2e8f0" };
  var td = { fontSize: 10, color: "#0f172a", padding: "4px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };
  var setF = function(k) { return function(v) { var n = Object.assign({}, filt); n[k] = v; setFilt(n); }; };
  return (<div data-testid="tracker" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
    <button onClick={expand} style={{ background: "none", border: "none", padding: 0, fontSize: 12, fontWeight: 700, color: "#0f172a", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>{expanded ? "▲" : "▼"} 📝 Tracker {newCount > 0 && <span data-testid="tracker-new-badge" style={{ background: "#dc2626", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{newCount} new</span>}</button>
    <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5, margin: "4px 0 6px" }}>Send Feedback entries land here as Feedback / New: re-categorise, set status, priority, a note and a ref. The plan (docs/plan.json) is loaded each time you open this: its items are "managed by plan" and only their admin note can be edited here. Token % = estimated share of a weekly allowance. Text only, no images.</div>
    {expanded && (<div>
      <div data-testid="tracker-plan-status" style={{ fontSize: 10, color: planInfo === "none" ? "#991b1b" : "#475569", marginBottom: 6 }}>{planInfo === "busy" ? "⏳ Loading the plan…" : planInfo === "none" ? "⚠️ Couldn't read the plan (plan.json): showing what's saved." : planInfo ? "Plan: " + planInfo.total + " items" + (planInfo.updated ? " (updated " + planInfo.updated + ")" : "") + (planInfo.written ? ", " + planInfo.written + " changed" : ", no changes") : ""}</div>
      {totals.length > 0 && (<div data-testid="tracker-phase-totals" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 8px", marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>Open work by phase (Token %)</div>
        {totals.map(function(t) { return <div key={t.phase} data-testid="tracker-phase-total" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155" }}><span>{t.phase}</span><strong>{t.pct}%</strong></div>; })}
      </div>)}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        {select("Filter category", filt.cat, ["All"].concat(CATEGORIES), setF("cat"))}
        {select("Filter phase", filt.phase, ["All"].concat(phases), setF("phase"))}
        {select("Filter status", filt.status, STATUS_FILTERS, setF("status"))}
        {select("Filter priority", filt.prio, ["All"].concat(PRIORITIES), setF("prio"))}
        <button onClick={function() { setOpen({ add: true, draft: { category: "Defect", status: "New", priority: "", note: "", ref: "", text: "" }, msg: "" }); }} style={btnOpen}>+ Add</button>
      </div>
      {open && open.add && renderAdd()}
      {items === null ? <div style={{ fontSize: 10, color: "#475569" }}>Loading…</div> : list.length === 0 ? <div style={{ fontSize: 10, color: "#475569" }}>Nothing here.</div> : (
        <table data-testid="tracker-list" style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
          <thead><tr><th style={th}>Item</th><th style={Object.assign({}, th, { width: 58 })}>Status</th><th style={Object.assign({}, th, { width: 36 })}>Prio</th><th style={Object.assign({}, th, { width: 34 })}>Tok %</th><th style={Object.assign({}, th, { width: 52 })}></th></tr></thead>
          <tbody>{list.map(function(e) { var plan = e.source === "plan"; return (<React.Fragment key={e.id}>
            <tr data-testid="tracker-row" data-plan={plan ? e.planId : undefined}>
              <td style={Object.assign({}, td, { overflow: "hidden" })}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plan ? <strong>{e.planId} </strong> : null}{e.text}</div>
                <div style={{ fontSize: 9, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ color: CAT_COLOUR[e.category], fontWeight: 700 }}>{e.category}</span>{" · " + (plan ? (e.phase || "—") + (e.version ? " · " + e.version : "") + " · plan" : day(e.created))}</div>
              </td>
              <td style={td}>{e.status}</td><td style={td}>{e.priority ? e.priority.charAt(0) === "M" ? "Med" : e.priority : "—"}</td><td style={td}>{plan ? pct(e.tokenPct) : "—"}</td>
              <td style={td}><button aria-label={"Open " + (plan ? e.planId : e.category + " " + e.id)} onClick={function() { setOpen(open && open.id === e.id ? null : { id: e.id, editing: false, draft: draftOf(e), msg: "" }); }} style={btnOpen}>Open</button></td></tr>
            {open && open.id === e.id && <tr><td colSpan={5} style={{ padding: 0 }}>{renderOpen(e)}</td></tr>}
          </React.Fragment>); })}</tbody>
        </table>)}
    </div>)}
  </div>);
}
