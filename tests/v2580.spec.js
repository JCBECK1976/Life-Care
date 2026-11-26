import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.58.0 (Architect brief 26 Nov, PART 2): in Single item (and the picker's Add New, which opens it), when NOTHING
// matches in my lists, common foods AND UK products, "Describe it instead" opens by itself, filled with what was typed,
// and the Companion's check starts straight away ("Your Companion is checking…"). With results, the
// "Can't see it? Describe it instead" button stays as it was.
const OFF_JSON = (products) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ products }) });

test("Single item: no match anywhere → Describe opens by itself, pre-filled, and the Companion checks straight away", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors, aiCalls } = await openApp(page);
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill(OFF_JSON([])));
  let release; const gate = new Promise((r) => { release = r; });
  await page.route("https://api.anthropic.com/**", async (r) => { if (!/CLARIFY_ITEM IDENTIFY/.test(r.request().postData() || "")) return r.fallback(); await gate; return r.fallback(); });
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  const ul = page.getByTestId("update-lists");
  await ul.getByLabel("Search your lists, common foods and UK products").fill("zzqx wobble cake");
  const box = ul.getByTestId("describe-it");
  await expect(box).toBeVisible({ timeout: 15000 });
  await expect(box.getByLabel(/Describe it in your own words/)).toHaveValue("zzqx wobble cake");
  await expect(box.getByTestId("describe-busy")).toHaveText("Your Companion is checking…");
  await box.screenshot({ path: "test-results/v2580-shots/auto-describe-360.png" });
  release();
  await expect(box.getByTestId("describe-choice").first()).toBeVisible();
  expect(JSON.stringify(aiCalls)).toContain("zzqx wobble cake");
  await box.getByRole("button", { name: "Back to search" }).click();                              // back: not re-opened for the same words
  await expect(ul.getByTestId("no-match")).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(ul.getByTestId("describe-it")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("with results: no automatic box; 'Can't see it? Describe it instead' is still there", async ({ page }) => {
  await openApp(page);
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill(OFF_JSON([])));
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  const ul = page.getByTestId("update-lists");
  await ul.getByLabel("Search your lists, common foods and UK products").fill("porridge");
  await expect(ul.getByTestId("describe-instead")).toHaveText("Can't see it? Describe it instead");
  await page.waitForTimeout(1500);
  await expect(ul.getByTestId("describe-it")).toHaveCount(0);
});

test("the picker's Add New with unknown words → Single item → Describe opens by itself", async ({ page }) => {
  await openApp(page);
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill(OFF_JSON([])));
  await tab(page, "My Eating"); await page.getByRole("button", { name: /^Sun( \d+)?$/ }).first().click();
  await page.getByTestId("picker-trigger").first().click();
  await page.getByTestId("picker-sheet").locator("input").first().fill("zzqx wobble cake");
  await page.getByTestId("act-add").click();
  await expect(page.getByTestId("update-lists").getByTestId("describe-it").getByLabel(/Describe it in your own words/)).toHaveValue("zzqx wobble cake", { timeout: 15000 });
});
