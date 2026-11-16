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

/* ---------- 3 + 4: stay on the form after Save; back to the day being planned ---------- */
const SUNDAY = new Date(2026, 10, 15, 18, 0, 0);
const childAt = async (slot) => { const d = await get("eat_children:jc:2026-11-15"); return d && d.children && d.children["c_2026-11-15_" + slot]; };
const SUNDAY_PREP = async () => { await fetch(KEY("eat_children:jc:2026-11-15"), { method: "DELETE", headers: H }); await fetch(KEY("mealplan:2026-11-15:jc"), { method: "DELETE", headers: H }); };

test("4a from 'Sunday dinner': Build a meal → Save adds it to Dinners AND the slot, back on Sunday with it highlighted, 'Added to Sunday dinner' + Undo", async ({ page }) => {
  await page.clock.setFixedTime(SUNDAY);
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await SUNDAY_PREP(); await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [SAUCE] }) }));
  await tab(page, "My Eating");
  await page.getByText("Select dinner...").first().click();
  await page.getByText("+ Not in my list?").first().click();
  const ul = page.getByTestId("update-lists");
  await expect(ul.getByTestId("return-to")).toContainText("Adding for Sunday dinner");
  await ul.getByRole("tab", { name: "Build a meal" }).click();
  const mb = ul.getByTestId("meal-builder");
  await buildBake(mb);
  await mb.getByRole("button", { name: "Next" }).click();
  await expect(ul.getByLabel("Dinners")).toBeChecked();
  await expect(ul.getByLabel("Add to Sunday dinner now")).toBeChecked();
  await ul.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("update-lists")).toHaveCount(0);
  const toast = page.getByTestId("pick-toast");
  await expect(toast).toContainText("Added to Sunday dinner");
  const trig = page.locator('[data-testid="picker-trigger"][data-flash="true"]');
  await expect(trig).toContainText("Tomato Pasta Bake");
  await expect(trig).toBeInViewport();
  fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: SHOTS + "/360-day-after-added.png" });
  await expect.poll(async () => (await childAt("d"))?.snapshot?.name).toBe("Tomato Pasta Bake");       // really saved in the slot
  expect(((await get("custom_meals")) || []).filter((x) => x.name === "Tomato Pasta Bake")).toHaveLength(1);   // and in Dinners
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => (await childAt("d"))?.snapshot?.name || null).toBe(null);
  expect(errors).toEqual([]);
});

test("3 + 4b no day context: Save keeps you on the form with '✓ Saved … to Dinners (… kcal per portion)'; Add to a day (today, Dinner) → that day with it selected; Done", async ({ page }) => {
  await page.clock.setFixedTime(SUNDAY);
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await SUNDAY_PREP(); await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"products":[]}' }));
  await tab(page, "My Eating"); await page.getByRole("button", { name: "Update Eating Lists" }).click();
  const ul = page.getByTestId("update-lists");
  await ul.getByLabel("Search your lists, common foods and UK products").fill("fusilli");
  await ul.getByTestId("generic-option").first().click();
  await ul.getByRole("button", { name: "Confirm" }).click();
  await ul.getByLabel("Breakfasts").uncheck(); await ul.getByLabel("Dinners").check();
  await ul.getByRole("button", { name: "Save", exact: true }).click();
  const card = ul.getByTestId("saved-card");
  await expect(card).toContainText("✓ Saved Fusilli pasta (dried) to Dinners (266 kcal per portion)");
  await expect(card).toBeInViewport();                                                                   // never scrolled away to the lists
  await card.screenshot({ path: SHOTS + "/360-saved-confirmation.png" });
  await expect(page.getByTestId("list-row").filter({ hasText: "Fusilli pasta (dried)" })).toHaveCount(1);   // really in Dinners
  await expect(card.getByLabel("Day")).toHaveValue("sunday");
  await expect(card.getByLabel("Meal")).toHaveValue("dinner");
  await card.getByRole("button", { name: "Add to Sunday dinner" }).click();
  await expect(page.getByTestId("update-lists")).toHaveCount(0);
  await expect(page.getByTestId("pick-toast")).toContainText("Added to Sunday dinner");
  await expect.poll(async () => (await childAt("d"))?.snapshot?.name).toBe("Fusilli pasta (dried)");
  expect(errors).toEqual([]);
});

test("4c the same saved card after My own (Done goes back to a fresh form)", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Eating"); await page.getByRole("button", { name: "Update Eating Lists" }).click();
  const ul = page.getByTestId("update-lists");
  await ul.getByRole("tab", { name: "My own" }).click();
  await ul.getByLabel("Describe your item").fill("beef stew, 500g beef, 400g veg, serves 4");
  await ul.getByRole("button", { name: "Send" }).click();
  await ul.getByTestId("own-confirm").getByRole("button", { name: "Confirm" }).click();
  await ul.getByRole("button", { name: "Save", exact: true }).click();
  await expect(ul.getByTestId("saved-card")).toContainText("✓ Saved Test Stew to Breakfasts (320 kcal per portion)");
  await ul.getByRole("button", { name: "Done" }).click();
  await expect(ul.getByTestId("saved-card")).toHaveCount(0);
  await expect(ul.getByLabel("Describe your item")).toBeVisible();
  expect(errors).toEqual([]);
});
