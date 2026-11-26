import { test, expect, devices } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.56.3 HOTFIX: on a phone, typing in the eating picker's search closed the keyboard after every letter (the picker was
// re-mounted on each change). Every search / text box must keep the SAME element focused while typing and deleting,
// one key at a time, with the full text kept.
const { defaultBrowserType, ...phone } = devices["Pixel 7"];   // touch, coarse pointer, mobile viewport
test.use(phone);

async function keepsFocus(page, box, text) {
  await box.tap();
  await page.evaluate(() => { window.__lcBox = document.activeElement; });
  const same = () => page.evaluate(() => document.activeElement === window.__lcBox && window.__lcBox.isConnected);
  expect(await same()).toBe(true);
  for (const ch of text) { await page.keyboard.type(ch); expect(await same(), "after typing '" + ch + "'").toBe(true); }
  await expect(box).toHaveValue(text);
  for (let i = 0; i < 3; i++) { await page.keyboard.press("Backspace"); expect(await same(), "after delete " + (i + 1)).toBe(true); }
  await expect(box).toHaveValue(text.slice(0, -3));
}

test("eating picker search: the same box keeps focus while typing and deleting (day row and Week → Set Defaults)", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Eating"); await page.getByRole("button", { name: /^Sun( \d+)?$/ }).first().tap();
  await page.getByTestId("picker-trigger").first().tap();
  await keepsFocus(page, page.getByTestId("picker-sheet").locator("input").first(), "porridge");
  await expect(page.getByTestId("picker-sheet")).toHaveCount(1);                                     // the sheet stayed open
  await page.getByTestId("picker-sheet").getByRole("button", { name: "Close the list" }).tap();
  await page.getByRole("button", { name: "Week", exact: true }).first().tap();
  await page.getByText("Set Defaults", { exact: true }).locator("xpath=..").getByTestId("picker-trigger").first().tap();
  await keepsFocus(page, page.getByTestId("picker-sheet").locator("input").first(), "yoghurt");
  expect(errors).toEqual([]);
});

test("Update Eating Lists: Single item search, Build a meal search, My own description", async ({ page }) => {
  await openApp(page);
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).tap();
  const ul = page.getByTestId("update-lists");
  await ul.getByRole("tab", { name: "Single item" }).tap();
  await keepsFocus(page, page.locator("#single-search"), "fusilli");
  await ul.getByRole("tab", { name: "Build a meal" }).tap();
  await keepsFocus(page, page.locator("#meal-search"), "pasta bake");
  await ul.getByRole("tab", { name: "My own" }).tap();
  await keepsFocus(page, ul.getByLabel("Describe your item"), "beef stew");
});

test("Add Exercise search, Help guide + FAQ search, and the chat box", async ({ page }) => {
  await openApp(page);
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "+ Add Exercise" }).first().tap();
  await keepsFocus(page, page.getByPlaceholder("Search exercises or type new name..."), "running");
  await page.getByRole("button", { name: /help/i }).first().tap();
  await page.getByTestId("help-how").locator(":scope > summary").tap();
  await keepsFocus(page, page.locator("#hiw-search"), "snap a photo");
  await keepsFocus(page, page.locator("#help-faq-search"), "energy");
  await page.keyboard.press("Escape");
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.getByTitle("Chat with your Companion").or(page.getByRole("button", { name: "Chat with your Companion" })).first().tap();
  await keepsFocus(page, page.locator("#qa-input-jc"), "how am I doing");
});
