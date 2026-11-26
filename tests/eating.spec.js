import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.19.1 (F27): a typed description goes to the clarifying conversation ("Create my own item"), values per portion
test("My Eating: typed item → the clarifying conversation → per portion → Save", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByRole("button", { name: "📷 Photo or bulk paste" }).click();
  await page.getByPlaceholder("e.g. Costa Rocky Road, Protein shake...").fill("Test Stew with beef and veg");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const ul = page.getByTestId("update-lists");
  await expect(ul.getByRole("tab", { name: "My own" })).toHaveAttribute("aria-selected", "true");
  await expect(ul.getByLabel("Describe your item")).toHaveValue("Test Stew with beef and veg");
  await ul.getByRole("button", { name: "Send" }).click();
  await expect(ul.getByTestId("own-confirm").getByTestId("portion-label")).toContainText("1 portion = 1 of 4 servings");
  await ul.getByRole("button", { name: "Confirm" }).click();
  await ul.getByRole("button", { name: "Save" }).click();
  await expect(ul.getByTestId("saved-card")).toContainText("✓ Saved Test Stew");
  await expect(page.getByText(/could not be read|did not return/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("My Eating: bulk paste adds items", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());                     // v2.6.3: "Add 2 items to Breakfast?"
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByRole("button", { name: "📷 Photo or bulk paste" }).click();
  await page.getByRole("button", { name: "📋 Bulk" }).click();
  await page.locator("#bulk-paste-textarea").fill("Test Apple\nTest Pear");
  const bulk = page.locator("div", { has: page.locator("#bulk-paste-textarea") })
    .filter({ has: page.getByRole("button", { name: "Cancel" }) }).last();      // v2.6.3: no category until chosen
  await bulk.getByRole("button", { name: /^breakfast$/i }).click();
  await bulk.getByRole("button", { name: "Upload Items" }).click();
  await page.getByRole("button", { name: "OK", exact: true }).click(); // v2.6.3 F4 reminder
  await expect(page.getByText("Test Apple").first()).toBeVisible();
  await expect(page.getByText("Test Pear").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("My Eating: Open shows the item read-only; Edit opens the Update Item editor", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByRole("button", { name: /^Open / }).first().click();             // v2.8.0: Open (read-only) → Edit
  await expect(page.getByTestId("item-view")).toBeVisible();
  await page.getByTestId("item-view").getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByTestId("item-open-form")).toBeVisible();
  expect(errors).toEqual([]);
});
