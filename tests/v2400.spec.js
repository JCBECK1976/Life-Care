import { test, expect } from "@playwright/test";
import { openApp, tab, PROGRESS } from "./helpers.js";
import { currentWeek } from "../scripts/make-fixture.mjs";
import { skipEntry } from "../src/lib/exerciseWhy.js";

// v2.40.0 (Architect night batch 23 Nov, PART 2): the Log form, top to bottom — previous notes (yellow), Companion
// feedback (last week; yellow, Show/Hide, hidden each time), one range + why line, sets, "Skipped this session", Session
// Quality, Progression, My Notes, Save. History → Open: "Your Companion said" is yellow.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const CW = currentWeek();
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const D = DAYS[new Date().getDay()];
const PRESS = (o = {}) => ({ name: "Chest Press", exType: "weights", status: "consolidating", current: "29kg", reps: "10x3", sets: 3, target: "36kg",
  prog: [{ wk: CW - 2, w: "27kg", r: "15x3" }, { wk: CW - 1, w: "29kg", r: "10/10/9", goodForm: "good", fullRange: "good", companion: { verdict: "Solid first week at the new weight.", recommendation: "Stay at 29 kg and build to 12", decision: "accepted" } }], ...o });
async function seed(page, list) {
  const dash = await get("dashboard:data"); dash.jc.exercises[D] = list; await put("dashboard:data", dash);
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Exercise");
}
const openLog = (page, i = 0) => page.getByRole("button", { name: "📋 Log", exact: true }).nth(i).click();

test("Log form order; last week's Companion feedback is yellow, hidden every time the form opens, Show/Hide; one range + why line", async ({ page }) => {
  const { errors } = await openApp(page);
  await seed(page, [PRESS()]);
  await openLog(page);
  const fb = page.getByTestId("log-fb");
  await expect(fb).toHaveCSS("background-color", "rgb(254, 243, 199)");
  await expect(fb).not.toHaveAttribute("open", "");
  await expect(fb.locator("summary")).toContainText("Show");
  await fb.locator("summary").click();
  await expect(fb).toContainText("Recommendation: Stay at 29 kg and build to 12");
  await expect(fb).toContainText("Why: Solid first week at the new weight.");
  await expect(fb.getByTestId("log-fb-decision")).toContainText("accepted it");
  await expect(fb.locator("summary")).toContainText("Hide");
  await expect(page.getByTestId("log-why")).toContainText("Range 12–15 ·");
  // order: feedback → why → sets → Skipped → Session Quality → Progression → My Notes
  const order = await page.evaluate(() => ["log-fb", "log-why", "log-sets", "log-skipped", "session-quality"].map((id) => document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect().top));
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByTestId("log-fb").screenshot({ path: "test-results/v2400-shots/log-feedback-shown-360.png" });
  // close and reopen the form → hidden again
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Exercise");
  await openLog(page);
  await expect(page.getByTestId("log-fb")).not.toHaveAttribute("open", "");
  expect(errors).toEqual([]);
});

test("Skipped this session: the sets grey out; Save without Form/Range saves zeros marked skipped with My Notes as the reason; pill and target unchanged; history greyed", async ({ page }) => {
  await openApp(page);
  await seed(page, [PRESS()]);
  await openLog(page);
  await page.getByTestId("log-skipped").locator("input").check();
  await expect(page.getByTestId("log-sets")).toHaveCSS("opacity", "0.45");
  await expect(page.locator('input[placeholder="Weight"]').first()).toBeDisabled();
  await page.locator("#log-notes").fill("knee sore");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByTestId("log-skipped").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/v2400-shots/log-skipped-360.png" });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await get("dashboard:data")).jc.exercises[D][0].prog.find((e) => e.wk === CW)).toMatchObject({ skipped: true, w: "0kg", r: "0×3", note: "knee sore" });
  const ex = (await get("dashboard:data")).jc.exercises[D][0];
  expect([ex.status, ex.current, ex.target]).toEqual(["consolidating", "29kg", "36kg"]);
  await expect(page.getByTestId("log-need-choice")).toHaveCount(0);
  await page.getByRole("button", { name: PROGRESS }).first().click();
  await expect(page.getByTestId("prog-skipped").first()).toHaveText("Skipped — knee sore");
});

test("three skips in a row: a gentle suggestion in the Log form; the session feedback prompt marks SKIPPED weeks", async ({ page }) => {
  const { aiCalls } = await openApp(page);
  await seed(page, [PRESS({ prog: [{ wk: CW - 4, w: "29kg", r: "12x3" }, skipEntry({}, CW - 3, "away"), skipEntry({}, CW - 2), skipEntry({}, CW - 1, "tired")] })]);
  await openLog(page);
  await expect(page.getByTestId("log-skip-checkin")).toContainText("three weeks running — that's fine");
  const n0 = aiCalls.length;
  await page.getByRole("button", { name: "My Companion Session Feedback" }).click();
  await expect.poll(() => aiCalls.length).toBeGreaterThan(n0);
  expect(JSON.stringify(aiCalls.slice(n0))).toContain("SKIPPED (why: tired)");
});

test("history → Open: 'Your Companion said' is yellow", async ({ page }) => {
  await openApp(page);
  await seed(page, [PRESS()]);
  await page.getByRole("button", { name: PROGRESS }).first().click();
  await page.getByRole("button", { name: "Open week " + (CW - 1) }).click();
  await expect(page.getByTestId("entry-companion")).toHaveCSS("background-color", "rgb(254, 243, 199)");
  await expect(page.getByTestId("entry-companion")).toContainText("Your Companion said (week " + (CW - 1) + ")");
});
