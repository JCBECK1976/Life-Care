import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp, tab } from "./helpers.js";

// v2.20.1 (JC's phone test of Build a meal): obvious adding / no duplicates, saved = preview, stay on the form after Save,
// back to the day being planned, Serves required, product type labels, typical sauce portion.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const SAUCE = { product_name: "Pasta Bake, Tomato & Herb", brands: "Aldi", code: "9", categories_tags: ["en:sauces"], nutriments: { "energy-kcal_100g": 107, proteins_100g: 1.1, fat_100g: 6.5, "saturated-fat_100g": 0.6, carbohydrates_100g: 10, sugars_100g: 7, fiber_100g: 1.5, salt_100g: 0.9 } };
const SHOTS = "test-results/v2201-shots";
async function openMeal(page) {
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [SAUCE] }) }));
  await tab(page, "My Eating"); await page.getByRole("button", { name: "Update Eating Lists" }).click();
  const ul = page.getByTestId("update-lists"); await ul.getByRole("tab", { name: "Build a meal" }).click();
  return { ul, mb: ul.getByTestId("meal-builder") };
}

test("1 adding is obvious: search cleared, 'Added: …' announced, the new card highlighted; the same item twice → one row (Yes adds a portion)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  const { mb } = await openMeal(page);
  const search = mb.getByLabel("Search available items");
  await search.fill("fusilli"); await mb.getByTestId("avail-generic").first().click();
  await expect(search).toHaveValue("");
  await expect(mb.getByTestId("avail-generic")).toHaveCount(0);                                            // results closed
  await expect(page.getByTestId("meal-added")).toHaveText("✓ Added: Fusilli pasta (dried)");
  await expect(mb.locator('[data-testid="meal-comp"][data-new="true"]')).toContainText("Fusilli pasta (dried)");
  fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: SHOTS + "/360-ingredient-added.png" });
  await search.fill("fusilli"); await mb.getByTestId("avail-generic").first().click();
  const dup = mb.getByTestId("dup-prompt");
  await expect(dup).toContainText("Fusilli pasta (dried) is already in this meal. Add another portion?");
  await dup.screenshot({ path: SHOTS + "/360-duplicate-prompt.png" });
  await dup.getByRole("button", { name: "No" }).click();
  await expect(mb.getByTestId("meal-comp")).toHaveCount(1);
  await expect(mb.getByLabel("Amount of Fusilli pasta (dried)")).toHaveValue("1");
  await search.fill("fusilli"); await mb.getByTestId("avail-generic").first().click();
  await mb.getByTestId("dup-prompt").getByRole("button", { name: "Yes" }).click();
  await expect(mb.getByTestId("meal-comp")).toHaveCount(1);
  await expect(mb.getByLabel("Amount of Fusilli pasta (dried)")).toHaveValue("2");
  await expect(page.getByTestId("meal-added")).toContainText("Added another portion: Fusilli pasta (dried)");
  expect(errors).toEqual([]);
});

async function buildBake(mb) {
  const search = mb.getByLabel("Search available items");
  await search.fill("fusilli"); await mb.getByTestId("avail-generic").first().click();
  await search.fill("aldi pasta bake"); await mb.getByTestId("avail-off").first().click();
  await mb.getByLabel("Meal name").fill("Tomato Pasta Bake");
  await mb.getByLabel(/How many portions|Serves/).fill("1");
}
const kcalOf = (t) => parseInt(/(\d[\d,]*)\s*kcal/.exec(t)[1].replace(/,/g, ""), 10);

test("2 saved = preview: the preview total = the review card = the saved item = the value in the list", async ({ page }) => {
  const { errors } = await openApp(page);
  const { ul, mb } = await openMeal(page);
  await buildBake(mb);
  const preview = kcalOf(await mb.getByTestId("meal-per-portion").innerText());
  await mb.getByRole("button", { name: "Next" }).click();
  const card = kcalOf(await ul.getByTestId("save-step").getByTestId("per-portion").innerText());
  await ul.getByLabel("Breakfasts").uncheck(); await ul.getByLabel("Dinners").check();
  await ul.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => ((await get("custom_meals")) || []).find((x) => x.name === "Tomato Pasta Bake")?.jcKcal).toBe(preview);
  const saved = (await get("custom_meals")).find((x) => x.name === "Tomato Pasta Bake");
  const row = page.getByTestId("list-row").filter({ hasText: "Tomato Pasta Bake" });
  await expect(row).toHaveCount(1);
  expect([preview, card, saved.kcal, saved.jcKcal, kcalOf(await row.innerText())]).toEqual([373, 373, 373, 373, 373]);
  expect(errors).toEqual([]);
});

test("2 an older item with the same name is never kept silently: Replace it, or Keep both", async ({ page }) => {
  const { errors } = await openApp(page);
  const dinners = (await get("custom_meals")) || [];
  await put("custom_meals", dinners.concat([{ id: "t_old_bake", name: "Tomato Pasta Bake", kcal: 628, jcKcal: 628, beckKcal: 628, satFat: 11.4, rating: "RED", portion: { desc: "1 portion (as entered)" } }]));
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  const { ul, mb } = await openMeal(page);
  await buildBake(mb);
  await mb.getByRole("button", { name: "Next" }).click();
  await ul.getByLabel("Breakfasts").uncheck(); await ul.getByLabel("Dinners").check();
  await ul.getByRole("button", { name: "Save", exact: true }).click();
  const clash = ul.getByTestId("name-clash");
  await expect(clash).toContainText("You already have Tomato Pasta Bake in Dinners (628 kcal per portion). This one is 373 kcal per portion.");
  await clash.getByRole("button", { name: "Replace it with this one" }).click();
  await expect.poll(async () => (await get("custom_meals")).filter((x) => x.name === "Tomato Pasta Bake").map((x) => [x.id, x.jcKcal])).toEqual([["t_old_bake", 373]]);
  expect(errors).toEqual([]);
});
