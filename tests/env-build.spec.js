import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// The version base, read from the app so tests don't need editing for each release.
const BASE = fs.readFileSync("src/constants/version.js", "utf8").match(/APP_VERSION_BASE = "(v[\d.]+)"/)[1];

// Runs against a dev server started with VITE_APP_ENV=build (see playwright.config.js).
test("build environment: BUILD badge, tab title prefix, -build version, noindex", async ({ page }) => {
  const { errors } = await openApp(page);
  await expect(page.getByTestId("env-badge")).toHaveText("BUILD");
  await expect(page).toHaveTitle("BUILD · Lifecare Companion™");
  await expect(page.getByText(BASE + "-build.test123", { exact: true })).toBeAttached();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  expect(errors).toEqual([]);
});

test("build environment: the badge sits under the Help and Settings buttons", async ({ page }) => {
  await openApp(page);
  const help = await page.getByRole("button", { name: /Help/ }).first().boundingBox();
  const badge = await page.getByTestId("env-badge").boundingBox();
  expect(badge.y).toBeGreaterThan(help.y + help.height - 1);
  const gear = await page.locator("button").nth(1).boundingBox(); // Settings gear, right of Help
  expect(Math.abs(badge.x + badge.width - (gear.x + gear.width))).toBeLessThan(2); // right-aligned under the buttons
});

test("build environment: its own installable app (name, scope, tinted icons)", async ({ request }) => {
  const m = await (await request.get("manifest.webmanifest")).json();
  expect(m).toMatchObject({ name: "Lifecare BUILD", short_name: "LC Build", id: "/Life-Care/build/", start_url: "/Life-Care/build/", scope: "/Life-Care/build/" });
  for (const i of m.icons) expect(i.src.startsWith("/Life-Care/build/brand/build/")).toBe(true);
});
