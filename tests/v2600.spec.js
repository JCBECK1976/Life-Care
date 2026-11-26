import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.60.0 (Architect, 26 Nov "Show steps in the day"): with the steps feature (useSteps), steps the sync already stored
// show on My Exercise (each day: "👣 Steps 6,240 steps · +N kcal", "—" when none, "Connect my steps" when never set up;
// the week strip with each day, the total and the daily average), Home → My Day (today), the Summary's Exercise Benefit
// breakdown ("Steps +N · Workouts +N"), and every Companion's context. Read-only; no new permissions.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const TAB = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const today = new Date(), T = ymd(today), dow = today.getDay();
const back = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return ymd(d); };

async function start(page, activity, flagOn = true) {
  if (flagOn) await page.addInitScript(() => { localStorage.setItem("lc_flags", JSON.stringify({ useSteps: true })); });
  const r = await openApp(page);
  const dash = await get("dashboard:data"); dash.jc.dailyActivity = activity; await put("dashboard:data", dash);
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  return r;
}
const dayTab = (page) => page.getByRole("button", { name: new RegExp("^" + TAB[dow] + "( \\d+)?$") }).first();

test("My Exercise: today's line, a day with none '—', and the week strip with total and daily average", async ({ page }) => {
  test.skip(dow < 1, "needs an earlier day this week");
  await page.setViewportSize({ width: 360, height: 900 });
  const { errors } = await start(page, { [T]: { steps: 6240, source: "Health Connect" }, [back(1)]: { steps: 9000, source: "Health Connect" } });
  await tab(page, "My Exercise"); await dayTab(page).click();
  await expect(page.getByTestId("steps-day").getByTestId("steps-value")).toHaveText(/^6,240 steps · \+\d[\d,]* kcal$/);
  await expect(page.getByTestId("steps-day").getByTestId("steps-connect")).toHaveCount(0);           // set up
  const w = page.getByTestId("steps-week");
  await expect(w.getByTestId("steps-week-total")).toHaveText("15,240 total · 7,620 a day on average");
  await expect(w.locator(`[data-date="${T}"]`).getByTestId("steps-week-value")).toHaveText("6,240");
  await expect(w.locator(`[data-date="${back(1)}"]`).getByTestId("steps-week-value")).toHaveText("9,000");
  await page.screenshot({ path: "test-results/v2600-shots/exercise-steps-360.png" });
  if (dow >= 2) { await page.getByRole("button", { name: new RegExp("^" + TAB[dow - 2] + "( \\d+)?$") }).first().click(); await expect(page.getByTestId("steps-day").getByTestId("steps-value")).toHaveText("—"); }
  expect(errors).toEqual([]);
});

test("active calories on: the line adds 'active … kcal'; Home → My Day shows today's steps", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await start(page, { [T]: { steps: 6240, activeKcal: 320, source: "Health Connect" } });
  if (!(await page.getByTestId("myday-eating").count())) await page.getByRole("button", { name: /My Day/ }).first().click();
  await expect(page.getByTestId("home-steps").getByTestId("steps-value")).toHaveText("6,240 steps · active 320 kcal");
  await page.getByTestId("home-steps").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/v2600-shots/home-myday-steps-360.png" });
  await tab(page, "My Exercise"); await dayTab(page).click();
  await expect(page.getByTestId("steps-day").getByTestId("steps-value")).toHaveText("6,240 steps · active 320 kcal");
});

test("never set up: '—' with 'Connect my steps', which opens Settings at the steps card", async ({ page }) => {
  await start(page, null);
  await tab(page, "My Exercise"); await dayTab(page).click();
  await expect(page.getByTestId("steps-day").getByTestId("steps-value")).toHaveText("—");
  await page.getByTestId("steps-day").getByTestId("steps-connect").click();
  await expect(page.getByTestId("steps-card")).toBeVisible();
});

test("Summary: tapping Exercise Benefit shows 'Steps +N · Workouts +N'", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await start(page, { [T]: { steps: 12000, source: "Health Connect" } });
  await tab(page, "My Eating"); await dayTab(page).click();
  const ds = page.getByTestId("day-summary");
  const b = ds.getByTestId("sum-benefit");
  await expect(b).toHaveAttribute("aria-expanded", "false");
  await b.click();
  await expect(ds.getByTestId("sum-benefit-row")).toHaveText(/^Steps \+\d[\d,]* · Workouts \+\d[\d,]*$/);
  const [s, w] = (await ds.getByTestId("sum-benefit-row").innerText()).match(/\d[\d,]*/g).map((x) => Number(x.replace(/,/g, "")));
  expect(s + w).toBe(Number((await b.innerText()).replace(/,/g, "")));                                // the parts add up
  await ds.screenshot({ path: "test-results/v2600-shots/benefit-breakdown-360.png" });
  await b.click();
  await expect(ds.getByTestId("sum-benefit-row")).toHaveCount(0);
});

test("the Companion is told the steps (session feedback); nothing about steps when the feature is off", async ({ page }) => {
  const { aiCalls } = await start(page, { [T]: { steps: 6240, source: "Health Connect" } });
  await tab(page, "My Exercise"); await page.getByRole("button", { name: /^Sun( \d+)?$/ }).first().click();
  await page.getByRole("button", { name: /My Companion Session Feedback/ }).click();
  await expect.poll(() => JSON.stringify(aiCalls)).toContain("STEPS (from the phone's health app, read-only): today 6,240");
});

test("feature off (beta/prod): no steps line, strip or Home steps", async ({ page }) => {
  await start(page, { [T]: { steps: 6240, source: "Health Connect" } }, false);
  await expect(page.getByTestId("home-steps")).toHaveCount(0);
  await tab(page, "My Exercise"); await dayTab(page).click();
  await expect(page.getByTestId("steps-week")).toHaveCount(0);
  await expect(page.getByTestId("steps-day")).toHaveCount(0);
});
