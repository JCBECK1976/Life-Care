import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.54.0 (Architect night batch 25 Nov, PART 3): each day's Summary — Day Calories (moved out of the header) · Week to date
// from Sunday up to AND including that day; the single-day row always shown; "Full Breakdown"; the day's Nutrition
// Overview shows all columns at 360 px with no sideways scrolling.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k.replace(/[.#$/[\]]/g, "_") + ".json" + NS;
const getKey = async (k) => { const v = await (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
const setKey = (k, obj) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
function thisWeek() {
  const base = new Date(2026, 6, 19), now = new Date();
  const ws = new Date(base); ws.setDate(ws.getDate() + Math.floor((now - base) / (7 * 864e5)) * 7);
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  return { key: "mealplan:" + ymd(ws) + ":jc", childKey: "eat_children:jc:" + ymd(ws) };
}
const A = { id: "t_sum_a", name: "Test Sum Breakfast With A Long Name", jcKcal: 650, beckKcal: 600, protein: 30.5, satFat: 4.4, carbs: 80.3, fibre: 6.6, salt: 1.25, rating: "GOOD" };
const num = (t) => Number(String(t).split("\n")[0].replace(/[^\d−-]/g, "").replace("−", "-"));
const dayBtn = (page, d) => page.getByRole("button", { name: new RegExp("^" + d + "( \\d+)?$") }).first();

async function seed(page) {
  const { key, childKey } = thisWeek();
  await setKey("custom_breakfasts", [A, ...((await getKey("custom_breakfasts")) || [])]);
  await setKey(key, { sunday: { b: A.id }, monday: { b: A.id } });
  await page.waitForTimeout(300); await fetch(url(childKey), { method: "DELETE", headers: { Authorization: "Bearer owner" } }); await page.reload();
  await tab(page, "My Eating");
}

test("day Summary: Day Calories (not in the header) + Week to date through this day; the day row always shown; spacing", async ({ page }) => {
  test.skip(new Date().getDay() < 1, "needs Sunday and Monday of this week in the past or today");
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await seed(page);
  await dayBtn(page, "Sun").click();
  const ds = page.getByTestId("day-summary");
  await expect(page.getByTestId("day-head")).not.toContainText("kcal");
  await expect(ds.getByTestId("sum-day")).toHaveText("Day Calories: 650");
  await expect(ds.getByTestId("day-sum-table").getByTestId("sum-row")).toHaveCount(1);              // always visible
  await expect(ds.getByTestId("sum-toggle")).toHaveCount(0);
  const row = ds.getByTestId("sum-row");
  const sunOnTrack = num(await row.locator('[data-col="ontrack"]').innerText());
  const sunGoal = num(await row.locator('[data-col="goal"]').innerText());
  expect(num(await row.locator('[data-col="burn"]').innerText()) - num(await row.locator('[data-col="target"]').innerText()) + num(await row.locator('[data-col="exercise"]').innerText())).toBe(sunGoal);
  await expect(ds.getByTestId("sum-wtd")).toContainText("Week to date: " + (sunOnTrack > 0 ? "+" : sunOnTrack < 0 ? "−" : "±") + Math.abs(sunOnTrack).toLocaleString("en-GB") + " kcal");   // Sunday = 1 day
  expect(await ds.getByTestId("sum-day").getAttribute("data-ok")).toBe(String(650 <= sunGoal));
  const gap = await page.evaluate(() => { const h = document.querySelector('[data-testid="day-head"]').getBoundingClientRect(), s = document.querySelector('[data-testid="day-summary"]').getBoundingClientRect(); return s.top - h.bottom; });
  expect(gap).toBeGreaterThanOrEqual(6);                                                               // breathing room under the buttons
  await ds.screenshot({ path: "test-results/v2540-shots/day-summary-360.png" });
  await dayBtn(page, "Mon").click();
  const monOnTrack = num(await page.getByTestId("day-summary").getByTestId("sum-row").locator('[data-col="ontrack"]').innerText());
  const both = sunOnTrack + monOnTrack;
  await expect(page.getByTestId("day-summary").getByTestId("sum-wtd")).toContainText("Week to date: " + (both > 0 ? "+" : both < 0 ? "−" : "±") + Math.abs(both).toLocaleString("en-GB") + " kcal");   // Sunday + Monday
  expect(errors).toEqual([]);
});

test("Full Breakdown opens the detail box; the day's Nutrition Overview shows every column at 360 px, no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openApp(page);
  await seed(page);
  await dayBtn(page, "Sun").click();
  await page.getByRole("button", { name: "Day full breakdown" }).click();
  const t = page.locator('[data-testid="nutrition-table"][data-day="1"]');
  await expect(t).toBeVisible();
  const fit = await t.evaluate((tb) => { const wrap = tb.parentElement, tr = tb.getBoundingClientRect(); return { noScroll: wrap.scrollWidth <= wrap.clientWidth + 1, inside: tr.right <= wrap.getBoundingClientRect().right + 1,
    spill: [...tb.querySelectorAll("td,th")].filter((c) => c.colSpan === 1 && !c.querySelector("span[style*='ellipsis']") && getComputedStyle(c).textOverflow !== "ellipsis" && c.scrollWidth > c.clientWidth + 1).map((c) => c.innerText) }; });
  expect(fit).toEqual({ noScroll: true, inside: true, spill: [] });
  for (const h of ["kcal", "prot", "s/fat", "carbs", "fib", "salt"]) await expect(t.getByText(h, { exact: true }).first()).toBeVisible();
  await t.scrollIntoViewIfNeeded();
  await t.screenshot({ path: "test-results/v2540-shots/day-breakdown-360.png" });
});
