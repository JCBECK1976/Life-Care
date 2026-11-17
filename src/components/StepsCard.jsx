import React, { useEffect, useState } from "react";
import { usePlan, planAllows } from "../lib/myPlan.js";
import { GatePrompt } from "./PlanGate.jsx";
import { SOURCES, HC_PLAY_URL, availability, connect, deviceSettings, getHealth, nativeSource, peopleOf, removeDays, saveDeviceSettings, syncSteps } from "../lib/steps.js";
import { isoDay } from "../lib/calories.js";

// v2.23.0 (N6): Settings → Connect my steps. Silver and up (the shared account counts as Platinum). Android: Health Connect.
var card = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginBottom: 14 };
var btn = { padding: "10px 14px", minHeight: 44, borderRadius: 8, border: "1px solid #1e3a5f", background: "#fff", color: "#1e3a5f", fontWeight: 700, fontSize: 13, cursor: "pointer" };
var btnP = Object.assign({}, btn, { background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none" });
var small = { fontSize: 12, color: "#475569", lineHeight: 1.5 };

/** Plain-English help when Health Connect isn't there or isn't sharing. */
function Guide(props) {
  return (<div data-testid="steps-guide" style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 12, color: "#0f172a", lineHeight: 1.55 }}>
    {props.reason === "web" && <div>Steps come from your phone. Open <b>Lifecare Companion on your Android phone</b> (from Google Play) and connect there. On the web, use Google Health below.</div>}
    {(props.reason === "not-installed" || props.reason === "update") && <div>
      <div><b>Health Connect {props.reason === "update" ? "needs an update" : "isn't on this phone yet"}.</b> On Android 14 and later it's built in (Settings → Security and privacy → Privacy → Health Connect). On Android 13 and earlier, install it from Google Play:</div>
      <a data-testid="hc-play-link" href={HC_PLAY_URL} target="_blank" rel="noopener noreferrer" style={Object.assign({}, btn, { display: "inline-flex", alignItems: "center", textDecoration: "none", marginTop: 6 })}>Get Health Connect on Google Play</a>
    </div>}
    {props.reason === "denied" && <div><b>Steps weren't allowed.</b> Open Health Connect → App permissions → Lifecare Companion → turn on <b>Steps</b>{props.calories ? " (and Active calories burned)" : ""}.</div>}
    <div style={{ marginTop: 8 }}><b>Using a Samsung phone or watch?</b> Samsung Health has to share with Health Connect: open <b>Samsung Health → Settings → Health Connect</b> and allow <b>Steps</b>. Google Fit and most watches do the same from their own settings.</div>
    {props.onOpenSettings && <button type="button" data-testid="hc-open-settings" style={Object.assign({}, btn, { marginTop: 8 })} onClick={props.onOpenSettings}>Open Health Connect settings</button>}
  </div>);
}

export default function StepsCard(props) {
  usePlan();
  var data = props.data;
  var [st, setSt] = useState(deviceSettings());
  var [guide, setGuide] = useState(null);
  var [msg, setMsg] = useState("");
  var [busy, setBusy] = useState(false);
  var [del, setDel] = useState(false);
  var people = peopleOf(data);
  var connected = st.source !== "none" && st.source !== "manual" && !!st.person;
  var who = people.find(function(x) { return x.key === st.person; });
  var today = st.person && data && data[st.person] && data[st.person].dailyActivity && data[st.person].dailyActivity[isoDay(new Date())];
  var update = function(patch) { setSt(saveDeviceSettings(patch)); };
  useEffect(function() { var on = function() { setSt(deviceSettings()); }; window.addEventListener("lc-steps-sync", on); return function() { window.removeEventListener("lc-steps-sync", on); }; }, []);

  if (!planAllows("healthSync")) return (<div data-testid="steps-card" style={card}><div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>👟 Connect my steps</div><GatePrompt feature="healthSync" /></div>);

  var doConnect = async function() {
    setBusy(true); setMsg(""); setGuide(null);
    try {
      var health = await getHealth();
      var a = await availability(health);
      if (!a.ok) { setGuide(a.reason); return; }
      var r = await connect(health, st.activeCalories);
      if (!r.ok) { setGuide("denied"); return; }
      update({ source: nativeSource(), connectedAt: Date.now() });
      var s = await syncSteps(window._lcData || data, window._lcSaveData || props.saveData, { health: health });
      setMsg(s.ok ? "✓ Connected. Steps for the last " + s.days + " days are in." : "✓ Connected.");
    } catch (e) { setMsg(String((e && e.message) || e)); } finally { setBusy(false); }
  };
  var doSync = async function() { setBusy(true); setMsg(""); try { var s = await syncSteps(window._lcData || data, window._lcSaveData || props.saveData); setMsg(s.ok ? "✓ Up to date." : "Not synced: " + s.skipped); } catch (e) { setMsg(String((e && e.message) || e)); } setBusy(false); };
  var doDisconnect = async function() {
    var label = SOURCES[st.source] ? SOURCES[st.source].label : "";
    if (del && st.person && data && data[st.person]) {
      var nd = JSON.parse(JSON.stringify(window._lcData || data)); var n = removeDays(nd[st.person], label);
      await (window._lcSaveData || props.saveData)(nd);
      setMsg("Disconnected. " + n + " stored daily total" + (n === 1 ? "" : "s") + " deleted.");
    } else setMsg("Disconnected. Your stored daily totals are kept.");
    update({ source: "none", connectedAt: null, lastSync: null });
    setDel(false);
  };
  var openSettings = async function() { try { var h = await getHealth(); if (h && h.openHealthConnectSettings) await h.openHealthConnectSettings(); } catch (e) { setMsg("Couldn't open Health Connect settings."); } };

  return (<div data-testid="steps-card" style={card}>
    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>👟 Connect my steps</div>
    <div style={small}>Reads only your <b>daily step total</b> (and, if you choose, daily active calories) for today and the last 7 days, each time you open the app. One total per day is kept; nothing else leaves your phone. Steps make your calorie goal follow how active you really were.</div>

    {people.length > 1 && <fieldset data-testid="steps-whose" style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", marginTop: 10 }}>
      <legend style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", padding: "0 4px" }}>Whose steps are on this phone?</legend>
      {people.map(function(x) { return <label key={x.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginRight: 16, minHeight: 44, fontSize: 13 }}>
        <input type="radio" name="steps-whose" checked={st.person === x.key} onChange={function() { update({ person: x.key }); }} /> {x.name}</label>; })}
      <div style={{ fontSize: 11, color: "#475569" }}>Saved on this phone only. Steps are written only to this person.</div>
    </fieldset>}

    <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, minHeight: 44, fontSize: 13 }}>
      <input type="checkbox" data-testid="steps-calories" checked={!!st.activeCalories} onChange={function(e) { update({ activeCalories: e.target.checked }); }} />
      Also read daily active calories (watch users; replaces the steps estimate on those days)
    </label>

    {connected
      ? <div data-testid="steps-connected" style={{ marginTop: 8, padding: 10, borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 13, color: "#0f172a" }}>
          Connected: <b>{SOURCES[st.source].label}</b> · steps for <b>{who ? who.name : st.person}</b>
          {today && today.steps != null && <div>Today: <b>{today.steps.toLocaleString("en-GB")}</b> steps{today.activeKcal != null ? " · " + today.activeKcal + " active kcal" : ""}</div>}
          {st.lastSync && <div style={{ fontSize: 11, color: "#475569" }}>Last synced {new Date(st.lastSync).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <button type="button" data-testid="steps-sync" disabled={busy} style={btn} onClick={doSync}>Sync now</button>
            <button type="button" data-testid="steps-disconnect" style={Object.assign({}, btn, { borderColor: "#b91c1c", color: "#b91c1c" })} onClick={doDisconnect}>Disconnect</button>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 12 }}><input type="checkbox" data-testid="steps-delete" checked={del} onChange={function(e) { setDel(e.target.checked); }} /> When disconnecting, also delete the stored daily totals</label>
        </div>
      : <button type="button" data-testid="steps-connect" disabled={busy || (people.length > 1 && !st.person)} style={Object.assign({}, btnP, { marginTop: 8 })} onClick={doConnect}>{busy ? "Connecting…" : "Connect my steps"}</button>}
    {!connected && people.length > 1 && !st.person && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Choose whose steps first.</div>}
    {guide && <Guide reason={guide} calories={st.activeCalories} onOpenSettings={guide === "denied" || guide === "update" ? openSettings : null} />}
    {!guide && !connected && <button type="button" style={{ background: "none", border: "none", color: "#1d4ed8", fontSize: 12, padding: "6px 0", cursor: "pointer" }} onClick={function() { setGuide(nativeSource() === "none" ? "web" : "not-installed"); }}>Steps not showing? How to fix it</button>}
    {msg && <div role="status" aria-live="polite" data-testid="steps-msg" style={{ marginTop: 8, fontSize: 12, color: "#0f172a" }}>{msg}</div>}
  </div>);
}
