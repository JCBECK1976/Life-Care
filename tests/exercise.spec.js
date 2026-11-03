import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

test("My Exercise: Stop hides it under Stopped Exercises, no Log while stopped, Restart returns it", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  const logs = page.getByRole("button", { name: "📋 Log" });
  const before = await logs.count();
  expect(before).toBeGreaterThan(0);

  await page.getByRole("button", { name: "👁 Progress" }).first().click();
  await page.getByRole("button", { name: "⏸ Stop Exercise" }).click();
  await expect(logs).toHaveCount(before - 1);
  const stoppedToggle = page.getByRole("button", { name: /Stopped Exercises \(1\)/ });
  await expect(stoppedToggle).toBeVisible();

  await stoppedToggle.click();
  await expect(page.getByText("⏸ Stopped", { exact: true })).toBeVisible();
  await expect(logs).toHaveCount(before - 1); // Log isn't offered while stopped

  await page.getByRole("button", { name: "👁 Progress" }).last().click();
  await page.getByRole("button", { name: "▶ Restart Exercise" }).click();
  await expect(logs).toHaveCount(before);
  expect(errors).toEqual([]);
});
