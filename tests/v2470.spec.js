import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { currentWeek } from "../scripts/make-fixture.mjs";
import { pillAfterLog, metCardio } from "../src/lib/pills.js";
import { cardioAdvice, setAdvice, pillAfterSet, styleContext, cardioStyleFor } from "../src/lib/trainingStyle.js";
import { isCardioEx, cardioHasForm } from "../src/lib/cardio.js";

// v2.47.0 (Architect brief 24 Nov, P2): cardio training style, "How hard did it feel?", the cardio pill, one-variable advice.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const CW = currentWeek();
const D = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
const BIKE = (o = {}) => ({ name: "Exercise Bike", exType: "cardio", status: "consolidate", current: "20kg", reps: "8", sets: 1, prog: [{ wk: CW - 1, w: "20kg", r: "8", sets: [{ w: "20", r: "8" }], effort: "right" }], ...o });
const s1 = (w, r) => [{ w: String(w), r: String(r) }];

test("cardio pill: met / not met × Easy / About right / Very hard; no target = the plan; Maintain, Reduce", () => {
  const ex = BIKE(), T = { m1: "22", m2: "" }, plan = { w: "20kg", r: "8" };
  for (const [eff, met, want] of [["easy", true, "move up"], ["right", true, "move up"], ["hard", true, "consolidate"], ["easy", false, "consolidate"], ["right", false, "consolidate"], ["hard", false, "consolidate"]]) {
    expect(pillAfterLog("standard", s1(met ? 22 : 21, 8), { effort: eff, plan }, T, ex)).toBe(want);
  }
  // no target: the planned time/distance completed
  expect(pillAfterLog("standard", s1(20, 8), { effort: "easy", plan }, null, ex)).toBe("move up");
  expect(pillAfterLog("standard", s1(20, 7), { effort: "easy", plan }, null, ex)).toBe("consolidate");
  expect(pillAfterLog("standard", s1(20, 8), { effort: "hard", plan }, null, ex)).toBe("consolidate");
  expect(pillAfterLog("maintain", s1(30, 9), { effort: "easy", plan }, null, ex)).toBe("consolidate");
  expect(pillAfterLog("reduce", s1(30, 9), { effort: "easy", plan }, null, ex)).toBe("reduce");
  expect(metCardio(s1(20, 8), null, { w: "", r: "" })).toBe(false);
  expect([isCardioEx(BIKE()), isCardioEx({ name: "Chest Press", exType: "weights" }), cardioHasForm({ name: "Rowing Machine", exType: "cardio" }), cardioHasForm(BIKE())]).toEqual([true, false, true, false]);
});

test("cardio Set my next session advice: one variable at a time, 10% a week, the focus; the pill", () => {
  const ex = BIKE();
  expect(setAdvice(ex, "21", "8", {})).toEqual([]);                                           // +5% time only: fine
  expect(cardioAdvice(ex, "21", "8.5", {})[0]).toMatch(/changed two things at once.*add time first/);
  expect(cardioAdvice(ex, "21", "8.5", { focus: "fitness" })[0]).toMatch(/keep the time the same/);
  expect(cardioAdvice(ex, "24", "8", {})[0]).toMatch(/about 20% more time .* 10% or less/);
  expect(cardioAdvice(ex, "20", "8.5", { focus: "endurance" })).toEqual(["With Endurance, add time first, then speed or level."]);
  expect(cardioAdvice(ex, "21", "8", { focus: "fitness" })).toEqual(["With Fitness-speed, keep the time the same and go faster or a level up instead."]);
  expect(cardioAdvice(ex, "18", "8", {})[0]).toMatch(/lower than last time/);
  expect(cardioAdvice(ex, "18", "8", {}, "short on time")).toEqual([]);
  expect([pillAfterSet(ex, "21", "8"), pillAfterSet(ex, "20", "8"), pillAfterSet(ex, "18", "8")]).toEqual(["move up", "consolidate", "reduce"]);
});

test("cardio style: default not chosen; the Companion line (one variable, ≤10%, effort, pattern)", () => {
  expect(cardioStyleFor({})).toMatchObject({ focus: "", pace: "" });
  const line = styleContext(BIKE({ prog: [{ wk: 1, w: "20kg", r: "8" }, { wk: 2, w: "22kg", r: "8", effort: "hard" }] }), { trainingStyle: { cardio: { focus: "endurance", pace: "steady" } } });
  expect(line).toContain("[CARDIO STYLE: Endurance (go longer at a steady pace) · Steady small steps; change ONE variable at a time (time first, then speed/level), 10% or less a week]");
  expect(line).toContain("[LAST EFFORT: Very hard]");
  expect(line).toContain("time up about 10%");
  expect(line).toContain("[UNSOUND — say so kindly: last session felt Very hard");
});

async function seed(page, list, extra) {
  const dash = await get("dashboard:data"); dash.jc.exercises[D] = list; dash.jc.trainingStyle = Object.assign({}, extra || {}); await put("dashboard:data", dash);
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
}

test("cardio Log form: 'How hard did it feel?' instead of Range/Form; saved as effort; Move Up when met and About right", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  await seed(page, [BIKE({ next: { m1: "21", m2: "", source: "set by you", setAt: "x" } })]);
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  const q = page.getByTestId("session-quality");
  await expect(q).toHaveAttribute("data-kind", "cardio");
  await expect(q).toContainText("How hard did it feel?");
  expect(await q.getByTestId("quality-effort").getByRole("button").allInnerTexts()).toEqual(["Easy", "About right", "Very hard"]);
  await expect(q).not.toContainText("Full Range");
  await expect(q.getByTestId("quality-form")).toHaveCount(0);                                  // no Form on a bike
  await expect(page.getByTestId("log-progression")).toContainText("Progression: 21 min (set by you)");   // v2.48.1: the one target, in minutes
  await expect(page.getByTestId("log-previous")).toHaveText("Previous: 20 min · 8 km (Wk " + (CW - 1) + ")");
  await expect(page.getByTestId("log-why")).toContainText("Easy or About right");
  await expect(page.getByTestId("log-why")).not.toContainText("range and form");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("log-need-choice")).toHaveText("Choose how hard it felt to save");
  await q.getByRole("button", { name: "About right" }).click();
  await page.setViewportSize({ width: 360, height: 800 });
  await q.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/v2470-shots/cardio-log-360.png" });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await get("dashboard:data")).jc.exercises[D][0].prog.find((e) => e.wk === CW)).toMatchObject({ effort: "right" });
  const ex = (await get("dashboard:data")).jc.exercises[D][0];
  expect(ex.prog.find((e) => e.wk === CW).fullRange).toBeUndefined();
  expect([ex.status, ex.statusSource]).toEqual(["move up", "rules"]);
  expect(errors).toEqual([]);
});

test("rowing keeps Form; My Profile has the Cardio subsection; Set my next session for cardio gives one-variable advice", async ({ page }) => {
  const { errors } = await openApp(page);
  const fb = { ["jc_" + D]: { summary: "Good", nextSession: "", _feedbackWeek: 0, _generatedAt: "now", exercises: [{ name: "Exercise Bike", verdict: "Steady.", icon: "star", newStatus: "move up", recommendation: "Add 5–10% time", alternative: "" }] } };
  await put("session_feedback_all", fb);
  await seed(page, [BIKE(), { name: "Rowing Machine", exType: "cardio", status: "", current: "10kg", reps: "2", sets: 1, prog: [{ wk: CW - 1, w: "10kg", r: "2" }] }]);
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "📋 Log", exact: true }).nth(1).click();
  await expect(page.getByTestId("session-quality").getByTestId("quality-form")).toBeVisible();
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "▼ Show Feedback" }).first().click();
  await page.getByRole("button", { name: /Exercise Feedback & Recommendations/ }).click();
  const box = page.getByTestId("set-next").first();
  await box.getByLabel("Duration (min)").fill("22"); await box.getByLabel("Distance (km)").fill("9");
  await box.getByRole("button", { name: "Set", exact: true }).click();
  await expect(box.getByTestId("set-next-advice")).toContainText("changed two things at once");
  await page.setViewportSize({ width: 360, height: 800 });
  await box.scrollIntoViewIfNeeded();
  await page.locator('[id^="rec-"]').first().screenshot({ path: "test-results/v2470-shots/cardio-set-next-360.png" });
  await page.evaluate(() => window._lcGo("overview"));
  await page.getByRole("button", { name: "▼ My Profile" }).click();
  const c = page.getByTestId("training-style-cardio");
  await expect(c.locator("#ts-cardio-focus")).toHaveValue("");                                  // not chosen = as before
  expect(await c.locator("#ts-cardio-focus option").allInnerTexts()).toEqual(["Not chosen (as now)", "Endurance", "Fitness-speed", "Fat burn", "Intervals"]);
  await c.locator("#ts-cardio-focus").selectOption("fitness");
  await expect(c.getByTestId("ts-cardio-focus-why")).toHaveText("Same time, but faster or at a higher level.");
  await c.locator("#ts-cardio-pace").selectOption("consolidate");
  await expect.poll(async () => (await get("dashboard:data")).jc.trainingStyle.cardio).toEqual({ focus: "fitness", pace: "consolidate" });
  await page.getByTestId("training-style").scrollIntoViewIfNeeded();
  await page.getByTestId("training-style").screenshot({ path: "test-results/v2470-shots/my-training-style-360.png" });
  expect(errors).toEqual([]);
});
