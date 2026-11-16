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
