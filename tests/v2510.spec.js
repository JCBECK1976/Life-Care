import { test, expect } from "@playwright/test";
import { openApp, tab, PROGRESS } from "./helpers.js";
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k.replace(/[.#$/[\]]/g, "_") + ".json" + NS;
const getKey = async (k) => { const v = await (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
const setKey = (k, obj) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function thisWeek() {
  const base = new Date(2026, 6, 19), now = new Date();
  const ws = new Date(base); ws.setDate(ws.getDate() + Math.floor((now - base) / (7 * 864e5)) * 7);
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  return { key: "mealplan:" + ymd(ws) + ":jc", today: DAYS[now.getDay()], childKey: "eat_children:jc:" + ymd(ws) };
}
async function freshReload(page) { await page.waitForTimeout(300); await fetch(url(thisWeek().childKey), { method: "DELETE", headers: { Authorization: "Bearer owner" } }); await page.reload(); }

// v2.51.0 (Architect night batch 24 Nov, PART 3): Nutrition Overview values rounded (one decimal, whole kcal, no float
// artefacts, no overlapping columns at 360 px); the week and day headers wrap their buttons on a phone.
const A = { id: "t_frac_a", name: "Test Frac A", jcKcal: 180.4, beckKcal: 170, protein: 8.8, satFat: 1.1, carbs: 20.2, fibre: 2.3, salt: 0.35, rating: "GOOD" };
const B = { id: "t_frac_b", name: "Test Frac B", jcKcal: 210.25, beckKcal: 200, protein: 17.6, satFat: 2.2, carbs: 30.1, fibre: 4.4, salt: 0.7, rating: "GOOD" };
const LONG = /\d+\.\d{2,}/;                                                                          // more than one decimal = an artefact

async function seed(page) {
  const { key, today } = thisWeek();
  await setKey("custom_breakfasts", [A, B, ...((await getKey("custom_breakfasts")) || [])]);
  await setKey(key, { [today]: { b: A.id, b2: B.id } });
  await freshReload(page);
  await tab(page, "My Eating");
  return today;
}
const noOverlap = async (table) => table.evaluate((t) => [...t.querySelectorAll("tr")].every((tr) => {
  const cells = [...tr.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0);
  return cells.every((r, i) => i === 0 || r.left >= cells[i - 1].right - 0.5)
    && [...tr.children].every((c) => c.colSpan > 1 || c.scrollWidth <= c.clientWidth + 1);   // v2.51.1: no number spills out of its cell
}));

test("Nutrition Overview (week and day): one decimal, whole kcal, no float artefacts, columns don't overlap at 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  const today = await seed(page);
  await page.getByRole("button", { name: "Week", exact: true }).first().click();
  await page.getByRole("button", { name: "Week full breakdown" }).click();
  const week = page.getByText("Week — Nutrition Overview (g)").locator("xpath=ancestor::div[2]");
  await expect(week).toContainText("Recommended");
  const wt = await week.innerText();
  expect(wt).not.toMatch(LONG);
  expect(wt).toContain("26.4");                                                                      // 8.8 + 17.6 (was 26.400000000000006)
  expect(wt).toMatch(/Total\s+390\s+26\.4\s+3\.3\s+50\.3\s+6\.7\s+1\.1/);                                // whole kcal, one decimal
  for (const t of await week.locator("table").all()) expect(await noOverlap(t)).toBe(true);
  await week.screenshot({ path: "test-results/v2510-shots/nutrition-overview-360.png" });
  await page.getByRole("button", { name: new RegExp("^" + today.slice(0, 1).toUpperCase() + today.slice(1, 3) + "( \\d+)?$") }).first().click();
  await page.getByRole("button", { name: PROGRESS }).first().click();
  const day = page.getByText(/ — Nutrition Overview/).last().locator("xpath=ancestor::div[2]");
  const dt = await day.innerText();
  expect(dt).not.toMatch(LONG);
  expect(dt).toContain("26.4");
  for (const t of await day.locator("table").all()) expect(await noOverlap(t)).toBe(true);
  expect(errors).toEqual([]);
});

test("headers at 360 px: 'My Week — Avg … kcal/day' and 'Monday — 1988 kcal' put Copy / Progress on their own line", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openApp(page);
  const today = await seed(page);
  await page.getByRole("button", { name: "Week", exact: true }).first().click();
  const below = async (head) => head.evaluate((h) => { const t = h.querySelector('[role="heading"]').getBoundingClientRect(); return [...h.querySelectorAll("button")].every((b) => b.getBoundingClientRect().top >= t.bottom - 1); });
  const wh = page.getByTestId("week-head");
  await expect(wh).not.toContainText("Avg");                                                       // v2.53.0: the Avg moved into the Week Summary
  expect(await below(wh)).toBe(true);
  await wh.screenshot({ path: "test-results/v2510-shots/week-header-360.png" });
  await page.getByRole("button", { name: new RegExp("^" + today.slice(0, 1).toUpperCase() + today.slice(1, 3) + "( \\d+)?$") }).first().click();
  const dh = page.getByTestId("day-head");
  await expect(dh).toContainText("390 kcal");
  expect(await below(dh)).toBe(true);
  // wide screens keep one line
  await page.setViewportSize({ width: 900, height: 800 });
  expect(await dh.evaluate((h) => { const t = h.querySelector('[role="heading"]').getBoundingClientRect(); return [...h.querySelectorAll("button")].some((b) => b.getBoundingClientRect().top < t.bottom); })).toBe(true);
});
