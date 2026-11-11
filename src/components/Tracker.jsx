import React from "react";
import OpenForm, { Field, inputStyle } from "./OpenForm.jsx";
import { btnOpen } from "../constants/styles.js";
import { CATEGORIES, PRIORITIES, STATUSES, adminEntry, currentEmail, loadEntries, removeEntry, saveEntry } from "../lib/tracker.js";

// v2.14.0 item 10 (admin only): 📝 Tracker — feedback from "Send Feedback" plus defects and features the admin adds.
// List newest first with Category and Status, filters, a count badge of New items, and the standard Open form:
// read-only → Edit (category, status, priority, admin note, link/ref) → Save, or Remove (deep orange, confirm).
var CAT_COLOUR = { Feedback: "#2563eb", Defect: "#dc2626", Feature: "#15803d" };
var sel = Object.assign({}, inputStyle, { width: "auto", padding: "4px 6px", fontSize: 11 });
var day = function(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };

export default function Tracker(props) {
  var _e = React.useState(null); var items = _e[0]; var setItems = _e[1];
  var _x = React.useState(false); var expanded = _x[0]; var setExpanded = _x[1];
  var _f = React.useState({ cat: "All", status: "All" }); var filt = _f[0]; var setFilt = _f[1];
  var _o = React.useState(null); var open = _o[0]; var setOpen = _o[1];          // { id, editing, draft, msg } | { add: true, draft }
  var reload = React.useCallback(function() { return loadEntries().then(setItems).catch(function() { setItems([]); }); }, [setItems]);
  React.useEffect(function() { reload(); }, [reload]);
  var list = (items || []).filter(function(e) { return (filt.cat === "All" || e.category === filt.cat) && (filt.status === "All" || e.status === filt.status); });
  var newCount = (items || []).filter(function(e) { return e.status === "New"; }).length;
  var draftOf = function(e) { return { category: e.category, status: e.status, priority: e.priority || "", note: e.note || "", ref: e.ref || "", text: e.text || "" }; };
  var select = function(label, value, options, onChange, blank) { return <select aria-label={label} value={value} onChange={function(ev) { onChange(ev.target.value); }} style={sel}>{blank ? <option value="">—</option> : null}{options.map(function(o) { return <option key={o} value={o}>{o}</option>; })}</select>; };

  var renderOpen = function(e) {
    var ed = open.editing; var d = open.draft; var setD = function(p) { setOpen(Object.assign({}, open, { draft: Object.assign({}, d, p), msg: "" })); };
    return (<OpenForm testid="tracker-open-form" title={e.category + " · " + day(e.created)} subtitle={ed ? "Change anything, then Save." : (e.source === "feedback" ? "From Send Feedback" : "Added by the admin")} editing={ed} message={open.msg}
      onEdit={function() { setOpen(Object.assign({}, open, { editing: true, draft: draftOf(e), msg: "" })); }}
      onCancelEdit={function() { setOpen({ id: e.id, editing: false, draft: draftOf(e), msg: "" }); }}
      onSave={async function() { var next = Object.assign({}, e, { category: d.category, status: d.status, priority: d.priority, note: d.note.trim().slice(0, 2000), ref: d.ref.trim().slice(0, 80), text: e.source === "admin" ? d.text.trim().slice(0, 4000) : e.text, updated: new Date().toISOString() }); await saveEntry(next); await reload(); setOpen({ id: e.id, editing: false, draft: draftOf(next), msg: "✓ Saved" }); }}
      onClose={function() { setOpen(null); }}
      dangerKind="remove" onDanger={async function() { if (!confirm("Remove this " + e.category.toLowerCase() + " from the tracker?")) return; await removeEntry(e.id); setOpen(null); await reload(); }}>
      <Field label="Category" testid="tr-category">{ed ? select("Category", d.category, CATEGORIES, function(v) { setD({ category: v }); }) : e.category}</Field>
      <Field label="Status" testid="tr-status">{ed ? select("Status", d.status, STATUSES, function(v) { setD({ status: v }); }) : e.status}</Field>
      <Field label="Priority" testid="tr-priority">{ed ? select("Priority", d.priority, PRIORITIES, function(v) { setD({ priority: v }); }, true) : (e.priority || "—")}</Field>
      <Field label="Text" testid="tr-text">{ed && e.source === "admin" ? <textarea aria-label="Text" value={d.text} onChange={function(ev) { setD({ text: ev.target.value }); }} style={Object.assign({}, inputStyle, { minHeight: 50 })} /> : <span style={{ whiteSpace: "pre-wrap" }}>{e.text}</span>}</Field>
      <Field label="From" testid="tr-from">{[e.kind === "bug" ? "Bug report" : e.kind === "feature" ? "Feature request" : "", e.person, e.account, e.env, e.version].filter(Boolean).join(" · ")}</Field>
      <Field label="Admin note" testid="tr-note">{ed ? <textarea aria-label="Admin note" value={d.note} onChange={function(ev) { setD({ note: ev.target.value }); }} style={Object.assign({}, inputStyle, { minHeight: 40 })} /> : (e.note || "—")}</Field>
      <Field label="Link / ref" testid="tr-ref">{ed ? <input aria-label="Link or ref" value={d.ref} onChange={function(ev) { setD({ ref: ev.target.value }); }} placeholder="e.g. D20 or v2.13.0" style={inputStyle} /> : (e.ref || "—")}</Field>
    </OpenForm>);
  };

  var renderAdd = function() {
    var d = open.draft; var setD = function(p) { setOpen(Object.assign({}, open, { draft: Object.assign({}, d, p), msg: "" })); };
    return (<OpenForm testid="tracker-add-form" title="Add a defect or feature" editing={true} message={open.msg}
      onSave={async function() { if (!d.text.trim()) { setOpen(Object.assign({}, open, { msg: "Describe it first" })); return; } await saveEntry(adminEntry({ email: currentEmail(), person: props.person, category: d.category, status: d.status, priority: d.priority, note: d.note, ref: d.ref, text: d.text.trim() })); setOpen(null); await reload(); }}
      onCancelEdit={function() { setOpen(null); }}>
      <Field label="Category">{select("Category", d.category, ["Defect", "Feature"], function(v) { setD({ category: v }); })}</Field>
      <Field label="Status">{select("Status", d.status, STATUSES, function(v) { setD({ status: v }); })}</Field>
      <Field label="Priority">{select("Priority", d.priority, PRIORITIES, function(v) { setD({ priority: v }); }, true)}</Field>
      <Field label="Text"><textarea aria-label="Text" value={d.text} onChange={function(ev) { setD({ text: ev.target.value }); }} style={Object.assign({}, inputStyle, { minHeight: 50 })} /></Field>
      <Field label="Admin note"><textarea aria-label="Admin note" value={d.note} onChange={function(ev) { setD({ note: ev.target.value }); }} style={Object.assign({}, inputStyle, { minHeight: 40 })} /></Field>
      <Field label="Link / ref"><input aria-label="Link or ref" value={d.ref} onChange={function(ev) { setD({ ref: ev.target.value }); }} placeholder="e.g. D20 or v2.13.0" style={inputStyle} /></Field>
    </OpenForm>);
  };

  var th = { textAlign: "left", fontSize: 9, color: "#64748b", fontWeight: 700, padding: "3px 4px", borderBottom: "1px solid #e2e8f0" };
  var td = { fontSize: 10, color: "#0f172a", padding: "4px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };
  return (<div data-testid="tracker" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginTop: 14, marginBottom: 14 }}>
    <button onClick={function() { setExpanded(!expanded); setOpen(null); }} style={{ background: "none", border: "none", padding: 0, fontSize: 12, fontWeight: 700, color: "#0f172a", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>{expanded ? "▲" : "▼"} 📝 Tracker {newCount > 0 && <span data-testid="tracker-new-badge" style={{ background: "#dc2626", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{newCount} new</span>}</button>
    <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.5, margin: "4px 0 6px" }}>Everything sent with Send Feedback lands here as Feedback / New. Re-categorise it as a Defect or Feature, set status, priority, a note and a ref. Text only, no images.</div>
    {expanded && (<div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        {select("Filter category", filt.cat, ["All"].concat(CATEGORIES), function(v) { setFilt(Object.assign({}, filt, { cat: v })); })}
        {select("Filter status", filt.status, ["All"].concat(STATUSES), function(v) { setFilt(Object.assign({}, filt, { status: v })); })}
        <button onClick={function() { setOpen({ add: true, draft: { category: "Defect", status: "New", priority: "", note: "", ref: "", text: "" }, msg: "" }); }} style={btnOpen}>+ Add</button>
      </div>
      {open && open.add && renderAdd()}
      {items === null ? <div style={{ fontSize: 10, color: "#64748b" }}>Loading…</div> : list.length === 0 ? <div style={{ fontSize: 10, color: "#64748b" }}>Nothing here.</div> : (
        <table data-testid="tracker-list" style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
          <thead><tr><th style={Object.assign({}, th, { width: 46 })}>Date</th><th style={Object.assign({}, th, { width: 64 })}>Category</th><th style={Object.assign({}, th, { width: 62 })}>Status</th><th style={th}>Text</th><th style={Object.assign({}, th, { width: 52 })}></th></tr></thead>
          <tbody>{list.map(function(e) { return (<React.Fragment key={e.id}>
            <tr data-testid="tracker-row"><td style={td}>{day(e.created)}</td><td style={Object.assign({}, td, { color: CAT_COLOUR[e.category], fontWeight: 700 })}>{e.category}</td><td style={td}>{e.status}</td>
              <td style={Object.assign({}, td, { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>{e.text}</td>
              <td style={td}><button aria-label={"Open " + e.category + " " + e.id} onClick={function() { setOpen(open && open.id === e.id ? null : { id: e.id, editing: false, draft: draftOf(e), msg: "" }); }} style={btnOpen}>Open</button></td></tr>
            {open && open.id === e.id && <tr><td colSpan={5} style={{ padding: 0 }}>{renderOpen(e)}</td></tr>}
          </React.Fragment>); })}</tbody>
        </table>)}
    </div>)}
  </div>);
}
