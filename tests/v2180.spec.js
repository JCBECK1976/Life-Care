import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { aimOf, dayTable, goalCtx, goalSuggestion, paceCheck, setupMissing, targetAllowed, typicalBurn, weekToDate, nutrientPriorities, healthyRange } from "../src/lib/goals.js";

// v2.18.0: person goals, mandatory setup, one goal everywhere, the Planned | Actual table, companions get the goal.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const readData = async () => JSON.parse(await (await fetch(KEY("dashboard:data"), { headers: H })).json());
const writeData = (d) => fetch(KEY("dashboard:data"), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(d)) });
const three = (v) => [1, 2, 3].map((wk) => ({ wk, v }));
const JC = { profile: { name: "JC", sex: "Male", age: 50, height: "178cm", activityLevel: "sitting" }, body: { weight: three(91.9), bodyFat: three(25.5) } };
const withGoal = (g, extra) => ({ ...JC, ...(extra || {}), goal: g });
const D = "2026-11-11";   // a Wednesday

test("each goal's calorie approach (known inputs: 91.9 kg, 25.5% fat, 178 cm, male 50, mostly sitting)", () => {
  expect(typicalBurn(JC)).toBe(2126);                                                     // BMR 1,849 × 1.15
  const hw = aimOf(withGoal({ id: "healthy_weight", months: 7, targetKg: 82 }));
  expect(hw.kcal).toBe(-359);                                                             // 9.9 kg over 7 months → 0.33 kg/week × 7,700 / 7
  expect(hw.pace).toMatchObject({ kgPerWeek: 0.33, level: "green" });
  expect(dayTable(withGoal({ id: "healthy_weight", months: 7, targetKg: 82 }), D, null).goal.actual).toBe(2126 - 359);
  expect(aimOf(withGoal({ id: "maintain" })).kcal).toBe(0);
  const build = aimOf(withGoal({ id: "build" }));                                         // 25.5% fat (male ≥ 25%) → recomposition
  expect(build).toMatchObject({ kcal: 0 }); expect(build.approach).toContain("recomposition");
  expect(aimOf({ ...withGoal({ id: "build" }), body: { weight: three(91.9), bodyFat: three(18) } }).kcal).toBeGreaterThan(0);   // +7.5% surplus
  expect(aimOf(withGoal({ id: "grow" })).kcal).toBe(-213);                                 // BMI 29 → gentle 10%
  expect(aimOf({ ...withGoal({ id: "grow" }), body: { weight: three(70), bodyFat: three(18) } }).kcal).toBe(0);   // healthy weight → maintenance
  const sup = withGoal({ id: "support" }, { healthConditions: "High cholesterol (LDL 3.4), prediabetes" });
  expect(aimOf(sup).kcal).toBe(-213);
  expect(aimOf(sup).priorities.join(" ")).toMatch(/saturated fat.*sugars/);
  expect(setupMissing(withGoal({ id: "support" }))).toContain("conditions");                // needs at least one condition
  expect(nutrientPriorities("high blood pressure")).toEqual(["salt (keep under 6 g)"]);
});

test("activity level is used only on days without step data; with steps: 1.15 + step credit", () => {
  const p = withGoal({ id: "maintain" }); p.profile = { ...p.profile, activityLevel: "feet" };
  expect(dayTable(p, D, null).burn).toBe(Math.round(1849 * 1.3));
  expect(dayTable({ ...p, profile: { ...p.profile, activityLevel: "very" } }, D, null).burn).toBe(Math.round(1849 * 1.45));
  const withSteps = { ...p, dailyActivity: { [D]: { steps: 10000 } } };
  const t = dayTable(withSteps, D, null);
  expect(t.burn).toBe(2126); expect(t.measured).toBe(true);
  expect(t.exercise.actual).toBe(t.exercise.steps); expect(t.exercise.steps).toBeGreaterThan(0);
});

test("timescale slider safety: green / amber / red with Steady and Gentle alternatives; BMI 18.5 block", () => {
  const o = { currentKg: 91.9, targetKg: 82, burn: 2126, bmr: 1849, male: true };
  expect(paceCheck({ ...o, months: 7 }).level).toBe("green");
  expect(paceCheck({ ...o, months: 5 }).reasons.join(" ")).toMatch(/safe minimum/);       // 1,624 kcal < 1,664 → red
  const amber = paceCheck({ currentKg: 100, targetKg: 88, months: 5, burn: 2600, bmr: 1849, male: true });   // gap ≈ 23% of burn
  expect(amber.level).toBe("amber"); expect(amber.gapPct).toBeGreaterThan(20); expect(amber.gapPct).toBeLessThanOrEqual(25);
  const red = paceCheck({ ...o, targetKg: 80, months: 3 });
  expect(red.level).toBe("red");
  expect(red.reasons.join(" ")).toMatch(/25% of your body burn/);
  expect(red.reasons.join(" ")).toMatch(/safe minimum of 1664/);
  expect(red.alternatives).toEqual([{ label: "Steady", months: 6 }, { label: "Gentle", months: 9 }]);
  expect(paceCheck({ currentKg: 100, targetKg: 80, months: 3, burn: 3000, bmr: 2000, male: true }).reasons.join(" ")).toMatch(/1% of your body weight/);
  expect(healthyRange(178)).toEqual({ minKg: 58.6, maxKg: 78.9 });
  expect(targetAllowed(57, 178)).toBe(false); expect(targetAllowed(58.6, 178)).toBe(true);
  // the applied aim is capped at 25% of body burn even if the chosen pace is faster (the goal is never below the safe minimum)
  const fast = aimOf(withGoal({ id: "healthy_weight", months: 3, targetKg: 80 }));
  expect(fast.capped).toBe(true); expect(fast.kcal).toBe(-Math.round(2126 * 0.25));
});

test("the table: planned eating from snapshots, actual from stored selections; exercise planned vs logged; on-track colours", () => {
  const wk = Math.floor((new Date(2026, 10, 11, 12) - new Date(2026, 6, 19)) / (7 * 864e5)) + 1;
  const p = withGoal({ id: "maintain" }, { exercises: { wednesday: [{ name: "Squat", exType: "weights", sets: 10, prog: [{ wk, w: "60kg", r: "10×10" }] }, { name: "Plank", exType: "timed_hold", sets: 3, prog: [] }] } });
  const doc = { children: {
    a: { date: D, snapshot: { kcal: 600 }, nutrition: { kcal: 750 } },                      // portion changed
    b: { date: D, snapshot: { kcal: 400 }, nutrition: { kcal: 400 }, tracked: "skipped" },   // planned, not eaten
    c: { date: D, snapshot: { kcal: 500 }, nutrition: { kcal: 520 } } } };
  const t = dayTable(p, D, doc);
  expect(t.eating).toEqual({ planned: 1500, actual: 1270 });
  expect(t.exercise.planned).toBe(Math.round((4 * 91.9 * 0.5) + (1.8 * 91.9 * 9 / 60)));   // 30 min weights + 9 min hold
  expect(t.exercise.actual).toBe(184);                                                     // only the logged squat session
  expect(t.goal).toEqual({ planned: 2126 + t.exercise.planned, actual: 2126 + 184 });
  expect(t.onTrack).toMatchObject({ kcal: 1270 - 2310, colour: "green" });
  const over = dayTable(p, D, { children: { a: { date: D, snapshot: { kcal: 2500 }, nutrition: { kcal: 2500 } } } });
  expect(over.onTrack).toMatchObject({ kcal: 190, pct: 8, colour: "red" });
  expect(dayTable({ ...p, goal: {} }, D, doc)).toMatchObject({ ready: false });            // no targets until setup is complete
});

test("Week to date (fixed clock, Wednesday): past days with actual data only — never today, the future or unlogged days", () => {
  const p = withGoal({ id: "maintain" });
  const doc = { children: {
    s: { date: "2026-11-08", snapshot: { kcal: 2000 }, nutrition: { kcal: 2000 } },      // Sun −126
    t: { date: "2026-11-10", snapshot: { kcal: 2400 }, nutrition: { kcal: 2400 } },      // Tue +274 (Mon not logged)
    w: { date: "2026-11-11", nutrition: { kcal: 5000 } },                                  // today: not counted
    f: { date: "2026-11-13", nutrition: { kcal: 9999 } } } };                             // future: never counted
  const w = weekToDate(p, doc, new Date(2026, 10, 11, 15));
  expect(w.days).toEqual(["2026-11-08", "2026-11-10"]);
  expect(w.kcal).toBe(4400 - 2 * 2126); expect(w.pct).toBe(Math.round(148 / 4252 * 100)); expect(w.colour).toBe("red");
  expect(weekToDate(p, doc, new Date(2026, 10, 8, 9)).pct).toBe(null);                   // Sunday morning: nothing yet
});

test("goal context for companions: goal, description, timescale, pace, progress; suggestions only", () => {
  const p = withGoal({ id: "healthy_weight", months: 7, targetKg: 82, setAt: "2026-09-01", startKg: 95 });
  const c = goalCtx(p, new Date(2026, 10, 11));
  expect(c).toContain('PERSON GOAL: "Work towards a healthy body weight"');
  expect(c).toContain("Timescale: 7 months to 82 kg; required pace 0.33 kg/week");
  expect(c).toContain("Progress vs pace: started 95 kg, now 91.9 kg");
  expect(c).toContain("suggestion only");
  // in the healthy range for 6+ weeks → suggest Maintain
  const healthy = { ...p, body: { weight: [0, 2, 4, 7].map((wk) => ({ wk, v: 75 })), bodyFat: three(18) } };
  expect(goalSuggestion(healthy, new Date(2026, 10, 11))).toMatchObject({ key: "maintain", to: { id: "maintain" } });
  expect(goalSuggestion({ ...healthy, goal: { ...healthy.goal, dismissed: { maintain: "2026-11-01" } } })).toBe(null);
  // an unrealistic pace → suggest a longer timescale
  expect(goalSuggestion(withGoal({ id: "healthy_weight", months: 3, targetKg: 80 }))).toMatchObject({ to: { months: 6 } });
  expect(goalCtx({ profile: {} })).toContain("not set yet");
});

test("UI: mandatory setup gate — no targets until complete; saving the goal shows the table", async ({ page }) => {
  const { errors } = await openApp(page);
  const d = await readData(); delete d.jc.goal; delete d.jc.profile.activityLevel; await writeData(d);
  await page.reload();
  const dlg = page.getByTestId("goal-setup");
  await expect(dlg).toBeVisible({ timeout: 20000 });
  await dlg.getByRole("button", { name: "Later" }).click();
  await expect(page.getByTestId("today-card").getByTestId("pa-setup-needed")).toBeVisible();
  await page.getByTestId("today-card").getByRole("button", { name: "Set up my goal" }).click();
  await dlg.getByLabel(/Work towards a healthy body weight/).check();
  await expect(dlg.getByTestId("goal-recommend")).toContainText("Your Companion recommends:");   // v2.18.1: recommended, not typed
  await dlg.getByRole("button", { name: "Change", exact: true }).click();
  await dlg.getByLabel("My target weight (kg)").fill("50");
  await expect(dlg.getByTestId("goal-bmi-block")).toBeVisible();                             // never below BMI 18.5
  await dlg.getByRole("button", { name: "Accept recommendation" }).click();
  await dlg.getByLabel("Mostly sitting").check();
  await dlg.getByRole("button", { name: "Save my goal" }).click();
  await expect(dlg).toHaveCount(0);
  await expect(page.getByTestId("today-card").getByTestId("pa-goal")).toBeVisible();
  const after = await readData();
  expect(after.jc.goal).toMatchObject({ id: "healthy_weight", months: 6 });
  expect(after.jc.profile.activityLevel).toBe("sitting");
  expect(errors).toEqual([]);
});

test("UI: the slider shows the pace colour and healthier alternatives", async ({ page }) => {
  const { errors } = await openApp(page);
  const d = await readData(); delete d.jc.goal; await writeData(d); await page.reload();
  const dlg = page.getByTestId("goal-setup");
  await expect(dlg).toBeVisible({ timeout: 20000 });
  await dlg.getByLabel(/Work towards a healthy body weight/).check();
  await dlg.getByRole("button", { name: "Change", exact: true }).click();
  await dlg.getByLabel("My target weight (kg)").fill("70");
  await dlg.getByLabel(/Timescale/).fill("3");
  await expect(dlg.getByTestId("goal-pace")).toHaveAttribute("data-level", "red");
  await expect(dlg.getByTestId("goal-pace")).toContainText("Steady:");
  await dlg.getByRole("button", { name: /^Gentle: \d+ months$/ }).click();
  await expect(dlg.getByTestId("goal-pace")).not.toHaveAttribute("data-level", "red");
  expect(errors).toEqual([]);
});

test("UI: one goal everywhere — Home Today and My Eating show the same goal; table rows, footnote, Week to date pill", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "Home");
  const card = page.getByTestId("today-card");
  for (const r of ["pa-burn", "pa-aim", "pa-exercise", "pa-goal", "pa-eating", "pa-ontrack"]) await expect(card.getByTestId(r)).toBeVisible();
  await expect(card.getByTestId("pa-aim")).toContainText("Your goal deficit");                                   // v2.20.0 label
  await expect(card.getByTestId("pa-goalname")).toContainText("Goal: Work towards a healthy body weight · 7 months");
  await expect(card.getByTestId("pa-footnote")).toHaveText("Actual includes eating selections stored in the day which need to be kept up to date, plus any exercises logged when completed");
  const homeGoal = (await card.getByTestId("pa-goal").locator("td").nth(1).innerText()).trim();
  if (new Date().getDay() > 0) await expect(card.getByRole("button", { name: "▸ Show earlier days this week" })).toBeVisible();
  await expect(page.getByTestId("week-so-far")).toHaveCount(0);                                // the old box is gone
  await expect(page.getByTestId("calorie-home")).toHaveCount(0);
  await tab(page, "My Eating");
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
  await page.getByRole("button", { name: wd, exact: true }).first().click();
  const day = page.getByTestId("day-plan-actual");
  await expect(day.getByTestId("pa-goal").locator("td").nth(1)).toHaveText(homeGoal);
  await expect(day.getByTestId("pa-footnote")).toBeVisible();
  await expect(page.getByText("Deficit:", { exact: false })).toHaveCount(0);                  // no user-facing deficit control
  await page.getByRole("button", { name: "Week", exact: true }).first().click();
  await expect(page.getByTestId("week-plan-actual").getByTestId("wpa-row")).toHaveCount(7);
  await expect(page.getByTestId("week-plan-actual").getByTestId("pa-footnote")).toBeVisible();
  expect(errors).toEqual([]);
});

test("UI: companions receive the goal context (Body feedback and Home check-in)", async ({ page }) => {
  const { errors, aiCalls } = await openApp(page);
  await tab(page, "My Body");
  const n0 = aiCalls.length;
  await page.getByRole("button", { name: "My Companion Body Feedback" }).click();
  await expect.poll(() => JSON.stringify(aiCalls.slice(n0))).toContain("PERSON GOAL: \\\"Work towards a healthy body weight\\\"");
  await expect.poll(() => JSON.stringify(aiCalls.slice(n0))).toContain("Timescale: 7 months");
  expect(JSON.stringify(aiCalls)).not.toMatch(/2000-2200|1700-1900/);
  expect(errors).toEqual([]);
});
