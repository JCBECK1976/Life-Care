// v2.19.0 eating lists (docs/design/EATING_LISTS.md, ADR 0015): nutrition PER PORTION everywhere. Pure functions.
// Items keep their per-portion values in the existing top-level fields (kcal, jcKcal, beckKcal, protein, …) so totals,
// selections (children), ratings and prompts are unchanged. New fields: portion { desc, grams }, per100 (packaged/OFF
// source data), meal { serves, components }.
export var NUTR = ["kcal", "protein", "fat", "satFat", "carbs", "sugar", "addedSugar", "fibre", "salt"];
var num = function(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };
var r1 = function(x) { return Math.round(x * 10) / 10; };

/** Per-portion nutrition of an item (from its top-level fields; jcKcal/beckKcal for the person when given). */
export function itemNutrition(item, isJC) {
  var n = {}; NUTR.forEach(function(k) { n[k] = num(item && item[k]); });
  var k = isJC === true ? item.jcKcal : isJC === false ? item.beckKcal : null;
  n.kcal = num(k != null ? k : (item.kcal != null ? item.kcal : item.jcKcal));
  if (!n.protein && item.jcProt != null) n.protein = num(isJC === false ? item.beckProt : item.jcProt);
  if (!n.fat && item.jcFat != null) n.fat = num(isJC === false ? item.beckFat : item.jcFat);
  return n;
}
/** Set an item's per-portion values (all the fields existing screens read). */
export function withPortionValues(item, n) {
  var o = Object.assign({}, item);
  NUTR.forEach(function(k) { o[k] = k === "kcal" ? Math.round(num(n[k])) : r1(num(n[k])); });
  o.jcKcal = o.kcal; o.beckKcal = o.kcal; o.jcProt = o.protein; o.beckProt = o.protein; o.jcFat = o.fat; o.beckFat = o.fat;
  return o;
}
/** per100 × grams ÷ 100. */
export function fromPer100(per100, grams) { var n = {}; NUTR.forEach(function(k) { n[k] = num(per100 && per100[k]) * num(grams) / 100; }); return n; }
export function scale(n, f) { var o = {}; NUTR.forEach(function(k) { o[k] = num(n[k]) * f; }); return o; }
export function add(a, b) { var o = {}; NUTR.forEach(function(k) { o[k] = num(a[k]) + num(b[k]); }); return o; }
export function zero() { var o = {}; NUTR.forEach(function(k) { o[k] = 0; }); return o; }

/** "1 portion = ¼ jar (88 g)" */
export function portionLabel(item) {
  var p = item && item.portion;
  if (!p) return "1 portion";
  var d = String(p.desc || "").trim();
  var g = num(p.grams) > 0 ? Math.round(num(p.grams)) + " g" : "";
  if (d && g && d.indexOf(g) < 0 && !/\d\s*g\b/.test(d)) d += " (" + g + ")";
  return "1 portion = " + (d || g || "1 portion");
}

/** A packaged / OFF item with per-100 g source data and a portion size in grams → per-portion values derived in code. */
export function packagedItem(base, per100, grams, desc) {
  var g = num(grams) > 0 ? num(grams) : 100;
  var it = Object.assign({}, base, { per100: Object.assign({}, per100), portion: { grams: g, desc: desc || (g + " g") }, itemType: "packaged" });
  return withPortionValues(it, fromPer100(per100, g));
}
/** Change a packaged item's portion size: values follow. */
export function setPortionGrams(item, grams, desc) {
  if (!item.per100) return Object.assign({}, item, { portion: Object.assign({}, item.portion, { grams: num(grams) || null, desc: desc != null ? desc : (item.portion && item.portion.desc) }) });
  return packagedItem(item, item.per100, grams, desc != null ? desc : Math.round(num(grams)) + " g");
}

/** Open Food Facts product → { name, barcode, per100, servingG } (per 100 g only; never shown as a portion). */
export function offProduct(p) {
  var nm = (p && p.nutriments) || {};
  var per100 = { kcal: num(nm["energy-kcal_100g"]), protein: num(nm.proteins_100g), fat: num(nm.fat_100g), satFat: num(nm["saturated-fat_100g"]), carbs: num(nm.carbohydrates_100g),
    sugar: num(nm.sugars_100g), fibre: num(nm.fiber_100g), salt: num(nm.salt_100g) };
  var sq = num(p && p.serving_quantity);
  return { name: (p.product_name || "") + (p.brands ? " (" + String(p.brands).split(",")[0].trim() + ")" : ""), barcode: p.code || "", per100: per100,
    servingG: sq > 0 ? sq : null, servingText: p.serving_size || "", ingredients: p.ingredients_text || "",
    packG: num(p.product_quantity) > 0 ? num(p.product_quantity) : null, packText: p.quantity || "",   // v2.19.2: pack size and categories for the wrong-match guard
    categories: (p.categories_tags || p.categories_tags_en || []).slice(0, 12) };
}
/** An OFF result as a list item: default portion = its serving size, else 100 g (editable). */
export function offToItem(o) {
  var g = o.servingG || 100;
  return packagedItem({ name: o.name, barcode: o.barcode, source: "off", ingredients: o.ingredients ? [o.ingredients] : [] }, o.per100, g, o.servingText && o.servingG ? o.servingText : g + " g" + (o.servingG ? "" : " (default — change if your portion differs)"));
}

/* ---------- Build a meal: Σ components ÷ serves, in code ---------- */
/** One component's nutrition: amount in portions, or grams (per100, else per-portion ÷ portion grams). null if grams can't be used. */
export function componentNutrition(c) {
  var amt = num(c.amount);
  if (c.unit === "g") {
    if (c.per100) return fromPer100(c.per100, amt);
    if (num(c.portionGrams) > 0) return scale(c.n, amt / num(c.portionGrams));
    return null;
  }
  return scale(c.n, amt);
}
export function canUseGrams(c) { return !!(c.per100 || num(c.portionGrams) > 0); }
/** Per-portion nutrition of a meal. */
export function mealNutrition(components, serves) {
  var s = Math.max(1, Math.round(num(serves)) || 1), t = zero();
  (components || []).forEach(function(c) { var n = componentNutrition(c); if (n) t = add(t, n); });
  return scale(t, 1 / s);
}
/** A component from any item (list, catalogue or OFF-derived), with a per-portion snapshot. */
export function componentFrom(item, isJC, ref) {
  return { ref: ref || item.id || null, name: item.name, amount: 1, unit: "portion", n: itemNutrition(item, isJC), per100: item.per100 || null, portionGrams: (item.portion && num(item.portion.grams)) || null };
}
/** Refresh linked components from the current list items (by ref). */
export function relinkComponents(components, lookup, isJC) {
  return (components || []).map(function(c) { var it = c.ref && lookup && lookup[c.ref]; return it ? Object.assign({}, c, { name: it.name, n: itemNutrition(it, isJC), per100: it.per100 || c.per100 || null, portionGrams: (it.portion && num(it.portion.grams)) || c.portionGrams || null }) : c; });
}
export function mealItem(base, components, serves, isJC) {
  var s = Math.max(1, Math.round(num(serves)) || 1);
  var it = Object.assign({}, base, { meal: { serves: s, components: components }, source: "meal", itemType: "ingredient",
    ingredients: components.map(function(c) { return c.name + " " + (c.unit === "g" ? Math.round(num(c.amount)) + " g" : num(c.amount) + (num(c.amount) === 1 ? " portion" : " portions")); }),
    portion: { desc: s === 1 ? "the whole meal" : "1 of " + s + " servings", grams: null } });
  return withPortionValues(it, mealNutrition(components, s));
}

/* ---------- Validation of the clarifying AI's item ---------- */
/** Parse a JSON object from an AI reply (tolerates code fences / text around it). null if none. */
export function parseJsonReply(text) {
  var t = String(text || "").replace(/```json|```/g, "").trim();
  var a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
}
/** { ok, problem } — schema, ranges and a plausibility check (energy from macros vs kcal). */
export function validateItemReply(o) {
  if (!o || typeof o !== "object") return { ok: false, problem: "the reply was not a JSON object" };
  if (o.type === "question") return typeof o.question === "string" && o.question.trim().length > 3 ? { ok: true } : { ok: false, problem: "a question reply needs a \"question\" text" };
  if (o.type !== "item") return { ok: false, problem: "\"type\" must be \"question\" or \"item\"" };
  if (!o.name || typeof o.name !== "string") return { ok: false, problem: "missing \"name\"" };
  var s = num(o.servings); if (!(s >= 1 && s <= 50)) return { ok: false, problem: "\"servings\" must be 1–50 (how many portions the recipe makes)" };
  var p = o.perPortion; if (!p || typeof p !== "object") return { ok: false, problem: "missing \"perPortion\"" };
  var bad = NUTR.filter(function(k) { return k !== "sugar" && k !== "addedSugar" && !(isFinite(parseFloat(p[k])) && parseFloat(p[k]) >= 0); });
  if (bad.length) return { ok: false, problem: "perPortion needs non-negative numbers for " + bad.join(", ") };
  var kcal = num(p.kcal);
  if (kcal < 5 || kcal > 2500) return { ok: false, problem: "kcal per portion (" + kcal + ") is outside 5–2,500 — check it is ONE portion, not the whole recipe or per 100 g" };
  if (num(p.satFat) > num(p.fat) + 0.5) return { ok: false, problem: "sat fat is more than total fat" };
  if (num(p.addedSugar) > num(p.carbs) + 1) return { ok: false, problem: "added sugar is more than carbohydrate" };
  if (num(p.salt) > 15) return { ok: false, problem: "salt over 15 g per portion" };
  var fromMacros = 4 * num(p.protein) + 4 * num(p.carbs) + 9 * num(p.fat);
  if (Math.abs(fromMacros - kcal) > Math.max(0.35 * kcal, 60)) return { ok: false, problem: "kcal (" + kcal + ") doesn't match the macros (≈ " + Math.round(fromMacros) + " kcal from protein, carbs and fat)" };
  return { ok: true };
}
/** The confirmed AI item → a list item (per portion). */
export function itemFromReply(o) {
  var it = withPortionValues({ name: o.name, itemType: "ingredient", source: "own", ingredients: Array.isArray(o.ingredients) ? o.ingredients : [],
    servings: Math.round(num(o.servings)) || 1, portion: { desc: o.portionDesc || ("1 of " + (Math.round(num(o.servings)) || 1) + " servings"), grams: num(o.portionGrams) > 0 ? Math.round(num(o.portionGrams)) : null },
    assumptions: o.assumptions || "" }, o.perPortion);
  return it;
}

/* ---------- Migration (idempotent; nothing deleted) ---------- */
/** Adds a portion description; OFF/packaged with a barcode keep per100 (= stored values) and a 100 g default; prepared items
 *  without servings are flagged "Check me — confirm portions". Items that already have `portion` are untouched. */
export function migrateItem(it) {
  if (!it || typeof it !== "object" || it.portion) return { item: it, changed: false };
  var o = Object.assign({}, it);
  if (o.barcode && !o.per100) {
    var p100 = {}; NUTR.forEach(function(k) { if (o[k] != null) p100[k] = num(o[k]); }); if (o.jcKcal != null && !p100.kcal) p100.kcal = num(o.jcKcal);
    o.per100 = p100; o.portion = { grams: 100, desc: "100 g (default — change if your portion differs)" };
  } else if (o.itemType === "ingredient" && !o.servings && !o.meal) {
    o.portion = { desc: "1 portion (to confirm)", grams: null }; o.portionCheck = true; o.checkMe = true;
    o.checkReason = "Check me — confirm portions: how many portions does this recipe make? Values are per portion.";
  } else {
    o.portion = { desc: o.servingSize && !/100\s*g/i.test(o.servingSize) ? String(o.servingSize) : "1 portion (as entered)", grams: null };
  }
  return { item: o, changed: true };
}
export function migrateList(list) {
  var changed = 0; var out = (list || []).map(function(it) { var r = migrateItem(it); if (r.changed) changed++; return r.item; });
  return { list: out, changed: changed };
}

/** Flag rule for Re-check: the saved value looks like a whole recipe / per 100 g, or is > 35% away from one portion. */
export function recheckFlag(saved, v) {
  if (!v) return null;
  if (v.looksLike === "wholeRecipe") return "Check me — confirm portions: the saved " + Math.round(saved) + " kcal looks like the whole recipe" + (v.servingsGuess ? " (about " + v.servingsGuess + " portions)" : "") + "; one portion is about " + Math.round(v.perPortionKcal) + " kcal.";
  if (v.looksLike === "per100g") return "Check me — confirm portions: the saved " + Math.round(saved) + " kcal looks like a per-100 g value; one portion is about " + Math.round(v.perPortionKcal) + " kcal.";
  if (saved > 0 && (saved > v.perPortionKcal * 1.35 || saved < v.perPortionKcal / 1.35)) return "Check me — confirm portions: saved " + Math.round(saved) + " kcal per portion, about " + Math.round(v.perPortionKcal) + " kcal expected.";
  return null;
}
