import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { recheckFlag } from "../src/lib/portion.js";

// v2.19.1 (F27): photo, bulk paste, the typed path and Re-check nutrition use the per-portion model and the clarifying
// conversation (strict JSON, retries; ask, don't fail). No whole-recipe prompts remain.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const msg = (text) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: typeof text === "string" ? text : JSON.stringify(text) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) });
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const per = (kcal, extra) => ({ kcal, protein: 5, fat: 5, satFat: 1, carbs: Math.round((kcal - 65) / 4), sugar: 3, addedSugar: 0, fibre: 2, salt: 0.2, ...(extra || {}) });
const linesOf = (body) => (JSON.parse(body).messages[0].content.split("Items to look up:\n")[1] || "").split("\n\nReturn")[0].split("\n").filter(Boolean);

async function openOldForm(page) {
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByRole("button", { name: "📷 Photo or bulk paste" }).click();
}

test("bulk paste of 3 items (+1 unclear): per portion with a portion description; a malformed line is retried; the unclear one asks you", async ({ page }) => {
  const { errors, aiCalls } = await openApp(page);
  const rounds = [];
  await page.route("https://api.anthropic.com/**", (r) => {
    const b = r.request().postData() || "";
    if (!/CLARIFY_ITEM BULK/.test(b)) return r.fallback();
    const lines = linesOf(b); rounds.push(lines);
    const out = lines.map((l) => l === "Test Mystery Thing" ? { line: l, type: "question", question: "What is “Test Mystery Thing” — a brand or something homemade, and how much is a portion?" }
      : l === "Test Crisps" && rounds.length === 1 ? { line: l, type: "item", name: "Test Crisps", servings: 0, perPortion: { kcal: 1247 } }     // invalid → retried
      : { line: l, type: "item", name: l, portionDesc: l === "Test Crisps" ? "1 bag (25 g)" : "1 can (330 ml)", portionGrams: l === "Test Crisps" ? 25 : null, servings: 1, ingredients: [], perPortion: per(l === "Test Crisps" ? 130 : 140) });
    return r.fulfill(msg(out));
  });
  page.on("dialog", (d) => d.accept());
  await openOldForm(page);
  await page.getByRole("button", { name: "📋 Bulk" }).click();
  await page.locator("#bulk-paste-textarea").fill("Test Cola\nTest Lemonade\nTest Crisps\nTest Mystery Thing");
  const bulk = page.locator("div", { has: page.locator("#bulk-paste-textarea") }).filter({ has: page.getByRole("button", { name: "Cancel" }) }).last();
  await bulk.getByRole("button", { name: /^snack$/i }).click();
  await bulk.getByRole("button", { name: "Upload Items" }).click();
  await expect(page.getByTestId("bulk-done")).toContainText("3 items added to Snacks");
  await page.getByRole("button", { name: "OK", exact: true }).click();
  expect(rounds).toEqual([["Test Cola", "Test Lemonade", "Test Crisps", "Test Mystery Thing"], ["Test Crisps"]]);
  const snacks = await get("custom_snacks");
  const added = snacks.filter((x) => /^Test (Cola|Lemonade|Crisps)$/.test(x.name));
  expect(added.map((x) => [x.name, x.kcal, x.portion.desc, x.checkMe])).toEqual([["Test Cola", 140, "1 can (330 ml)", true], ["Test Lemonade", 140, "1 can (330 ml)", true], ["Test Crisps", 130, "1 bag (25 g)", true]]);
  expect(added[2].checkReason).toContain("check the portion (1 portion = 1 bag (25 g))");
  // the unclear line asks you instead of failing
  const help = page.getByTestId("bulk-help");
  await expect(help).toContainText("“Test Mystery Thing”");
  await help.getByRole("button", { name: "Finish with my Companion" }).click();
  const ul = page.getByTestId("update-lists");
  await expect(ul.getByTestId("clarify-question")).toContainText("What is “Test Mystery Thing”");
  await expect(ul.getByLabel("Your answer")).toBeVisible();
  await expect(page.getByText(/could not be read|could not be rated|did not return/)).toHaveCount(0);
  expect(JSON.stringify(aiCalls)).not.toMatch(/add up the calories of the WHOLE recipe|homemade dish/);
  expect(errors).toEqual([]);
});

test("photo (mocked): one portion with a portion description; values per portion; saved to the list", async ({ page }) => {
  const { errors } = await openApp(page);
  let n = 0;
  await page.route("https://api.anthropic.com/**", (r) => {
    const b = r.request().postData() || "";
    if (!/CLARIFY_ITEM PHOTO/.test(b)) return r.fallback();
    n++;
    return r.fulfill(msg(n === 1 ? "Looks like a protein bar!" :                                                         // malformed → retried
      { isFood: true, type: "item", name: "Test Protein Bar", portionDesc: "1 bar (60 g)", portionGrams: 60, servings: 1, itemType: "packaged", ingredients: [], perPortion: per(220, { protein: 20, fat: 8, carbs: 18 }) }));
  });
  await openOldForm(page);
  await page.locator('#add-item-form-manage input[type="file"]').setInputFiles({ name: "bar.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByTestId("review-portion")).toHaveText("1 portion = 1 bar (60 g) · values per portion");
  expect(n).toBe(2);
  const panel = page.locator("div", { has: page.locator("#review-item-name") }).filter({ has: page.getByRole("button", { name: "✓ Confirm" }) }).last();
  await panel.getByRole("button", { name: /^snack$/i }).click();
  await panel.getByRole("button", { name: "✓ Confirm" }).click();
  await expect.poll(async () => ((await get("custom_snacks")) || []).find((x) => x.name === "Test Protein Bar")?.jcKcal).toBe(220);
  await expect(page.getByText(/per 100g|could not be read/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("photo the Companion can't size: it asks you in the conversation instead of failing", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.route("https://api.anthropic.com/**", (r) => /CLARIFY_ITEM PHOTO/.test(r.request().postData() || "")
    ? r.fulfill(msg({ type: "question", question: "Is that a single-serve pot or a large tub, and how much would you eat?" })) : r.fallback());
  await openOldForm(page);
  await page.locator('#add-item-form-manage input[type="file"]').setInputFiles({ name: "tub.png", mimeType: "image/png", buffer: PNG });
  const ul = page.getByTestId("update-lists");
  await expect(ul.getByRole("tab", { name: "Create my own item" })).toHaveAttribute("aria-selected", "true");
  await expect(ul.getByTestId("clarify-question")).toContainText("single-serve pot or a large tub");
  await expect(page.getByText(/could not be read|No JSON found/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Re-check nutrition flags whole-recipe and per-100 g values ('Check me — confirm portions') and changes nothing", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  const items = [
    { id: "t_chilli", name: "Test Chilli", itemType: "ingredient", ingredients: ["mince 500g", "beans 400g", "rice 300g"], jcKcal: 2400, beckKcal: 2400, protein: 120, fat: 80, satFat: 30, rating: "RED", portion: { desc: "1 portion (as entered)" } },
    { id: "t_granola", name: "Test Granola", itemType: "packaged", jcKcal: 450, beckKcal: 450, protein: 9, fat: 18, rating: "AMBER", portion: { desc: "1 portion (as entered)" } },
    { id: "t_soup", name: "Test Soup", itemType: "packaged", jcKcal: 180, beckKcal: 180, protein: 6, fat: 4, rating: "GREAT", portion: { desc: "1 bowl" } },
  ];
  await put("custom_meals", items);
  let prompt = "";
  await page.route("https://api.anthropic.com/**", (r) => {
    const b = r.request().postData() || ""; if (!/CLARIFY_ITEM RECHECK/.test(b)) return r.fallback();
    prompt = b;
    return r.fulfill(msg([{ id: "t_chilli", perPortionKcal: 600, looksLike: "wholeRecipe", servingsGuess: 4 }, { id: "t_granola", perPortionKcal: 200, looksLike: "per100g" }, { id: "t_soup", perPortionKcal: 190, looksLike: "portion" }]));
  });
  await page.reload();
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "🔎 Re-check nutrition" }).click();
  await expect(page.getByText(/✅ Re-checked 3 items per portion: 2 marked "Check me — confirm portions"\. Nothing else was changed\./)).toBeVisible({ timeout: 20000 });
  expect(prompt).not.toMatch(/add up the calories of the WHOLE recipe|ONE portion is the WHOLE recipe|do not divide/);   // no whole-recipe totals asked for
  expect(prompt).toContain("ONE PORTION");
  const after = await get("custom_meals");
  expect(after.find((x) => x.id === "t_chilli")).toMatchObject({ jcKcal: 2400, checkMe: true, portionCheck: true, checkReason: expect.stringContaining("looks like the whole recipe (about 4 portions)") });
  expect(after.find((x) => x.id === "t_granola").checkReason).toContain("looks like a per-100 g value");
  expect(after.find((x) => x.id === "t_soup").checkMe).toBeUndefined();
  expect(errors).toEqual([]);
});

test("recheckFlag: whole recipe, per 100 g, > 35% off, or fine", () => {
  expect(recheckFlag(2400, { perPortionKcal: 600, looksLike: "wholeRecipe", servingsGuess: 4 })).toMatch(/^Check me — confirm portions: .*whole recipe \(about 4 portions\)/);
  expect(recheckFlag(450, { perPortionKcal: 200, looksLike: "per100g" })).toMatch(/per-100 g value/);
  expect(recheckFlag(900, { perPortionKcal: 500, looksLike: "portion" })).toMatch(/saved 900 kcal per portion, about 500/);
  expect(recheckFlag(520, { perPortionKcal: 500, looksLike: "portion" })).toBe(null);
});
