import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.50.0 (Architect night batch 24 Nov, PART 2): eating rows = ONE wide box (✎ / +); the picker's sticky action bar
// (Snap · Favourites · Add New · Edit Item · Remove); confirm with a quantity; one automatic blank row; Remove on any row;
// ♥ Favourites per person; Set Defaults the same.
const day = async (page, d = "Sun") => { await tab(page, "My Eating"); await page.getByRole("button", { name: d, exact: true }).click(); };
const rows = (page, cat) => page.getByTestId("picker-trigger").filter({ hasText: new RegExp("Add " + cat + "|.") });
const trig = (page, i) => page.getByTestId("picker-trigger").nth(i);
const sheet = (page) => page.getByTestId("picker-sheet");
async function pick(page, i, name, qty) {
  await trig(page, i).click();
  await sheet(page).getByRole("option", { name: new RegExp("^" + name) }).dispatchEvent("mousedown");
  const f = page.getByTestId("pick-confirm-form");
  await expect(f).toContainText(name);
  if (qty) await f.locator("#pick-qty").fill(String(qty));
  await page.getByTestId("pick-confirm").click();
  await expect(sheet(page)).toHaveCount(0);
}
const header = (page) => page.getByTestId("day-summary").getByTestId("sum-day");   // v2.54.0: the day's calories are in the Summary

test("rows: one aligned box each, '+' when empty / '✎' when filled, 'Add breakfast…'; no Snap/Open/✕/✓/Del/+ Add New beside them", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await day(page);
  await expect(trig(page, 0)).toContainText("Add breakfast…");
  await expect(trig(page, 0).getByTestId("row-icon")).toHaveText("+");
  for (const n of ["Snap a photo of your food", "Open this meal", "Add to this meal", "Remove this empty row", "🗑 Del", "+ Add New"]) await expect(page.getByRole("button", { name: n, exact: true })).toHaveCount(0);
  const boxes = await page.getByTestId("picker-trigger").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.width)]; }));
  expect(new Set(boxes.map((b) => b.join(","))).size).toBe(1);                                      // one column, same width
  await page.screenshot({ path: "test-results/v2500-shots/day-rows-360.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("picker action bar on an EMPTY row: Snap, Favourites, Add New, Edit Item (greyed), Remove (closes, no change)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openApp(page);
  await day(page);
  await trig(page, 0).click();
  const bar = page.getByTestId("picker-actions");
  expect(await bar.getByRole("button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).toEqual(["Snap", "Favourites", "Add New", "Edit Item", "Remove"]);
  await expect(bar.getByTestId("act-edit")).toBeDisabled();
  const h = await sheet(page).getByTestId("picker-row").first().boundingBox(); expect(h.height).toBeGreaterThanOrEqual(43); expect(h.height).toBeLessThan(50);   // ~44 px rows
  await page.screenshot({ path: "test-results/v2500-shots/picker-empty-360.png" });
  await bar.getByTestId("act-remove").click();
  await expect(sheet(page)).toHaveCount(0);
  await expect(trig(page, 0)).toContainText("Add breakfast…");
  await trig(page, 0).click(); await page.getByTestId("act-snap").click();                          // Snap: this row's Snap
  await expect(page.getByTestId("snap-pre")).toBeVisible();
  await page.reload(); await day(page);
  await trig(page, 0).click(); await page.getByTestId("act-add").click();                           // Add New: the "not in my list" flow
  await expect(page.locator("#update-lists").or(page.getByText("Update Eating Lists")).first()).toBeVisible();
});

test("pick → confirm (3 portions) fills the row; ONE blank row follows; picking on a filled row REPLACES it; Edit Item opens its form", async ({ page }) => {
  const { errors } = await openApp(page);
  await day(page);
  await pick(page, 0, "Greek Yoghurt Pot", 3);
  await expect(trig(page, 0)).toContainText("Greek Yoghurt Pot");
  await expect(trig(page, 0).getByTestId("row-icon")).toHaveText("✎");
  await expect(trig(page, 1)).toContainText("Add breakfast…");                                     // the automatic blank row
  await expect(header(page)).toHaveText("Day Calories: 540");                                        // 3 × 180
  await pick(page, 1, "Wholemeal Toast");
  await expect(trig(page, 2)).toContainText("Add breakfast…");
  await expect(trig(page, 3)).toContainText("Add lunch…");                                          // never more than one blank
  await pick(page, 0, "Bacon Roll");                                                                // replace
  await expect(trig(page, 0)).toContainText("Bacon Roll");
  await expect(trig(page, 3)).toContainText("Add lunch…");                                          // no extra row
  await trig(page, 0).click();
  await expect(page.getByTestId("act-edit")).toBeEnabled();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: "test-results/v2500-shots/picker-filled-360.png" });
  await page.getByTestId("act-edit").click();
  await expect(page.getByTestId("slot-open-form")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Remove: a filled first row goes and the row below moves up; the only row clears back to 'Add …'", async ({ page }) => {
  const { errors } = await openApp(page);
  await day(page);
  await pick(page, 0, "Greek Yoghurt Pot");
  await pick(page, 1, "Wholemeal Toast");
  await trig(page, 0).click(); await page.getByTestId("act-remove").click();
  await expect(trig(page, 0)).toContainText("Wholemeal Toast");
  await expect(trig(page, 1)).toContainText("Add breakfast…");
  await trig(page, 0).click(); await page.getByTestId("act-remove").click();
  await expect(trig(page, 0)).toContainText("Add breakfast…");
  await expect(trig(page, 1)).toContainText("Add lunch…");
  expect(errors).toEqual([]);
});

test("♥ Favourite: ticked in Open → Edit, a red ♥ in the picker, the Favourites filter; per person", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByRole("button", { name: "Open Greek Yoghurt Pot" }).first().click();
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await page.getByTestId("edit-fav").locator("input").check();
  await page.getByRole("button", { name: "✕ Close" }).first().click().catch(() => {});
  await day(page);
  await trig(page, 0).click();
  await expect(sheet(page).getByRole("option", { name: /Greek Yoghurt Pot/ }).getByTestId("fav-heart")).toBeVisible();
  await page.getByTestId("act-fav").click();
  await expect(page.getByTestId("act-fav")).toHaveAttribute("aria-pressed", "true");
  expect(await sheet(page).getByTestId("picker-row").allInnerTexts()).toEqual([expect.stringContaining("Greek Yoghurt Pot")]);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: "test-results/v2500-shots/favourites-filter-360.png" });
  await page.getByTestId("act-fav").click();                                                        // everything again
  expect(await sheet(page).getByTestId("picker-row").count()).toBeGreaterThan(1);
  await sheet(page).getByRole("button", { name: "Close the list" }).click();
  await page.getByRole("button", { name: "Becks", exact: true }).first().click();                   // per person
  await day(page);
  await trig(page, 0).click();
  await expect(sheet(page).getByTestId("fav-heart")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Week → Set Defaults: the same rows and picker (no Snap), no Del / + Add New; Individual/All kept; Remove; confirm form", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Week", exact: true }).first().click();
  const sd = page.getByText("Set Defaults", { exact: true }).locator("xpath=..");
  await expect(sd.getByRole("button", { name: "🗑 Del" })).toHaveCount(0);
  await expect(sd.getByRole("button", { name: "+ Add New" })).toHaveCount(0);
  await expect(sd.getByRole("button", { name: "Individual" }).first()).toBeVisible();
  const t = sd.getByTestId("picker-trigger").first();
  await t.click();
  await expect(page.getByTestId("act-snap")).toHaveCount(0);
  await sheet(page).getByRole("option", { name: /^Greek Yoghurt Pot/ }).dispatchEvent("mousedown");
  await expect(page.getByTestId("pick-confirm-form")).toContainText("Greek Yoghurt Pot");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: "test-results/v2500-shots/confirm-form-360.png" });
  await page.getByTestId("pick-confirm").click();
  await expect(t).toContainText("Greek Yoghurt Pot");
  await expect(sd.getByTestId("picker-trigger").nth(1)).toContainText("Add breakfast…");
  await sd.scrollIntoViewIfNeeded();
  await sd.screenshot({ path: "test-results/v2500-shots/set-defaults-360.png" });
  await t.click(); await page.getByTestId("act-remove").click();
  await expect(t).toContainText("Add breakfast…");
  expect(errors).toEqual([]);
});

test("Help: the eating row, the picker action bar, ♥ Favourite and Confirm (portions) are explained", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: /help/i }).first().click();
  await page.getByTestId("help-how").locator(":scope > summary").click();
  for (const [q, name] of [["picker action", "Picker action bar"], ["favourite", "♥ Favourite"], ["portions", "Confirm (portions)"], ["eating row", "Eating row (✎ / +)"]]) {
    await page.locator("#hiw-search").fill(q);
    await expect(page.getByTestId("hiw-name").filter({ hasText: name })).toHaveCount(1);
  }
});
