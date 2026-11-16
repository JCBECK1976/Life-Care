import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { openApp, tab } from "./helpers.js";
import { searchGeneric, correctedQuery, matchScore } from "../src/lib/foodSearch.js";
import { productType, needsPortionCheck } from "../src/lib/off.js";
import { offProduct, portionLabel } from "../src/lib/portion.js";
import { CSP_HOSTS, buildCsp } from "../vite.config.js";

// v2.19.2: search forgives spelling (own lists → UK generic list → UK products), UK product search survives OFF's
// intermittent 503s, a portion check for per-100 g / sauce products, "Describe it instead", and the form layout.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const first = (q) => (searchGeneric(q, 5)[0] || {}).name;
const OFF_JSON = (products) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ products }) });
const ALDI_BAKE = { product_name: "Pasta Bake, Tomato & Herb", brands: "Aldi", code: "9", product_quantity: 500, quantity: "500 g", categories_tags: ["en:groceries", "en:sauces", "en:pasta-sauces"],
  nutriments: { "energy-kcal_100g": 107, proteins_100g: 1.1, fat_100g: 6.5, "saturated-fat_100g": 0.6, carbohydrates_100g: 10, sugars_100g: 7, fiber_100g: 1.5, salt_100g: 0.9 } };
const SHOTS = path.join("test-results", "v2192-shots");

async function openSingle(page) {
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  return page.getByTestId("update-lists");
}

test("fuzzy search: typos, sound-alikes and plain words find the right food", () => {
  expect(first("fruselli")).toBe("Fusilli pasta (dried)");
  expect(first("fusili")).toBe("Fusilli pasta (dried)");
  expect(first("spirals")).toBe("Fusilli pasta (dried)");
  expect(first("pasta spirals")).toBe("Fusilli pasta (dried)");
  expect(first("penny")).toBe("Penne pasta (dried)");
  expect(first("spagetti")).toBe("Spaghetti (dried)");
  expect(first("brocoli")).toBe("Broccoli");
  expect(first("pasta shells")).toBe("Conchiglie pasta (dried)");
  expect(first("pasta bows")).toBe("Farfalle pasta (dried)");
  expect(first("tubes")).toBe("Penne pasta (dried)");
  for (const q of ["pasta", "bag of dried pasta"]) {
    const names = searchGeneric(q, 10).map((x) => x.name);
    expect(names.slice(0, 5).every((n) => /pasta|spaghetti|macaroni|tagliatelle|linguine|lasagne/i.test(n))).toBe(true);
    expect(names).toEqual(expect.arrayContaining(["Fusilli pasta (dried)", "Penne pasta (dried)", "Spaghetti (dried)"]));
  }
  expect(matchScore("fu", "Fusilli pasta")).toBeGreaterThan(0);           // as you type
  expect(searchGeneric("zzqx thing")).toEqual([]);
  expect(searchGeneric("beans").map((x) => x.name)).not.toContain("Banana");
  // UK product search gets the corrected spelling
  expect(correctedQuery("fruselli")).toBe("fusilli");
  expect(correctedQuery("bag of dried pasta spirals")).toBe("pasta fusilli");
  expect(correctedQuery("aldi pasta bake")).toBe("aldi pasta bake");
  // generic items: per portion with "1 portion = … g" and the source label
  const f = searchGeneric("fusilli")[0];
  expect(portionLabel(f)).toBe("1 portion = 75 g dried");
  expect(f).toMatchObject({ source: "generic", sourceLabel: "Typical values", kcal: 266, per100: { kcal: 355 }, portion: { grams: 75 } });
});

test("wrong-match guard: per-100 g values with no serving size, or a sauce/condiment, need the portion confirmed", () => {
  const bake = offProduct(ALDI_BAKE);
  expect(productType(bake)).toBe("sauce / jar");
  expect(needsPortionCheck(bake)).toBe(true);
  expect(bake.packG).toBe(500);
  const bar = offProduct({ product_name: "Protein Bar", serving_quantity: 60, nutriments: { "energy-kcal_100g": 380 } });
  expect(productType(bar)).toBe(""); expect(needsPortionCheck(bar)).toBe(false);
  expect(needsPortionCheck(offProduct({ product_name: "Penne", nutriments: { "energy-kcal_100g": 355 } }))).toBe(true);   // no serving size
});

test("CSP: every Open Food Facts host the code fetches is allowed by connect-src (and image hosts by img-src)", async ({ page }) => {
  const files = []; const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => e.isDirectory() ? walk(path.join(d, e.name)) : /\.(js|jsx)$/.test(e.name) && files.push(path.join(d, e.name)));
  walk("src");
  const hosts = new Set(); files.forEach((f) => (fs.readFileSync(f, "utf8").match(/https:\/\/[a-z0-9.-]*openfoodfacts\.org/g) || []).forEach((h) => hosts.add(h)));
  expect(hosts.size).toBeGreaterThan(0);
  const prod = buildCsp("<head></head>", false);
  const dir = (n) => prod.split(";").find((d) => d.trim().startsWith(n));
  for (const h of hosts) {
    if (/\/\/(images|static)\./.test(h)) expect(dir("img-src"), h).toContain(h);
    else { expect(CSP_HOSTS.connect, h).toContain(h); expect(dir("connect-src"), h).toContain(h); }
  }
  // and in the running app the browser lets the search request out (a CSP block would fail before the network)
  await page.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective + " " + e.blockedURI)); });
  const { errors } = await openApp(page);
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill(OFF_JSON([ALDI_BAKE])));
  const n = await page.evaluate(async () => (await (await import("/Life-Care/src/lib/off.js")).searchOffRaw("csp check")).length);
  expect(n).toBe(1);
  expect(await page.evaluate(() => window.__csp)).toEqual([]);
  expect(errors).toEqual([]);
});

test("UK products: an intermittent 503 (no CORS header) is retried and the results still appear", async ({ page }) => {
  const { errors } = await openApp(page);
  let calls = 0;
  await page.route(/openfoodfacts\.org/, (r) => { calls++; return calls === 1 ? r.fulfill({ status: 503, contentType: "text/html", body: "<html>Page temporarily unavailable</html>" }) : r.fulfill(OFF_JSON([{ ...ALDI_BAKE, product_name: "Test Retry Granola", categories_tags: [], serving_quantity: 45, product_quantity: null }])); });
  const ul = await openSingle(page);
  await ul.getByLabel("Search your lists, common foods and UK products").fill("granola");
  await expect(ul.getByTestId("off-option").filter({ hasText: "Test Retry Granola" })).toBeVisible({ timeout: 15000 });
  expect(calls).toBe(2);
  await expect(page.getByText(/isn't available right now/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("offline: own-list and generic results appear as you type when UK product search is down; 'fruselli' adds dried fusilli per portion", async ({ page }) => {
  const { errors } = await openApp(page);
  const snacks = (await get("custom_snacks")) || [];
  await put("custom_snacks", snacks.concat([{ id: "t_fus", name: "Test Fusilli Salad", jcKcal: 300, beckKcal: 300, kcal: 300, rating: "AMBER", portion: { desc: "1 bowl" } }]));
  await page.reload();
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.route(/openfoodfacts\.org/, (r) => r.abort("failed"));
  const ul = await openSingle(page);
  await ul.getByLabel("Search your lists, common foods and UK products").fill("fruselli");
  await expect(ul.getByTestId("own-option").first()).toContainText("Test Fusilli Salad");                 // own lists first
  await expect(ul.getByTestId("generic-option").first()).toContainText("Fusilli pasta (dried)");
  await expect(ul.getByTestId("generic-option").first()).toContainText("1 portion = 75 g dried · Typical values");
  const order = await ul.locator("[data-testid=own-option], [data-testid=generic-option]").evaluateAll((els) => els.map((e) => e.dataset.testid));
  expect(order[0]).toBe("own-option");
  await expect(ul.getByTestId("off-down")).toBeVisible({ timeout: 15000 });                                // OFF down: said plainly, local results stay
  await expect(ul.getByTestId("generic-option").first()).toBeVisible();
  await ul.getByTestId("generic-option").first().click();
  const c = ul.getByTestId("single-confirm");
  await expect(c.getByTestId("portion-label")).toHaveText("1 portion = 75 g dried");
  await expect(c).toContainText("Source: Typical values");
  await expect(c.getByTestId("per-portion")).toContainText("Per portion: 266 kcal");
  await c.getByRole("button", { name: "Confirm" }).click();
  await ul.getByLabel("Breakfasts").uncheck(); await ul.getByLabel("Dinners").check();
  await ul.getByRole("button", { name: "Save" }).click();
  await expect(ul.getByTestId("saved-card")).toContainText("✓ Saved Fusilli pasta (dried) to Dinners");
  expect((await get("custom_meals")).find((x) => x.name === "Fusilli pasta (dried)")).toMatchObject({ kcal: 266, source: "generic", portion: { grams: 75 } });
  expect(errors).toEqual([]);
});

test("wrong-match guard (UI): the Aldi 'Pasta Bake' sauce shows its type and pack size, and the portion must be confirmed", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill(OFF_JSON([ALDI_BAKE])));
  const ul = await openSingle(page);
  await ul.getByLabel("Search your lists, common foods and UK products").fill("aldi pasta bake");
  const o = ul.getByTestId("off-option").first();
  await expect(o).toContainText("Pasta Bake, Tomato & Herb (Aldi)");
  await expect(o.getByTestId("off-type")).toHaveText("sauce / jar");
  await expect(o).toContainText("per 100 g: 107 kcal · pack 500 g · check the portion");
  await o.click();
  const c = ul.getByTestId("single-confirm");
  await expect(c.getByTestId("portion-guard")).toContainText("Check the portion before adding");
  await expect(c.getByTestId("pack-size")).toHaveText("500 g");
  await expect(c.getByTestId("portion-label")).toHaveText("1 portion = ¼ of the pack (125 g)");
  await expect(c.getByRole("button", { name: "Confirm" })).toBeDisabled();
  await c.getByTestId("confirm-portion").click();
  await expect(c.getByTestId("portion-guard")).toContainText("Portion confirmed");
  await c.getByRole("button", { name: "Confirm" }).click();
  await expect(ul.getByTestId("save-step")).toContainText("Per portion: 134 kcal");                     // 107 × 125 g ÷ 100
  expect(errors).toEqual([]);
});

test("Describe it instead: nothing matches → the Companion identifies it and offers choices to tap", async ({ page }) => {
  const { errors, aiCalls } = await openApp(page);
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill(OFF_JSON([])));
  const ul = await openSingle(page);
  await ul.getByLabel("Search your lists, common foods and UK products").fill("zzqx thing");
  await expect(ul.getByTestId("no-match")).toContainText("Nothing matches “zzqx thing”", { timeout: 15000 });
  await ul.getByTestId("describe-instead").click();
  await ul.getByLabel(/Describe it in your own words/).fill("bag of dried pasta spirals");
  await ul.getByRole("button", { name: "Find it" }).click();
  await expect(ul.getByTestId("describe-choice")).toHaveCount(2);
  expect(JSON.stringify(aiCalls)).toContain("CLARIFY_ITEM IDENTIFY");
  await ul.getByTestId("describe-choice").first().click();
  const c = ul.getByTestId("single-confirm");
  await expect(c.getByLabel("Name")).toHaveValue("Fusilli pasta (dried)");
  await expect(c.getByTestId("portion-label")).toHaveText("1 portion = 75 g dried");
  await expect(c.getByTestId("per-portion")).toContainText("Per portion: 266 kcal");
  await expect(page.getByText(/could not be read|isn't available right now/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("layout at 360 px: the three tabs on one line, equal width; meal ingredient cards with clear gaps; screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill(OFF_JSON([])));
  const ul = await openSingle(page);
  const tabs = ul.getByRole("tab");
  await expect(tabs).toHaveText(["Single item", "Build a meal", "My own"]);
  const boxes = await tabs.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, right: r.right, sw: e.scrollWidth, cw: e.clientWidth }; }));
  expect(new Set(boxes.map((b) => Math.round(b.y))).size).toBe(1);                                       // one line
  expect(Math.max(...boxes.map((b) => b.w)) - Math.min(...boxes.map((b) => b.w))).toBeLessThan(1.5);    // equal width
  expect(boxes[2].right).toBeLessThanOrEqual(360);
  expect(boxes.every((b) => b.sw <= b.cw + 1)).toBe(true);                                               // labels not cut off
  await expect(tabs.first()).toHaveCSS("color", "rgb(255, 255, 255)");                                    // selected: white on deep blue
  await expect(tabs.nth(1)).toHaveCSS("background-color", "rgb(255, 255, 255)");                          // others: white with a blue border
  await expect(tabs.nth(1)).toHaveCSS("border-top-color", "rgb(37, 99, 235)");
  await ul.getByLabel("Search your lists, common foods and UK products").fill("fusilli");
  await expect(ul.getByTestId("generic-option").first()).toBeVisible();
  fs.mkdirSync(SHOTS, { recursive: true });
  await ul.screenshot({ path: path.join(SHOTS, "360-single-item.png") });
  await tabs.nth(1).click();
  const mb = ul.getByTestId("meal-builder");
  for (const t of ["penne", "cheddar"]) { await mb.getByLabel("Search available items").fill(t); await mb.getByTestId("avail-generic").first().click(); }
  await mb.getByLabel("Meal name").fill("Cheesy pasta");
  const rows = mb.getByTestId("meal-comp");
  await expect(rows).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    const r = rows.nth(i);
    const name = await r.getByTestId("meal-comp-name").boundingBox(), amt = await r.getByLabel(/^Amount of/).boundingBox();
    const kcal = await r.getByTestId("meal-comp-kcal").boundingBox(), x = await r.getByRole("button", { name: /^Remove/ }).boundingBox();
    expect(name.y + name.height).toBeLessThanOrEqual(amt.y);                                              // name on its own line
    expect(await r.getByTestId("meal-comp-kcal").evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);   // kcal text not clipped
    expect(x.x - (kcal.x + kcal.width)).toBeGreaterThanOrEqual(12);                                       // kcal clear of ✕
    expect(Math.abs((kcal.y + kcal.height / 2) - (x.y + x.height / 2))).toBeLessThan(4);                  // same line
    const card = await r.boundingBox(); expect(x.x + x.width).toBeLessThanOrEqual(card.x + card.width - 4);   // ✕ inside the card
  }
  const sum = await mb.getByTestId("meal-summary").boundingBox(), next = await mb.getByRole("button", { name: "Next" }).boundingBox();
  expect(next.y - (sum.y + sum.height)).toBeGreaterThanOrEqual(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);     // no sideways scroll
  await mb.screenshot({ path: path.join(SHOTS, "360-build-a-meal.png") });
  expect(errors).toEqual([]);
});
