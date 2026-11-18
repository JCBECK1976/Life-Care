import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { bmrOf, dayBudget, dayCredit, dayFoodKcal, exerciseKcal, planOf, safeMinimum } from "../src/lib/calories.js";
import { stripOldCalorieSettings } from "../src/lib/cleanupCore.js";
import { bodyNotes, bodyNotesCtx } from "../src/lib/bodyNotes.js";

// v2.17.1: calorie model (docs/design/CALORIES.md), My Notes on body records in every companion, Home "Week so far".
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const three = (v) => [1, 2, 3].map((wk) => ({ wk, v }));
const JC = { profile: { name: "JC", sex: "Male", age: 50, height: "178cm" }, body: { weight: three(91.9), bodyFat: three(25.5) } };
const BECKS = { profile: { name: "Becks", sex: "Female", age: 47, height: "165cm" }, body: { weight: three(10.4), bodyFat: three(30) } };   // stone

test("model: 91.9 kg / 25.5% fat → BMR ≈ 1,849, baseline ≈ 2,126, safe minimum 1,664, goal at 20% = 1,701 (not floored)", () => {
  const pl = planOf(JC);
  expect(pl.method).toBe("katch"); expect(pl.estimate).toBe(false);
  expect(pl.bmr).toBe(1849); expect(pl.baseline).toBe(2126);
  expect(pl.deficitPct).toBe(20); expect(pl.goalRaw).toBe(1701);
  expect(pl.minimum).toBe(1664);                                                   // v2.17.2: 90% of 1,849
  expect(pl.goal).toBe(1701); expect(pl.floored).toBe(false);
  const thirty = planOf({ ...JC, calorieSettings: { deficitPct: 30 } });           // 1,488 → limited to the safe minimum
  expect(thirty).toMatchObject({ goalRaw: 1488, goal: 1664, floored: true });
  const ten = planOf({ ...JC, calorieSettings: { deficitPct: 10 } });
  expect(ten.goal).toBe(1913); expect(ten.floored).toBe(false);                    // 2126 × 0.9
});

test("per-person basal step allowance (JC, Becks): steps equivalent of 0.15 × BMR − 10% of goal, clamped 2,000–3,500", () => {
  for (const p of [JC, BECKS]) {
    const pl = planOf(p);
    const stride = parseInt(p.profile.height) / 100 * 0.415, perStep = stride / 1000 * 0.5 * pl.weightKg;
    const expected = Math.min(3500, Math.max(2000, Math.round((0.15 * pl.bmr - 0.10 * pl.goal) / perStep)));
    expect(pl.stepAllowance).toBe(expected);
    expect(pl.stepAllowance).toBeGreaterThanOrEqual(2000); expect(pl.stepAllowance).toBeLessThanOrEqual(3500);
  }
  expect(planOf(JC).stepAllowance).toBe(3160);      // v2.17.2: higher than 2,724 because the goal is no longer floored at BMR
  expect(planOf(BECKS).stepAllowance).toBe(3500);   // clamped
});

test("activity credit: 10,000 steps; 30-min weights; total-burned mode adds nothing on top; adjustment % applied", () => {
  const d = "2026-11-11";   // a Wednesday
  const p = { ...JC, dailyActivity: { [d]: { steps: 10000 } } };
  const pl = planOf(p);
  const stepsK = (10000 - pl.stepAllowance) * pl.kcalPerStep;
  expect(dayCredit(p, d).steps).toBe(Math.round(stepsK));                          // ≈ 232 kcal
  expect(Math.round(stepsK)).toBe(232);
  expect(Math.round(exerciseKcal(5.0, 91.9, 30))).toBe(184);                        // (5 − 1) × 91.9 × 0.5
  // a logged weights session that day: 10 sets × 3 min = 30 min
  const wk = Math.floor((new Date(2026, 10, 11, 12) - new Date(2026, 6, 19)) / (7 * 864e5)) + 1;
  const withEx = { ...p, exercises: { wednesday: [{ name: "Squat", exType: "weights", prog: [{ wk, w: "60kg", r: "10×10" }] }] } };
  const c = dayCredit(withEx, d);
  expect(c.exercise).toBe(184); expect(c.credit).toBe(184 + 232);
  // total calories burned from Health: credit = total − baseline, steps/exercise NOT added (no double count)
  const tot = { ...withEx, googleDaily: { [d]: { kcal: 2900 } } };
  expect(dayCredit(tot, d)).toMatchObject({ mode: "total", credit: 2900 - 2126, steps: 0, exercise: 0 });
  expect(dayCredit({ ...tot, googleDaily: { [d]: { kcal: 2000 } } }, d).credit).toBe(0);   // below baseline → 0, never negative
  // adjustment %
  expect(dayCredit({ ...tot, calorieSettings: { adjPct: 50 } }, d).credit).toBe(Math.round((2900 - 2126) * 0.5));
  // budget line
  const b = dayBudget(tot, d, 1500);
  expect(b).toMatchObject({ target: 1701 + 774, food: 1500, left: 1701 + 774 - 1500 });
});

test("fallbacks are labelled estimates: Mifflin-St Jeor from weight/height/age/sex; age/sex average without weight", () => {
  const noFat = { profile: JC.profile, body: { weight: three(91.9) } };
  const m = bmrOf(noFat);
  expect(m).toMatchObject({ method: "mifflin", estimate: true });
  expect(m.bmr).toBe(Math.round(10 * 91.9 + 6.25 * 178 - 5 * 50 + 5));
  const none = bmrOf({ profile: { sex: "Female", age: 47 } });
  expect(none).toMatchObject({ method: "average", estimate: true });
  expect(none.bmr).toBe(Math.round(10 * 72 + 6.25 * 162 - 5 * 47 - 161));
  expect(planOf({ profile: { sex: "Female", age: 47 } }).estimate).toBe(true);
});

test("safe minimum (v2.17.2): max(90% of BMR, 1,200 kcal women / 1,500 kcal men)", () => {
  expect(safeMinimum(1849, true)).toBe(1664);       // 90% wins
  expect(safeMinimum(1600, true)).toBe(1500);       // men: 1,440 → 1,500
  expect(safeMinimum(1200, false)).toBe(1200);      // women: 1,080 → 1,200
  expect(safeMinimum(1369, false)).toBe(1232);
  const small = { profile: { sex: "Female", age: 60, height: "150cm" }, body: { weight: three(7.5) } };   // Mifflin ≈ 1,060
  const pl = planOf({ ...small, calorieSettings: { deficitPct: 30 } });
  expect(pl.minimum).toBe(1200); expect(pl.goal).toBe(1200); expect(pl.floored).toBe(true);
});

test("one-off cleanup (v2.17.2): removes only the old kcal deficit and R6 switch; idempotent", () => {
  const d = { config: { week: 3 }, jc: { profile: { name: "JC" }, calorieSettings: { r6Active: true, deficit: 500, deficitPct: 15, adjPct: 90, adjHistory: [{ value: 90 }] } }, becks: { calorieSettings: { deficit: 400 } }, x: { profile: {} } };
  expect(stripOldCalorieSettings(d)).toBe(true);
  expect(d.jc.calorieSettings).toEqual({ deficitPct: 15, adjPct: 90, adjHistory: [{ value: 90 }] });
  expect(d.becks.calorieSettings).toEqual({});
  expect(d.config).toEqual({ week: 3 }); expect(d.x).toEqual({ profile: {} });
  expect(stripOldCalorieSettings(d)).toBe(false);   // second run: nothing to do
});

test("food per day from the eating record (skipped items don't count)", () => {
  const doc = { children: { a: { date: "2026-11-11", nutrition: { kcal: 400 } }, b: { date: "2026-11-11", nutrition: { kcal: 300 }, tracked: "skipped" }, c: { date: "2026-11-10", nutrition: { kcal: 900 } } } };
  expect(dayFoodKcal(doc, "2026-11-11")).toBe(400);
});

test("My Notes on body records: collected newest first, one context line", () => {
  const p = { body: { weight: [{ wk: 15, v: 13.1, note: "after a long flight" }, { wk: 16, v: 13.3, note: "birthday week" }], bodyFat: [{ wk: 16, v: 22, note: "birthday week" }] }, measurements: { waist: [{ wk: 16, v: 90, note: "bloated" }] } };
  expect(bodyNotes(p).map((n) => n.note)).toEqual(["birthday week", "bloated", "after a long flight"]);
  expect(bodyNotesCtx(p)).toContain('Wk16 weigh-in: "birthday week"');
  expect(bodyNotesCtx({ body: {} })).toBe("");
});

// v2.18.0: the Week so far test moved to tests/v2180.spec.js (Week to date).

// v2.18.0: the calorie line UI was replaced by the Planned | Actual table (tests/v2180.spec.js).

test("a weigh-in's My Notes reaches the AI request context (Body feedback)", async ({ page }) => {
  const { errors, aiCalls } = await openApp(page);
  await tab(page, "My Body");
  await page.getByRole("button", { name: "📋 Record" }).first().click();
  await page.getByTestId("bw-st").fill("13"); await page.getByTestId("bw-lb").fill("4");   // v2.32.3: st + lb boxes
  await page.getByLabel("My Notes").first().fill("birthday week, lots of cake");
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect.poll(async () => JSON.stringify(JSON.parse(await (await fetch(KEY("dashboard:data"), { headers: H })).json()).jc.body)).toContain("birthday week");
  const n0 = aiCalls.length;
  await page.getByRole("button", { name: "My Companion Body Feedback" }).click();
  await expect.poll(() => JSON.stringify(aiCalls.slice(n0))).toContain("birthday week, lots of cake");
  expect(errors).toEqual([]);
});

test("v2.17.2: the old kcal deficit and R6 switch are removed once on load; everything else kept", async ({ page }) => {
  const { errors } = await openApp(page);
  const d = JSON.parse(await (await fetch(KEY("dashboard:data"), { headers: H })).json());
  d.jc.calorieSettings = { r6Active: true, deficit: 500, deficitPct: 18, adjPct: 90 };
  await fetch(KEY("dashboard:data"), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(d)) });
  await page.reload();
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => JSON.parse(await (await fetch(KEY("dashboard:data"), { headers: H })).json()).jc.calorieSettings).toEqual({ deficitPct: 18, adjPct: 90 });
  const after = JSON.parse(await (await fetch(KEY("dashboard:data"), { headers: H })).json());
  expect(after.jc.profile).toEqual(d.jc.profile);
  expect(errors).toEqual([]);
});
