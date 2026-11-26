import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.57.0 (Architect brief 26 Nov, PART 1): Edit Item from a filled row's picker opens the meal's form INSIDE the picker
// (where the portions confirm and the Snap result appear), already editing; Cancel / Save → back to the same picker list
// with the item kept (or updated); Remove → the row is emptied and the picker stays open on it to choose again.
const trig = (page, i) => page.getByTestId("picker-trigger").nth(i);
const sheet = (page) => page.getByTestId("picker-sheet");
async function pick(page, i, name) {
  await trig(page, i).click();
  await sheet(page).getByRole("option", { name: new RegExp("^" + name) }).dispatchEvent("mousedown");
  await page.getByTestId("pick-confirm").click();
  await expect(sheet(page)).toHaveCount(0);
}
async function editFromPicker(page) {
  await trig(page, 0).click();
  await page.getByTestId("act-edit").click();
  const f = sheet(page).getByTestId("picker-edit").getByTestId("slot-open-form");
  await expect(f).toBeVisible();
  await expect(f.getByTestId("open-form-mode")).toHaveText(/edit/i);                                 // already editing
  return f;
}

test("Edit Item: the form opens inside the picker, already editing; Cancel → the same picker list, item kept", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await tab(page, "My Eating"); await page.getByRole("button", { name: /^Sun( \d+)?$/ }).first().click();
  await pick(page, 0, "Greek Yoghurt Pot");
  const f = await editFromPicker(page);
  await expect(page.getByTestId("picker-actions")).toBeVisible();                                    // still the picker window
  await expect(page.getByLabel("Portion factor")).toBeVisible();
  await page.screenshot({ path: "test-results/v2570-shots/inline-edit-360.png" });
  await f.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(sheet(page).getByTestId("picker-results")).toBeVisible();
  await expect(sheet(page).getByTestId("picker-edit")).toHaveCount(0);
  await sheet(page).getByRole("button", { name: "Close the list" }).click();
  await expect(trig(page, 0)).toContainText("Greek Yoghurt Pot");
  await expect(page.getByTestId("slot-open-form")).toHaveCount(0);                                    // no form left below the rows
  expect(errors).toEqual([]);
});

test("Edit Item → Save (portion ×2) → back to the picker list; the row keeps the item with the new portion", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Eating"); await page.getByRole("button", { name: /^Sun( \d+)?$/ }).first().click();
  await pick(page, 0, "Greek Yoghurt Pot");
  const before = await page.getByTestId("day-summary").getByTestId("sum-day").innerText();
  const f = await editFromPicker(page);
  await f.getByRole("button", { name: "2×", exact: true }).click();
  await f.getByRole("button", { name: "Save", exact: true }).click();
  await expect(sheet(page).getByTestId("picker-results")).toBeVisible();
  await expect(page.getByTestId("pick-toast")).toContainText("Saved for this meal only");
  await sheet(page).getByRole("button", { name: "Close the list" }).click();
  await expect(trig(page, 0)).toContainText("Greek Yoghurt Pot");
  await expect(page.getByTestId("day-summary").getByTestId("sum-day")).not.toHaveText(before);       // the portion changed the day
  expect(errors).toEqual([]);
});

test("Edit Item → Remove: the row is emptied and the picker stays open on that row to choose again", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  await tab(page, "My Eating"); await page.getByRole("button", { name: /^Sun( \d+)?$/ }).first().click();
  await pick(page, 0, "Greek Yoghurt Pot");
  const f = await editFromPicker(page);
  await f.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(sheet(page).getByTestId("picker-results")).toBeVisible();                              // same picker, list again
  await expect(sheet(page)).toContainText("Add breakfast");                                           // that row, now empty
  await sheet(page).getByRole("option", { name: /^Wholemeal Toast/ }).dispatchEvent("mousedown");     // choose something else
  await page.getByTestId("pick-confirm").click();
  await expect(trig(page, 0)).toContainText("Wholemeal Toast");
  expect(errors).toEqual([]);
});
