// v2.38.0 (Architect brief 23 Nov, PART 5c): "How would you like to get started?" — after the mandatory steps (age, Terms
// and Privacy, privacy choices) a new account picks: explore myself, quick set-up (about 3 min) or full set-up (about
// 10–15 min). Existing users can open it from Settings → Set-up guide. Progress is saved per person after every step,
// so it carries on where it stopped. Every step can be skipped; nothing paid ever blocks it. (Flag useOnboarding.)
import { sGet, sSet } from "./storage.js";
import { setupComplete } from "./goals.js";

export var PATHS = {
  explore: { label: "I'll explore myself", hint: "Go straight to Home. A short checklist there shows what's left to set up." },
  quick: { label: "Quick set-up (about 3 min)", hint: "Your profile and goal, units, colour, and connecting your health data." },
  full: { label: "Full set-up (about 10–15 min)", hint: "The quick set-up, then a guided first visit to each section. Skip anything." },
};
/** The steps after the profile + goal (GoalSetup, mandatory for quick and full). */
export var QUICK_STEPS = ["guide", "colour", "health"];
export var SECTIONS = ["body", "weights", "meals", "shop", "bloods", "overview"];
export var SECTION_NAME = { body: "My Body", weights: "My Exercise", meals: "My Eating", shop: "My Shop", bloods: "My Health", overview: "Home" };
export function stepsFor(path) { return path === "full" ? QUICK_STEPS.concat(SECTIONS.map(function(s) { return "visit:" + s; })) : path === "quick" ? QUICK_STEPS.slice() : []; }

/** The guided first visit of each section (full set-up): 2–4 things to do, each optional. `tier` marks a paid feature. */
export var VISITS = {
  body: ["Log your first weigh-in: tap 📋 Log and type it in st + lb or kg.", "Smart scales? Answer the scales question on this page so weigh-ins can come in by themselves."],
  weights: ["Tell the app your equipment, training days and session length as you add exercises.", "Build your plan: + Add Exercise picks from the built-in list.", { text: "Or let your Companion generate a plan for you.", tier: "aiPlans" }],
  meals: ["Your preferences: in My Profile, say what you like and avoid.", "Starter foods: Update Eating Lists → Single item → common foods.", "Defaults: set what a normal day looks like, so each new day starts filled in."],
  shop: ["Your shopping list fills from the week's meals. Tick things off as you buy them; add anything else by hand."],
  bloods: ["Add any medications you take, and your vitals (blood pressure, heart rate) when you check them.", "Symptom tracking is optional: turn it on in Settings → Privacy if you want it."],
  overview: ["Tap how you feel today in My Mood.", "Add a line to My Journal — your Companion can read it."],
};
/** First-visit tips (2–3, dismissable) shown in a section the person skipped, or never visited when exploring. */
export var TIPS = {
  body: ["📋 Log records a weigh-in; 👁 Progress shows the trend.", "Unsure of a weigh-in? ⚠ Check this weigh-in lets you fix it."],
  weights: ["Each exercise shows its range and why its target is what it is.", "Didn't do one this week? Tap Skipped — it doesn't count against you."],
  meals: ["+ Not in my list? adds a food you can't find.", "Open on a meal shows its nutrition; Edit adjusts the portion or changes."],
  shop: ["The list builds itself from your planned meals.", "Tick items off as you shop."],
  bloods: ["Add your medications so your Companion knows them.", "Record vitals whenever you check them."],
  overview: ["The Today table compares what you planned with what you've logged.", "💬 Chat is there whenever you want to talk it through."],
};

export function emptySetup() { return { path: "", step: 0, guideSeen: false, skipped: {}, tipsDone: {}, done: {}, finished: false, hidden: false }; }
export async function loadSetup(who) {
  var v = await sGet("setup_guide_" + who);
  try { var o = typeof v === "string" ? JSON.parse(v) : v; return Object.assign(emptySetup(), o || {}); } catch (e) { return emptySetup(); }
}
export async function saveSetup(who, s) { await sSet("setup_guide_" + who, JSON.stringify(s)); return s; }

/** The "Finish setting up" checklist (explore path): [{ k, label, done, go }] — done from the person's data where it can
 *  be seen, otherwise once they've been there (s.done). */
export function checklist(p, s, extra) {
  p = p || {}; s = s || emptySetup(); extra = extra || {};
  var any = function(o) { return Object.keys(o || {}).some(function(d) { return (o[d] || []).length > 0; }); };
  return [
    { k: "profile", label: "Your profile and goal", done: setupComplete(p), go: "goal" },
    { k: "health", label: "Connect your health data (steps, weigh-ins)", done: !!(s.done.health || (p.steps && Object.keys(p.steps).length)), go: "admin" },
    { k: "weighin", label: "Your first weigh-in", done: !!(p.body && p.body.weight && p.body.weight.length), go: "body" },
    { k: "food", label: "Your food lists", done: !!s.done.food, go: "meals" },
    { k: "exercise", label: "Your exercise plan", done: any(p.exercises), go: "weights" },
    { k: "colour", label: "Your colour theme", done: !!(s.done.colour || extra.colour), go: "admin" },
  ];
}
