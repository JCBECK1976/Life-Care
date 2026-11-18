import React, { useEffect, useState } from "react";
import firebase, { auth } from "../lib/firebase.js";
import { APP_ID } from "../lib/platform.js";
import { accountsOn } from "../lib/accounts.js";
import { SHARING_GROUPS } from "../lib/areas.js";

// v2.28.1 (ADR 0018): Settings → Privacy & your data → "What my family can see". For an individual account in a family.
// Hidden / Visible first; when Visible, one switch per area (and "can log for me" per area). Defaults as today: every
// area follows the overall setting until the person changes one. Saved in apps/lifecare/users/{uid}/privacy — the
// database rules enforce it (a family member can't read an area that is off, or write one without "log for me").
var row = { display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid #f1f5f9", fontSize: 13, minHeight: 44 };
export default function FamilySharingCard() {
  var [pv, setPv] = useState(null);
  var [inFamily, setInFamily] = useState(false);
  var [msg, setMsg] = useState("");
  var u = auth.currentUser;
  var base = u ? "apps/" + APP_ID + "/users/" + u.uid + "/privacy" : "";
  useEffect(function() {
    if (!accountsOn() || !window._lcIndividual || !u) return;
    firebase.database().ref("apps/" + APP_ID + "/memberOf/" + u.uid).once("value").then(function(s) { setInFamily(!!s.val()); }).catch(function() {});
    firebase.database().ref(base).once("value").then(function(s) { setPv(s.val() || { visible: false, logForMe: false }); }).catch(function() { setPv({ visible: false, logForMe: false }); });
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!accountsOn() || !window._lcIndividual || !inFamily || !pv) return null;
  var areas = pv.areas || {}, logAreas = pv.logAreas || {};
  var seen = function(g) { return g.areas.every(function(a) { return areas[a] !== false; }); };
  var logs = function(g) { return g.areas.every(function(a) { return logAreas[a] !== undefined ? logAreas[a] === true : pv.logForMe === true; }); };
  var save = async function(next, text) {
    var before = pv; setPv(next); setMsg("");
    try { await firebase.database().ref(base).set(next); setMsg(text); } catch (e) { setPv(before); setMsg("Couldn't save: " + ((e && e.message) || e)); }
  };
  var setVisible = function(v) { save(v ? Object.assign({}, pv, { visible: true }) : { visible: false, logForMe: false, areas: pv.areas || null, logAreas: null }, v ? "✓ Your family can see the areas switched on below." : "✓ Hidden: your family sees your name only."); };
  var setArea = function(g, on) {
    var a = Object.assign({}, areas), l = Object.assign({}, logAreas);
    g.areas.forEach(function(x) { a[x] = on; if (!on) l[x] = false; });
    save(Object.assign({}, pv, { areas: a, logAreas: l }), on ? "✓ " + g.label + ": shown to your family." : "✓ " + g.label + ": kept private.");
  };
  var setLog = function(g, on) {
    var l = Object.assign({}, logAreas); g.areas.forEach(function(x) { l[x] = on; });
    save(Object.assign({}, pv, { logAreas: l }), on ? "✓ Your family can add " + g.label.split(" (")[0].toLowerCase() + " entries for you." : "✓ Only you can add " + g.label.split(" (")[0].toLowerCase() + " entries.");
  };
  return (<div data-testid="family-sharing" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginBottom: 14 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>👪 What my family can see</div>
    <div style={{ fontSize: 12, color: "#475569", margin: "4px 0 8px" }}>The family's food lists, defaults and shopping list are always shared. Your own records are shared only as you choose here. Your Companion chats are never shown to anyone else.</div>
    <div role="radiogroup" aria-label="Who can see my data" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, fontSize: 13 }}><input type="radio" name="fs-vis" data-testid="fs-hidden" checked={!pv.visible} onChange={function() { setVisible(false); }} /> <b>Hidden</b></label>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, fontSize: 13 }}><input type="radio" name="fs-vis" data-testid="fs-visible" checked={!!pv.visible} onChange={function() { setVisible(true); }} /> <b>Visible</b></label>
    </div>
    {pv.visible && <div data-testid="fs-areas" style={{ marginTop: 4 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 12px", fontSize: 11, color: "#475569", padding: "4px 0" }}><span>Area</span><span>They can see</span><span>Can log for me</span></div>
      {SHARING_GROUPS.map(function(g) { var on = seen(g); return (<div key={g.id} style={Object.assign({}, row, { display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 12px" })}>
        <span>{g.label}</span>
        <input type="checkbox" aria-label={g.label + ": my family can see it"} data-testid={"fs-see-" + g.id} checked={on} onChange={function(e) { setArea(g, e.target.checked); }} style={{ width: 22, height: 22, justifySelf: "center" }} />
        <input type="checkbox" aria-label={g.label + ": my family can log for me"} data-testid={"fs-log-" + g.id} disabled={!on} checked={on && logs(g)} onChange={function(e) { setLog(g, e.target.checked); }} style={{ width: 22, height: 22, justifySelf: "center" }} />
      </div>); })}
    </div>}
    {msg && <div role="status" aria-live="polite" data-testid="fs-msg" style={{ fontSize: 12, marginTop: 6, color: "#0f172a" }}>{msg}</div>}
  </div>);
}
