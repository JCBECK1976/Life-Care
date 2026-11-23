import React, { useEffect, useState } from "react";
import LegalViewer from "./LegalViewer.jsx";
import { optins, LEGAL_LABEL, needsOnboarding, saveAccountConsent } from "../lib/accountConsent.js";
import { usePlan, loadPlan, planAllows } from "../lib/myPlan.js";
import HealthSetup from "./HealthSetup.jsx";
import { SetupChoice } from "./SetupGuide.jsx";
import { weighInsOn } from "../lib/weighIns.js";
import { nativeSource } from "../lib/steps.js";
import { auth } from "../lib/firebase.js";
import { storeAgeSignal } from "../lib/ageSignal.js";

// v2.24.0 (Step 4, DPIA §3/§7; flag useOnboarding): first sign-in of a NEW individual account. Never shown to the
// shared joint/admin account. 1) 18+  2) Terms + Privacy (versions recorded)  3) separate opt-ins  → then the existing
// mandatory goal setup (it opens by itself when the profile isn't set up).
var page = { position: "fixed", inset: 0, zIndex: 2100, background: "#f1f5f9", overflowY: "auto" };   // v2.27.2: above the chat button (no chat before consent)
var wrap = { maxWidth: 480, margin: "0 auto", padding: 16 };
var cardS = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "4px 12px", marginTop: 10 };
var row = { display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#0f172a", minHeight: 44 };
var btnP = { width: "100%", marginTop: 12, padding: 12, minHeight: 48, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" };
var link = { flex: 1, padding: 10, minHeight: 44, borderRadius: 8, border: "1px solid #bfdbfe", background: "#fff", color: "#1d4ed8", fontWeight: 600, cursor: "pointer" };

export default function Onboarding() {
  var plan = usePlan();
  var [step, setStep] = useState(1);
  var [adult, setAdult] = useState(null);       // true | false
  var [agree, setAgree] = useState(false);
  var [ch, setCh] = useState({ ai: false, photos: false, health: false, bodyBalance: false, symptoms: false });
  var [view, setView] = useState(null);
  var [busy, setBusy] = useState(false);
  var [err, setErr] = useState("");
  useEffect(function() { setStep(1); }, [plan.loaded]);
  /* v2.35.0: the app store's age signal (Play Age Signals / Apple Declared Age Range) — under 18 = refused kindly */
  var [store, setStore] = useState({ verdict: "checking" });
  var needed = plan.loaded && needsOnboarding();
  useEffect(function() { if (!needed) return undefined; var live = true; storeAgeSignal().then(function(r) { if (live) setStore(r); }); return function() { live = false; }; }, [needed]);
  if (!plan.loaded || (!needsOnboarding() && step !== 4 && step !== 5)) return null;   /* step 5 (v2.38.0): the start choice; step 4 (v2.32.0): the guided health setup */
  var healthNow = ch.health && weighInsOn() && planAllows("healthSync") && nativeSource() !== "none";
  var choose = function(path) {   /* the set-up itself continues on the main screen (SetupGuide), saved per step */
    window._lcSetupChoice = path; window.dispatchEvent(new CustomEvent("lc-setup-choice", { detail: { path: path, wait: path !== "explore" && !!healthNow } }));
    if (path !== "explore" && healthNow) setStep(4); else setStep(6);
  };
  var set = function(k, v) { var n = Object.assign({}, ch); n[k] = v; if (k === "ai" && !v) { n.photos = false; n.bodyBalance = false; } if (k === "photos" && !v) n.bodyBalance = false; setCh(n); };
  var needs = { photos: !ch.ai, bodyBalance: !ch.ai || !ch.photos };

  return (<div role="dialog" aria-modal="true" aria-labelledby="ob-title" data-testid="onboarding" style={page}>
    <div style={wrap}>
      <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>{step === 4 ? "Optional" : step === 5 ? "You're in" : "Step " + step + " of 3"}</div>
      {step === 1 && <>
        <h2 id="ob-title" style={{ fontSize: 20, margin: "4px 0 6px", color: "#0f172a" }}>Welcome to Lifecare Companion</h2>
        {store.verdict !== "under18" && <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>Lifecare Companion is for adults. Please confirm your age.</div>}
        {store.verdict === "under18" ? <div role="alert" data-testid="ob-store-under18" style={{ marginTop: 10, padding: 14, borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 14, lineHeight: 1.55, color: "#0f172a" }}>
          <b>Sorry, Lifecare Companion is only for adults.</b><br />
          Your {store.source === "apple" ? "Apple account" : "Google Play account"} says you're under 18, so we can't set up an account for you. Nothing has been saved.<br />
          If that's not right, the age can be updated in your {store.source === "apple" ? "Apple Account settings" : "Google Account settings"}, or by the family organiser.
          <button type="button" onClick={function() { auth.signOut(); }} style={Object.assign({}, link, { display: "block", marginTop: 10, flex: "none", width: "100%" })}>Sign out</button></div>
        : <><div role="radiogroup" aria-label="Your age" aria-busy={store.verdict === "checking"} style={cardS}>
          <label style={row}><input type="radio" name="ob-age" data-testid="ob-adult" disabled={store.verdict === "checking"} checked={adult === true} onChange={function() { setAdult(true); }} style={{ width: 20, height: 20 }} /> I am 18 or over</label>
          <label style={Object.assign({}, row, { borderBottom: "none" })}><input type="radio" name="ob-age" data-testid="ob-under18" disabled={store.verdict === "checking"} checked={adult === false} onChange={function() { setAdult(false); }} style={{ width: 20, height: 20 }} /> I am under 18</label>
        </div>
        {store.verdict === "checking" && <div role="status" style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>Checking with your app store…</div>}</>}
        {adult === false && <div role="alert" data-testid="ob-too-young" style={{ marginTop: 10, padding: 12, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 13, color: "#0f172a" }}>
          Sorry, Lifecare Companion is only for people aged 18 and over. Nothing has been saved.
          <button type="button" onClick={function() { auth.signOut(); }} style={Object.assign({}, link, { display: "block", marginTop: 8, flex: "none", width: "100%" })}>Sign out</button></div>}
        {store.verdict !== "under18" && <button type="button" data-testid="ob-next-1" disabled={adult !== true} style={Object.assign({}, btnP, { opacity: adult === true ? 1 : 0.5 })} onClick={function() { setStep(2); }}>Continue</button>}
      </>}
      {step === 2 && <>
        <h2 id="ob-title" style={{ fontSize: 20, margin: "4px 0 6px", color: "#0f172a" }}>Terms and privacy</h2>
        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>Your health data is yours. Please read how we look after it ({LEGAL_LABEL}).</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button type="button" style={link} onClick={function() { setView("privacy"); }}>Read the Privacy Notice</button>
          <button type="button" style={link} onClick={function() { setView("terms"); }}>Read the Terms</button>
        </div>
        <label style={Object.assign({}, row, { borderBottom: "none", marginTop: 6 })}>
          <input type="checkbox" data-testid="ob-agree" checked={agree} onChange={function(e) { setAgree(e.target.checked); }} style={{ width: 20, height: 20, marginTop: 2 }} />
          <span>I have read the <b>Privacy Notice</b> and agree to the <b>Terms of Use</b>.</span></label>
        <button type="button" data-testid="ob-next-2" disabled={!agree} style={Object.assign({}, btnP, { opacity: agree ? 1 : 0.5 })} onClick={function() { setStep(3); }}>Continue</button>
      </>}
      {step === 3 && <>
        <h2 id="ob-title" style={{ fontSize: 20, margin: "4px 0 6px", color: "#0f172a" }}>Your choices</h2>
        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>Each one is separate and off until you turn it on. You can change any of them later in <b>Settings → Privacy &amp; your data</b>. Without AI processing the app still works for manual tracking.</div>
        <div style={cardS}>
          {optins().map(function(o) { var dis = !!needs[o.k]; return (<label key={o.k} style={Object.assign({}, row, { opacity: dis ? 0.55 : 1 })}>
            <input type="checkbox" data-testid={"ob-" + o.k} disabled={dis} checked={!!ch[o.k]} onChange={function(e) { set(o.k, e.target.checked); }} style={{ width: 20, height: 20, marginTop: 2 }} />
            <span><b>{o.label}</b><br /><span style={{ color: "#475569", fontSize: 12 }}>{o.hint}</span></span></label>); })}
        </div>
        {!ch.ai && <div data-testid="ob-no-ai-note" style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 12, color: "#0f172a" }}>That's fine: you can track your health, eating and exercise by hand. The Companion's feedback and other AI features stay off until you turn AI processing on.</div>}
        {err && <div role="alert" style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>{err}</div>}
        <button type="button" data-testid="ob-finish" disabled={busy} style={btnP} onClick={async function() { setBusy(true); setErr(""); try { await saveAccountConsent(ch); await loadPlan(); setBusy(false); setStep(5); }   /* v2.38.0 (brief P5c): then "How would you like to get started?" */ catch (e) { setErr("Couldn't save: " + ((e && e.message) || e)); setBusy(false); } }}>{busy ? "Saving…" : "Continue to set up your goals"}</button>
      </>}
      {step === 5 && <>
        <h2 id="ob-title" style={{ fontSize: 20, margin: "4px 0 6px", color: "#0f172a" }}>How would you like to get started?</h2>
        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>You can change your mind later: Settings → Set-up guide.</div>
        <SetupChoice onChoose={choose} />
      </>}
      {step === 4 && <div style={{ marginTop: 8 }}><HealthSetup data={window._lcData} saveData={window._lcSaveData} onDone={function() { window.dispatchEvent(new CustomEvent("lc-setup-health-done")); setStep(6); }} /></div>}
    </div>
    {view && <LegalViewer which={view} onClose={function() { setView(null); }} />}
  </div>);
}
