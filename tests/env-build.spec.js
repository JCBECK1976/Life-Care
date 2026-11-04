import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// Runs against a dev server started with VITE_APP_ENV=build (see playwright.config.js).
test("build environment: BUILD badge, tab title prefix, -build version, noindex", async ({ page }) => {
  const { errors } = await openApp(page);
  await expect(page.getByTestId("env-badge")).toHaveText("BUILD");
  await expect(page).toHaveTitle("BUILD · Lifecare Companion™");
  await expect(page.getByText("v2.1.0-build.test123", { exact: true })).toBeAttached();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  expect(errors).toEqual([]);
});
