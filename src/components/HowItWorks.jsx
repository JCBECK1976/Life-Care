import React from "react";
import { btnP, btnS, btnAction, btnEdit, btnOpen, btnSnap, btnProgress, btnLog, btnFilledOn, btnDelete, btnMuted, btnClose, btnClear } from "../constants/styles.js";
import { PILLS, SKIPPED_PILL } from "../lib/pills.js";
import { MOOD_EMOJIS } from "../constants/mood.js";

// v2.45.0 (night batch P7): sections, a 3-column table, a filtering search. v2.38.0 (Architect brief 23 Nov, PART 5a): "How Lifecare works" — the app's REAL controls (the same shared styles the
// screens use), grouped, one plain line each, generic meanings. No AI, all plans. Shown once in onboarding (after the
// profile, on every path) and always at the top of Help. The samples are pictures of controls, not working buttons.
var sample = function(style, text) { return <span aria-hidden="true" style={Object.assign({}, style, { display: "inline-flex", width: "auto", cursor: "default", whiteSpace: "nowrap", margin: 0 }, style && style.width === "100%" ? { padding: "6px 12px", fontSize: 11 } : {})}>{text}</span>; };
var pill = function(s) { var p = s === "skipped" ? SKIPPED_PILL : PILLS[s]; return <span aria-hidden="true" style={{ fontSize: 9, fontWeight: 600, color: p.color, background: p.bg, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", border: "1px solid " + p.color + "40" }}>{p.label}</span>; };
var chip = function(text, on) { return <span aria-hidden="true" style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: on ? "#dcfce7" : "#fef3c7", color: on ? "#15803d" : "#b45309", border: "1px solid " + (on ? "#86efac" : "#fcd34d") }}>{text}</span>; };
var tab = function(text, on) { return <span aria-hidden="true" style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: on ? "#fff" : "transparent", color: on ? "#0f172a" : "#475569", border: "1px solid #cbd5e1" }}>{text}</span>; };
var rag = function(c, t) { return <span aria-hidden="true" style={{ fontSize: 10, fontWeight: 700, color: c }}>{t}</span>; };

/** The sections: [title, [[sample(s), name, what it does, where you'll see it]]]. Exported for the tests.
 *  v2.45.0 (night batch P7): Everywhere · Eating · Exercise · Body & Health · Your Companion · Home · Account & plans. */
export var GUIDE = [
  ["Everywhere", [
    [sample(btnProgress, "👁 Progress"), "Progress", "History and trends for that item.", "Every list: exercises, body stats, foods"],
    [sample(btnOpen, "Open"), "Open", "Review an item, and edit it from there.", "Lists, history weeks, saved items"],
    [sample(btnEdit, "✎ Edit"), "Edit", "Change what's there.", "Inside Open, and on cards"],
    [sample(btnMuted, "Remove"), "Remove", "Take it out of this selection only; your lists keep it.", "Day plans and selections"],
    [sample(btnDelete, "🗑 Delete"), "Delete", "Permanently, after asking you first.", "Your lists and records"],
    [sample(btnMuted, "Undo"), "Undo", "Shown for a few seconds after a change: puts it back.", "A few seconds after a change"],
    [<>{sample(btnAction, "Add")} {sample(btnMuted, "+ Add New")}</>, "Add / + Add New / + Add Exercise / + Add Week", "Add something new to that list or week.", "Under each list or day"],
    [sample(btnLog, "📋 Log"), "Log", "Record an entry (a weigh-in, a session, a measurement).", "My Exercise, My Body"],
    [sample(btnSnap, "📷 Snap"), "Snap", "A photo of an item, analysed and never stored.", "The eating picker's action bar, Food Checker"],
    [sample(btnMuted, "📷 Upload"), "Upload", "Information or images for analysis, never stored.", "My Body, My Health"],
    [sample(btnMuted, "Help ?"), "Help", "This guide, the user guide, and (Silver and up) asking the Companion.", "Top of every screen"],
    [<>{tab("JC", true)} {tab("Becks")}</>, "Person tabs", "Whose data you're looking at.", "Under the header"],
    [<>{tab("‹")} {tab("Week 19", true)} {tab("›")} {tab("Mon")} {tab("Tue", true)}</>, "Week ‹ › and day tabs", "Move between weeks and days.", "My Eating, My Exercise"],
  ]],
  ["Eating", [
    [<span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 11, color: "#475569" }}>Add breakfast… <b style={{ color: "#1e3a5f" }}>+</b></span>, "Eating row (✎ / +)", "One box per item: + adds, ✎ changes. Tap it to open the picker.", "My Eating days and Week → Set Defaults"],
    [<span aria-hidden="true" style={{ fontSize: 11, color: "#1e3a5f" }}>📷 Snap · ♡ Favourites · + Add New · ✎ Edit Item · 🗑 Remove</span>, "Picker action bar", "At the top of the picker: Snap this row, show favourites only, add a food not in your list, edit the item right there in the picker, or remove it (and its row).", "The eating picker"],
    [<span aria-hidden="true" style={{ color: "#dc2626", fontSize: 13 }}>♥</span>, "♥ Favourite", "Tick ♥ Favourite when you save or edit an item; it shows with a red ♥ and the Favourites filter. Each person has their own.", "Update Eating Lists; the picker"],
    [sample(btnP(true), "Confirm"), "Confirm (portions)", "After you pick: say how many portions (e.g. 3 biscuits), then Confirm. A new blank row appears under the last one.", "The eating picker"],
    [sample(btnMuted, "+ Not in my list?"), "+ Not in my list?", "Add a food that isn't in that list yet.", "Food pickers"],
    [<>{tab("Single item", true)} {tab("Build a meal")} {tab("My own")}</>, "Single item / Build a meal / My own", "Three ways to add food to your lists.", "My Eating → Update Lists"],
    [<>{sample(btnMuted, "📋 Copy Day")} {sample(btnMuted, "Copy Week")}</>, "Copy Day / Copy Week", "Repeat a day or a week you've planned.", "My Eating, above the days"],
    [sample(btnMuted, "Default: Individual"), "Default (Individual / All)", "What a new day starts with: just you, or everyone.", "My Eating, each day"],
    [sample(btnClear, "Clear Week"), "Clear Week", "Empty the week's plan (asks first).", "My Eating, week view"],
    [sample(btnP(true), "Help Me with What to Eat"), "Help Me with What to Eat", "Ideas for a meal, from your lists and goal.", "My Eating"],
    [sample(btnMuted, "Quick Prep Days"), "Quick Prep Days", "Mark days when you need something fast.", "My Eating, week view"],
    [sample(btnMuted, "🛒 Shopping generator"), "Shopping generator (Gold)", "A shopping list built from your week.", "My Shop"],
    [<>{rag("#15803d", "● GOOD")} {rag("#b45309", "● AMBER")} {rag("#b91c1c", "● RED")}</>, "RAG colours", "Green, amber, red: how well a food suits your goal (always with the word too).", "Food lists, Food Checker, Snap results"],
    [sample(btnMuted, "🔄 Re-rate all lists"), "Re-rate all lists", "Re-rate every food for your profile and goal.", "My Eating → Update Lists"],
    [sample(btnMuted, "🔎 Re-check nutrition"), "Re-check nutrition", "Look up a food's nutrition again.", "My Eating → Update Lists"],
    [<span aria-hidden="true" style={{ fontSize: 10, fontWeight: 700, color: "#9a3412", background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 6, padding: "1px 6px" }}>Check me</span>, "Check / Check me badge", "Something to confirm, e.g. portions.", "Food lists"],
    [<>{sample(btnP(true), "Confirm")} {sample(btnMuted, "Re-check")} {sample(btnS, "Cancel")}</>, "Confirm / Re-check / Cancel", "For photo results: keep it, look again, or keep nothing.", "Snap results"],
    [sample(btnMuted, "🍴 Add to today's eating"), "Add to today's eating", "Share a food photo from another app: it becomes a new row today, checked with Snap (Silver and up).", "When you share a photo to the app"],
  ]],
  ["Exercise", [
    [<>{pill("move up")} {pill("consolidate")} {pill("reduce")} {pill("skipped")}</>, "Status pills", "Worked out each time you Log: Ready to Progress (Range and Form Good and you hit your target), Consolidate (keep this load and build), Reduce (drop a step). Skipped greys out a week you didn't do.", "Each exercise card"],
    [<>{chip("Standard Progression", true)} {chip("Maintain")} {chip("Reduce")}</>, "Progression", "In the Log form: Standard Progression lets the pill move up when you're ready; Maintain keeps it at Consolidate; Reduce sets Reduce.", "The Log form"],
    [<>{chip("Working towards")} {chip("Good", true)}</>, "Range / Form", "How the reps felt: still working towards it, or good.", "The Log form (Session Quality)"],
    [<span aria-hidden="true" style={{ fontSize: 11, color: "#334155" }}>☐ Skipped this session</span>, "Skipped this session", "Tick it in the Log form if you didn't do it. It never counts against you.", "The Log form"],
    [sample(btnMuted, "Set"), "Set my next session", "Type your exact numbers for next time; you get a quick tip if a step looks big.", "My Companion Session Feedback, under each recommendation"],
    [sample(btnAction, "🔄 Generate Warm-up & Cool-down"), "Generate Warm-up & Cool-down", "A warm-up and cool-down for that session.", "Each exercise day"],
  ]],
  ["Body & Health", [
    [sample(btnLog, "📋 Log"), "Log a weigh-in or measurement", "Record your weight, body stats or measurements; the Progress button shows the trend.", "My Body"],
    [sample(btnMuted, "+ Add"), "Bloods, medicines and appointments", "Keep your test results, medicines and appointments in one place.", "My Health"],
  ]],
  ["Your Companion", [
    [sample(btnP(true), "My Companion Feedback"), "My Companion Feedback", "Your Companion's view of a section, or of everything on Home.", "Home and each section"],
    [<span aria-hidden="true" style={{ display: "inline-flex", width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "#fff", fontSize: 13 }}>💬</span>, "Chat 💬", "Talk to your Companion about anything in the app.", "The round button, bottom right"],
    [sample(btnMuted, "🏋️ My training style"), "My training style", "My training style: in My Profile. Your rep range (Strength, Muscle, Endurance or Mixed) and pace, for your Companion's suggestions (Silver and up).", "My Profile (Home → ▼ My Profile)"],
    [<span aria-hidden="true" style={{ display: "inline-block", width: 90, height: 6, borderRadius: 3, background: "linear-gradient(90deg, #22c55e 70%, #e2e8f0 70%)" }} />, "Energy meter", "This month's Companion Energy left; top up in My Plan.", "Settings → My Plan, and the header"],
  ]],
  ["Home", [
    [<span aria-hidden="true" style={{ fontSize: 11 }}>{MOOD_EMOJIS.join(" ")}</span>, "Mood", "How you feel today, one tap.", "Home"],
    [sample(btnMuted, "+ Add Journal Entry"), "Journal", "A note for the day; your Companion can read it.", "Home"],
    [<span aria-hidden="true" style={{ fontSize: 10, color: "#334155" }}>Planned 1,963 · Actual 1,240</span>, "Today table (Planned vs Actual)", "Your day's calories: what you planned and what you've logged.", "Home"],
  ]],
  ["Account & plans", [
    [<span aria-hidden="true" style={{ fontSize: 16 }}>⚙</span>, "Settings ⚙", "Your plan, privacy, account and app settings.", "Top right"],
    [<span aria-hidden="true" style={{ fontSize: 10, color: "#475569" }}>🔒 Part of Silver · <u>See plans</u></span>, "🔒 plan prompts / See plans", "A feature in a higher plan; See plans shows what each includes.", "Wherever a feature is in a higher plan"],
  ]],
];
export var GUIDE_NAMES = GUIDE.reduce(function(a, g) { return a.concat(g[1].map(function(r) { return r[1]; })); }, []);

var CSS = ".hiw-t{width:100%;border-collapse:collapse;font-size:12px;color:#334155}.hiw-t th{text-align:left;font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.3px;padding:4px;border-bottom:1px solid #e2e8f0}.hiw-t td{vertical-align:top;padding:6px 4px;border-bottom:1px solid #f1f5f9}.hiw-t td:first-child{width:38%}.hiw-w2{display:none;color:#475569;font-size:11px;margin-top:2px}@media (max-width:480px){.hiw-t .hiw-w{display:none}.hiw-w2{display:block}}";

/** The guide: a search box that filters the rows, then the sections (all closed until opened or searched). */
export default function HowItWorks(props) {
  var _q = React.useState(""); var q = _q[0]; var setQ = _q[1];
  var ql = q.trim().toLowerCase();
  var hit = function(r) { return !ql || (r[1] + " " + r[2] + " " + r[3]).toLowerCase().indexOf(ql) >= 0; };
  var any = false;
  var sections = GUIDE.map(function(g) {
    var rows = g[1].filter(hit); if (!rows.length) return null; any = true;
    return (<details key={g[0]} data-testid="hiw-section" open={ql ? true : undefined} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 8px", marginBottom: 6 }}>
      <summary style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", cursor: "pointer" }}>{g[0]}</summary>
      <table className="hiw-t" style={{ marginTop: 4 }}>
        <thead><tr><th scope="col">Button / label</th><th scope="col">What it does</th><th scope="col" className="hiw-w">Where you'll see it</th></tr></thead>
        <tbody>{rows.map(function(r) { return (<tr key={r[1]} data-testid="hiw-item">
          <td><div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", minHeight: 22 }}>{r[0]}</div><b data-testid="hiw-name" style={{ display: "block", color: "#0f172a", fontSize: 11, marginTop: 2 }}>{r[1]}</b></td>
          <td>{r[2]}<div className="hiw-w2">Where: {r[3]}</div></td>
          <td className="hiw-w">{r[3]}</td>
        </tr>); })}</tbody>
      </table>
    </details>);
  });
  return (<div data-testid="how-it-works" style={props.style}>
    <style>{CSS}</style>
    {props.intro !== false && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#334155" }}>The same buttons and labels appear all through the app. Open a section, or search for a button.</p>}
    <label htmlFor="hiw-search" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Find a button or label</label>
    <input id="hiw-search" type="search" value={q} onChange={function(e) { setQ(e.target.value); }} placeholder="e.g. Snap, Log, pills" style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, marginBottom: 8 }} />
    {sections}
    {!any && <div data-testid="hiw-none" role="status" style={{ fontSize: 12, color: "#475569" }}>No buttons match "{q}".</div>}
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
