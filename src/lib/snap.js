// v2.6.5 D15 (JC, 10 Nov 20:15): photo portion checks.
//  • First check: temperature 0, explicit grams per component.
//  • Re-check: an INDEPENDENT deep dive (no earlier estimate is passed in): component by component, grams each,
//    plate/portion cues, the user's description first. Shown as "Re-check deep dive — re-assessed outcome" with a
//    one-line comparison against the first check. Confirm uses whichever result is shown last.
import { rateByPortion } from "./rag.js";

var JSON_SHAPE = '{"isFood":true/false,"name":"what you see","matchesPlanned":true/false,"portionSize":"small or medium or large","components":[{"name":"component name","grams":estimated_grams}],"totalGrams":total_estimated_grams,"kcal":calories,"protein":grams,"fat":total_fat,"satFat":sat_fat,"addedSugar":added_sugar_grams_only_not_natural_sugars,"carbs":carbs_grams,"fibre":fibre_grams,"salt":salt_grams,"portionNote":"ONE sentence comparing portion size to standard"}';

// v2.14.1: every food photo prompt must say whether there is food at all. With no food the app shows NO_FOOD_MSG,
// no rating and no nutrition, and Confirm is disabled (only Re-check and Cancel).
export var NO_FOOD_RULE = " FIRST decide whether the photo shows food or drink at all. If it does NOT (for example a person, a room, a screen, a blank, dark or blurred photo), set \"isFood\": false, set every nutrition value to 0 and say briefly what you see in \"name\". Otherwise set \"isFood\": true.";
export var NO_FOOD_MSG = "No food found in this photo — try another photo, or add a description and Re-check";
export function noFood(info) { return !info || info.isFood === false || info.isFood === "false"; }

export function snapPrompt(o) {
  var planned = o.plannedName ? "The planned meal was: " + o.plannedName + "." : "Nothing was planned for this slot: identify the food (one combined meal if several foods are on the plate).";
  var desc = o.desc ? " The user describes it as: \"" + o.desc + "\". PREFER the user's description over your own size or product guess." : "";
  if (o.deep) {
    return "Re-check deep dive: give an independent, careful second opinion on this food photo. " + planned + desc
      + " Work component by component: list every food on the plate separately and estimate the weight in grams of each, using the plate size, cutlery, packaging and other portion cues in the photo. Then work out the nutrition of each component and add them up."
      + NO_FOOD_RULE + " Return ONLY JSON: " + JSON_SHAPE;
  }
  return "Analyze this food portion. " + planned + desc + " Estimate the ACTUAL portion shown, with an estimated weight in grams for each component." + NO_FOOD_RULE + " Return ONLY JSON: " + JSON_SHAPE;
}

export function requestBody(o, image) {
  var body = { model: "claude-sonnet-4-6", max_tokens: o.deep ? 1000 : 700, messages: [{ role: "user", content: [image, { type: "text", text: snapPrompt(o) }] }] };
  if (!o.deep) body.temperature = 0;          // first check: as repeatable as possible
  return body;
}

// "~450g — rice 200g, sausages 120g, beans 130g"
export function gramsLine(info) {
  if (!info) return "";
  var comps = Array.isArray(info.components) ? info.components.filter(function(c) { return c && c.name; }) : [];
  var total = parseFloat(info.totalGrams) || comps.reduce(function(a, c) { return a + (parseFloat(c.grams) || 0); }, 0);
  var parts = comps.map(function(c) { return c.name + (parseFloat(c.grams) ? " " + Math.round(parseFloat(c.grams)) + "g" : ""); });
  if (total || parts.length) return (total ? "~" + Math.round(total) + "g" : "") + (parts.length ? (total ? " — " : "") + parts.join(", ") : "");
  return info.assumed || "";
}

export function sizeAndRag(info) {
  var r = rateByPortion({ jcKcal: info.kcal, beckKcal: info.kcal, satFat: info.satFat, addedSugar: info.addedSugar, fibre: info.fibre, protein: info.protein });
  return (info.portionSize || "—") + " · " + r.rating;
}
export function compareLine(first, deep) { return "First check: " + sizeAndRag(first) + " → Deep dive: " + sizeAndRag(deep); }
