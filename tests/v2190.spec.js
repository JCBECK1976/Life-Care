import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { mealNutrition, componentFrom, offToItem, offProduct, migrateList, validateItemReply, portionLabel, packagedItem, setPortionGrams } from "../src/lib/portion.js";
import { mockReplyFor } from "./mock-ai.js";

// v2.19.0 eating lists redesign (docs/design/EATING_LISTS.md): per portion everywhere, drop-downs = own lists only,
// "+ Not in my list?" round trip, Build a meal (in code), clarifying AI with retries, migration.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });

// Aldi pasta bake: per-100 g label values (UK supermarket typical)
const OFF = {
  "pasta bake sauce": { product_name: "Pasta Bake Tomato & Herb Sauce", brands: "Aldi", code: "1", serving_size: "1/4 jar (125 g)", serving_quantity: 125, nutriments: { "energy-kcal_100g": 50, proteins_100g: 1.4, fat_100g: 1.2, "saturated-fat_100g": 0.2, carbohydrates_100g: 8, sugars_100g: 6, fiber_100g: 1, salt_100g: 0.9 } },
  "penne": { product_name: "Penne Pasta", brands: "Aldi", code: "2", nutriments: { "energy-kcal_100g": 355, proteins_100g: 12, fat_100g: 1.5, "saturated-fat_100g": 0.3, carbohydrates_100g: 71, sugars_100g: 3, fiber_100g: 3, salt_100g: 0 } },
  "mozzarella": { product_name: "Mozzarella", brands: "Aldi", code: "3", serving_size: "125 g", serving_quantity: 125, nutriments: { "energy-kcal_100g": 250, proteins_100g: 18, fat_100g: 19, "saturated-fat_100g": 13, carbohydrates_100g: 1, sugars_100g: 1, fiber_100g: 0, salt_100g: 0.5 } },
  "chicken breast": { product_name: "Chicken Breast Fillets", brands: "Aldi", code: "4", nutriments: { "energy-kcal_100g": 110, proteins_100g: 24, fat_100g: 1.5, "saturated-fat_100g": 0.4, carbohydrates_100g: 0, sugars_100g: 0, fiber_100g: 0, salt_100g: 0.2 } },
  "test granola": { product_name: "Test Granola", brands: "Test", code: "5", serving_size: "45 g", serving_quantity: 45, nutriments: { "energy-kcal_100g": 450, proteins_100g: 9, fat_100g: 18, "saturated-fat_100g": 4, carbohydrates_100g: 60, sugars_100g: 20, fiber_100g: 6, salt_100g: 0.1 } },
};
async function mockOff(page) {
  await page.route(/openfoodfacts\.org/, (r) => {
    const term = decodeURIComponent((/search_terms=([^&]*)/.exec(r.request().url()) || [])[1] || "").toLowerCase();
    const hit = Object.keys(OFF).find((k) => term.indexOf(k) >= 0 || k.indexOf(term) >= 0);
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: hit ? [OFF[hit]] : [] }) });
  });
}

test("Aldi pasta bake maths: sauce jar + pasta + mozzarella + chicken, serves 4 → a few hundred kcal per portion (never the per-100 g figure)", () => {
  const comp = (k, g) => ({ ...componentFrom(offToItem(offProduct(OFF[k]))), unit: "g", amount: g });
  const comps = [comp("pasta bake sauce", 500), comp("penne", 250), comp("mozzarella", 125), comp("chicken breast", 300)];
  const per = mealNutrition(comps, 4);
  expect(Math.round(per.kcal)).toBe(Math.round((250 + 887.5 + 312.5 + 330) / 4));     // 445 kcal per portion
  expect(per.kcal).toBeGreaterThan(200); expect(per.kcal).toBeLessThan(700);
  expect(Math.round(per.protein)).toBe(Math.round((7 + 30 + 22.5 + 72) / 4));
  expect(Math.round(mealNutrition(comps, 1).kcal)).toBe(1780);                           // the whole bake, if "serves" were forgotten
  // OFF items are per 100 g at source; the item's own values are per portion (serving size, else 100 g)
  const sauce = offToItem(offProduct(OFF["pasta bake sauce"]));
  expect(sauce).toMatchObject({ kcal: 63, per100: { kcal: 50 }, portion: { grams: 125 } });   // ¼ jar
  expect(portionLabel(sauce)).toBe("1 portion = 1/4 jar (125 g)");
  expect(portionLabel(setPortionGrams(sauce, 88))).toBe("1 portion = 88 g");
  expect(setPortionGrams(sauce, 88).kcal).toBe(44);
});

test("Build a meal maths: portions and grams, ÷ serves; grams use per-100 g or the portion's grams", () => {
  const a = { name: "A", n: { kcal: 200, protein: 10, fat: 5, satFat: 1, carbs: 20, sugar: 2, addedSugar: 0, fibre: 2, salt: 0.5 }, unit: "portion", amount: 1.5, portionGrams: 100 };
  const b = { name: "B", n: { kcal: 300 }, per100: { kcal: 150, protein: 5 }, unit: "g", amount: 200 };
  const c = { ...a, unit: "g", amount: 50 };                                              // half of a 100 g portion
  expect(mealNutrition([a], 1).kcal).toBe(300);
  expect(mealNutrition([b], 2).kcal).toBe(150);
  expect(mealNutrition([a, b, c], 3).kcal).toBeCloseTo((300 + 300 + 100) / 3, 5);
  expect(mealNutrition([a], 0).kcal).toBe(300);                                          // serves never below 1
});

test("AI item validation: schema, ranges and plausibility (macros vs kcal)", () => {
  const ok = { type: "item", name: "Stew", servings: 4, perPortion: { kcal: 320, protein: 28, fat: 12, satFat: 4, carbs: 24, fibre: 5, salt: 1 } };
  expect(validateItemReply(ok).ok).toBe(true);
  expect(validateItemReply({ ...ok, perPortion: { ...ok.perPortion, kcal: 1247 } }).problem).toMatch(/doesn't match the macros/);
  expect(validateItemReply({ ...ok, perPortion: { ...ok.perPortion, kcal: 4800 } }).problem).toMatch(/ONE portion/);
  expect(validateItemReply({ ...ok, servings: 0 }).problem).toMatch(/servings/);
  expect(validateItemReply({ ...ok, perPortion: { ...ok.perPortion, satFat: 20 } }).problem).toMatch(/sat fat/);
  expect(validateItemReply({ type: "question", question: "Is the chicken weight raw or cooked?" }).ok).toBe(true);
  expect(validateItemReply(null).ok).toBe(false);
});

test("migration: portion descriptions; OFF items keep per 100 g with a 100 g default; prepared items without servings → Check me; idempotent", () => {
  const list = [
    { id: "a", name: "Granola", barcode: "123", kcal: 450, jcKcal: 450, beckKcal: 450, protein: 9, fat: 18 },
    { id: "b", name: "Chilli", itemType: "ingredient", jcKcal: 900, beckKcal: 900, ingredients: ["mince 500g"] },
    { id: "c", name: "Banana", itemType: "packaged", jcKcal: 100, beckKcal: 100, servingSize: "1 medium" },
    { id: "d", name: "Done", portion: { desc: "x" } },
  ];
  const m = migrateList(list);
  expect(m.changed).toBe(3);
  expect(m.list[0]).toMatchObject({ per100: { kcal: 450 }, portion: { grams: 100 }, jcKcal: 450 });
  expect(m.list[1]).toMatchObject({ checkMe: true, portionCheck: true, portion: { desc: "1 portion (to confirm)" } });
  expect(m.list[1].checkReason).toContain("confirm portions");
  expect(m.list[2].portion.desc).toBe("1 medium");
  expect(m.list[3]).toEqual(list[3]);
  expect(migrateList(m.list).changed).toBe(0);                                             // second run: nothing
  expect(m.list.length).toBe(4);                                                           // nothing deleted
});

test("clarifying engine: malformed replies are retried, then a friendly question — never 'could not be read'", async ({ page }) => {
  const { errors } = await openApp(page);
  const r = await page.evaluate(async () => {
    const { clarifyTurn, FRIENDLY } = await import("/Life-Care/src/lib/clarify.js");
    const seq = (replies) => { let i = 0; const calls = []; return { calls, call: async (m) => { calls.push(m); return replies[Math.min(i++, replies.length - 1)]; } }; };
    const bad = seq(["Sorry, here it is: kcal about 1247", "{not json", '{"type":"item","name":"X","servings":1,"perPortion":{"kcal":1247,"protein":5,"fat":5,"satFat":1,"carbs":5,"fibre":0,"salt":0}}']);
    const r1 = await clarifyTurn([{ role: "user", text: "pasta bake" }], { call: bad.call });
    const fix = seq(["oops", '{"type":"question","question":"How many portions does it make?"}']);
    const r2 = await clarifyTurn([{ role: "user", text: "pasta bake" }], { call: fix.call });
    return { r1, n1: bad.calls.length, retryMsg: JSON.stringify(bad.calls[1]), r2, n2: fix.calls.length, FRIENDLY };
  });
  expect(r.n1).toBe(3);                                                                     // 1 + 2 retries
  expect(r.retryMsg).toContain("That reply can't be used");
  expect(r.r1).toEqual({ type: "question", question: r.FRIENDLY, friendly: true });
  expect(r.FRIENDLY).not.toMatch(/could not be read|did not return/i);
  expect(r.r2).toEqual({ type: "question", question: "How many portions does it make?" });
  expect(r.n2).toBe(2);
  expect(errors).toEqual([]);
});

test("UI: drop-downs list only items already in that list, ending with '+ Not in my list?'", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Eating");
  await page.getByRole("button", { name: /^Sun( |$)/ }).first().click();
  const custom = (await get("custom_breakfasts")) || [];
  await page.getByText(/Select breakfast|Select\.\.\./).first().click().catch(async () => { await page.locator('[data-testid="selected-item"]').first().click(); });
  const rows = page.locator("text=— not added");
  await expect(rows).toHaveCount(0);
  await expect(page.getByText("+ Not in my list?").first()).toBeVisible();
  expect(custom.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("UI: '+ Not in my list?' → Add single item (UK product, per portion) → Add to the day now → back with it selected", async ({ page }) => {
  const { errors } = await openApp(page);
  await mockOff(page);
  await tab(page, "My Eating");
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
  await page.getByRole("button", { name: new RegExp("^" + wd + "( |$)") }).first().click();
  await page.getByText(/Select breakfast|Select\.\.\./).first().click().catch(async () => { await page.locator('[data-testid="selected-item"]').first().click(); });
  await page.getByText("+ Not in my list?").first().click();
  const ul = page.getByTestId("update-lists");
  await expect(ul.getByTestId("return-to")).toContainText(/Adding for \w+day breakfast/);
  await ul.getByLabel("Search your lists, common foods and UK products").fill("Test Granola");   // v2.19.2: results as you type
  await ul.getByTestId("off-option").first().click();
  await expect(ul.getByTestId("single-confirm").getByTestId("portion-label")).toHaveText("1 portion = 45 g");
  await expect(ul.getByTestId("single-confirm").getByTestId("per-portion")).toContainText("Per portion: 203 kcal");   // 450 per 100 g × 45 g
  await ul.getByRole("button", { name: "Confirm" }).click();
  await expect(ul.getByTestId("save-step")).not.toContainText("per 100g");
  await expect(ul.getByLabel(/Add to \w+day breakfast now/)).toBeChecked();
  await ul.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("update-lists")).toHaveCount(0);                             // back to the day
  await expect(page.getByTestId("selected-item").filter({ hasText: "Test Granola" }).first()).toBeVisible();
  const list = await get("custom_breakfasts");
  const it = list.find((x) => x.name === "Test Granola (Test)");
  expect(it).toMatchObject({ kcal: 203, per100: { kcal: 450 }, portion: { grams: 45 }, source: "off" });
  expect(errors).toEqual([]);
});

test("UI: Build a meal — the Aldi pasta bake, serves 4, computed in code and labelled per portion", async ({ page }) => {
  const { errors, aiCalls } = await openApp(page);
  await mockOff(page);
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  const ul = page.getByTestId("update-lists");
  await ul.getByRole("tab", { name: "Build a meal" }).click();
  const mb = ul.getByTestId("meal-builder");
  for (const [term, g] of [["pasta bake sauce", 500], ["penne", 250], ["mozzarella", 125], ["chicken breast", 300]]) {
    await mb.getByLabel("Search available items").fill(term);
    await mb.getByTestId("avail-off").first().click();
    const row = mb.getByTestId("meal-comp").last();
    await row.getByLabel(/^Unit for/).selectOption("g");
    await row.getByLabel(/^Amount of/).fill(String(g));
  }
  await mb.getByLabel("Meal name").fill("Aldi chicken pasta bake");
  await mb.getByLabel(/How many portions does this make/).fill("4");
  await expect(mb.getByTestId("meal-per-portion")).toContainText("Per portion: 445 kcal");
  const n0 = aiCalls.length;
  await mb.getByRole("button", { name: "Next" }).click();
  await expect(ul.getByTestId("portion-label")).toHaveText("1 portion = 1 of 4 servings");
  await ul.getByLabel("Breakfasts").uncheck(); await ul.getByLabel("Dinners").check();
  await ul.getByRole("button", { name: "Save" }).click();
  await expect(ul.getByTestId("saved-card")).toContainText("✓ Saved Aldi chicken pasta bake to Dinners");
  const it = (await get("custom_meals")).find((x) => x.name === "Aldi chicken pasta bake");
  expect(it).toMatchObject({ kcal: 445, jcKcal: 445, beckKcal: 445, source: "meal", meal: { serves: 4 } });
  expect(it.meal.components).toHaveLength(4);
  expect(aiCalls.length).toBe(n0);                                                         // no AI for the maths
  expect(errors).toEqual([]);
});

test("UI: Create my own item — the Companion asks a question, then returns valid per-portion JSON", async ({ page }) => {
  const { errors } = await openApp(page);
  let n = 0;
  await page.route("https://api.anthropic.com/**", async (route) => {
    let b = null; try { b = route.request().postDataJSON(); } catch {}
    const r = mockReplyFor(b);
    if (/CLARIFY_ITEM/.test(JSON.stringify(b || {}))) {
      n++;
      r.content[0].text = n === 1 ? JSON.stringify({ type: "question", question: "Is the 500 g of chicken weighed raw or cooked, and how many portions does it make?" })
        : JSON.stringify({ type: "item", name: "Chicken curry", portionDesc: "1 of 4 servings (about 400 g)", portionGrams: 400, servings: 4, ingredients: ["chicken 500g raw", "curry sauce 1 jar", "rice 300g dry"], assumptions: "", perPortion: { kcal: 520, protein: 38, fat: 14, satFat: 4, carbs: 60, sugar: 8, addedSugar: 3, fibre: 3, salt: 1.6 } });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(r) });
  });
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  const ul = page.getByTestId("update-lists");
  await ul.getByRole("tab", { name: "My own" }).click();
  await ul.getByLabel("Describe your item").fill("Chicken curry: 500g chicken, a jar of curry sauce, 300g rice");
  await ul.getByRole("button", { name: "Send" }).click();
  await expect(ul.getByTestId("clarify-question")).toContainText("raw or cooked");
  await ul.getByLabel("Your answer").fill("Raw, and it makes 4 portions");
  await ul.getByRole("button", { name: "Send" }).click();
  await expect(ul.getByTestId("own-confirm").getByTestId("portion-label")).toContainText("1 portion = 1 of 4 servings (about 400 g)");
  await expect(ul.getByTestId("own-confirm").getByTestId("per-portion")).toContainText("Per portion: 520 kcal");
  await ul.getByRole("button", { name: "Confirm" }).click();
  await ul.getByLabel("Breakfasts").uncheck(); await ul.getByLabel("Dinners").check();
  await ul.getByRole("button", { name: "Save" }).click();
  await expect(ul.getByTestId("saved-card")).toContainText("✓ Saved Chicken curry to Dinners");
  expect((await get("custom_meals")).find((x) => x.name === "Chicken curry")).toMatchObject({ kcal: 520, servings: 4, source: "own" });
  expect(n).toBe(2);
  await expect(page.getByText(/could not be read|did not return values/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("UI: migration on load flags prepared items without servings ('Check me — confirm portions'); nothing deleted", async ({ page }) => {
  const { errors } = await openApp(page);
  const before = await get("custom_meals");
  const seeded = before.map((x) => { const y = { ...x }; delete y.portion; delete y.per100; return y; }).concat([{ id: "custom_mig_1", name: "Old Chilli", itemType: "ingredient", jcKcal: 1247, beckKcal: 1247, ingredients: ["mince 500g", "beans 400g"], rating: "RED" }]);
  await put("custom_meals", seeded);
  await page.reload();
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => ((await get("custom_meals")).find((x) => x.id === "custom_mig_1") || {}).portionCheck).toBe(true);
  const after = await get("custom_meals");
  expect(after.length).toBe(seeded.length);
  expect(after.find((x) => x.id === "custom_mig_1")).toMatchObject({ checkMe: true, jcKcal: 1247, portion: { desc: "1 portion (to confirm)" } });
  expect(after.every((x) => x.portion)).toBe(true);
  expect(errors).toEqual([]);
});

test("packagedItem derives per-portion values from per 100 g in code", () => {
  const it = packagedItem({ name: "Oats" }, { kcal: 380, protein: 13, fat: 7, satFat: 1.2, carbs: 60, fibre: 9, salt: 0 }, 40);
  expect(it).toMatchObject({ kcal: 152, jcKcal: 152, beckKcal: 152, protein: 5.2, portion: { grams: 40 } });
});
