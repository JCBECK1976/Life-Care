import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { addSnapshots, selectionName, snapshotItems } from "../src/lib/meals.js";

// v2.6.2 food data and photos (D6, D7, D9, D10, F7).
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k.replace(/[.#$/[\]]/g, "_") + ".json" + NS;
export const getKey = async (k) => { const v = await (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
export const setKey = (k, obj) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
export function thisWeek() {
  const base = new Date(2026, 6, 19), now = new Date();
  const ws = new Date(base); ws.setDate(ws.getDate() + Math.floor((now - base) / (7 * 864e5)) * 7);
  const key = "mealplan:" + ws.getFullYear() + "-" + String(ws.getMonth() + 1).padStart(2, "0") + "-" + String(ws.getDate()).padStart(2, "0") + ":jc";
  return { key, today: DAYS[now.getDay()] };
}

test("D6: snapshot rules (pure)", () => {
  const item = { id: "x1", name: "Granola (300 kcal)", jcKcal: 300, beckKcal: 250, satFat: 2, rating: "GOOD" };
  const dates = { monday: new Date(2020, 0, 6), friday: new Date(2999, 0, 3) };
  const m = { monday: { b: "x1" }, friday: { b: "x1" } };
  addSnapshots(m, { x1: item }, true, dates);
  expect(m._snap["monday:b"]).toEqual({ id: "x1", name: "Granola (300 kcal)", kcal: 300, rating: "GOOD", satFat: 2 });
  item.name = "Granola (350 kcal)"; item.jcKcal = 350;
  addSnapshots(m, { x1: item }, true, dates);
  expect(m._snap["monday:b"].kcal).toBe(300);   // past day keeps its snapshot
  expect(m._snap["friday:b"].kcal).toBe(350);   // today/future follows the list
  addSnapshots(m, {}, true, dates);              // item deleted from the list
  expect(m._snap["monday:b"].name).toBe("Granola (300 kcal)");
  expect(snapshotItems(m, {})[0]).toMatchObject({ id: "x1", jcKcal: 300, _deleted: true }) // one stand-in per deleted id;
  expect(selectionName("custom_17123_abc", null, null)).toBe("Deleted item");
  expect(selectionName("x1", m._snap["monday:b"], item)).toBe("Granola (300 kcal)");
  expect(selectionName("x1", null, item)).toBe("Granola (350 kcal)");
});

test("D6: deleted items show their snapshot or 'Deleted item', never code; a new selection stores a snapshot", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  const { key, today } = thisWeek();
  const cb = await getKey("custom_breakfasts"); const a = cb[0], b = cb[1];
  await setKey(key, { [today]: { b: a.id, b2: "custom_gone_123", b3: "custom_gone_456" },
    _snap: { [today + ":b2"]: { id: "custom_gone_123", name: "Old Granola Bowl", kcal: 300, rating: "GOOD" } } });
  await page.reload();
  await tab(page, "My Eating");
  await expect(page.getByText("Old Granola Bowl").first()).toBeVisible();
  await expect(page.getByText("Deleted item", { exact: true })).toHaveCount(1);
  await expect(page.getByText(/Custom Gone/i)).toHaveCount(0);
  await page.getByText("Deleted item", { exact: true }).click();
  await page.getByPlaceholder("Type to search...").fill(b.name.slice(0, 12));
  await page.getByText(b.name, { exact: false }).first().click();
  await expect.poll(async () => ((await getKey(key))._snap || {})[today + ":b3"]?.id).toBe(b.id);
  const saved = await getKey(key);
  expect(saved._snap[today + ":b2"].name).toBe("Old Granola Bowl");  // kept
  expect(saved._snap[today + ":b"].id).toBe(a.id);
  expect(errors).toEqual([]);
});

// D7: Update Item really recalculates
const aiText = (obj) => ({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: JSON.stringify(obj) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
async function openOatsUpdate(page, replies) {
  const cb = await getKey("custom_breakfasts");
  await setKey("custom_breakfasts", [{ id: "t_oats", name: "Test Oats 95g (387 kcal)", itemType: "ingredient", ingredients: ["95g rolled oats", "80g berries", "tsp honey"], jcKcal: 387, beckKcal: 387, protein: 18.2, fat: 9, satFat: 2, rating: "GOOD" }, ...cb]);
  const prompts = [];
  await page.route("https://api.anthropic.com/**", (r) => {
    const b = JSON.stringify(r.request().postDataJSON());
    if (!/homemade dish/.test(b)) return r.fallback();
    prompts.push(b);
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(aiText(replies[Math.min(prompts.length - 1, replies.length - 1)])) });
  });
  await page.reload();
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  const row = page.locator("div", { hasText: /^Test Oats 95g/ }).filter({ has: page.getByRole("button", { name: "✎ Update" }) }).last();
  await row.getByRole("button", { name: "✎ Update" }).click();
  await page.locator("#edit-item-ingredients-t_oats").fill("95g rolled oats, 150g berries, tsp honey");
  await page.getByRole("button", { name: "✓ Confirm" }).click();
  return prompts;
}

test("D7: changing an ingredient recalculates; before → after, assumed amounts, and the name's kcal update", async ({ page }) => {
  const { errors } = await openApp(page);
  const prompts = await openOatsUpdate(page, [{ kcal: 612, protein: 27, fat: 12, satFat: 3, carbs: 90, fibre: 12, salt: 0.2, rating: "GOOD", breakdown: [{ ingredient: "95g rolled oats", kcal: 355 }, { ingredient: "150g berries", kcal: 75 }], assumed: ["7g honey (1 tsp)"] }]);
  await expect(page.getByText(/387 → 612 kcal, protein 18.2 → 27g/).first()).toBeVisible();
  await expect(page.getByText(/Assumed: 7g honey \(1 tsp\)/).first()).toBeVisible();
  expect(prompts[0]).toContain("150g berries");
  expect(prompts[0]).not.toContain("387");                                  // no anchoring on the old value
  await expect(page.locator("#edit-item-name-t_oats")).toHaveValue("Test Oats 95g (612 kcal)");
  await page.getByRole("button", { name: "✓ Continue — Save" }).click();
  await expect.poll(async () => (await getKey("custom_breakfasts")).find((x) => x.id === "t_oats").jcKcal).toBe(612);
  expect((await getKey("custom_breakfasts")).find((x) => x.id === "t_oats").name).toBe("Test Oats 95g (612 kcal)");
  expect(errors).toEqual([]);
});

test("D7: an implausible total is retried, then refused — no success message, nothing changed", async ({ page }) => {
  const { errors } = await openApp(page);
  const bad = { kcal: 350, protein: 18, rating: "GOOD", breakdown: [{ ingredient: "95g rolled oats", kcal: 355 }, { ingredient: "150g berries", kcal: 75 }] };
  const prompts = await openOatsUpdate(page, [bad, bad]);
  await expect(page.getByText(/Recalculation failed: the total \(350 kcal\) is less than its ingredients add up to \(430 kcal\)/).first()).toBeVisible();
  expect(prompts.length).toBe(2);
  await expect(page.getByText(/Nutritional values updated/)).toHaveCount(0);
  expect((await getKey("custom_breakfasts")).find((x) => x.id === "t_oats").jcKcal).toBe(387);
  expect(errors).toEqual([]);
});

// D9: generator order — keep selections → defaults → generate only into empty slots from that slot's list
test("D9: generator keeps selections, uses defaults, fills only empty slots from the slot's list, and summarises", async ({ page }) => {
  const { errors } = await openApp(page);
  const { key } = thisWeek();
  const mk = (id) => ({ id, name: "Test " + id, jcKcal: 400, beckKcal: 350, protein: 20, rating: "GREAT" });
  const [bA, bB, lA, lB, dA] = ["t_bA", "t_bB", "t_lA", "t_lB", "t_dA"].map(mk);
  for (const [k, items] of [["custom_breakfasts", [bA, bB]], ["custom_lunches", [lA, lB]], ["custom_meals", [dA]]]) await setKey(k, [...items, ...((await getKey(k)) || [])]);
  const defs = (await getKey("meal_defaults")) || {}; defs.jc = { b: bA.id };
  await setKey("meal_defaults", defs);
  await setKey(key, { monday: { l: lA.id } });
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const gen = Object.fromEntries(days.map((d) => [d, { b: bB.id, l: lB.id, d: d === "friday" ? "invented_id" : dA.id }]));
  await page.route("https://api.anthropic.com/**", (r) => /Generate a week of meals/.test(r.request().postData() || "")
    ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(aiText(gen)) }) : r.fallback());
  await page.reload();
  await tab(page, "My Eating");
  await page.getByText("Week", { exact: true }).first().click();
  await page.getByRole("button", { name: "My Companion Meals Generator" }).click();
  await expect(page.getByText(/Week meals generated — Breakfast: your default · Lunch: 1 kept, 6 generated · Dinner: 6 generated · 1 slot left empty/)).toBeVisible();
  const m = await getKey(key);
  for (const d of days) expect(m[d].b).toBe(bA.id);                   // default, not the AI's pick
  expect(m.monday.l).toBe(lA.id);                                       // existing selection untouched
  expect(m.tuesday.l).toBe(lB.id);                                      // generated into the empty slot
  expect(m.friday.d || "").toBe("");                                    // invented id rejected, slot left empty
  expect(errors).toEqual([]);
});

// D10 + F7: portion photo
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
async function portionSetup(page, reply, desc, plan) {
  const { key, today } = thisWeek();
  const a = { id: "t_oatbar", name: "Test Oat Bar", jcKcal: 200, beckKcal: 200, protein: 5, satFat: 1, rating: "GOOD" };
  await setKey("custom_breakfasts", [a, ...((await getKey("custom_breakfasts")) || [])]);
  await setKey(key, plan === undefined ? { [today]: { b: a.id } } : plan(today));
  const prompts = [];
  await page.route("https://api.anthropic.com/**", (r) => {
    const b = r.request().postData() || "";
    if (!/Analyze this food portion/.test(b)) return r.fallback();
    prompts.push(b);
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(aiText(reply)) });
  });
  await page.reload();
  await tab(page, "My Eating");
  await snap(page, desc);
  return { key, today, a, prompts };
}
// v2.6.5: 📷 Snap → optional description → 📷 Take photo
async function snap(page, desc, nth = 0) {
  await page.getByRole("button", { name: "Snap a photo of your food" }).nth(nth).click();
  if (desc) await page.getByLabel("Photo description").fill(desc);
  await page.locator("label", { hasText: "📷 Take photo" }).locator("input[type=file]").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
}

test("D10: a photo of a different food becomes a new entry in the slot, with Undo; the original is never changed", async ({ page }) => {
  const { errors } = await openApp(page);
  const { key, today, a } = await portionSetup(page, { name: "Peanut Brunch Bar", matchesPlanned: false, assumed: "28g bar", kcal: 125, protein: 3, fat: 7, satFat: 2, carbs: 13, rating: "AMBER" });
  await expect(page.getByText("⚠️ Looks like Peanut Brunch Bar, not Test Oat Bar")).toBeVisible();
  await expect(page.getByTestId("portion-assumed")).toHaveText("Assumed: 28g bar — 125 kcal");
  await expect(page.getByTestId("snap-update-to")).toHaveText("Update to Peanut Brunch Bar");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByTestId("portion-replaced")).toContainText("Looks like Peanut Brunch Bar, not Test Oat Bar — updated");
  const list = await getKey("custom_breakfasts");
  const added = list.find((x) => x.name === "Peanut Brunch Bar");
  expect(added).toMatchObject({ jcKcal: 125, servingSize: "28g bar" });
  expect(list.find((x) => x.id === a.id)).toEqual(a);                                  // original untouched
  await expect.poll(async () => (await getKey(key))[today].b).toBe(added.id);
  expect((await getKey(key))._snap[today + ":b"].name).toBe("Peanut Brunch Bar");     // snapshot taken at once
  expect(((await getKey("portion_overrides:jc")) || {})[today]?.b).toBeUndefined();     // no values written to the slot
  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => (await getKey(key))[today].b).toBe(a.id);
  expect(errors).toEqual([]);
});

test("D10: the same food only updates this meal's portion; F7/Snap: the description goes with the first photo and can be edited for Re-check", async ({ page }) => {
  const { errors } = await openApp(page);
  const { a, today, prompts } = await portionSetup(page, { name: "Test Oat Bar", matchesPlanned: true, assumed: "40g bar", kcal: 180, protein: 4, satFat: 1, rating: "GOOD" }, "40g bar");
  await expect(page.getByText("📷 Portion Analysis")).toBeVisible();
  expect(prompts[0]).toContain("40g bar");                                            // typed before the photo
  expect(prompts[0]).toContain("PREFER the user's description");
  expect(((await getKey("portion_overrides:jc")) || {})[today]).toBeUndefined();       // nothing saved before Confirm
  await page.getByLabel("Photo description").fill("28g bar");
  await page.getByRole("button", { name: "↻ Re-check" }).click();
  await expect.poll(() => prompts.length).toBe(2);
  expect(prompts[1]).toContain("28g bar");
  await expect(page.getByTestId("snap-update-to")).toHaveCount(0);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect.poll(async () => ((await getKey("portion_overrides:jc")) || {})[today]?.b?.kcal).toBe(180);
  expect((await getKey("custom_breakfasts")).find((x) => x.id === a.id)).toEqual(a);  // list item untouched
  expect(errors).toEqual([]);
});

test("F7: Shop Food Checker sends the description with the photo and shows the assumed size", async ({ page }) => {
  const { errors } = await openApp(page);
  const prompts = [];
  await page.route("https://api.anthropic.com/**", (r) => {
    const b = r.request().postData() || "";
    if (!/Identify this food or product/.test(b)) return r.fallback();
    prompts.push(b);
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(aiText({ name: "Peanut Brunch Bar", assumed: "28g bar", kcal: 125, protein: 3, fat: 7, satFat: 2, rating: "AMBER", itemType: "packaged" })) });
  });
  await tab(page, "My Shop");
  await page.getByLabel("Food description").fill("28g bar");
  await page.locator("label", { hasText: "📷" }).filter({ has: page.locator("input[type=file]") }).first().locator("input[type=file]").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByTestId("checker-assumed")).toHaveText("Assumed: 28g bar — 125 kcal");
  expect(prompts[0]).toContain("28g bar");
  expect(prompts[0]).toContain("PREFER the user's description");
  expect(errors).toEqual([]);
});

// v2.6.5 Snap on an EMPTY slot
const emptyPlan = (today) => ({ [today]: { b: "__empty__" } });
test("Snap on an empty slot: a matching list item is selected with this portion", async ({ page }) => {
  const { errors } = await openApp(page);
  const { key, today, a, prompts } = await portionSetup(page, { name: "Test Oat Bar", assumed: "1 bar (45g)", kcal: 190, protein: 5, satFat: 1, addedSugar: 6, rating: "GOOD" }, "", emptyPlan);
  await expect(page.getByText("📷 Test Oat Bar").first()).toBeVisible();
  await expect(page.getByTestId("snap-rating")).toHaveText("GOOD · daily");          // 6g added sugar = 24%
  expect(prompts[0]).toContain("Nothing was planned for this slot");
  expect((await getKey(key))[today].b).toBe("__empty__");                              // nothing saved yet
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect.poll(async () => (await getKey(key))[today].b).toBe(a.id);
  expect((await getKey("portion_overrides:jc"))[today].b.kcal).toBe(190);
  expect(errors).toEqual([]);
});

test("Snap on an empty slot: a new food is added to the list on 'Add to list?' and selected; Cancel saves nothing", async ({ page }) => {
  const { errors } = await openApp(page);
  const dialogs = []; page.on("dialog", (d) => { dialogs.push(d.message()); d.accept(); });
  const { key, today } = await portionSetup(page, { name: "Banana Bread Slice", assumed: "1 slice (80g)", kcal: 260, protein: 4, satFat: 3, addedSugar: 14, rating: "AMBER" }, "", emptyPlan);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect.poll(() => dialogs).toEqual(["Add \u201cBanana Bread Slice\u201d to your Breakfast list?"]);
  const added = await expect.poll(async () => (await getKey("custom_breakfasts")).find((x) => x.name === "Banana Bread Slice")?.rating).toBe("RED");
  void added;
  const item = (await getKey("custom_breakfasts")).find((x) => x.name === "Banana Bread Slice");
  expect(item).toMatchObject({ ragFreq: "weekly", addedSugar: 14 });                    // 14g = 56% → weekly treat (rule, not the AI's AMBER)
  await expect.poll(async () => (await getKey(key))[today].b).toBe(item.id);
  // Cancel before the photo: nothing saved
  await page.getByRole("button", { name: "Snap a photo of your food" }).first().click();
  await page.getByTestId("snap-pre").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("snap-pre")).toHaveCount(0);
  expect((await getKey(key))[today].b).toBe(item.id);
  expect(errors).toEqual([]);
});

// JC phone test: one row [Confirm][Re-check][Cancel], equal height, on every kind of result
test("Snap result: Confirm, Re-check and Cancel sit in one row of equal-height buttons, in all three cases", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const { errors } = await openApp(page);
  const cases = [{ name: "Test Oat Bar", matchesPlanned: true, kcal: 180 }, { name: "Peanut Brunch Bar", matchesPlanned: false, kcal: 125 }];
  let reply = cases[0];
  const { key, today } = thisWeek();
  const a = { id: "t_oatbar", name: "Test Oat Bar", jcKcal: 200, beckKcal: 200, rating: "GOOD" };
  await setKey("custom_breakfasts", [a, ...((await getKey("custom_breakfasts")) || [])]);
  await setKey(key, { [today]: { b: a.id, l: "__empty__" } });
  await page.route("https://api.anthropic.com/**", (r) => /Analyze this food portion/.test(r.request().postData() || "") ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(aiText(reply)) }) : r.fallback());
  await page.reload();
  await tab(page, "My Eating");
  for (const [slot, rep] of [[0, cases[0]], [0, cases[1]], [1, { name: "Soup", kcal: 200 }]]) {          // same food · different food · empty slot
    reply = rep;
    await snap(page, "", slot);
    const row = page.getByTestId("snap-actions");
    await expect(row).toBeVisible();
    const boxes = await Promise.all(["Confirm", "↻ Re-check", "Cancel"].map((n) => row.getByRole("button", { name: n, exact: true }).boundingBox()));
    expect(boxes.every((b) => b && Math.abs(b.y - boxes[0].y) < 1 && Math.abs(b.height - boxes[0].height) < 1)).toBe(true);
    expect(boxes[0].x < boxes[1].x && boxes[1].x < boxes[2].x).toBe(true);
    await row.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(row).toHaveCount(0);
  }
  expect((await getKey(key))[today]).toEqual({ b: a.id, l: "__empty__" });                               // Cancel saved nothing
  expect(errors).toEqual([]);
});
