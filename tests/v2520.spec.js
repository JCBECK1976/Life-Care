import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.52.0 (Architect night batch 25 Nov, PART 1): Snap from the picker stays in the picker — the photo, the result with the
// notes box and Confirm / Re-check / Cancel appear where the portions confirm does; Cancel goes back to the same list;
// the yellow tip says "Additional Information" on the first result and "Re-check" after a re-check.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const day = async (page) => { await tab(page, "My Eating"); await page.getByRole("button", { name: /^Sun( \d+)?$/ }).first().click(); };
const ADD = "Additional Information – for improved accuracy, you may provide any known weight, calories or portion sizes to help your companion analysis";
const RE = "Re-check – for improved accuracy, you may provide any known weight, calories or portion sizes to help your companion analysis";

async function snapInPicker(page) {
  await page.getByTestId("picker-trigger").first().click();
  await page.getByTestId("act-snap").click();
  const sheet = page.getByTestId("picker-sheet"), box = sheet.getByTestId("picker-snap");
  await expect(box.getByTestId("snap-pre")).toBeVisible();                                            // still in the picker
  await box.locator("label", { hasText: "📷 Take photo" }).locator("input[type=file]").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
  await expect(box.getByTestId("snap-values")).toBeVisible();
  return { sheet, box };
}

test("Snap from the picker: the result, the tip and Confirm / Re-check / Cancel are inside the picker; Cancel goes back to the same list, nothing changed", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await day(page);
  const { sheet, box } = await snapInPicker(page);
  await expect(box.getByTestId("snap-recheck-hint")).toContainText(ADD);
  for (const b of ["Confirm", "↻ Re-check", "Cancel"]) await expect(box.getByRole("button", { name: b, exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/v2520-shots/snap-result-in-picker-360.png" });
  await box.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(sheet.getByTestId("picker-results")).toBeVisible();                                    // back to the same picker list
  await expect(sheet.getByTestId("picker-actions")).toBeVisible();
  await sheet.getByRole("button", { name: "Close the list" }).click();
  await expect(page.getByTestId("picker-trigger").first()).toContainText("Add breakfast…");           // nothing changed
  expect(errors).toEqual([]);
});

test("Re-check shows the 'Re-check' tip; Confirm saves and closes the picker", async ({ page }) => {
  const { errors } = await openApp(page);
  await day(page);
  const { sheet, box } = await snapInPicker(page);
  await box.getByRole("button", { name: "↻ Re-check", exact: true }).click();
  await expect(box.getByTestId("snap-recheck-hint")).toContainText(RE);
  await box.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByTestId("picker-trigger").first()).not.toContainText("Add breakfast…");
  expect(errors).toEqual([]);
});
