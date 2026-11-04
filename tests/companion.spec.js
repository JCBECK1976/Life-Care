import { test, expect } from "@playwright/test";
import { openApp, tab, person } from "./helpers.js";
import { MOCK_TEXT } from "./mock-ai.js";

test("Help ? opens and returns a (mocked) answer", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.getByRole("button", { name: /Help/ }).first().click();
  await expect(page.getByText("Help — using the app").first()).toBeVisible();
  const box = page.locator("textarea:visible, input[type=text]:visible").last();
  await box.fill("How do I add a meal?");
  await box.press("Enter");
  if (!(await page.getByText(MOCK_TEXT).count())) await page.getByRole("button", { name: /Send|Ask/ }).last().click();
  await expect(page.getByText(MOCK_TEXT).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("💬 Chat opens", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.getByTitle("Chat with your Companion").or(page.getByRole("button", { name: "Chat with your Companion" })).first().click();
  await expect(page.getByText("Chat with your Companion").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Home: Companion Energy card shows a percentage only (no $ values)", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "Home");
  const card = page.locator("div", { has: page.getByText("Companion Energy", { exact: true }) })
    .filter({ hasText: "%" }).last();
  const text = await card.innerText();
  expect(text).toMatch(/\d+%/);
  expect(text).not.toContain("$");
  expect(errors).toEqual([]);
});

test("switching people changes the colour theme", async ({ page }) => {
  await openApp(page);
  const homeTab = page.getByRole("button", { name: "Home", exact: true }).first();
  await person(page, "JC");
  const jc = await homeTab.evaluate((b) => getComputedStyle(b).color + "|" + getComputedStyle(b).borderBottomColor);
  await person(page, "Becks");
  await expect.poll(() => homeTab.evaluate((b) => getComputedStyle(b).color + "|" + getComputedStyle(b).borderBottomColor)).not.toBe(jc);
});
