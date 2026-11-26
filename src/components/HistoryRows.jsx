import React from "react";
import WeightInput from "./WeightInput.jsx";
import { legacyCode, readWeight } from "../lib/weight.js";
import OpenForm, { Field, inputStyle } from "./OpenForm.jsx";
import { btnOpen } from "../constants/styles.js";

// v2.13.0 F9: My Body history (Weigh In metrics and Measurements) uses the same "Open" pattern as Progress weeks.
// A row shows the key data + Open (no inline-editable fields, no Del). Open → read-only → Edit/Save, or Remove
// (deep orange, with a confirm) inside the form. Entries are { wk, v, note } (no photos since v2.13.1).
//   entries   the history array (oldest first)        unit     shown after the value ("cm", "st", "")
//   limit     rows to show (newest first)             label    the metric's name, for titles and the confirm
//   onSave(index, { wk, v, note })                    onRemove(index)
//   testid    prefix for the rows' test ids
export default function HistoryRows(props) {
  var entries = props.entries || []; var unit = props.unit || ""; var pre = props.testid || "hist";
  var _o = React.useState(null); var open = _o[0]; var setOpen = _o[1];   // { i, editing, draft, msg }
  React.useEffect(function() { setOpen(null); }, [entries.length, setOpen]);       // a removed row never leaves a stale form open
  var shown = entries.map(function(e, i) { return { e: e, i: i }; }).reverse().slice(0, props.limit || 999);
  var fmt = function(v) { return v == null || v === "" ? "—" : String(v) + (unit ? " " + unit : ""); };
  var show = function(e) { return props.fmt ? props.fmt(e) : fmt(e.v); };   // v2.32.2: weight shown by the shared reader
  var kgOf = function(e) { if (!props.weight) return undefined; var w = readWeight(e); return w && !w.ambiguous ? w.kg : null; };

  var save = async function() {
    var d = open.draft; var wk = parseInt(d.wk); var v = parseFloat(d.v);
    if (!wk) { setOpen(Object.assign({}, open, { msg: "Enter the week" })); return; }
    if (props.weight) {   // v2.32.3: st/lb or kg boxes → kg + the legacy string (ADR 0019)
      if (!d.kg) { setOpen(Object.assign({}, open, { msg: "Enter the weight" })); return; }
      await props.onSave(open.i, { wk: wk, v: legacyCode(d.kg), kg: d.kg, note: (d.note || "").trim() }); setOpen(null); return;
    }
    if (isNaN(v)) { setOpen(Object.assign({}, open, { msg: "Enter a value" })); return; }
    await props.onSave(open.i, { wk: wk, v: v, note: (d.note || "").trim() });
    setOpen(null);
  };

  return (<div>
    {shown.map(function(r) {
      var e = r.e; var isOpen = open && open.i === r.i;
      return (<div key={r.i}>
        <div data-testid={pre + "-row"} style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 0", borderBottom: "1px solid #f1f5f9", fontSize: 11 }}>
          <span data-testid={pre + "-wk"} style={{ width: 40, color: "#475569", fontWeight: 600 }}>{e.wk}</span>
          <span data-testid={pre + "-v"} style={{ flex: 1, minWidth: 0, fontWeight: 700, color: "#0f172a" }}>{show(e)}{props.badge && props.badge(e) && props.onBadge ? <button type="button" data-testid={pre + "-badge"} onClick={function() { props.onBadge(r.i, e); }} style={{ marginLeft: 6, minHeight: 28, fontSize: 11, fontWeight: 700, color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6, padding: "1px 8px", cursor: "pointer" }}>⚠ {props.badge(e)} — fix</button> : props.badge && props.badge(e) ? <span data-testid={pre + "-badge"} style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6, padding: "1px 6px" }}>⚠ {props.badge(e)}</span> : null}</span>
          <button aria-label={"Open week " + e.wk} onClick={function() { setOpen(isOpen ? null : { i: r.i, editing: false, msg: "", draft: { wk: String(e.wk), v: String(e.v), note: e.note || "", kg: kgOf(e) } }); }} style={btnOpen}>Open</button>
        </div>
        {isOpen && (function() {
          var d = open.draft; var ed = open.editing;
          var setD = function(patch) { setOpen(Object.assign({}, open, { draft: Object.assign({}, d, patch), msg: "" })); };
          return (<OpenForm testid={pre + "-open-form"} title={props.label + " — week " + e.wk} subtitle={ed ? "Change anything, then Save." : "As logged. Edit to change it."} editing={ed} message={open.msg}
            onEdit={function() { setOpen(Object.assign({}, open, { editing: true, msg: "" })); }}
            onCancelEdit={function() { setOpen({ i: r.i, editing: false, msg: "", draft: { wk: String(e.wk), v: String(e.v), note: e.note || "", kg: kgOf(e) } }); }}
            onSave={save} onClose={function() { setOpen(null); }}
            dangerKind="remove" onDanger={async function() { if (!confirm("Remove week " + e.wk + " from " + props.label + "?")) return; setOpen(null); await props.onRemove(r.i); }}>
            <Field label="Week" testid={pre + "-f-wk"}>{ed ? <input aria-label="Week" type="number" value={d.wk} onChange={function(ev) { setD({ wk: ev.target.value }); }} style={Object.assign({}, inputStyle, { width: 70 })} /> : e.wk}</Field>
            <Field label={props.weight ? "Weight" : "Value" + (unit ? " (" + unit + ")" : "")} testid={pre + "-f-v"}>{ed && props.weight ? <WeightInput id={pre + "-wt"} label="Weight" kg={d.kg} unit={props.weight.unit} onUnit={props.weight.onUnit} onChange={function(k) { setD({ kg: k }); }} /> : ed ? <input aria-label="Value" type="number" step="any" value={d.v} onChange={function(ev) { setD({ v: ev.target.value }); }} style={Object.assign({}, inputStyle, { width: 90 })} /> : show(e)}</Field>
            <Field label="My Notes" testid={pre + "-f-note"}>{ed ? <textarea aria-label="My Notes" value={d.note} onChange={function(ev) { setD({ note: ev.target.value }); }} style={Object.assign({}, inputStyle, { minHeight: 40 })} /> : (e.note || <span style={{ color: "#475569" }}>—</span>)}</Field>
          </OpenForm>);
        })()}
      </div>);
    })}
  </div>);
}
