import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { rateByPortion, frequencyWarning, withRuleRating } from "../src/lib/rag.js";

// v2.6.5: D11 portion-based ratings (approved bands, ADDED sugar) and D7 follow-ups.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k + ".json" + NS;
const getKey = async (k) => { const v = await (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
const setKey = (k, obj) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
const aiText = (obj) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: JSON.stringify(obj) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) });

test("D11: biscuits and brownie land in different bands; half the portion rates better; frequency labels", () => {
  const biscuits = { satFat: 4, addedSugar: 10, jcKcal: 150, beckKcal: 150 };
  const brownie = { satFat: 20, addedSugar: 60, jcKcal: 800, beckKcal: 800 };
  expect(rateByPortion(biscuits)).toMatchObject({ band: "AMBER", freqLabel: "a few times a week" });
  expect(rateByPortion(brownie)).toMatchObject({ band: "RED-monthly", freqLabel: "monthly treat", rating: "RED", ragFreq: "monthly" });
  expect(rateByPortion({ satFat: 2, addedSugar: 5, jcKcal: 75 })).toMatchObject({ band: "GOOD" });
  expect(rateByPortion({ satFat: 1, addedSugar: 0, jcKcal: 100 }).band).toBe("GREAT");
  expect(rateByPortion({ satFat: 12, addedSugar: 0, jcKcal: 500 }).band).toBe("RED-weekly");      // 60%
  expect(rateByPortion({ satFat: 12, addedSugar: 0, protein: 30, jcKcal: 500 }).band).toBe("AMBER"); // credit, capped at AMBER
  expect(rateByPortion({ satFat: 1, addedSugar: 0, jcKcal: 950 }).band).toBe("RED-monthly");     // > 40% of the day
  expect(rateByPortion(biscuits).reason).toBe("AMBER (a few times a week): one portion is 10g added sugar = 40% of the 25g daily limit");
  const amber = withRuleRating(biscuits), redW = withRuleRating({ satFat: 12, jcKcal: 500 }), redM = withRuleRating(brownie);
  expect(frequencyWarning(amber, 2, 2)).toBeNull();
  expect(frequencyWarning(amber, 3, 3)).toMatch(/a few times a week/);
  expect(frequencyWarning(redW, 1, 1)).toMatch(/weekly treat/);
  expect(frequencyWarning(redM, 0, 1)).toMatch(/monthly treat/);
});

test("D11: Re-rate all lists estimates missing added sugar, applies the bands, and marks changed items Check me", async ({ page }) => {
  const { errors } = await openApp(page);
  await setKey("custom_snacks", [
    { id: "t_bisc", name: "Test Biscuits x3", jcKcal: 150, beckKcal: 150, satFat: 4, carbs: 20, rating: "RED" },
    { id: "t_apple", name: "Test Apple", jcKcal: 80, beckKcal: 80, satFat: 0, addedSugar: 0, rating: "GREAT" },
  ]);
  const prompts = [];
  await page.route("https://api.anthropic.com/**", (r) => {
    const b = r.request().postDataJSON(); const t = JSON.stringify(b);
    if (!/estimate the ADDED sugar/.test(t)) return r.fallback();
    prompts.push(t);
    const ids = [...b.messages[0].content.split("Items: ")[1].matchAll(/(?:^|; )([^:;]+): /g)].map((m) => m[1]);
    return r.fulfill(aiText(ids.map((id) => ({ id, addedSugar: id === "t_bisc" ? 10 : 0 }))));
  });
  await page.reload();
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "🔄 Re-rate all lists" }).click();
  await expect(page.getByText(/✅ Re-rated \d+ items by portion: \d+ changed \(marked Check me\)/)).toBeVisible({ timeout: 20000 });
  expect(prompts.every((p) => !/t_apple/.test(p))).toBe(true);                   // only items missing added sugar are asked about
  const sn = await getKey("custom_snacks");
  expect(sn.find((x) => x.id === "t_bisc")).toMatchObject({ rating: "AMBER", addedSugar: 10, prevRating: "RED-monthly", checkMe: true });
  expect(sn.find((x) => x.id === "t_apple")).toMatchObject({ rating: "GREAT" });
  expect(sn.find((x) => x.id === "t_apple").checkMe).toBeUndefined();
  expect(errors).toEqual([]);
});

test("D7: Re-check nutrition flags doubtful recipe items (values unchanged); Confirm on a flagged item recalculates", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  const oats = { id: "t_oats", name: "Test Oats 95g (387 kcal)", itemType: "ingredient", ingredients: ["95g rolled oats", "150g berries"], jcKcal: 387, beckKcal: 387, protein: 18, satFat: 2, rating: "GOOD" };
  const fine = { id: "t_fine", name: "Test Toast", itemType: "ingredient", ingredients: ["2 slices toast"], jcKcal: 200, beckKcal: 200, satFat: 1, rating: "GOOD" };
  await setKey("custom_breakfasts", [oats, fine]);
  const seen = [];
  await page.route("https://api.anthropic.com/**", (r) => {
    const t = JSON.stringify(r.request().postDataJSON());
    if (/add up the calories of the WHOLE recipe/.test(t)) { seen.push("recheck"); return r.fulfill(aiText([{ id: "t_oats", kcal: 612, breakdownSum: 600 }, { id: "t_fine", kcal: 210, breakdownSum: 205 }])); }
    if (/homemade dish/.test(t)) { seen.push("recalc"); return r.fulfill(aiText({ kcal: 612, protein: 27, satFat: 3, addedSugar: 0, breakdown: [{ ingredient: "oats", kcal: 355 }, { ingredient: "berries", kcal: 75 }] })); }
    return r.fallback();
  });
  await page.reload();
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "🔎 Re-check nutrition" }).click();
  await expect(page.getByText(/✅ Re-checked \d+ recipe items: 1 look doubtful/)).toBeVisible({ timeout: 20000 });
  const bf = await getKey("custom_breakfasts");
  expect(bf.find((x) => x.id === "t_oats")).toMatchObject({ jcKcal: 387, checkMe: true, checkReason: expect.stringMatching(/^Nutrition looks off: saved 387 kcal/) });
  expect(bf.find((x) => x.id === "t_fine").checkMe).toBeUndefined();
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  const row = page.locator("div", { hasText: /^Test Oats 95g/ }).filter({ has: page.getByRole("button", { name: /^Open / }) }).last();
  await row.getByRole("button", { name: /^Open / }).click(); await page.getByTestId("item-view").getByRole("button", { name: "✎ Edit" }).click();
  await page.getByRole("button", { name: "✓ Confirm" }).click();                       // no ingredient change
  await expect(page.getByText(/387 → 612 kcal/).first()).toBeVisible();
  await page.getByRole("button", { name: "✓ Continue — Save" }).click();
  await expect.poll(async () => (await getKey("custom_breakfasts")).find((x) => x.id === "t_oats").jcKcal).toBe(612);
  const saved = (await getKey("custom_breakfasts")).find((x) => x.id === "t_oats");
  expect(saved.checkMe).toBeUndefined();
  expect(saved.name).toBe("Test Oats 95g (612 kcal)");
  expect(errors).toEqual([]);
});

test("D7 on the add-item Review path: implausible totals are refused; good values show before → after", async ({ page }) => {
  const { errors } = await openApp(page);
  let reply = { kcal: 200, protein: 8, satFat: 2, breakdown: [{ ingredient: "oats 80g", kcal: 300 }, { ingredient: "milk 250ml", kcal: 120 }] };
  let calls = 0;
  await page.route("https://api.anthropic.com/**", (r) => /homemade dish/.test(r.request().postData() || "") ? (calls++, r.fulfill(aiText(reply))) : r.fallback());
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByRole("button", { name: "+ Add New Item to Lists" }).click();
  await page.getByPlaceholder("e.g. Costa Rocky Road, Protein shake...").fill("Test Porridge");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.locator("#review-item-ingredients").fill("oats 80g, milk 250ml");
  const panel = page.locator("div", { has: page.locator("#review-item-ingredients") }).filter({ has: page.getByRole("button", { name: "✓ Confirm" }) }).last();
  await panel.getByRole("button", { name: /^breakfast$/i }).click();
  await panel.getByRole("button", { name: "✓ Confirm" }).click();
  await expect(page.getByText(/Recalculation failed: the total \(200 kcal\) is less than its ingredients add up to \(420 kcal\)/).first()).toBeVisible();
  expect(calls).toBe(2);
  reply = { kcal: 430, protein: 18, satFat: 3, addedSugar: 0, breakdown: [{ ingredient: "oats 80g", kcal: 300 }, { ingredient: "milk 250ml", kcal: 120 }], assumed: [] };
  await panel.getByRole("button", { name: "✓ Confirm" }).click();
  await expect(page.getByText(/250 → 430 kcal, protein 10 → 18g/).first()).toBeVisible();
  expect(errors).toEqual([]);
});
