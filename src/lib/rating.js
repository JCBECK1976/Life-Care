// v2.22.1 (Architect, 17 Nov 2026): food ratings (RAG) are a Silver feature, not user data. EVERY place that shows a
// rating colour, label, badge or frequency warning goes through here. On a plan without `foodRatings` (Bronze) they are
// shown as normal text: no colour, no label, no badge. Stored ratings are never changed, so they come back on upgrade.
import { planAllows } from "./myPlan.js";

export var NEUTRAL = "#0f172a";          // normal body text
export function ratingsShown() { return planAllows("foodRatings"); }
var TEXT = { RED: "#b91c1c", AMBER: "#b45309" }, TEXT_OK = "#15803d";      // P6: dark enough for text
var BRIGHT = { RED: "#dc2626", AMBER: "#d97706" }, BRIGHT_OK = "#16a34a";
var key = function(r) { return String(r || "").toUpperCase(); };
/** Text colour for a rating ("bright" = the lighter shades used in search lists). */
export function ratingColor(r, kind) {
  if (!ratingsShown()) return NEUTRAL;
  var k = key(r); return kind === "bright" ? (BRIGHT[k] || BRIGHT_OK) : (TEXT[k] || TEXT_OK);
}
export function ratingBg(r) { if (!ratingsShown()) return "transparent"; var k = key(r); return k === "RED" ? "#fef2f2" : k === "AMBER" ? "#fffbeb" : "#f0fdf4"; }
export function ratingBorder(r) { if (!ratingsShown()) return "transparent"; var k = key(r); return k === "RED" ? "#fecaca" : k === "AMBER" ? "#fcd34d" : "#86efac"; }
/** Small dot before a food name. */
export function ratingDot(r) { if (!ratingsShown()) return "#cbd5e1"; var k = key(r); return k === "RED" ? "#dc2626" : k === "AMBER" ? "#f59e0b" : k === "GREAT" || k === "GOOD" || k === "GREEN" ? "#16a34a" : "#cbd5e1"; }
/** The rating word (or "" when hidden). */
export function ratingLabel(text) { return ratingsShown() ? text : ""; }
