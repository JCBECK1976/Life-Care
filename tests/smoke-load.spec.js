import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

const SECTIONS = ["Home", "My Body", "My Exercise", "My Eating", "My Shop", "My Health"];

test("app loads from the emulator data and shows the version", async ({ page }) => {
  const { errors } = await openApp(page);
  await expect(page.getByText("v1.374.2").first()).toBeAttached();
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
