import React, { useState } from "react";
import { planAllows } from "../lib/myPlan.js";
import { GatePrompt } from "./PlanGate.jsx";
import { HC_PLAY_URL, availability, connect, deviceSettings, getHealth, nativeSource, peopleOf, readDays, saveDeviceSettings, syncSteps } from "../lib/steps.js";
import { connectWeighIns, syncWeighIns, weighInsOn } from "../lib/weighIns.js";
import { isoDay } from "../lib/calories.js";

// v2.32.0 (Architect, 18 Nov — GUIDED HEALTH SETUP + SCALES): onboarding (after consent, if health sync was chosen) and
// Settings → Connect my health data. Silver and up. Skippable at every step.
//   Android: Health Connect there? (Play Store link if not) → Allow → CHECK data arrives (last 24 h) → if none, the fix
//   for this phone's maker → "✓ Connected: today so far N steps".  iPhone: Allow → the same check → ✓.
//   Then: "Do you use smart scales or a weight app?" → Yes → weight permission → "✓ Found weigh-ins from [app]" or how to
//   turn on the scales app's sync. We never claim to see other apps before the person allows access.
var box = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14 };
var btn = { padding: "10px 14px", minHeight: 44, borderRadius: 8, border: "1px solid #1e3a5f", background: "#fff", color: "#1e3a5f", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" };
var btnP = Object.assign({}, btn, { background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", border: "none" });
var note = { marginTop: 10, padding: 10, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 13, color: "#0f172a", lineHeight: 1.5 };
var ok = Object.assign({}, note, { background: "#f0fdf4", border: "1px solid #bbf7d0" });
export var SCALES_APPS = "Fitdays, Renpho, Withings, Eufy, Garmin, Fitbit, Samsung Health";
var SAMSUNG_HEALTH = "https://play.google.com/store/apps/details?id=com.sec.android.app.shealth";

/** Which phone maker's fix to show (Android). */
export function makerOf(ua) {
  ua = String(ua || (typeof navigator !== "undefined" ? navigator.userAgent : ""));
  if (/SM-|Samsung|Galaxy/i.test(ua)) return "samsung";
  if (/Pixel/i.test(ua)) return "pixel";
  return "other";
}

export default function HealthSetup(props) {
  var data = props.data;
  var ios = nativeSource() === "healthKit";
  var people = peopleOf(data);
  var [st, setSt] = useState(deviceSettings());
  var [step, setStep] = useState(people.length > 1 && !st.person ? "whose" : "allow");
  var [msg, setMsg] = useState("");
  var [busy, setBusy] = useState(false);
  var [fix, setFix] = useState(null);
  var [stepsToday, setStepsToday] = useState(null);
  var [scales, setScales] = useState(null);   // null | "found" | "none"
  var [found, setFound] = useState(null);
  var update = function(p) { setSt(saveDeviceSettings(p)); };
  var done = function() { if (props.onDone) props.onDone(); };
  if (!planAllows("healthSync")) return (<div style={box} data-testid="health-setup"><b>Connect my health data</b><GatePrompt feature="healthSync" style={{ marginTop: 8 }} /><button type="button" style={Object.assign({}, btn, { marginTop: 8 })} onClick={done}>Skip for now</button></div>);
  var save = window._lcSaveData || props.saveData;

  var allow = async function() {
    if (busy) return; setBusy(true); setMsg(""); setFix(null);
    try {
      var health = await getHealth();
      var a = await availability(health);
      if (!a.ok) { setFix(a.reason); return; }
      var r = await connect(health, st.activeCalories);
      if (!r.ok) { setFix("denied"); return; }
      update({ source: nativeSource(), connectedAt: Date.now() });
      await check(health);
    } catch (e) { setMsg(String((e && e.message) || e)); } finally { setBusy(false); }
  };
  var check = async function(h) {
    var health = h || await getHealth();
    var days = await readDays(health, false);
    var today = isoDay(new Date()), y = new Date(); y.setDate(y.getDate() - 1); var yest = isoDay(y);
    var t = days[today] && days[today].steps, yv = days[yest] && days[yest].steps;
    if (!(t > 0) && !(yv > 0)) { setFix("no-data"); setStep("check"); return; }
    await syncSteps(window._lcData || data, save, { health: health });
    setStepsToday(t || 0); setFix(null); setStep("scales");
  };
  var openHC = async function() { try { var h = await getHealth(); if (h && h.openHealthConnectSettings) await h.openHealthConnectSettings(); } catch (e) { setMsg("Couldn't open Health Connect."); } };
  var yesScales = async function() {
    if (busy) return; setBusy(true); setMsg("");
    try {
      var health = await getHealth();
      var r = await connectWeighIns(health);
      if (!r.ok) { setScales("none"); setMsg("Weight wasn't allowed. You can allow it later in " + (ios ? "the Health app → Apps → Lifecare Companion." : "Health Connect → App permissions → Lifecare Companion.")); return; }
      update({ weighIns: true });
      var s = await syncWeighIns(window._lcData || data, save, { health: health });
      if (s.ok && s.latest) { setFound(s.latest); setScales("found"); } else setScales("none");
    } catch (e) { setMsg(String((e && e.message) || e)); } finally { setBusy(false); }
  };

  var maker = makerOf();
  return (<div style={box} data-testid="health-setup">
    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Connect my health data</div>
    <div style={{ fontSize: 12, color: "#475569", margin: "2px 0 8px" }}>We read only steps{st.activeCalories ? ", active calories" : ""} and, if you choose, weight and body fat. Nothing is ever written to {ios ? "Apple Health" : "Health Connect"}.</div>

    {step === "whose" && <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px" }}>
      <legend style={{ fontSize: 13, fontWeight: 700, padding: "0 4px" }}>Whose data is on this phone?</legend>
      {people.map(function(x) { return <label key={x.key} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 14 }}><input type="radio" name="hs-whose" data-testid={"hs-whose-" + x.key} checked={st.person === x.key} onChange={function() { update({ person: x.key }); }} /> {x.name}</label>; })}
      <button type="button" data-testid="hs-next" disabled={!st.person} style={Object.assign({}, btnP, { marginTop: 6, opacity: st.person ? 1 : 0.5 })} onClick={function() { setStep("allow"); }}>Continue</button>
    </fieldset>}

    {step === "allow" && <div>
      <div style={{ fontSize: 13, color: "#0f172a" }}>{ios ? "Apple Health will ask you which data to share. Allow Steps." : "Health Connect will ask you which data to share. Allow Steps."}</div>
      <button type="button" data-testid="hs-allow" disabled={busy} style={Object.assign({}, btnP, { marginTop: 8 })} onClick={allow}>{busy ? "Checking…" : "Allow"}</button>
    </div>}

    {fix === "web" && <div data-testid="hs-fix-web" style={note}>Health data comes from your phone. Open <b>Lifecare Companion on your phone</b> (Google Play or the App Store) and connect there.</div>}
    {(fix === "not-installed" || fix === "update") && !ios && <div data-testid="hs-fix-install" style={note}><b>Health Connect {fix === "update" ? "needs an update" : "isn't on this phone yet"}.</b> On Android 14 and later it's built in; on older phones get it from Google Play, then come back and tap Allow again.<div><a data-testid="hs-play-link" href={HC_PLAY_URL} target="_blank" rel="noopener noreferrer" style={Object.assign({}, btn, { marginTop: 8 })}>Get Health Connect</a></div></div>}
    {fix === "unsupported" && ios && <div style={note}><b>Apple Health isn't available on this device</b> (iPads don't have it). Use the app on your iPhone.</div>}
    {fix === "denied" && <div data-testid="hs-fix-denied" style={note}><b>Steps weren't allowed.</b> {ios ? <>Open the <b>Health</b> app → tap your picture → <b>Apps</b> → <b>Lifecare Companion</b> → turn on <b>Steps</b>.</> : <>Open Health Connect → <b>App permissions</b> → <b>Lifecare Companion</b> → turn on <b>Steps</b>.</>}
      {!ios && <div><button type="button" style={Object.assign({}, btn, { marginTop: 8 })} onClick={openHC}>Open Health Connect</button></div>}</div>}
    {fix === "no-data" && <div data-testid="hs-fix-nodata" style={note}><b>Connected, but no steps have arrived in the last 24 hours.</b>
      {ios ? <div>Carry your iPhone for a few minutes, or check the <b>Health</b> app → <b>Browse</b> → <b>Activity</b> → <b>Steps</b> shows today's steps.</div>
        : maker === "samsung" ? <div data-testid="hs-fix-samsung">On a Samsung phone, <b>Samsung Health</b> counts your steps: open <b>Samsung Health → ⋮ → Settings → Health Connect</b> and allow it to share <b>Steps</b>.<div><a href={SAMSUNG_HEALTH} target="_blank" rel="noopener noreferrer" style={Object.assign({}, btn, { marginTop: 8 })}>Open Samsung Health</a></div></div>
        : maker === "pixel" ? <div data-testid="hs-fix-pixel">On a Pixel, steps come from <b>Fitbit</b> or <b>Google Fit</b>: open it → <b>Settings</b> → <b>Health Connect</b> and turn on sync.</div>
        : <div data-testid="hs-fix-other">Your phone's own health app counts steps: open it and turn on <b>Sync to Health Connect</b> (often under Settings → Health Connect).</div>}
      {!ios && <div><button type="button" data-testid="hs-open-hc" style={Object.assign({}, btn, { marginTop: 8 })} onClick={openHC}>Open Health Connect</button></div>}
      <button type="button" data-testid="hs-check-again" disabled={busy} style={Object.assign({}, btnP, { marginTop: 8 })} onClick={function() { setBusy(true); check().catch(function(e) { setMsg(String(e)); }).then(function() { setBusy(false); }); }}>Check again</button></div>}

    {step === "scales" && <div>
      <div data-testid="hs-connected" role="status" style={ok}>✓ Connected: today so far <b>{(stepsToday || 0).toLocaleString("en-GB")}</b> steps.</div>
      {weighInsOn() && scales === null && <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Do you use smart scales or a weight app?</div>
        <div style={{ fontSize: 12, color: "#475569" }}>For example {SCALES_APPS}. If they share with {ios ? "Apple Health" : "Health Connect"}, your weigh-ins can arrive here automatically.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <button type="button" data-testid="hs-scales-yes" disabled={busy} style={btnP} onClick={yesScales}>{busy ? "Checking…" : "Yes"}</button>
          <button type="button" data-testid="hs-scales-no" style={btn} onClick={done}>No</button>
        </div></div>}
      {scales === "found" && found && <div data-testid="hs-scales-found" role="status" style={ok}>✓ Found weigh-ins from <b>{found.source}</b> — latest {found.kg} kg{found.fatPct != null ? " · " + found.fatPct + "% body fat" : ""}. They'll arrive automatically.</div>}
      {scales === "none" && <div data-testid="hs-scales-none" style={note}><b>No weigh-ins yet.</b> Turn on {ios ? "Apple Health" : "Health Connect"} sync in your scales app (for example in Fitdays or Renpho: Settings → {ios ? "Apple Health" : "Health Connect"}), weigh yourself, then open Lifecare Companion again.
        {!ios && <div><button type="button" style={Object.assign({}, btn, { marginTop: 8 })} onClick={openHC}>Open Health Connect</button></div>}</div>}
      {(scales !== null || !weighInsOn()) && <button type="button" data-testid="hs-done" style={Object.assign({}, btnP, { marginTop: 10 })} onClick={done}>Done</button>}
    </div>}

    {msg && <div role="status" style={{ marginTop: 8, fontSize: 12, color: "#0f172a" }}>{msg}</div>}
    {step !== "scales" && <button type="button" data-testid="hs-skip" style={{ marginTop: 10, background: "none", border: "none", color: "#1d4ed8", fontSize: 13, minHeight: 44, cursor: "pointer", padding: 0 }} onClick={done}>Skip for now</button>}
  </div>);
}
