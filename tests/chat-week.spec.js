import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { latestFirst } from "../src/lib/chat.js";

// v2.6.4: D8 companion chats latest first; C1 eating week shown Sunday first.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const setKey = (k, obj) => fetch("http://127.0.0.1:9000/data/" + k + ".json" + NS, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });

test("D8: threads are shown latest exchange first, each question above its answer", () => {
  const t = [{ role: "user", text: "q1" }, { role: "assistant", text: "a1" }, { role: "user", text: "q2" }, { role: "assistant", text: "a2a" }, { role: "assistant", text: "a2b" }];
  expect(latestFirst(t).map((m) => m.text)).toEqual(["q2", "a2a", "a2b", "q1", "a1"]);
  expect(latestFirst([])).toEqual([]);
});

for (const kind of ["Help", "Chat"]) {
  test(`D8: ${kind} chat opens with the latest exchange at the top`, async ({ page }) => {
    const { errors } = await openApp(page);
    if (kind === "Help") await page.getByRole("button", { name: /Help/ }).first().click();
    else await page.getByTitle("Chat with your Companion").or(page.getByRole("button", { name: "Chat with your Companion" })).first().click();
    const box = page.locator(kind === "Help" ? "#help-input-jc" : "#qa-input-jc");
    const send = box.locator("xpath=following-sibling::button[1]");
    for (const q of ["First question", "Second question"]) { await box.fill(q); await send.click(); await expect(page.getByText(q).first()).toBeVisible(); await expect(box).toBeEnabled(); }
    const bubbles = await page.locator("text=/^(First|Second) question$/").allInnerTexts();
    expect(bubbles).toEqual(["Second question", "First question"]);
    expect(errors).toEqual([]);
  });
}

test("C1: the eating week is shown Sunday first, and on a Sunday the app opens that week's Sunday", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 8, 10, 0, 0));          // Sunday 8 Nov 2026
  const { errors } = await openApp(page);
  const id = "t_sun";
  await setKey("custom_breakfasts", [{ id, name: "Sunday Pancakes", jcKcal: 400, beckKcal: 350, rating: "GOOD" }]);
  await setKey("mealplan:2026-11-08:jc", { sunday: { b: id } });          // stored key: week starting Sun 8 Nov
  await page.reload();
  await tab(page, "My Eating");
  await expect(page.getByText("Sunday Pancakes").first()).toBeVisible();     // today's slot = this week's "sunday"
  const days = (await page.getByRole("button", { name: /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)( \d+)?$/ }).allInnerTexts()).map((t) => t.slice(0, 3));
  expect(days.slice(0, 7)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  expect(errors).toEqual([]);
});
