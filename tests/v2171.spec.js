import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { bmrOf, dayBudget, dayCredit, dayFoodKcal, exerciseKcal, planOf } from "../src/lib/calories.js";
import { bodyNotes, bodyNotesCtx } from "../src/lib/bodyNotes.js";
import { weekSoFar } from "../src/lib/weekSoFar.js";

// v2.17.1: calorie model (docs/design/CALORIES.md), My Notes on body records in every companion, Home "Week so far".
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const three = (v) => [1, 2, 3].map((wk) => ({ wk, v }));
const JC = { profile: { name: "JC", sex: "Male", age: 50, height: "178cm" }, body: { weight: three(91.9), bodyFat: three(25.5) } };
const BECKS = { profile: { name: "Becks", sex: "Female", age: 47, height: "165cm" }, body: { weight: three(10.4), bodyFat: three(30) } };   // stone

test("model: 91.9 kg / 25.5% fat → BMR ≈ 1,849, baseline ≈ 2,126, goal at 20% ≈ 1,701 (then the BMR floor applies)", () => {
  const pl = planOf(JC);
  expect(pl.method).toBe("katch"); expect(pl.estimate).toBe(false);
  expect(pl.bmr).toBe(1849); expect(pl.baseline).toBe(2126);
  expect(pl.deficitPct).toBe(20); expect(pl.goalRaw).toBe(1701);
  expect(pl.goal).toBe(1849); expect(pl.floored).toBe(true);                       // "limited to your BMR"
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
  expect(planOf(JC).stepAllowance).toBe(2724);
  expect(planOf(BECKS).stepAllowance).toBe(3027);
});

test("activity credit: 10,000 steps; 30-min weights; total-burned mode adds nothing on top; adjustment % applied", () => {
  const d = "2026-11-11";   // a Wednesday
  const p = { ...JC, dailyActivity: { [d]: { steps: 10000 } } };
  const pl = planOf(p);
  const stepsK = (10000 - pl.stepAllowance) * pl.kcalPerStep;
  expect(dayCredit(p, d).steps).toBe(Math.round(stepsK));                          // ≈ 247 kcal
  expect(Math.round(stepsK)).toBe(247);
  expect(Math.round(exerciseKcal(5.0, 91.9, 30))).toBe(184);                        // (5 − 1) × 91.9 × 0.5
  // a logged weights session that day: 10 sets × 3 min = 30 min
  const wk = Math.floor((new Date(2026, 10, 11, 12) - new Date(2026, 6, 19)) / (7 * 864e5)) + 1;
  const withEx = { ...p, exercises: { wednesday: [{ name: "Squat", exType: "weights", prog: [{ wk, w: "60kg", r: "10×10" }] }] } };
  const c = dayCredit(withEx, d);
  expect(c.exercise).toBe(184); expect(c.credit).toBe(184 + 247);
  // total calories burned from Health: credit = total − baseline, steps/exercise NOT added (no double count)
  const tot = { ...withEx, googleDaily: { [d]: { kcal: 2900 } } };
  expect(dayCredit(tot, d)).toMatchObject({ mode: "total", credit: 2900 - 2126, steps: 0, exercise: 0 });
  expect(dayCredit({ ...tot, googleDaily: { [d]: { kcal: 2000 } } }, d).credit).toBe(0);   // below baseline → 0, never negative
  // adjustment %
  expect(dayCredit({ ...tot, calorieSettings: { adjPct: 50 } }, d).credit).toBe(Math.round((2900 - 2126) * 0.5));
  // budget line
  const b = dayBudget(tot, d, 1500);
  expect(b).toMatchObject({ target: 1849 + 774, food: 1500, left: 1849 + 774 - 1500 });
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

test("Week so far with a fixed clock (Wednesday): counts Sun–Tue only; today separate; future never counted", () => {
  const wed = new Date(2026, 10, 11, 15, 0);     // Wed 11 Nov 2026
  const wk = Math.floor((new Date(2026, 10, 11, 12) - new Date(2026, 6, 19)) / (7 * 864e5)) + 1;
  const p = { ...JC, calorieSettings: { deficitPct: 10 }, exercises: { sunday: [{ name: "Squat", prog: [{ wk, w: "60kg", r: "10×3" }] }], monday: [{ name: "Row", prog: [] }], thursday: [{ name: "Press", prog: [] }] } };
  const target = planOf(p).goal;                  // 1913 (no activity on Mon/Tue; Sun has a session credit)
  const sunT = dayBudget(p, "2026-11-08", 0).target;
  const doc = { children: {
    s: { date: "2026-11-08", nutrition: { kcal: sunT } },                // Sun exactly on target
    m: { date: "2026-11-09", nutrition: { kcal: Math.round(target * 1.15) } },   // Mon +15% → amber
    t: { date: "2026-11-10", nutrition: { kcal: Math.round(target * 0.7) } },    // Tue −30% → red
    w: { date: "2026-11-11", nutrition: { kcal: 500 } },                 // today
    f: { date: "2026-11-13", nutrition: { kcal: 9999 } } } };           // future: never counted
  const w = weekSoFar(p, doc, wed);
  expect(w.days.map((d) => d.weekday)).toEqual(["sunday", "monday", "tuesday"]);
  expect(w.days.map((d) => d.eatRag)).toEqual(["green", "amber", "red"]);
  expect(w.eatPct).toBe(Math.round((100 + 85 + 70) / 3));
  expect(w.exPct).toBe(50);                       // Sun trained, Mon missed (Tue rest)
  expect(w.overall).toBe(Math.round((w.eatPct + 50) / 2));
  expect(w.today).toMatchObject({ date: "2026-11-11", food: 500 });
  expect(JSON.stringify(w.days)).not.toContain("2026-11-13");
  expect(weekSoFar(p, doc, new Date(2026, 10, 8, 9)).overall).toBe(null);      // Sunday: nothing complete yet
});

test("UI: My Eating day and Home show Goal · Food · Activity · Left, the step note and 'How this is calculated'; deficit % changes", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "Home");
  const home = page.getByTestId("calorie-home");
  await expect(home.getByTestId("calorie-line")).toContainText(/Goal [\d,]+ · Food [\d,]+ · Activity \+[\d,]+ \(steps: \+[\d,]+ · exercise: \+[\d,]+\) · Left/);
  await expect(home.getByTestId("step-allowance")).toContainText(/Your first ~[\d,]+ steps are already in your goal/);
  await home.getByRole("button", { name: /How this is calculated/ }).click();
  await expect(home.getByTestId("calorie-how")).toContainText("× 1.15");
  await home.getByRole("button", { name: "Change deficit" }).click();
  await home.getByLabel("Deficit %").fill("15");
  await home.getByRole("button", { name: "Save" }).click();
  await expect(home.getByTestId("deficit")).toHaveText("15%");
  const d = JSON.parse(await (await fetch(KEY("dashboard:data"), { headers: H })).json());
  expect(d.jc.calorieSettings.deficitPct).toBe(15);
  await expect(page.getByTestId("week-so-far")).toBeVisible();
  await expect(page.getByTestId("wsf-today")).toContainText("Today (in progress)");
  await tab(page, "My Eating");
  const wd = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
  await page.getByRole("button", { name: wd, exact: true }).first().click();
  await expect(page.getByTestId("calorie-day").getByTestId("calorie-line")).toContainText(/Goal [\d,]+ · Food/);
  expect(errors).toEqual([]);
});

test("a weigh-in's My Notes reaches the AI request context (Body feedback)", async ({ page }) => {
  const { errors, aiCalls } = await openApp(page);
  await tab(page, "My Body");
  await page.getByRole("button", { name: "📋 Record" }).first().click();
  await page.locator("label", { hasText: "Weight (stone)" }).locator("xpath=following-sibling::input").fill("13.4");
  await page.getByLabel("My Notes").first().fill("birthday week, lots of cake");
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect.poll(async () => JSON.stringify(JSON.parse(await (await fetch(KEY("dashboard:data"), { headers: H })).json()).jc.body)).toContain("birthday week");
  const n0 = aiCalls.length;
  await page.getByRole("button", { name: "My Companion Body Feedback" }).click();
  await expect.poll(() => JSON.stringify(aiCalls.slice(n0))).toContain("birthday week, lots of cake");
  expect(errors).toEqual([]);
});
