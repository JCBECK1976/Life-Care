import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.58.1 (Architect brief 26 Nov, PART 3): EXACTLY ONE trailing blank "Add …" row after a category's last filled row,
// whatever filled it — a pick, "+ Not in my list?" → Update Eating Lists → Save, Snap, share / Home Snap / Copy Day /
// defaults (all of which write filled rows only) — on every category, on day views AND Week → Set Defaults.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k.replace(/[.#$/[\]]/g, "_") + ".json" + NS;
const getKey = async (k) => { const v = await (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
const setKey = (k, obj) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
function thisWeek() {
  const base = new Date(2026, 6, 19), now = new Date();
  const ws = new Date(base); ws.setDate(ws.getDate() + Math.floor((now - base) / (7 * 864e5)) * 7);
  return { key: "mealplan:" + ymd(ws) + ":jc", childKey: "eat_children:jc:" + ymd(ws) };
}
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const TAB = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATS = [["breakfast", "custom_breakfasts", "b", "b"], ["lunch", "custom_lunches", "l", "l"], ["dinner", "custom_meals", "d", "d"],
  ["dessert", "custom_desserts", "ds1", "ds"], ["drink", "custom_drinks", "dr1", "dr"], ["snack", "custom_snacks", "o1", "o1"]];   // [label, list, day slot, default slot]
const item = (c) => ({ id: "t_tb_" + c, name: "Test TB " + c, jcKcal: 100, beckKcal: 90, protein: 5, satFat: 1, rating: "GOOD" });
const blanks = (page, label) => page.getByTestId("picker-trigger").filter({ hasText: new RegExp("^\\s*\\+?\\s*Add " + label + "…") });
const OFF_GRANOLA = { product_name: "Test Granola", brands: "Test", code: "5", serving_size: "45 g", serving_quantity: 45, nutriments: { "energy-kcal_100g": 450, proteins_100g: 9, fat_100g: 18, "saturated-fat_100g": 4, carbohydrates_100g: 60, sugars_100g: 20, fiber_100g: 6, salt_100g: 0.1 } };

async function seedLists() { for (const [c, list] of CATS) await setKey(list, [item(c), ...((await getKey(list)) || [])]); }
async function reloadDay(page) {
  await page.waitForTimeout(300); await fetch(url(thisWeek().childKey), { method: "DELETE", headers: { Authorization: "Bearer owner" } });
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Eating"); await page.getByRole("button", { name: new RegExp("^" + TAB[new Date().getDay()] + "( \\d+)?$") }).first().click();
}

test("day view, every category filled with NO blank stored (as Snap / share / Home Snap / Copy Day / defaults leave it) + stale blanks: exactly one 'Add …' after each", async ({ page }) => {
  const { errors } = await openApp(page);
  await seedLists();
  const day = {}; for (const [c, , slot] of CATS) day[slot] = item(c).id;
  Object.assign(day, { b2: "__empty__", b3: "__empty__", o2: "__empty__", o5: "__empty__", dr3: "__empty__" });   // stale blanks are hidden
  await setKey(thisWeek().key, { [DAYS[new Date().getDay()]]: day });
  await reloadDay(page);
  for (const [c] of CATS) {
    await expect(page.getByTestId("picker-trigger").filter({ hasText: "Test TB " + c })).toHaveCount(1);
    await expect(blanks(page, c), c).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test("Week → Set Defaults, every category filled: exactly one 'Add …' after each", async ({ page }) => {
  await openApp(page);
  await seedLists();
  const md = (await getKey("meal_defaults")) || {}; md.jc = {}; for (const [c, , , slot] of CATS) md.jc[slot] = item(c).id;
  await setKey("meal_defaults", md);
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Eating"); await page.getByRole("button", { name: "Week", exact: true }).first().click();
  const sd = page.getByText("Set Defaults", { exact: true }).locator("xpath=..");
  for (const [c] of CATS) await expect(sd.getByTestId("picker-trigger").filter({ hasText: new RegExp("^\\s*\\+?\\s*Add " + c + "…") }), c).toHaveCount(1);
});

for (const [c] of CATS) test(`'+ Not in my list?' → Update Eating Lists → Save on the ${c} row → the next blank row appears`, async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: /granola/i.test(r.request().url()) ? [OFF_GRANOLA] : [] }) }));
  await setKey(thisWeek().key, {});
  await reloadDay(page);
  await blanks(page, c).first().click();
  await page.getByText("+ Not in my list?").first().click();
  const ul = page.getByTestId("update-lists");
  await ul.getByLabel("Search your lists, common foods and UK products").fill("Test Granola");
  await ul.getByTestId("off-option").first().click();
  await ul.getByRole("button", { name: "Confirm" }).click();
  await ul.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("update-lists")).toHaveCount(0);                                     // back to the day
  await expect(page.getByTestId("picker-trigger").filter({ hasText: "Test Granola" })).toHaveCount(1);
  await expect(blanks(page, c)).toHaveCount(1);                                                         // the new blank row
  const [filled, blank] = [await page.getByTestId("picker-trigger").filter({ hasText: "Test Granola" }).boundingBox(), await blanks(page, c).boundingBox()];
  expect(blank.y).toBeGreaterThan(filled.y);                                                          // below it
  if (c === "snack") { await page.getByTestId("picker-trigger").filter({ hasText: "Test Granola" }).scrollIntoViewIfNeeded(); await page.screenshot({ path: "test-results/v2581-shots/snack-added-blank-row-360.png" }); }
  expect(errors).toEqual([]);
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
for (const c of ["breakfast", "snack"]) test(`Snap on the last ${c} row → Confirm → the next blank row appears`, async ({ page }) => {
  const { errors } = await openApp(page);
  await setKey(thisWeek().key, {});
  await reloadDay(page);
  await blanks(page, c).first().click();
  await page.getByTestId("act-snap").click();
  const box = page.getByTestId("picker-snap");
  await box.locator("label", { hasText: "📷 Take photo" }).locator("input[type=file]").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
  await box.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByTestId("picker-sheet")).toHaveCount(0);
  await expect(blanks(page, c)).toHaveCount(1);
  const all = await page.getByTestId("picker-trigger").allInnerTexts();
  const i = all.findIndex((t) => new RegExp("Add " + c + "…").test(t));
  expect(i).toBeGreaterThan(0); expect(all[i - 1]).not.toMatch(/Add /);                              // right after the snapped row
  expect(errors).toEqual([]);
});
