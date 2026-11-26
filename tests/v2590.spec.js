import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { eatCategoryFor } from "../src/lib/eatShare.js";

// v2.59.0 (Architect brief 26 Nov, PART 4): Home's quick Snap. The top row = Companion Energy (narrower) + a white Snap
// tile as tall as it, shaped like the mood buttons; the gap = the gap between My Eating and My Exercises; outer edges
// aligned with the cards below. Snap opens the panel BELOW that row (Additional Information + details) → Take photo →
// the result there with "Add to:" (default by time), the person on a shared account, Confirm / Re-check / Cancel.
// Confirm = a NEW row in today's category + "Added to today's …" with Undo. Silver+ (Bronze sees the plan prompt).
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const LABEL = { b: "Breakfast", l: "Lunch", d: "Dinner", ds: "Desserts", dr: "Drinks", o: "Snacks" };
const TAB = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const box = (loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right }; });
async function snapPhoto(page) {
  await page.getByTestId("home-snap-tile").click();
  const panel = page.getByTestId("home-snap-panel");
  await panel.getByTestId("home-snap-file").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
  await expect(panel.getByTestId("home-snap-values")).toBeVisible();
  return panel;
}

for (const width of [360, 768]) test(`layout at ${width} px: Energy + Snap tile on one row, same height, the My Day gap, edges aligned`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const { errors } = await openApp(page);
  const tile = page.getByTestId("home-snap-tile"), energy = page.getByTestId("energy-box");
  await expect(tile).toHaveAccessibleName("Snap a photo of your food");
  await expect(tile).toContainText("Snap");
  const [e, t] = [await box(energy), await box(tile)];
  expect(Math.abs(e.h - t.h)).toBeLessThanOrEqual(1); expect(Math.abs(e.y - t.y)).toBeLessThanOrEqual(1);   // same row, same height
  if (!(await page.getByTestId("myday-eating").count())) await page.getByRole("button", { name: /My Day/ }).first().click();
  const eat = page.getByTestId("myday-eating").locator("xpath=.."), ex = eat.locator("xpath=following-sibling::*[1]");
  const [a, b] = [await box(eat), await box(ex)];
  expect(Math.round(t.x - e.r)).toBe(Math.round(b.x - a.r));                                         // the same gap
  const card = await box(eat.locator("xpath=ancestor::*[contains(@style,'border-radius: 12px')][1]"));
  expect(Math.abs(e.x - card.x)).toBeLessThanOrEqual(1); expect(Math.abs(t.r - card.r)).toBeLessThanOrEqual(1);   // outer edges
  const mood = await box(page.getByRole("button", { name: /^Mood: / }).first());
  if (width === 360) expect(Math.abs(t.w / t.h - mood.w / mood.h) / (mood.w / mood.h)).toBeLessThan(0.35);   // mood-button proportions on a phone (they stretch on wide screens)
  expect(t.h).toBeGreaterThan(mood.h);                                                                // larger
  if (width === 360) await page.screenshot({ path: "test-results/v2590-shots/home-snap-tile-360.png" });
  expect(errors).toEqual([]);
});

test("Snap → panel below the row (tip + details, focused) → result with 'Add to:' (by time) → Lunch → Confirm → a new lunch row + Undo", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  const { errors } = await openApp(page);
  await page.getByTestId("home-snap-tile").click();
  const panel = page.getByTestId("home-snap-panel");
  await expect(panel).toBeFocused();
  expect((await box(panel)).y).toBeGreaterThan((await box(page.getByTestId("home-snap-tile"))).y);
  await expect(panel.getByTestId("home-snap-hint")).toContainText("Additional Information – for improved accuracy");
  await expect(panel.getByTestId("home-snap-hint").getByLabel("Photo description")).toHaveCSS("border-top-color", "rgb(245, 158, 11)");
  await panel.getByTestId("home-snap-file").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
  await expect(panel.getByTestId("home-snap-values")).toBeVisible();
  await expect(panel.getByTestId("home-snap-recheck-hint")).toContainText("Re-check – for improved accuracy");
  await expect(panel.getByRole("radio", { checked: true })).toHaveText(LABEL[eatCategoryFor(new Date())]);   // default by time of day
  for (const l of Object.values(LABEL)) await expect(panel.getByRole("radio", { name: l, exact: true })).toBeVisible();
  for (const b of ["Confirm", "↻ Re-check", "Cancel"]) await expect(panel.getByRole("button", { name: b, exact: true })).toBeVisible();
  await expect(panel.getByTestId("home-snap-person")).toBeVisible();                                   // the joint account: the person
  await panel.getByRole("radio", { name: "Lunch", exact: true }).click();
  await panel.scrollIntoViewIfNeeded(); await page.screenshot({ path: "test-results/v2590-shots/home-snap-result-360.png" });
  const name = (await panel.locator("b").first().innerText()).replace(/^📷 /, "");
  await panel.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByTestId("home-snap-panel")).toHaveCount(0);
  await expect(page.getByTestId("home-snap-toast")).toContainText("Added to today's lunch");
  await tab(page, "My Eating"); await page.getByRole("button", { name: new RegExp("^" + TAB[new Date().getDay()] + "( \\d+)?$") }).first().click();
  await expect(page.getByTestId("picker-trigger").filter({ hasText: name })).toHaveCount(1);
  await expect(page.getByTestId("picker-trigger").filter({ hasText: /Add lunch…/ })).toHaveCount(1);     // Part 3: the trailing blank row
  // Undo (on Home, where the message shows): a second snap to Breakfast, then Undo → only the lunch row is left
  await tab(page, "Home");
  const p2 = await snapPhoto(page);
  await p2.getByRole("radio", { name: "Breakfast", exact: true }).click();
  await p2.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByTestId("home-snap-toast")).toContainText("Added to today's breakfast");
  await page.getByTestId("home-snap-toast").getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("home-snap-toast")).toHaveCount(0);
  await tab(page, "My Eating");
  await expect(page.getByTestId("picker-trigger").filter({ hasText: name })).toHaveCount(1);         // the lunch row only
  expect(errors).toEqual([]);
});

test("Cancel and Esc close with nothing saved; Re-check runs the deep dive", async ({ page }) => {
  const { aiCalls } = await openApp(page);
  let panel = await snapPhoto(page);
  const n = aiCalls.length;
  await panel.getByRole("button", { name: "↻ Re-check", exact: true }).click();
  await expect(panel).toContainText("Re-check deep dive");
  expect(aiCalls.length).toBe(n + 1);
  await panel.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByTestId("home-snap-panel")).toHaveCount(0);
  await expect(page.getByTestId("home-snap-toast")).toHaveCount(0);
  await page.getByTestId("home-snap-tile").click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("home-snap-panel")).toHaveCount(0);
  await expect(page.getByTestId("home-snap-tile")).toBeFocused();
});

test("joint account: Confirm for Becks adds the row to Becks' today", async ({ page }) => {
  await openApp(page);
  const panel = await snapPhoto(page);
  await panel.getByTestId("home-snap-person-tabs").getByRole("button", { name: "Becks", exact: true }).click();
  await panel.getByRole("radio", { name: "Snacks", exact: true }).click();
  const name = (await panel.locator("b").first().innerText()).replace(/^📷 /, "");
  await panel.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByTestId("home-snap-toast")).toContainText("Added to today's snacks for Becks");
  await page.getByRole("button", { name: "Becks", exact: true }).first().click();
  await tab(page, "My Eating"); await page.getByRole("button", { name: new RegExp("^" + TAB[new Date().getDay()] + "( \\d+)?$") }).first().click();
  await expect(page.getByTestId("picker-trigger").filter({ hasText: name })).toHaveCount(1);
});

test("Bronze: the tile shows the plan prompt, no panel, nothing sent", async ({ page }) => {
  await fetch("http://127.0.0.1:9000/apps/lifecare.json?ns=life-care-app-64d04-default-rtdb", { method: "PUT", headers: { Authorization: "Bearer owner" }, body: "null" });
  await page.addInitScript(() => { localStorage.setItem("lc_flags", JSON.stringify({ useTiers: true })); localStorage.removeItem("lc_plan_preview"); });
  const { aiCalls } = await openApp(page, "member");
  await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  const n = aiCalls.length;
  await page.getByTestId("home-snap-tile").click();
  await expect(page.getByTestId("plan-gate-snap")).toBeVisible();
  await expect(page.getByTestId("home-snap-panel")).toHaveCount(0);
  expect(aiCalls.length).toBe(n);
});
