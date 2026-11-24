import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { currentWeek } from "../scripts/make-fixture.mjs";
import { detectPattern, styleFor, styleRange, setAdvice, pillAfterSet, styleContext, unsoundFlags } from "../src/lib/trainingStyle.js";
import { skipEntry } from "../src/lib/exerciseWhy.js";

// v2.43.0 (Architect night batch 23 Nov, PART 5 — Silver+): training style, a style-aware Companion (pattern, one primary +
// at most one alternative, kind push-back, technical ranges only) and "Set my next session" in the session feedback.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const CW = currentWeek();
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const D = DAYS[new Date().getDay()];
const E = (wk, w, r, o = {}) => ({ wk, w: w + "kg", r, goodForm: "good", fullRange: "good", ...o });
const PRESS = (prog, o = {}) => ({ name: "Chest Press", exType: "weights", status: "consolidate", current: "40kg", reps: "12x3", sets: 3, prog, ...o });

test("pattern detector fixtures (an observation only)", () => {
  const k = (prog, st) => detectPattern(PRESS(prog), st || { focus: "mixed" }).key;
  expect(k([E(1, 40, "12x3"), E(2, 40, "13x3"), E(3, 40, "14/14/13")])).toBe("rising-reps");
  expect(k([E(1, 40, "12x3"), E(2, 40, "12x3"), E(3, 40, "12x3")])).toBe("plateau");
  expect(k([E(1, 40, "15x3"), E(2, 42, "12x3"), E(3, 44, "12x3")])).toBe("rising-load");
  expect(k([E(1, 44, "12x3"), E(2, 42, "12x3")])).toBe("falling-load");
  expect(k([E(1, 40, "12/10/9"), E(2, 40, "12/11/8"), E(3, 40, "13/12/12")])).toBe("failed");
  expect(k([E(1, 40, "12x3"), skipEntry({}, 2), skipEntry({}, 3)])).toBe("skips");
  expect(k([E(1, 40, "12x3")])).toBe("new");
  // the same reps under a Strength focus (6–8) are not failures
  expect(k([E(1, 40, "8/7/6"), E(2, 40, "8/8/7")], { focus: "strength" })).toBe("rising-reps");
  expect(detectPattern(PRESS([E(1, 40, "15x3"), E(2, 44, "12x3")])).text).toBe("load up about 10% over 2 logged weeks");
});

test("style: per person, per exercise override, ranges; unsound flags", () => {
  const person = { trainingStyle: { focus: "muscle", pace: "bigger", perExercise: { "Chest Press": { focus: "strength" } } } };
  expect(styleFor(person, "Leg Press")).toEqual({ focus: "muscle", pace: "bigger" });
  expect(styleFor(person, "chest press")).toMatchObject({ focus: "strength", pace: "bigger", perExercise: true });
  expect(styleFor({}, "x")).toEqual({ focus: "mixed", pace: "steady" });
  expect([styleRange(PRESS([]), { focus: "strength" }), styleRange(PRESS([]), { focus: "endurance" }), styleRange(PRESS([]), { focus: "mixed" })]).toEqual([{ lo: 6, hi: 8 }, { lo: 12, hi: 15 }, { lo: 12, hi: 15 }]);
  const working = PRESS([E(1, 40, "12x3", { goodForm: "working" })]);
  expect(unsoundFlags(working, {})[0]).toMatch(/form Working towards/);
  const ctx = styleContext(working, person);
  expect(ctx).toContain("[STYLE: Strength · 6–8 reps · Bigger jumps when ready; reps 6–8; step 5–10% when ready]");   // Chest Press has its own focus
  expect(ctx).toContain("[PATTERN (observation, last 4 weeks): ");
  expect(ctx).toContain("[UNSOUND — say so kindly: last log had form Working towards");
  expect(ctx).not.toMatch(/\b\d+(\.\d+)?\s*kg\b/);                                          // technical ranges only
});

test("Set my next session advice: jump outside 2.5–10%, reps outside the range, lower without a reason; the pill", () => {
  const ex = PRESS([E(1, 40, "12x3")]), st = { focus: "mixed" };
  expect(setAdvice(ex, "42", "12", st)).toEqual([]);                                      // +5%: sensible
  expect(setAdvice(ex, "46", "12", st)[0]).toMatch(/about 15% more .* usual 2\.5–10% step/);
  expect(setAdvice(ex, "40.5", "12", st)[0]).toMatch(/under 2\.5% more/);
  expect(setAdvice(ex, "36", "12", st)[0]).toMatch(/lower than last time \(40 kg\)/);
  expect(setAdvice(ex, "36", "12", st, "knee sore")).toEqual([]);                         // a reason given
  expect(setAdvice(ex, "42", "20", st)[0]).toBe("20 reps is outside your 12–15 range.");
  expect(setAdvice(ex, "42", "10", { focus: "strength" })[0]).toBe("10 reps is outside your 6–8 range (Strength).");
  expect([pillAfterSet(ex, "42"), pillAfterSet(ex, "40"), pillAfterSet(ex, "36"), pillAfterSet(ex, "")]).toEqual(["move up", "consolidate", "reduce", "consolidate"]);
});

async function seed(page, list, fb) {
  const dash = await get("dashboard:data"); dash.jc.exercises[D] = list; delete dash.jc.trainingStyle; await put("dashboard:data", dash);
  if (fb) await put("session_feedback_all", fb);
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
}

test("Settings → My training style: focus and pace per person, and per exercise", async ({ page }) => {
  const { errors } = await openApp(page);
  await seed(page, [PRESS([E(CW - 1, 40, "12x3")])]);
  await page.evaluate(() => window._lcGo("admin"));
  const card = page.getByTestId("training-style");
  await expect(card).toContainText("never an exact weight");
  await card.locator("#ts-focus").selectOption("muscle");
  await card.locator("#ts-pace").selectOption("consolidate");
  await expect.poll(async () => (await get("dashboard:data")).jc.trainingStyle).toMatchObject({ focus: "muscle", pace: "consolidate" });
  await card.locator("#ts-exercise").selectOption("Chest Press");
  await expect(card.getByTestId("training-style-now")).toContainText("uses your general style");
  await card.locator("#ts-focus").selectOption("strength");
  await expect.poll(async () => (await get("dashboard:data")).jc.trainingStyle.perExercise["Chest Press"]).toMatchObject({ focus: "strength", pace: "consolidate" });
  await page.setViewportSize({ width: 360, height: 800 });
  await card.screenshot({ path: "test-results/v2430-shots/training-style-360.png" });
  expect(errors).toEqual([]);
});

test("session feedback: one primary + an alternative; Set my next session gives advice, Keep my choice → the one target (card = Log pre-fill)", async ({ page }) => {
  const { errors } = await openApp(page);
  const fb = { ["jc_" + D]: { summary: "Good", nextSession: "", _feedbackWeek: 0, _generatedAt: "now", exercises: [{ name: "Chest Press", verdict: "Clean 12s.", icon: "star", newStatus: "move up", recommendation: "Add 2.5–5% and restart at 12 reps", alternative: "Stay and build to 15 first — slower, but more reps in the bank" }] } };
  await seed(page, [PRESS([E(CW - 1, 40, "12x3")])], fb);
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "▼ Show Feedback" }).first().click();
  await page.getByRole("button", { name: /Exercise Feedback & Recommendations/ }).click();
  await expect(page.getByTestId("fb-alternative")).toHaveText("Alternative: Stay and build to 15 first — slower, but more reps in the bank");
  const box = page.getByTestId("set-next");
  const order = await page.evaluate(() => [document.querySelector('[data-testid="set-next"]'), document.querySelector('[id^="user-note-"]')].map((e) => e.getBoundingClientRect().top));
  expect(order[0]).toBeLessThan(order[1]);                                                 // above the note box
  await box.getByLabel("Weight (kg)").fill("46");
  await box.getByLabel("Reps").fill("12");
  await box.getByRole("button", { name: "Set", exact: true }).click();
  await expect(box.getByTestId("set-next-advice")).toContainText("about 15% more");
  await page.setViewportSize({ width: 360, height: 800 });
  await box.screenshot({ path: "test-results/v2430-shots/set-next-advice-360.png" });
  await box.getByRole("button", { name: "Keep my choice" }).click();
  await expect(box.getByTestId("set-next-done")).toContainText("46kg · 12×3");
  const ex = (await get("dashboard:data")).jc.exercises[D][0];
  expect(ex.next).toMatchObject({ m1: "46", m2: "12", source: "set by you" });
  expect([ex.status, ex.statusSource]).toEqual(["move up", "set by you"]);
  await expect(page.getByTestId("ex-headline").first()).toHaveText("46kg · 12×3");
  await expect(page.getByTestId("ex-status").first()).toHaveText("Move Up");
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  await expect(page.locator('input[placeholder="Weight"]').first()).toHaveValue("46");
  await expect(page.locator('input[placeholder="Reps"]').first()).toHaveValue("12");
  expect(errors).toEqual([]);
});

test("the Companion prompt: style + pattern per exercise, one primary + one alternative, kind push-back, technical ranges only", async ({ page }) => {
  const { aiCalls } = await openApp(page);
  await seed(page, [PRESS([E(CW - 2, 40, "12x3"), E(CW - 1, 40, "13x3", { goodForm: "working" })])]);
  await tab(page, "My Exercise");
  const n0 = aiCalls.length;
  await page.getByRole("button", { name: "My Companion Session Feedback" }).click();
  await expect.poll(() => aiCalls.length).toBeGreaterThan(n0);
  const sent = JSON.stringify(aiCalls.slice(n0));
  for (const s of ["[STYLE: Mixed (your current ranges) · Steady small steps", "[PATTERN (observation, last 4 weeks): same load, reps rising", "[UNSOUND — say so kindly", "ONE primary recommendation", "at most ONE close alternative", "TECHNICAL RANGES ONLY", "NEVER an exact equipment weight", "do not simply agree"]) expect(sent).toContain(s);
  expect(sent).not.toContain("45–47kg");                                                    // the old stack-step instruction is gone
});
