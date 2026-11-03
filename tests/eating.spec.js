import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

test("My Eating: add item → Review Item → edit ingredients → Confirm → values updated → Continue — Add", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByRole("button", { name: "+ Add New Item to Lists" }).click();
  await page.getByPlaceholder("e.g. Costa Rocky Road, Protein shake...").fill("Test Porridge");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Review Item").first()).toBeVisible();
  await page.locator("#review-item-ingredients").fill("oats 80g, milk 250ml");
  const panel = page.locator("div", { has: page.locator("#review-item-ingredients") })
    .filter({ has: page.getByRole("button", { name: "✓ Confirm" }) }).last();
  await panel.getByRole("button", { name: /^breakfast$/i }).click();
  await panel.getByRole("button", { name: "✓ Confirm" }).click();
  await expect(page.getByText("Nutritional values updated").first()).toBeVisible();
  await page.getByRole("button", { name: /Continue — Add/ }).first().click();
  await expect(page.getByText("Test Porridge").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("My Eating: bulk paste adds items", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByRole("button", { name: "+ Add New Item to Lists" }).click();
  await page.getByRole("button", { name: "📋 Bulk" }).click();
  await page.locator("#bulk-paste-textarea").fill("Test Apple\nTest Pear");
  const bulk = page.locator("div", { has: page.locator("#bulk-paste-textarea") })
    .filter({ has: page.getByRole("button", { name: "Upload Items" }) }).last();
  await bulk.getByRole("button", { name: /^breakfast$/i }).click();
  await bulk.getByRole("button", { name: "Upload Items" }).click();
  await expect(page.getByText("Test Apple").first()).toBeVisible();
  await expect(page.getByText("Test Pear").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("My Eating: ✎ Update opens the Update Item panel", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByRole("button", { name: "✎ Update" }).first().click();
  await expect(page.getByText("Update Item").first()).toBeVisible();
  expect(errors).toEqual([]);
});
