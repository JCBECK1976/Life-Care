// The name's "(N kcal)" helpers. v2.19.1 (F27): the D7 whole-recipe prompt and parser were removed — every add and
// recalculation now goes through the per-portion clarifying conversation (src/lib/clarify.js).
export function stripKcal(name) { return String(name || "").replace(/\s*\(\s*\d+(\.\d+)?\s*kcal\s*\)/i, "").trim(); }

export function renameKcal(name, kcal) {
  return /\(\s*\d+(\.\d+)?\s*kcal\s*\)/i.test(name || "") ? String(name).replace(/\(\s*\d+(\.\d+)?\s*kcal\s*\)/i, "(" + Math.round(kcal) + " kcal)") : name;
}
