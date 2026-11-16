import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openApp, tab } from "./helpers.js";
function thisWeek() { const DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"]; const base = new Date(2026, 6, 19), now = new Date(); const ws = new Date(base); ws.setDate(ws.getDate() + Math.floor((now - base) / (7 * 864e5)) * 7); const d = ws.getFullYear() + "-" + String(ws.getMonth() + 1).padStart(2, "0") + "-" + String(ws.getDate()).padStart(2, "0"); return { key: "mealplan:" + d + ":jc", today: DAYS[now.getDay()] }; }
const DB = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };

// v2.17.0 P6 accessibility: axe (WCAG 2.0/2.1/2.2 A + AA) on the main screens, focus visible, ratings not by colour alone.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const scan = async (page) => (await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => v.id + " ×" + v.nodes.length + " e.g. " + v.nodes[0].html.slice(0, 120) + " " + JSON.stringify((v.nodes[0].any[0] || {}).data || {}).slice(0, 160));

for (const screen of ["Home", "My Exercise", "My Eating", "My Body", "My Health", "My Shop"]) {
  test("axe: no WCAG A/AA violations on " + screen, async ({ page }) => {
    const { errors } = await openApp(page);
    await tab(page, screen); await page.waitForTimeout(300);
    expect(await scan(page)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("axe: Settings and an open Progress week", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.locator("button").nth(1).click(); await page.waitForTimeout(300);
  expect(await scan(page)).toEqual([]);
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await page.getByRole("button", { name: "👁 Progress" }).first().click();
  await page.getByRole("button", { name: /^Open week/ }).first().click();
  expect(await scan(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test("keyboard focus is clearly visible (3px outline)", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle + " " + s.outlineWidth; });
  expect(outline).toBe("solid 3px");
  expect(errors).toEqual([]);
});

test("a chosen meal's rating has a shape + word, not only colour", async ({ page }) => {
  const { errors } = await openApp(page);
  const { key, today } = thisWeek();
  const a = { id: "t_red", name: "Test Fry Up", jcKcal: 900, beckKcal: 800, satFat: 20, rating: "RED" };
  const items = JSON.parse(await (await fetch(DB("custom_breakfasts"), { headers: H })).json());
  await fetch(DB("custom_breakfasts"), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify([a, ...items])) });
  await fetch(DB(key), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify({ [today]: { b: a.id } })) });
  await page.reload();
  await tab(page, "My Eating");
  const cue = page.getByTestId("rag-cue").first();
  await expect(cue).toBeVisible();
  await expect(cue).toHaveText(/(✓ Great|✓ Good|! Amber|✕ Red)/);
  expect(errors).toEqual([]);
});
