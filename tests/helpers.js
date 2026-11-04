import { expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { mockAnthropic } from "./mock-ai.js";

export { mockAnthropic };

export function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

// Re-seed the emulator, then open the app with AI and Open Food Facts mocked; wait until data has loaded.
export async function openApp(page) {
  execSync("node scripts/seed-emulator.mjs", { stdio: "ignore" }); // fresh data for every test
  const errors = collectErrors(page);
  const aiCalls = await mockAnthropic(page);
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"products":[]}' }));
  await page.goto("./");
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  return { errors, aiCalls };
}

export const tab = (page, name) => page.getByRole("button", { name, exact: true }).first().click();
export const person = (page, name) => page.getByRole("button", { name, exact: true }).first().click();
