import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// The version base, read from the app so tests don't need editing for each release.
const BASE = fs.readFileSync("src/constants/version.js", "utf8").match(/APP_VERSION_BASE = "(v[\d.]+)"/)[1];

const SECTIONS = ["Home", "My Body", "My Exercise", "My Eating", "My Shop", "My Health"];

test("app loads from the emulator data and shows the version", async ({ page }) => {
  const { errors } = await openApp(page);
  await expect(page.getByText(BASE, { exact: true }).first()).toBeAttached();
  expect(errors).toEqual([]);
});

test("every main tab renders for both people", async ({ page }) => {
  const { errors } = await openApp(page);
  for (const person of ["JC", "Becks"]) {
    await page.getByRole("button", { name: person, exact: true }).first().click();
    for (const s of SECTIONS) {
      await page.getByRole("button", { name: s, exact: true }).first().click();
      await expect(page.locator("#root")).not.toBeEmpty();
    }
  }
  expect(errors).toEqual([]);
});

test("APP_GUIDE.md is served next to the app (Help companion source)", async ({ request }) => {
  const res = await request.get("APP_GUIDE.md");
  expect(res.ok()).toBeTruthy();
  expect((await res.text()).length).toBeGreaterThan(1000);
});

test("prod: no environment badge, plain tab title, indexable", async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId("env-badge")).toHaveCount(0);
  await expect(page).toHaveTitle("Lifecare Companion™");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test("loading screen is in the page HTML before JavaScript runs; header shows the logo", async ({ page, request }) => {
  const html = await (await request.get("./")).text();
  expect(html).toContain('class="boot"');
  expect(html).toContain("Loading Lifecare Companion™…");
  await openApp(page);
  const logo = page.getByAltText("Lifecare Companion logo");
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true);
});
