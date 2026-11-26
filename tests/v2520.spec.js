import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.52.0 (Architect night batch 25 Nov, PART 1): Snap from the picker stays in the picker — the photo, the result with the
// notes box and Confirm / Re-check / Cancel appear where the portions confirm does; Cancel goes back to the same list;
// v2.56.2: the yellow "Additional Information" tip is on the FIRST step (above the details box and Take photo); the result shows
// only the "Re-check" tip.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const day = async (page) => { await tab(page, "My Eating"); await page.getByRole("button", { name: /^Sun( \d+)?$/ }).first().click(); };
const ADD = "Additional Information – for improved accuracy, you may provide any known weight, calories or portion sizes to help your companion analysis";
const RE = "Re-check – for improved accuracy, you may provide any known weight, calories or portion sizes to help your companion analysis";

async function snapInPicker(page) {
  await page.getByTestId("picker-trigger").first().click();
  await page.getByTestId("act-snap").click();
  const sheet = page.getByTestId("picker-sheet"), box = sheet.getByTestId("picker-snap");
  await expect(box.getByTestId("snap-pre")).toBeVisible();                                            // still in the picker
  const hint = box.getByTestId("snap-pre-hint"), take = box.locator("label", { hasText: "📷 Take photo" });
  await expect(hint).toContainText(ADD);                                                              // v2.56.2: the tip on the first step
  await expect(hint).toHaveCSS("border-top-color", "rgb(245, 158, 11)");
  await expect(hint.getByRole("textbox", { name: "Photo description" })).toHaveCSS("border-top-color", "rgb(245, 158, 11)");   // the details box, yellow
  const [hb, tb] = [await hint.boundingBox(), await take.boundingBox()]; expect(hb.y + hb.height).toBeLessThanOrEqual(tb.y + 1);   // above Take photo
  await box.getByTestId("snap-pre").screenshot({ path: "test-results/v2562-shots/snap-first-step-360.png" });
  await box.locator("label", { hasText: "📷 Take photo" }).locator("input[type=file]").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
  await expect(box.getByTestId("snap-values")).toBeVisible();
  return { sheet, box };
}

test("Snap from the picker: the result, the tip and Confirm / Re-check / Cancel are inside the picker; Cancel goes back to the same list, nothing changed", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await day(page);
  const { sheet, box } = await snapInPicker(page);
  await expect(box.getByTestId("snap-recheck-hint")).toContainText(RE);                               // v2.56.2: only the Re-check tip on the result
  await expect(box.getByTestId("snap-recheck-hint")).not.toContainText("Additional Information");
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
