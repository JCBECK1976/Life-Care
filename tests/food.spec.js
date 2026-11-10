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
  const sunday = ws.getFullYear() + "-" + String(ws.getMonth() + 1).padStart(2, "0") + "-" + String(ws.getDate()).padStart(2, "0");
  const dateOf = (day) => { const d = new Date(ws); d.setDate(d.getDate() + DAYS.indexOf(day)); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  return { key, today: DAYS[now.getDay()], sunday, childKey: "eat_children:jc:" + sunday, dateOf };
}
// v2.6.5 children: the selection at a weekday/slot of this week
// Tests write their data after the app's first load; drop any week the first load already migrated, then reload.
export async function freshReload(page) { await page.waitForTimeout(300); await fetch(url(thisWeek().childKey), { method: "DELETE", headers: { Authorization: "Bearer owner" } }); await page.reload(); }
export async function childOf(day, slot) { const w = thisWeek(); const doc = await getKey(w.childKey); return doc ? doc.children["c_" + w.dateOf(day) + "_" + slot] || null : null; }

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
  await freshReload(page);
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
  await freshReload(page);
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
  expect((await childOf(today, "b")).portion).toEqual({ factor: 1 });                                     // Cancel saved nothing
  expect(await childOf(today, "l")).toBeNull();
  expect(errors).toEqual([]);
});

// ═══ v2.6.5 parent list items + child selections (HANDOVER 10 Nov 14:35) ═══
test("children: an old plan is migrated once into dated children (current week portions + ticks), old day-name keys removed", async ({ page }) => {
  const { errors } = await openApp(page);
  const { key, today, childKey } = thisWeek();
  await tab(page, "My Eating"); await page.waitForTimeout(800);                         // let the first load finish
  const a = { id: "t_oatbar", name: "Test Oat Bar", jcKcal: 200, beckKcal: 200, protein: 5, satFat: 1, rating: "GOOD" };
  await setKey("custom_breakfasts", [a, ...((await getKey("custom_breakfasts")) || [])]);
  await setKey(key, { [today]: { b: a.id, b2: "custom_gone_1" } });
  await setKey("portion_overrides:jc", { [today]: { b: { kcal: 260, protein: 6, satFat: 2 } } });
  await setKey("meal_tracking:jc", { [today + ":b"]: "eaten", "someday:x": "skipped" });
  await page.reload();
  await tab(page, "My Eating");
  await expect.poll(async () => !!(await getKey(childKey))).toBe(true);
  const c = await childOf(today, "b");
  expect(c).toMatchObject({ parentId: a.id, source: "migrated", tracked: "eaten", portion: { source: "photo", values: { kcal: 260 } }, nutrition: { kcal: 260 } });
  expect(await childOf(today, "b2")).toBeNull();                                         // unknown id: not carried over
  expect(await getKey("portion_overrides:jc")).toBeNull();                                // legacy day-name keys deleted
  expect(await getKey("meal_tracking:jc")).toBeNull();
  const once = JSON.stringify(await getKey(childKey));
  await page.reload(); await tab(page, "My Eating");
  await expect(page.getByText("Test Oat Bar").first()).toBeVisible();
  expect(JSON.stringify(await getKey(childKey))).toBe(once);                             // idempotent
  expect(errors).toEqual([]);
});

test("children: editing or deleting a parent list item never changes the child; a manual pick creates a child", async ({ page }) => {
  const { errors } = await openApp(page);
  const { key, today } = thisWeek();
  const a = { id: "t_oatbar", name: "Test Oat Bar", jcKcal: 200, beckKcal: 200, satFat: 1, rating: "GOOD" };
  const b = { id: "t_toast", name: "Test Toast", jcKcal: 150, beckKcal: 150, satFat: 1, rating: "GOOD" };
  await setKey("custom_breakfasts", [a, b, ...((await getKey("custom_breakfasts")) || [])]);
  await setKey(key, { [today]: { b: a.id, b2: "__empty__" } });
  await freshReload(page); await tab(page, "My Eating");
  await expect.poll(async () => (await childOf(today, "b"))?.snapshot.name).toBe("Test Oat Bar");
  // the parent is edited and then deleted from the list (as Update Lists would)
  await setKey("custom_breakfasts", [{ ...a, name: "Test Oat Bar XL", jcKcal: 900 }, b]);
  await page.reload(); await tab(page, "My Eating");
  await setKey("custom_breakfasts", [b]);
  await page.reload(); await tab(page, "My Eating");
  const c = await childOf(today, "b");
  expect(c.snapshot).toMatchObject({ name: "Test Oat Bar", kcal: 200 });
  await expect(page.getByText("Test Oat Bar", { exact: true }).first()).toBeVisible();   // still shown from the child
  // manual pick in the empty row → a child from the parent
  await page.getByText("Select breakfast...").first().click();
  await page.getByPlaceholder("Type to search...").fill("Test Toast");
  await page.getByText("Test Toast", { exact: false }).first().click();
  await expect.poll(async () => (await childOf(today, "b2"))?.parentId).toBe(b.id);
  expect(await childOf(today, "b2")).toMatchObject({ source: "manual", snapshot: { name: "Test Toast", kcal: 150 } });
  expect(errors).toEqual([]);
});

test("D13: a portion logged this Monday is not shown next Monday (children are dated)", async ({ page }) => {
  const { errors } = await openApp(page);
  const { today } = await portionSetup(page, { name: "Test Oat Bar", matchesPlanned: true, assumed: "40g bar", kcal: 180, protein: 4, satFat: 1 });
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect.poll(async () => (await childOf(today, "b"))?.portion?.values?.kcal).toBe(180);
  await expect(page.getByTitle("Portion verified").first()).toBeVisible();
  await page.locator("button", { hasText: "›" }).first().click();                         // next week
  await expect(page.getByText(/Week \d+/).first()).toBeVisible();
  await expect(page.getByTitle("Portion verified")).toHaveCount(0);
  await expect(page.getByText("Test Oat Bar", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("D9: generator writes children — defaults and generated picks from parents, existing selection kept", async ({ page }) => {
  const { errors } = await openApp(page);
  const { key } = thisWeek();
  const mk = (id) => ({ id, name: "Test " + id, jcKcal: 400, beckKcal: 350, protein: 20, satFat: 1, rating: "GREAT" });
  const [bA, bB, lA, lB, dA] = ["t_bA", "t_bB", "t_lA", "t_lB", "t_dA"].map(mk);
  for (const [k, items] of [["custom_breakfasts", [bA, bB]], ["custom_lunches", [lA, lB]], ["custom_meals", [dA]]]) await setKey(k, [...items, ...((await getKey(k)) || [])]);
  const defs = (await getKey("meal_defaults")) || {}; defs.jc = { b: bA.id }; await setKey("meal_defaults", defs);
  await setKey(key, { monday: { l: lA.id } });
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const gen = Object.fromEntries(days.map((d) => [d, { b: bB.id, l: lB.id, d: d === "friday" ? "invented_id" : dA.id }]));
  await page.route("https://api.anthropic.com/**", (r) => /Generate a week of meals/.test(r.request().postData() || "") ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(aiText(gen)) }) : r.fallback());
  await freshReload(page);
  await tab(page, "My Eating");
  await page.getByText("Week", { exact: true }).first().click();
  await page.getByRole("button", { name: "My Companion Meals Generator" }).click();
  await expect(page.getByText(/Week meals generated — Breakfast: your default · Lunch: 1 kept, 6 generated · Dinner: 6 generated · 1 slot left empty/)).toBeVisible();
  for (const d of days) expect(await childOf(d, "b")).toMatchObject({ parentId: bA.id, source: "default" });
  expect(await childOf("monday", "l")).toMatchObject({ parentId: lA.id, source: "migrated" });
  expect(await childOf("tuesday", "l")).toMatchObject({ parentId: lB.id, source: "generator", snapshot: { name: "Test t_lB" } });
  expect(await childOf("friday", "d")).toBeNull();
  expect(errors).toEqual([]);
});

test("Snap, filled slot, different food NOT in the list — Yes: saved to the list and linked; Undo restores the original child", async ({ page }) => {
  const { errors } = await openApp(page);
  const dialogs = []; page.on("dialog", (d) => { dialogs.push(d.message()); d.accept(); });
  const { today, a } = await portionSetup(page, { name: "Peanut Brunch Bar", matchesPlanned: false, assumed: "28g bar", kcal: 125, protein: 3, fat: 7, satFat: 2, addedSugar: 9 });
  await expect(page.getByTestId("snap-update-to")).toHaveText("Update to Peanut Brunch Bar");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByTestId("portion-replaced")).toContainText("Looks like Peanut Brunch Bar, not Test Oat Bar — updated");
  expect(dialogs).toEqual(["Save \u201cPeanut Brunch Bar\u201d to your Breakfast list for future selection?"]);
  const list = await getKey("custom_breakfasts");
  const added = list.find((x) => x.name === "Peanut Brunch Bar");
  expect(list.find((x) => x.id === a.id)).toEqual(a);                                         // parent untouched
  expect(await childOf(today, "b")).toMatchObject({ parentId: added.id, source: "snap", nutrition: { kcal: 125 }, portion: { assumed: "28g bar" } });
  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => (await childOf(today, "b"))?.parentId).toBe(a.id);
  expect(errors).toEqual([]);
});

test("Snap, empty slot, food NOT in the list — No: an ad hoc child (parentId null), the list is unchanged; no other popups", async ({ page }) => {
  const { errors } = await openApp(page);
  const dialogs = []; page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });
  const { today } = await portionSetup(page, { name: "Banana Bread Slice", assumed: "1 slice (80g)", kcal: 260, protein: 4, satFat: 3, addedSugar: 14 }, "", (t) => ({ [t]: { b: "__empty__" } }));
  expect(await childOf(today, "b")).toBeNull();                                                 // nothing before Confirm
  const before = JSON.stringify(await getKey("custom_breakfasts"));
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect.poll(async () => (await childOf(today, "b"))?.source).toBe("adhoc");
  expect(dialogs).toEqual(["Save \u201cBanana Bread Slice\u201d to your Breakfast list for future selection?"]);
  const c = await childOf(today, "b");
  expect(c).toMatchObject({ parentId: null, snapshot: { name: "Banana Bread Slice" }, nutrition: { kcal: 260, addedSugar: 14 }, rating: "RED", ragFreq: "weekly" });
  expect(JSON.stringify(await getKey("custom_breakfasts"))).toBe(before);
  await expect(page.getByText("Banana Bread Slice", { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Snap, empty slot, food IN the list — linked to the parent with no question; same food on a filled slot updates the portion only", async ({ page }) => {
  const { errors } = await openApp(page);
  const dialogs = []; page.on("dialog", (d) => { dialogs.push(d.message()); d.accept(); });
  const { today, a, prompts } = await portionSetup(page, { name: "Test Oat Bar", assumed: "1 bar (45g)", kcal: 190, protein: 5, satFat: 1, addedSugar: 6 }, "45g bar", (t) => ({ [t]: { b: "__empty__" } }));
  await expect(page.getByTestId("snap-actions")).toBeVisible();
  expect(prompts[0]).toContain("45g bar");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect.poll(async () => (await childOf(today, "b"))?.parentId).toBe(a.id);
  expect(dialogs).toEqual([]);
  expect(await childOf(today, "b")).toMatchObject({ source: "snap", nutrition: { kcal: 190 }, notes: "45g bar" });
  expect((await getKey("custom_breakfasts")).find((x) => x.id === a.id)).toEqual(a);
  expect(errors).toEqual([]);
});

test("child RAG: recalculated from the child's own nutrition; shown when it differs from the parent", async ({ page }) => {
  const { errors } = await openApp(page);
  const { today } = await portionSetup(page, { name: "Test Oat Bar", matchesPlanned: true, assumed: "3 bars", kcal: 600, protein: 15, satFat: 13, addedSugar: 20 });
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect.poll(async () => (await childOf(today, "b"))?.ragFreq).toBe("weekly");
  expect((await childOf(today, "b")).rating).toBe("RED");                                       // 13g sat fat = 65%
  await expect(page.getByTestId("child-rag-note").first()).toHaveText("RED today — large portion");
  expect(errors).toEqual([]);
});
