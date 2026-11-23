import React from "react";
import { btnP, btnS, btnAction, btnEdit, btnOpen, btnSnap, btnProgress, btnLog, btnFilledOn, btnDelete, btnMuted, btnClose, btnClear } from "../constants/styles.js";
import { sColor, sBg, sLabel } from "../lib/utils.js";
import { MOOD_EMOJIS } from "../constants/mood.js";

// v2.38.0 (Architect brief 23 Nov, PART 5a): "How Lifecare works" — the app's REAL controls (the same shared styles the
// screens use), grouped, one plain line each, generic meanings. No AI, all plans. Shown once in onboarding (after the
// profile, on every path) and always at the top of Help. The samples are pictures of controls, not working buttons.
var sample = function(style, text) { return <span aria-hidden="true" style={Object.assign({}, style, { display: "inline-flex", width: "auto", cursor: "default", whiteSpace: "nowrap", margin: 0 }, style && style.width === "100%" ? { padding: "6px 12px", fontSize: 11 } : {})}>{text}</span>; };
var pill = function(s) { return <span aria-hidden="true" style={{ fontSize: 9, fontWeight: 600, color: sColor(s), background: sBg(s), padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", border: "1px solid " + sColor(s) + "40" }}>{sLabel(s)}</span>; };
var chip = function(text, on) { return <span aria-hidden="true" style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: on ? "#dcfce7" : "#fef3c7", color: on ? "#15803d" : "#b45309", border: "1px solid " + (on ? "#86efac" : "#fcd34d") }}>{text}</span>; };
var tab = function(text, on) { return <span aria-hidden="true" style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: on ? "#fff" : "transparent", color: on ? "#0f172a" : "#475569", border: "1px solid #cbd5e1" }}>{text}</span>; };
var rag = function(c, t) { return <span aria-hidden="true" style={{ fontSize: 10, fontWeight: 700, color: c }}>{t}</span>; };

/** The groups: [title, [[sample(s), name, meaning]]]. Exported for the tests (every item in the brief is here). */
export var GUIDE = [
  ["Looking and changing", [
    [sample(btnProgress, "👁 Progress"), "Progress", "History and trends for that item."],
    [sample(btnOpen, "Open"), "Open", "Review an item, and edit it from there."],
    [sample(btnEdit, "✎ Edit"), "Edit", "Change what's there."],
    [sample(btnMuted, "Remove"), "Remove", "Take it out of this selection only; your lists keep it."],
    [sample(btnDelete, "🗑 Delete"), "Delete", "Permanently, after asking you first."],
    [sample(btnMuted, "Undo"), "Undo", "Shown for a few seconds after a change: puts it back."],
  ]],
  ["Adding and recording", [
    [<>{sample(btnAction, "Add")} {sample(btnMuted, "+ Add New")}</>, "Add / + Add New / + Add Exercise / + Add Week", "Add something new to that list or week."],
    [sample(btnLog, "📋 Log"), "Log", "Record an entry (a weigh-in, a session, a measurement)."],
    [sample(btnSnap, "📷 Snap"), "Snap", "A photo of an item, analysed and never stored."],
    [sample(btnMuted, "📷 Upload"), "Upload", "Information or images for analysis, never stored."],
    [sample(btnMuted, "+ Not in my list?"), "+ Not in my list?", "Add a food that isn't in that list yet."],
    [<>{tab("Single item", true)} {tab("Build a meal")} {tab("My own")}</>, "Single item / Build a meal / My own", "Three ways to add food to your lists."],
  ]],
  ["Planning your week", [
    [<>{sample(btnMuted, "📋 Copy Day")} {sample(btnMuted, "Copy Week")}</>, "Copy Day / Copy Week", "Repeat a day or a week you've planned."],
    [sample(btnMuted, "Default: Individual"), "Default (Individual / All)", "What a new day starts with: just you, or everyone."],
    [sample(btnClear, "Clear Week"), "Clear Week", "Empty the week's plan (asks first)."],
    [<>{tab("‹")} {tab("Week 19", true)} {tab("›")} {tab("Mon")} {tab("Tue", true)}</>, "Week ‹ › and day tabs", "Move between weeks and days."],
    [sample(btnP(true), "Help Me with What to Eat"), "Help Me with What to Eat", "Ideas for a meal, from your lists and goal."],
    [sample(btnMuted, "Quick Prep Days"), "Quick Prep Days", "Mark days when you need something fast."],
    [sample(btnMuted, "🛒 Shopping generator"), "Shopping generator (Gold)", "A shopping list built from your week."],
    [sample(btnAction, "🔄 Generate Warm-up & Cool-down"), "Generate Warm-up & Cool-down", "A warm-up and cool-down for that session."],
  ]],
  ["Checking food", [
    [<>{rag("#15803d", "● GOOD")} {rag("#b45309", "● AMBER")} {rag("#b91c1c", "● RED")}</>, "RAG colours", "Green, amber, red: how well a food suits your goal (always with the word too)."],
    [sample(btnMuted, "🔄 Re-rate all lists"), "Re-rate all lists", "Re-rate every food for your profile and goal."],
    [sample(btnMuted, "🔎 Re-check nutrition"), "Re-check nutrition", "Look up a food's nutrition again."],
    [<span aria-hidden="true" style={{ fontSize: 10, fontWeight: 700, color: "#9a3412", background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 6, padding: "1px 6px" }}>Check me</span>, "Check / Check me badge", "Something to confirm, e.g. portions."],
    [<>{sample(btnP(true), "Confirm")} {sample(btnMuted, "Re-check")} {sample(btnS, "Cancel")}</>, "Confirm / Re-check / Cancel", "For photo results: keep it, look again, or keep nothing."],
  ]],
  ["Exercise", [
    [<>{pill("building")} {pill("ready to move")} {pill("moved up")} {pill("consolidating")} {pill("building back up")}</>, "Status pills", "Where each exercise is: building reps, ready to move up, just moved up, confirming, or building back into your range."],
    [<>{chip("Working towards")} {chip("Good", true)}</>, "Range / Form", "How the reps felt: still working towards it, or good."],
    [sample(btnMuted, "Set"), "Set (next weight)", "Choose your next weight yourself."],
    [sample(btnMuted, "Skipped"), "Skipped", "You didn't do it this week. It doesn't count against you."],
  ]],
  ["Your Companion", [
    [sample(btnP(true), "My Companion Feedback"), "My Companion Feedback", "Your Companion's view of a section, or of everything on Home."],
    [<span aria-hidden="true" style={{ display: "inline-flex", width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", fontSize: 13 }}>💬</span>, "Chat 💬", "Talk to your Companion about anything in the app."],
    [sample(btnMuted, "Help ?"), "Help", "This guide, the user guide, and (Silver and up) asking the Companion."],
    [<span aria-hidden="true" style={{ display: "inline-block", width: 90, height: 6, borderRadius: 3, background: "linear-gradient(90deg, #22c55e 70%, #e2e8f0 70%)" }} />, "Energy meter", "This month's Companion Energy left; top up in My Plan."],
    [<span aria-hidden="true" style={{ fontSize: 10, color: "#475569" }}>🔒 Part of Silver · <u>See plans</u></span>, "🔒 plan prompts / See plans", "A feature in a higher plan; See plans shows what each includes."],
  ]],
  ["Getting around", [
    [<>{tab("JC", true)} {tab("Becks")}</>, "Person tabs", "Whose data you're looking at."],
    [<span aria-hidden="true" style={{ fontSize: 16 }}>⚙</span>, "Settings ⚙", "Your plan, privacy, account and app settings."],
    [<span aria-hidden="true" style={{ fontSize: 11 }}>{MOOD_EMOJIS.join(" ")}</span>, "Mood", "How you feel today, one tap."],
    [sample(btnMuted, "+ Add Journal Entry"), "Journal", "A note for the day; your Companion can read it."],
    [<span aria-hidden="true" style={{ fontSize: 10, color: "#334155" }}>Planned 1,963 · Actual 1,240</span>, "Today table (Planned vs Actual)", "Your day's calories: what you planned and what you've logged."],
  ]],
];
export var GUIDE_NAMES = GUIDE.reduce(function(a, g) { return a.concat(g[1].map(function(r) { return r[1]; })); }, []);

/** The guide itself (inline in Help, or inside the onboarding dialog). */
export default function HowItWorks(props) {
  return (<div data-testid="how-it-works" style={props.style}>
    {props.intro !== false && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#334155" }}>The same buttons and labels appear all through the app. Here's what each one does.</p>}
    {GUIDE.map(function(g) { return (<section key={g[0]} aria-label={g[0]} style={{ marginBottom: 10 }}>
      <h3 style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>{g[0]}</h3>
      <dl style={{ margin: 0 }}>{g[1].map(function(r) { return (<div key={r[1]} data-testid="hiw-item" style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
        <dt style={{ flex: "0 0 auto", maxWidth: "100%", display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", minHeight: 22 }}>{r[0]}<span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{r[1]}</span></dt>
        <dd style={{ margin: 0, flex: "1 1 160px", fontSize: 12, color: "#334155" }}><b style={{ color: "#0f172a" }}>{r[1]}:</b> {r[2]}</dd>
      </div>); })}</dl>
    </section>); })}
  </div>);
}

/** The once-only dialog (onboarding): focus moves in, Tab stays inside, Esc / ✕ close it. */
export function HowItWorksDialog(props) {
  var ref = React.useRef(null);
  React.useEffect(function() {
    var el = ref.current; if (!el) return undefined;
    var prev = document.activeElement; var first = el.querySelector("button"); if (first) first.focus();
    var key = function(e) {
      if (e.key === "Escape") { e.preventDefault(); props.onClose(); return; }
      if (e.key !== "Tab") return;
      var f = el.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    el.addEventListener("keydown", key);
    return function() { el.removeEventListener("keydown", key); if (prev && prev.focus) prev.focus(); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  return (<div style={{ position: "fixed", inset: 0, zIndex: 2200, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="hiw-title" data-testid="how-it-works-dialog" style={{ background: "#fff", width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", borderRadius: "16px 16px 0 0", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h2 id="hiw-title" style={{ fontSize: 17, margin: 0, color: "#0f172a" }}>How Lifecare works</h2>
        <button type="button" aria-label="Close the guide" data-testid="how-it-works-close" onClick={props.onClose} style={Object.assign({}, btnClose, { fontSize: 14, padding: "4px 8px" })}>✕</button>
      </div>
      <HowItWorks />
      <p style={{ fontSize: 11, color: "#475569", margin: "8px 0 0" }}>You can see this again any time: <b>Help</b>, at the top.</p>
      <button type="button" onClick={props.onClose} style={Object.assign({}, btnP(true), { width: "100%", marginTop: 10, padding: 12 })}>Got it</button>
    </div>
  </div>);
}
