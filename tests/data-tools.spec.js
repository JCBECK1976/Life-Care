import { test, expect } from "@playwright/test";
import { openApp, person } from "./helpers.js";

const openSettings = (page) => page.locator("button").nth(1).click(); // the gear, next to Help

test("admin (JC): Settings → Open Data tools shows the Data Viewer; Back returns to Settings", async ({ page }) => {
  const { errors } = await openApp(page);
  await person(page, "JC");
  await openSettings(page);
  await expect(page.getByText("Data & backups", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open Data viewer" }).click();
  await expect(page.getByText("Firebase Data Viewer")).toBeVisible();
  await page.getByRole("button", { name: "← Back to Settings" }).click();
  await expect(page.getByRole("button", { name: "Open Data viewer" })).toBeVisible();
  await expect(page.getByText("Firebase Data Viewer")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("not admin (Becks): no Data tools button, and the viewer hides on switching person", async ({ page }) => {
  const { errors } = await openApp(page);
  await person(page, "JC");
  await openSettings(page);
  await page.getByRole("button", { name: "Open Data viewer" }).click();
  await expect(page.getByText("Firebase Data Viewer")).toBeVisible();
  await person(page, "Becks");
  await expect(page.getByText("Firebase Data Viewer")).toHaveCount(0);
  await openSettings(page);
  await expect(page.getByRole("button", { name: "Open Data viewer" })).toHaveCount(0);
  expect(errors).toEqual([]);
});
