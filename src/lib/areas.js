// v2.28.0 (ADR 0018) — the FINAL data layout for individual accounts. Pure (no Firebase), shared by the app, the
// migration script and the tests. The shared joint account (data / data_build) is NOT affected.
//
//   apps/lifecare/users/{uid}/data/{area}/{key}        the person's OWN records, split by area
//   apps/lifecare/households/{hid}/shared/{area}/{key} what the FAMILY shares (food lists, "All" defaults, shopping list,
//                                                      the exercise / measurement / medicine name lists)
//   apps/lifecare/users/{uid}/shared/{area}/{key}      the same for an account that isn't in a family (a family of one)
//
// The app above the storage layer is unchanged: it still asks for keys ("journal_jc", "custom_breakfasts",
// "dashboard:data" …); lib/storage.js puts each one in its area and assembles "dashboard:data" from the areas.

export var AREAS = ["exercise", "body", "eating", "health", "mood", "journal", "companion", "settings"];
// What a family member can be shown (each with its own switch, defaulting to the overall Visible setting). "companion"
// (the person's AI chats and feedback) is never shown to anyone else.
export var FAMILY_AREAS = ["exercise", "body", "eating", "health", "mood", "journal", "settings"];
// The groups on "What my family can see" (Mood & journal is one switch for both areas).
export var SHARING_GROUPS = [
  { id: "exercise", label: "Exercise", areas: ["exercise"] },
  { id: "body", label: "Body (weight, measurements, steps)", areas: ["body"] },
  { id: "eating", label: "Eating (what I eat and plan)", areas: ["eating"] },
  { id: "health", label: "Health (medicines, readings, notes, symptoms, HRT)", areas: ["health"] },
  { id: "moodJournal", label: "Mood & journal", areas: ["mood", "journal"] },
];

/** A person's fields in "dashboard:data" → their area. Anything not listed goes to settings. */
export var FIELD_AREA = {
  profile: "settings", goal: "settings", onboarding: "settings", calorie: "settings", activity: "settings",
  body: "body", measurements: "body", dailyActivity: "body", googleDaily: "body", bodyBalance: "body", progressPhotos: "body", bodyAnalysis: "body",
  exercises: "exercise", sessionGuides: "exercise", exerciseLog: "exercise",
  meds: "health", medsHistory: "health", attachments: "health", bloods: "health", vitals: "health", healthProfile: "health", healthNotes: "health", healthLog: "health",
  symptoms: "health", hrt: "health", gpSummaries: "health",
  eating: "eating", meals: "eating",
};
export function fieldArea(field) { return FIELD_AREA[field] || "settings"; }

// Keys the FAMILY shares — one copy for everyone in the family (ADR 0018 table).
var FAMILY = [
  [/^custom_(breakfasts|lunches|meals|snacks|desserts|drinks)$/, "eating"],   // food lists
  [/^meal_defaults$/, "eating"],                                               // "All" defaults (Set Defaults → All)
  [/^shop_(defaults|list.*)$/, "eating"],                                      // the shopping list
  [/^supermarket_pref$/, "eating"],
  [/^generated_meals?(_.*)?$/, "eating"],                                      // a generated plan before it is applied
  [/^custom_exercises$/, "exercise"],
  [/^custom_meas_types$/, "body"],
  [/^custom_(med_names|blood_tests)$/, "health"],
];
// The person's OWN keys → area (first match wins).
var OWN = [
  [/^(journal|wellbeing_flags)[_:]/, "journal"],
  [/^(daily_mood|user_mood)[_:]/, "mood"],
  [/^(mealplan|meal_tracking|portion_overrides|eat_children|meal_defaults)[_:]/, "eating"],   // a person's meal plan IS their eating record
  [/^(comment|session)[_:]/, "exercise"], [/^session_feedback_all$/, "exercise"],
  [/^(meas_comment)[_:]/, "body"], [/^(meas_feedback|body_feedback)$/, "body"],
  [/^(health_fb|rag_health_hash)[_:]/, "health"], [/^health_feedback$/, "health"],
  [/^(qa_history|help_history|feedback_results|feedback_history|eat_feedback)$/, "companion"],
  [/^(user_colour|generated_targets|consent)[_:]/, "settings"],
  [/^(symptoms|hrt|gp_summary)[_:]/, "health"],
];

/** Where a key lives: { scope: "family" | "own", area }. */
export function locate(key) {
  var k = String(key);
  for (var i = 0; i < FAMILY.length; i++) if (FAMILY[i][0].test(k)) return { scope: "family", area: FAMILY[i][1] };
  for (var j = 0; j < OWN.length; j++) if (OWN[j][0].test(k)) return { scope: "own", area: OWN[j][1] };
  return { scope: "own", area: "settings" };
}
/** The same escaping the app has always used for keys. */
export function cleanKey(key) { return String(key).replace(/[.#$/[\]]/g, "_"); }

/** Pure: split a person-map ({ config, jc: {...} }) into areas → { area: JSON string of { person: { fields } } }, config in settings. */
export function splitDash(d) {
  var out = {};
  Object.keys(d || {}).forEach(function(p) {
    if (p === "config") return;
    Object.keys(d[p] || {}).forEach(function(f) {
      var a = fieldArea(f); out[a] = out[a] || {}; out[a][p] = out[a][p] || {}; out[a][p][f] = d[p][f];
    });
  });
  var res = {};
  Object.keys(out).forEach(function(a) { res[a] = JSON.stringify(out[a]); });
  res._config = JSON.stringify((d && d.config) || {});
  return res;
}
/** Pure: assemble { config, person: {...} } from area parts ({ area: JSON string }). */
export function joinDash(parts) {
  var d = { config: {} };
  try { d.config = JSON.parse(parts._config || "{}"); } catch (e) { d.config = {}; }
  Object.keys(parts || {}).forEach(function(a) {
    if (a === "_config" || !parts[a]) return;
    var o; try { o = JSON.parse(parts[a]); } catch (e) { return; }
    Object.keys(o || {}).forEach(function(p) { d[p] = Object.assign(d[p] || {}, o[p]); });
  });
  return d;
}
export var DASH = "dashboard_data";          // the per-area part of "dashboard:data" (a valid Firebase key)
export var DASH_CONFIG = "dashboard_config";

/** Pure: a flat key → value map (today's layout) → { own: { area: { key: value } }, family: { area: { key: value } } }. */
export function toAreas(flat) {
  var own = {}, family = {};
  Object.keys(flat || {}).forEach(function(k) {
    if (k === "dashboard:data") {
      var parts = splitDash(JSON.parse(flat[k]));
      Object.keys(parts).forEach(function(a) {
        if (a === "_config") { own.settings = own.settings || {}; own.settings[DASH_CONFIG] = parts._config; return; }
        own[a] = own[a] || {}; own[a][DASH] = parts[a];
      });
      return;
    }
    var l = locate(k); var t = l.scope === "family" ? family : own;
    t[l.area] = t[l.area] || {}; t[l.area][cleanKey(k)] = flat[k];
  });
  return { own: own, family: family };
}
