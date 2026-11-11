import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
// own helpers (importing food.spec.js would also run its tests)
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k + ".json" + NS;
const getKey = async (k) => { const v = await (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
const setKey = (k, obj) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
function thisWeek() { const base = new Date(2026, 6, 19), now = new Date(); const ws = new Date(base); ws.setDate(ws.getDate() + Math.floor((now - base) / (7 * 864e5)) * 7); return { key: "mealplan:" + ymd(ws) + ":jc", today: DAYS[now.getDay()], childKey: "eat_children:jc:" + ymd(ws), date: ymd(now) }; }
async function childOf(day, slot) { const w = thisWeek(); const doc = await getKey(w.childKey); return doc ? doc.children["c_" + w.date + "_" + slot] || null : null; }
async function freshReload(page) { await page.waitForTimeout(300); await fetch(url(thisWeek().childKey), { method: "DELETE", headers: { Authorization: "Bearer owner" } }); await page.reload(); }

// v2.8.0 "Open" pattern (F1 + F5): Progress weeks, list items and meal selections open read-only in one shared form.
const aiText = (obj) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: JSON.stringify(obj) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) });

test("F1: Progress rows show key data + Open (no notes, no Del); Open → read-only per-set → Edit/Save; Delete inside the form", async ({ page }) => {
  const { errors } = await openApp(page);
  const d = await getKey("dashboard:data"); const i = d.jc.exercises.sunday.findIndex((e) => !e.stopped); const ex = d.jc.exercises.sunday[i];
  ex.prog = [
    { wk: 1, w: "60kg", r: "10×3", note: "felt easy", goodForm: "good", fullRange: "good", sets: [{ w: "60", r: "10" }, { w: "60", r: "10" }, { w: "60", r: "10" }] },
    { wk: 2, w: "63kg", r: "10/8/8", note: "tough last set", goodForm: "good", fullRange: "working", sets: [{ w: "63", r: "10" }, { w: "56", r: "8" }, { w: "63", r: "8" }] },
  ];
  await setKey("dashboard:data", d); await page.reload();
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await page.getByRole("button", { name: "👁 Progress" }).nth(i).click();
  await expect(page.getByTestId("prog-wk")).toHaveCount(2);
  await expect(page.getByText("tough last set")).toHaveCount(0);                       // no notes text in the rows
  for (const row of await page.getByTestId("prog-wk").locator("xpath=..").all()) await expect(row.getByRole("button")).toHaveText(["Open"]);   // only Open, no Del
  await page.getByRole("button", { name: "Open week 2" }).click();
  const form = page.getByTestId("prog-open-form");
  await expect(form.getByTestId("open-form-mode")).toHaveText("Viewing");
  await expect(form.getByTestId("entry-set-2")).toHaveText("56kg × 8");
  await expect(form.getByTestId("entry-note")).toHaveText("tough last set");
  await expect(form.getByTestId("entry-fullRange").getByRole("button")).toHaveCount(0);                 // D21: viewing = one chip, no segmented buttons
  await expect(form.getByTestId("entry-fullRange-chip")).toHaveText("Working towards");
  await expect(form.getByTestId("entry-goodForm-chip")).toHaveText("Good");
  await form.getByRole("button", { name: "Edit", exact: true }).click();
  await form.getByLabel("Set 2 Weight").fill("60");
  await expect(form.getByTestId("entry-fullRange").getByRole("button", { name: "Working towards" })).toHaveAttribute("aria-pressed", "true");   // segmented only in Edit
  await form.getByTestId("entry-fullRange").getByRole("button", { name: "Good" }).click();
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByTestId("open-form-msg")).toHaveText("✓ Week 2 saved");
  const saved = (await getKey("dashboard:data")).jc.exercises.sunday[i].prog[1];
  expect(saved).toMatchObject({ wk: 2, w: "63kg", r: "10/8/8", fullRange: "good", sets: [{ w: "63", r: "10" }, { w: "60", r: "8" }, { w: "63", r: "8" }] });
  page.on("dialog", (dg) => dg.accept());
  await expect(form.getByTestId("entry-fullRange-chip")).toHaveText("Good");
  await expect(form.getByRole("button", { name: "Remove", exact: true })).toHaveAttribute("data-kind", "remove");   // D17
  await form.getByRole("button", { name: "Remove", exact: true }).click();
  await expect.poll(async () => (await getKey("dashboard:data")).jc.exercises.sunday[i].prog.length).toBe(1);
  if (!(await page.getByTestId("prog-wk").count())) await page.getByRole("button", { name: "👁 Progress" }).nth(i).click();
  await expect(page.getByTestId("prog-wk")).toHaveText(["1"]);                         // remaining row shows the right week (old index bug)
  expect(errors).toEqual([]);
});

test("F5: a list item opens read-only; Delete from list exists ONLY there (with confirm)", async ({ page }) => {
  const { errors } = await openApp(page);
  const item = { id: "t_oat", name: "Test Oat Bar", jcKcal: 200, beckKcal: 200, satFat: 1, addedSugar: 6, rating: "GOOD", ragReason: "GOOD (daily): one portion is 6g added sugar = 24% of the 25g daily limit" };
  await setKey("custom_breakfasts", [item, ...((await getKey("custom_breakfasts")) || [])]); await page.reload();
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await expect(page.getByRole("button", { name: "🗑 Del" })).toHaveCount(0);               // no delete in list rows
  await page.getByRole("button", { name: "Open Test Oat Bar" }).click();
  const view = page.getByTestId("item-view");
  await expect(view.getByTestId("view-kcal")).toHaveText("200 kcal");
  await expect(view.getByTestId("view-rating")).toContainText("GOOD · daily");
  let msg = ""; page.once("dialog", (dg) => { msg = dg.message(); dg.accept(); });
  await expect(view.getByRole("button", { name: "Delete", exact: true })).toHaveAttribute("data-kind", "delete");   // D19
  await view.getByRole("button", { name: "Delete", exact: true }).click();
  await expect.poll(async () => (await getKey("custom_breakfasts")).some((x) => x.id === "t_oat")).toBe(false);
  expect(msg).toBe("Delete Test Oat Bar from your Breakfasts list? Meals you already logged keep their own copy.");
  expect(errors).toEqual([]);
});

test("F5: a meal selection opens as the CHILD — variations recalculate the child's nutrition and RAG; the list item is untouched; Remove from this meal", async ({ page }) => {
  const { errors } = await openApp(page);
  const { key, today } = thisWeek();
  await tab(page, "My Eating"); await page.waitForTimeout(500);
  const dinner = { id: "t_fish", name: "Test Fish & Potato", jcKcal: 500, beckKcal: 450, protein: 30, satFat: 4, addedSugar: 0, rating: "GOOD" };
  await setKey("custom_meals", [dinner, ...((await getKey("custom_meals")) || [])]);
  await setKey(key, { [today]: { d: dinner.id } });
  const prompts = [];
  await page.route("https://api.anthropic.com/**", (r) => { const t = r.request().postData() || ""; if (!/The person ate/.test(t)) return r.fallback(); prompts.push(JSON.parse(t)); return r.fulfill(aiText({ kcal: 760, protein: 30, fat: 38, satFat: 14, addedSugar: 1, carbs: 70, fibre: 6, salt: 2, change: "Chips add about 260 kcal and 10g sat fat." })); });
  await freshReload(page); await tab(page, "My Eating");
  await page.getByRole("button", { name: "Open this meal" }).first().click();
  const form = page.getByTestId("slot-open-form");
  await expect(form).toContainText("Test Fish & Potato");
  await expect(form.getByTestId("slot-rating")).toContainText("GREAT");                    // 4g sat fat = 20%, protein credit
  await page.setViewportSize({ width: 360, height: 800 });                                // v2.13.0: buttons fit at 360px, never truncated
  await expect(form.getByRole("button")).toHaveText(["Edit", "Remove", "Close"]);
  expect(await form.locator("button").evaluateAll((bs) => bs.filter((b) => b.scrollWidth > b.clientWidth + 1).length)).toBe(0);
  await form.getByRole("button", { name: "Edit", exact: true }).click();
  await form.getByLabel("Changes to this meal").fill("chips instead of potato");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(form.getByTestId("open-form-msg")).toHaveText("✓ Saved for this meal only. To update the list item permanently, please go to 'Update Eating Lists'.");
  expect(prompts[0].temperature).toBe(0);
  expect(prompts[0].messages[0].content).toContain('with these changes: "chips instead of potato"');
  const c = await childOf(today, "d");
  expect(c).toMatchObject({ variations: { text: "chips instead of potato" }, nutrition: { kcal: 760, satFat: 14 }, rating: "RED", ragFreq: "monthly", parentId: dinner.id });
  expect((await getKey("custom_meals")).find((x) => x.id === dinner.id)).toEqual(dinner);          // parent untouched
  await expect(form.getByTestId("slot-rag-diff")).toHaveText("Differs today: RED today — with changes");
  page.on("dialog", (dg) => dg.accept());
  await expect(form.getByRole("button", { name: "Remove", exact: true })).toHaveAttribute("data-kind", "remove");   // D18
  await form.getByRole("button", { name: "Remove", exact: true }).click();
  await expect.poll(async () => await childOf(today, "d")).toBeNull();
  expect((await getKey("custom_meals")).some((x) => x.id === dinner.id)).toBe(true);
  expect(errors).toEqual([]);
});

test("F5: Open on an empty slot starts adding an item", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Add to this meal" }).first().click();
  await expect(page.getByText("Add New Breakfast Item")).toBeVisible();
  expect(errors).toEqual([]);
});

test("v2.11.1: changing the portion of a photo-checked meal scales the PHOTO values (not list × factor)", async ({ page }) => {
  const { errors } = await openApp(page);
  const { key, today } = thisWeek();
  await tab(page, "My Eating"); await page.waitForTimeout(500);
  const dinner = { id: "t_pasta", name: "Test Pasta", jcKcal: 500, beckKcal: 450, protein: 18, satFat: 3, addedSugar: 2, rating: "GOOD" };
  await setKey("custom_meals", [dinner, ...((await getKey("custom_meals")) || [])]);
  await setKey(key, { [today]: { d: dinner.id } });
  await setKey("portion_overrides:jc", { [today]: { d: { kcal: 600, protein: 20, satFat: 6, addedSugar: 4 } } });   // photo-checked (migrated)
  await freshReload(page); await tab(page, "My Eating");
  await expect.poll(async () => (await childOf(today, "d"))?.portion?.values?.kcal).toBe(600);
  await page.getByRole("button", { name: "Open this meal" }).first().click();
  const form = page.getByTestId("slot-open-form");
  await form.getByRole("button", { name: "Edit", exact: true }).click();
  await form.getByRole("button", { name: "1½×", exact: true }).click();
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await childOf(today, "d"))?.nutrition?.kcal).toBe(900);               // 600 × 1.5, not 500 × 1.5
  expect((await childOf(today, "d")).portion).toMatchObject({ source: "photo", factor: 1.5, photoValues: { kcal: 600 }, values: { kcal: 900, satFat: 9 } });
  await expect(form.getByTestId("slot-portion")).toHaveText("checked by photo ×1.5");
  await form.getByRole("button", { name: "Edit", exact: true }).click();
  await form.getByRole("button", { name: "½×", exact: true }).click();
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await childOf(today, "d"))?.nutrition?.kcal).toBe(300);               // always from the photo, not from 900
  expect((await getKey("custom_meals")).find((x) => x.id === dinner.id)).toEqual(dinner);
  expect(errors).toEqual([]);
});
