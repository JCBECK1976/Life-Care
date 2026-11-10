// v2.6.2 D7: Update Item recalculation — prompt, parsing, plausibility and the name's "(N kcal)".
export function stripKcal(name) { return String(name || "").replace(/\s*\(\s*\d+(\.\d+)?\s*kcal\s*\)/i, "").trim(); }

export function renameKcal(name, kcal) {
  return /\(\s*\d+(\.\d+)?\s*kcal\s*\)/i.test(name || "") ? String(name).replace(/\(\s*\d+(\.\d+)?\s*kcal\s*\)/i, "(" + Math.round(kcal) + " kcal)") : name;
}

export function recalcPrompt(name, ingredients, retryNote) {
  return "Calculate nutritional info for a homemade dish called \"" + stripKcal(name) + "\". ONE portion is the WHOLE recipe exactly as listed (add every ingredient up; do not divide into servings, and ignore any calories you may associate with the name): " + ingredients.join(", ") + "."
    + " For any ingredient with no amount (e.g. 'tsp honey', 'mixed seeds'), assume a typical amount and state it."
    + (retryNote ? " " + retryNote : "")
    + " Return ONLY JSON: {\"kcal\":total_calories,\"protein\":grams,\"fat\":total_fat_grams,\"satFat\":saturated_fat_grams,\"addedSugar\":added_sugar_grams_only_not_natural_sugars,\"carbs\":carbs_grams,\"fibre\":fibre_grams,\"salt\":salt_grams,\"rating\":\"GREAT or AMBER or RED based on healthiness\",\"breakdown\":[{\"ingredient\":\"95g rolled oats\",\"kcal\":355}],\"assumed\":[\"15g mixed seeds\"]}";
}

// Returns { values, assumed, problem }. values only when the result can be applied.
export function parseRecalc(text) {
  var m = String(text || "").replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
  if (!m) return { problem: "the AI did not return nutrition values" };
  var ri; try { ri = JSON.parse(m[0]); } catch (e) { return { problem: "the AI's answer could not be read" }; }
  var kcal = parseFloat(ri.kcal);
  if (!(kcal > 0)) return { problem: "no calorie value came back" };
  var sum = (Array.isArray(ri.breakdown) ? ri.breakdown : []).reduce(function(a, b) { var k = parseFloat(b && b.kcal); return a + (k > 0 ? k : 0); }, 0);
  if (sum > 0 && kcal < sum * 0.9) return { problem: "the total (" + Math.round(kcal) + " kcal) is less than its ingredients add up to (" + Math.round(sum) + " kcal)", implausible: true };
  var num = function(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; };
  return { values: { kcal: Math.round(kcal), protein: num(ri.protein), fat: num(ri.fat), satFat: num(ri.satFat), addedSugar: num(ri.addedSugar), carbs: num(ri.carbs), fibre: num(ri.fibre), salt: num(ri.salt), rating: ri.rating || "" },
    assumed: Array.isArray(ri.assumed) ? ri.assumed.filter(Boolean).map(String) : [] };
}
