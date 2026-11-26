// v2.48.0 (Architect brief 24 Nov, P3): the person's training style (Strength and Cardio: focus + pace) and goal, for EVERY
// Companion. Most Companions already get the goal in the shared cross-section context (App.getCrossSectionCtx); this adds
// the style there, and companionProfileCtx() gives goal + style to the ones that don't use it (Help, the generators).
import { styleFor, styleLabel, cardioStyleFor, cardioLabel } from "./trainingStyle.js";
import { goalCtx } from "./goals.js";

/** One line: the style and how each kind of advice should use it. */
export function trainingStyleCtx(person) {
  if (!person) return "";
  var st = styleFor(person, ""), cs = cardioStyleFor(person);
  return "TRAINING STYLE (their own choice in My Profile — use it in every kind of advice): Strength — " + styleLabel(st) + "; Cardio — " + cardioLabel(cs) + ". "
    + "Eating: more protein emphasis for a Strength or Muscle focus; carbohydrate timing around sessions for Endurance cardio or Intervals. "
    + "Body: read weight and measurement trends in its light (e.g. some weight gain can be muscle with a Strength or Muscle focus). "
    + "Exercise: progress in line with it.";
}
/** Goal + training style, for Companions that don't get the shared context. */
export function companionProfileCtx(person) {
  var g = ""; try { g = goalCtx(person); } catch (e) { g = ""; }
  return [g, trainingStyleCtx(person)].filter(Boolean).join("\n");
}
