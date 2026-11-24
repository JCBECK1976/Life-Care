import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// v2.45.0 (Architect night batch 23 Nov, PART 7): Help → How Lifecare works in collapsible sections (all closed), a
// 3-column table (column 3 stacks on phones), a search that filters the rows, no autofocus on phones; then the FAQ,
// then Ask the Companion.
const SECTIONS = ["Everywhere", "Eating", "Exercise", "Body & Health", "Your Companion", "Home", "Account & plans"];
const openHelp = async (page) => { await page.getByRole("button", { name: /help/i }).first().click(); await page.getByTestId("help-how").locator(":scope > summary").click(); };

test("sections in order, all closed; three columns; then the FAQ, then Ask the Companion", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });                                       // wide screen: three columns
  const { errors } = await openApp(page);
  await openHelp(page);
  const secs = page.getByTestId("hiw-section");
  expect(await secs.locator("summary").allTextContents()).toEqual(SECTIONS);
  for (let i = 0; i < SECTIONS.length; i++) await expect(secs.nth(i)).not.toHaveAttribute("open", "");
  expect(await page.getByTestId("help-scroll").evaluate((el) => [...el.children].map((c) => c.getAttribute("data-testid")))).toEqual(["help-how", "help-faq", "help-ask"]);
  await secs.nth(2).locator("summary").click();
  const ex = secs.nth(2);
  expect(await ex.locator("thead th").allTextContents()).toEqual(["Button / label", "What it does", "Where you'll see it"]);
  const names = await ex.getByTestId("hiw-name").allTextContents();
  for (const n of ["Status pills", "Progression", "Range / Form", "Skipped this session", "Set my next session"]) expect(names).toContain(n);
  await expect(ex.locator("tr", { hasText: "Status pills" })).toContainText("Ready to Progress");
  await expect(ex.locator("tr", { hasText: "Status pills" })).toContainText("Skipped");
  await expect(ex.locator("tr", { hasText: "Progression" }).first()).toContainText("Standard Progression");
  await expect(ex.locator("td.hiw-w").first()).toBeVisible();                                     // wide: column 3
  expect(errors).toEqual([]);
});

test("phone (360 px): column 3 stacks under the meaning; no autofocus (no keyboard)", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await openApp(page);
  await page.getByRole("button", { name: /help/i }).first().click();
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => document.activeElement && document.activeElement.tagName)).not.toMatch(/INPUT|TEXTAREA/);
  await page.getByTestId("help-how").locator(":scope > summary").click();
  await page.getByTestId("hiw-section").first().locator("summary").click();
  const row = page.getByTestId("hiw-item").first();
  await expect(row.locator("td.hiw-w")).toBeHidden();
  await expect(row.locator(".hiw-w2")).toBeVisible();
  await expect(row.locator(".hiw-w2")).toContainText("Where: ");
  await page.getByTestId("help-scroll").screenshot({ path: "test-results/v2450-shots/help-open-section-360.png" });
  await page.getByTestId("hiw-section").first().locator("summary").click();
  await page.getByTestId("help-scroll").screenshot({ path: "test-results/v2450-shots/help-closed-360.png" });
  await ctx.close();
});

test("search filters the rows and opens the sections that match", async ({ page }) => {
  await openApp(page);
  await openHelp(page);
  await page.locator("#hiw-search").fill("snap");
  const names = await page.getByTestId("hiw-name").allTextContents();
  expect(names).toContain("Snap");
  expect(names).not.toContain("Status pills");
  for (const s of await page.getByTestId("hiw-section").all()) await expect(s).toHaveAttribute("open", "");
  await page.locator("#hiw-search").fill("zzzz");
  await expect(page.getByTestId("hiw-none")).toContainText('No buttons match "zzzz"');
  await page.locator("#hiw-search").fill("");
  await expect(page.getByTestId("hiw-section")).toHaveCount(7);
});
