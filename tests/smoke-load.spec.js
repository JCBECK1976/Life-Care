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
