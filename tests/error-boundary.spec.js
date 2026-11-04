import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

const MSG = "Something went wrong in this section — your data is safe. Reload to try again.";

test("a crashing section shows the friendly message, not a blank screen; other tabs still work", async ({ page }) => {
  await page.addInitScript(() => { window.__lcCrash = "Body"; });
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  await openApp(page);
  await tab(page, "My Body");
  await expect(page.getByText(MSG)).toBeVisible();
  await expect(page.getByRole("button", { name: "Home", exact: true })).toBeVisible(); // header and nav survive
  expect(consoleErrors.join("\n")).toContain("error in Body");
  await tab(page, "Home");
  await expect(page.getByText(MSG)).toHaveCount(0);
  await expect(page.getByText("My Mood")).toBeVisible();
});

test("a crashing overlay is contained too", async ({ page }) => {
  await page.addInitScript(() => { window.__lcCrash = "HelpPanel"; });
  await openApp(page);
  await expect(page.getByText(MSG)).toBeVisible();
  await expect(page.getByText("My Mood")).toBeVisible(); // Home still renders
});
