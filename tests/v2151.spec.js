import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";
import * as meals from "../src/lib/meals.js";

// v2.15.1: "Clear old eating history" removed from Data tools (its one-off job is done; recovery = Download backup + Restore).
test("v2.15.1: Clear old eating history is gone from Settings and Data tools; backup, restore and viewer remain", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.locator("button").nth(1).click();
  await expect(page.getByRole("button", { name: "Open Clear old eating history" })).toHaveCount(0);
  await expect(page.getByTestId("data-links").getByRole("button", { name: /^Open / })).toHaveCount(3);
  await page.getByRole("button", { name: "Open Data viewer" }).click();
  await expect(page.getByText("Firebase Data Viewer")).toBeVisible();
  await expect(page.getByTestId("clear-history")).toHaveCount(0);
  await expect(page.getByText("Clear old eating history")).toHaveCount(0);
  await expect(page.getByTestId("backup")).toBeVisible();
  await expect(page.getByTestId("restore-export")).toBeAttached();
  expect(meals.planClearHistory).toBeUndefined();
  expect(errors).toEqual([]);
});
