import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.60.1 (JC, 26 Nov): a filled row's picker opens with the SELECTED item at the top of the list (highlighted), on day
// rows and Week → Set Defaults; Home Snap's Close uses the standard Close style (the picker's "✕ Close").
const sheet = (page) => page.getByTestId("picker-sheet");
async function pickAndReopen(page, trig, name) {
  await trig.click();
  await sheet(page).getByRole("option", { name: new RegExp("^" + name) }).dispatchEvent("mousedown");
  await page.getByTestId("pick-confirm").click();
  await expect(sheet(page)).toHaveCount(0);
  await trig.click();
  const box = sheet(page).getByTestId("picker-results"), sel = box.locator('[aria-selected="true"]');
  await expect(sel).toContainText(name);
  await expect.poll(async () => { const [b, s] = [await box.boundingBox(), await sel.boundingBox()]; return Math.abs(s.y - b.y); }).toBeLessThanOrEqual(2);   // at the top
  expect(await box.getByTestId("picker-row").first().getAttribute("aria-selected")).toBe("true");     // first in the list
  await expect(sel).toHaveCSS("border-left-color", "rgb(37, 99, 235)");                               // highlighted
}

test("day row: the selected item is at the top of the reopened list", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await tab(page, "My Eating"); await page.getByRole("button", { name: /^Sun( \d+)?$/ }).first().click();
  await pickAndReopen(page, page.getByTestId("picker-trigger").first(), "Wholemeal Toast");
  await page.screenshot({ path: "test-results/v2601-shots/picker-selected-top-360.png" });
  expect(errors).toEqual([]);
});

test("Week → Set Defaults: the selected item is at the top of the reopened list", async ({ page }) => {
  await openApp(page);
  await tab(page, "My Eating"); await page.getByRole("button", { name: "Week", exact: true }).first().click();
  const sd = page.getByText("Set Defaults", { exact: true }).locator("xpath=..");
  await pickAndReopen(page, sd.getByTestId("picker-trigger").first(), "Wholemeal Toast");
});

test("Home Snap: Close looks like the standard Close (the picker's ✕ Close)", async ({ page }) => {
  await openApp(page);
  const css = (loc) => loc.evaluate((e) => { const s = getComputedStyle(e); return [s.borderTopColor, s.color, s.backgroundColor, s.fontSize, s.fontWeight, s.borderRadius, s.minHeight].join("|"); });
  await page.getByTestId("home-snap-tile").click();
  const snap = await css(page.getByTestId("home-snap-close"));
  await expect(page.getByTestId("home-snap-close")).toHaveText("✕ Close");
  await page.getByTestId("home-snap-close").click();
  await tab(page, "My Eating"); await page.getByRole("button", { name: /^Sun( \d+)?$/ }).first().click();
  await page.getByTestId("picker-trigger").first().click();
  expect(snap).toBe(await css(sheet(page).getByRole("button", { name: "Close the list" })));
});
