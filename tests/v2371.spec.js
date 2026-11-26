import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.37.1 (Architect brief 23 Nov, PART 3): a) changing a meal (Open → Edit → Changes) is a conversation like "My own" —
// a clarifying question instead of "didn't understand", strict JSON, retries, values for what was eaten, review before
// save; b) "+ Not in my list?" opens Single item with what was typed already searched.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const getKey = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const setKey = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const aiText = (text) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) });
const ITEM = { type: "item", name: "Fish pie with extra cheese", servings: 1, portionDesc: "1 portion", change: "Extra cheddar adds about 120 kcal.", assumptions: "30 g mature cheddar", perPortion: { kcal: 620, protein: 38, fat: 30, satFat: 14, carbs: 48, sugar: 5, addedSugar: 0, fibre: 4, salt: 2.1 } };
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
function thisWeek() { const base = new Date(2026, 6, 19), now = new Date(); const ws = new Date(base); ws.setDate(ws.getDate() + Math.floor((now - base) / (7 * 864e5)) * 7); return { key: "mealplan:" + ymd(ws) + ":jc", today: DAYS[now.getDay()], childKey: "eat_children:jc:" + ymd(ws), date: ymd(now) }; }

test("the meal-change conversation: a question when unclear, retries a broken reply, never a rejection; one request carries the meal and the change", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async (ITEM) => {
    const m = await import("/Life-Care/src/lib/clarify.js");
    const replies = ["not json at all", JSON.stringify({ type: "question", question: "Roughly how much extra cheese — a small handful?" }), JSON.stringify(ITEM)];
    const sent = []; const call = async (x) => { sent.push(x); return replies.shift(); };
    const req = m.mealChangeRequest({ name: "Fish pie", kcal: 500, protein: 30 }, 1.5, "extra cheese");
    const t1 = [{ role: "user", text: req }];
    const q = await m.clarifyMealChange(t1, { call });
    const it = await m.clarifyMealChange(t1.concat([{ role: "assistant", text: q.question }, { role: "user", text: "about 30 g" }]), { call });
    const bad = await m.clarifyMealChange(t1, { call: async () => "{ broken" });
    return { req, q, retried: sent[1][sent[1].length - 1].content, kcal: it.type === "item" ? it.reply.perPortion.kcal : 0, bad, sys: m.CLARIFY_CHANGE.slice(0, 19) };
  }, ITEM);
  expect(r.req).toContain('They ate 1.5 × that portion, with these changes: "extra cheese"');
  expect(r.q).toEqual({ type: "question", question: "Roughly how much extra cheese — a small handful?" });
  expect(r.retried).toMatch(/That reply can't be used/);                                         // retried, not rejected
  expect(r.kcal).toBe(620);
  expect(r.bad).toMatchObject({ type: "question", friendly: true });                              // a friendly question, never "didn't understand"
  expect(r.sys).toBe("CLARIFY_MEAL_CHANGE");
});

test("My Eating → Open → Edit → Changes: the Companion asks, you answer, you review the values, then Save stores them (nothing before)", async ({ page }) => {
  const { errors } = await openApp(page);
  const { key, today } = thisWeek();
  const dinner = { id: "t_pie", name: "Test Fish Pie", jcKcal: 500, beckKcal: 450, protein: 30, satFat: 6, addedSugar: 0, rating: "GOOD" };
  await setKey("custom_meals", [dinner, ...((await getKey("custom_meals")) || [])]);
  await setKey(key, { [today]: { d: dinner.id } });
  const asked = [];
  let turn = 0;
  await page.route("https://api.anthropic.com/**", (r) => { const t = r.request().postData() || ""; if (!/CLARIFY_MEAL_CHANGE/.test(t)) return r.fallback(); asked.push(JSON.parse(t)); turn++;
    return r.fulfill(aiText(turn === 1 ? JSON.stringify({ type: "question", question: "How much extra cheese, roughly?" }) : JSON.stringify(ITEM))); });
  await page.waitForTimeout(300); await fetch(KEY(thisWeek().childKey), { method: "DELETE", headers: H });
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Eating");
  await page.locator('[data-testid=picker-trigger]:has([data-testid=row-icon]:text-is("✎"))').first().click(); await page.getByTestId("act-edit").click();   // v2.50.0: Edit Item in the picker
  const form = page.getByTestId("slot-open-form");
  await form.getByRole("button", { name: "Edit", exact: true }).click();
  await form.getByLabel("Changes to this meal").fill("extra cheese on top");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(form.getByTestId("slot-clarify")).toContainText("How much extra cheese, roughly?");
  await expect(form).not.toContainText(/didn't understand|couldn't work out/i);
  await form.getByTestId("slot-clarify-answer").fill("about 30 g of cheddar");
  await form.getByTestId("slot-clarify-send").click();
  await expect(form.getByTestId("slot-review-values")).toHaveText("620 kcal · protein 38 g · fat 30 g (sat 14 g) · carbs 48 g · added sugar 0 g · fibre 4 g · salt 2.1 g");
  await page.setViewportSize({ width: 360, height: 800 });
  await form.screenshot({ path: "test-results/v2371-shots/meal-change-review-360.png" });
  const kids = async () => JSON.stringify(await getKey(thisWeek().childKey));
  expect(await kids()).not.toContain("620");                                                       // nothing saved before the review
  await form.getByTestId("slot-review-save").click();
  await expect(form.getByTestId("open-form-msg")).toContainText("✓ Saved for this meal only");
  await expect.poll(kids).toContain("620");
  expect(asked[1].messages.map((m) => m.content).join(" ")).toContain("about 30 g of cheddar");     // the answer went back to the Companion
  expect(asked[0].messages[0].content).toContain('with these changes: "extra cheese on top"');
  expect(errors).toEqual([]);
});

test("'+ Not in my list?' → Single item opens with what you typed already searched, results showing", async ({ page }) => {
  await openApp(page);
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [{ code: "1", product_name: "Granola Crunch", brands: "Test", nutriments: { "energy-kcal_100g": 450, proteins_100g: 9, fat_100g: 15, "saturated-fat_100g": 3, carbohydrates_100g: 65, sugars_100g: 20, fiber_100g: 6, salt_100g: 0.2 }, serving_size: "45 g" }] }) }));
  await tab(page, "My Eating");
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
  await page.getByRole("button", { name: new RegExp("^" + wd + "( |$)") }).first().click();
  await page.getByText(/Add breakfast…|Select\.\.\./).first().click().catch(async () => { await page.locator('[data-testid="selected-item"]').first().click(); });
  await page.getByLabel("Search items").first().fill("granola crunch");
  await page.getByText("+ Not in my list?").first().click();
  const ul = page.getByTestId("update-lists");
  await expect(ul.getByLabel("Search your lists, common foods and UK products")).toHaveValue("granola crunch");
  await expect(ul.getByTestId("off-option").first()).toBeVisible({ timeout: 10000 });
});
