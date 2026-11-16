import { test, expect } from "@playwright/test";
import { rateByPortion, withRuleRating, REFERENCE } from "../src/lib/rag.js";
import { personalLimits, typicalBurn } from "../src/lib/goals.js";
import { openApp } from "./helpers.js";

// v2.18.2 (F23): list items rate against the UK reference intake (shared, no re-rating); selections rate against that
// person's goal and personal limits; the "… today" note shows when they differ.
const three = (v) => [1, 2, 3].map((wk) => ({ wk, v }));
const JC = { profile: { sex: "Male", age: 50, height: "178cm", activityLevel: "sitting" }, body: { weight: three(91.9), bodyFat: three(25.5) } };
const goal = (p, g, extra) => ({ ...p, ...(extra || {}), goal: g });

test("list items (parents): UK reference intake — 2,000 kcal, sat fat 20 g, free sugars 25 g; the same for everyone", () => {
  expect(REFERENCE).toEqual({ kcal: 2000, satFat: 20, addedSugar: 25 });
  expect(rateByPortion({ kcal: 850, satFat: 1, addedSugar: 0 }).band).toBe("RED-monthly");   // 42.5% of 2,000
  expect(rateByPortion({ kcal: 760, satFat: 1, addedSugar: 0 }).band).toBe("GREAT");          // 38%: was RED against the old 1,800 reference
  expect(rateByPortion({ kcal: 300, satFat: 6, addedSugar: 0 })).toMatchObject({ band: "AMBER" });   // 30% of 20 g
  expect(rateByPortion({ kcal: 300, satFat: 6 }).reason).toContain("of the reference 20g daily limit");
  expect(withRuleRating({ name: "x", jcKcal: 760, beckKcal: 760, satFat: 1, addedSugar: 0 }).rating).toBe("GREAT");
});

test("personal limits: the person's daily goal (no exercise); sat fat and sugars scale from the reference, capped by conditions", () => {
  expect(personalLimits(goal(JC, { id: "maintain" }))).toEqual({ kcal: 2126, satFat: 21.3, addedSugar: 26.6 });
  expect(personalLimits(goal(JC, { id: "healthy_weight", months: 7, targetKg: 82 }))).toEqual({ kcal: 1767, satFat: 17.7, addedSugar: 22.1 });
  expect(personalLimits(goal(JC, { id: "maintain" }, { healthConditions: "High cholesterol; prediabetes" }))).toEqual({ kcal: 2126, satFat: 20, addedSugar: 25 });
  expect(personalLimits(JC)).toBe(null);                                                    // setup incomplete → the reference is used
  expect(typicalBurn(JC)).toBe(2126);
});

test("selections (children) rate against that person's limits; the note shows when they differ from the list item", async ({ page }) => {
  const { errors } = await openApp(page);
  const p = goal(JC, { id: "healthy_weight", months: 7, targetKg: 82 });
  const L = personalLimits(p), Lm = personalLimits(goal(JC, { id: "maintain" }));
  const r = await page.evaluate(async ({ L, Lm }) => {
    const { makeChild, recalcChild, childItems, ragNote } = await import("/Life-Care/src/lib/children.js");
    const { withRuleRating } = await import("/Life-Care/src/lib/rag.js");
    const parent = withRuleRating({ id: "p1", name: "Big pasta", jcKcal: 760, beckKcal: 760, satFat: 1, addedSugar: 0 });
    const c = makeChild(parent, { date: "2026-11-11", weekday: "wednesday", slot: "d", isJC: true, limits: L });
    const items = childItems({ children: { [c.id]: { ...c, band: "GREAT", rating: "GREAT" } } }, { p1: parent }, () => L);
    return { parent: parent.rating, child: c.band, note: ragNote(c, parent, L), noteMaintain: ragNote(c, parent, Lm), ref: recalcChild({ ...c }).band, live: items[0].rating };
  }, { L, Lm });
  expect(r.parent).toBe("GREAT");                     // list: 760 = 38% of 2,000
  expect(r.child).toBe("RED-monthly");                // 760 / 1,767 = 43% of this person's day
  expect(r.note).toBe("RED today — for your goal");
  expect(r.noteMaintain).toBe("");                    // 760 / 2,126 = 36%: same as the list
  expect(r.ref).toBe("GREAT");                        // no limits (setup incomplete) → the reference
  expect(r.live).toBe("RED");                         // childItems re-rates live for the person
  expect(errors).toEqual([]);
});
