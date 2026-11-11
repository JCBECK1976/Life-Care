import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.13.3: one outlined shape for Open / 📷 Snap / 👁 Progress / 📋 Log (shared styles), each in its own colour
// family; an open panel's button stays filled. Checked at 360px: no button text is cut off.
const BLUE = "rgb(37, 99, 235)", VIOLET = "rgb(109, 40, 217)", GREEN = "rgb(21, 128, 61)", NAVY = "rgb(30, 58, 95)";
async function shape(loc) { return loc.evaluate((b) => { const s = getComputedStyle(b); return [s.borderTopWidth, s.borderTopStyle, s.borderTopLeftRadius, s.paddingTop, s.paddingLeft, s.fontWeight, s.fontSize].join(" "); }); }
async function notTruncated(loc) { expect(await loc.evaluate((b) => b.scrollWidth <= b.clientWidth + 1)).toBe(true); }

test("shared outlined buttons: same shape, own colours, filled when open, not truncated at 360px", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.setViewportSize({ width: 360, height: 760 });
  const shapes = new Set();
  const check = async (loc, color) => { await expect(loc).toHaveCSS("color", color); await notTruncated(loc); shapes.add(await shape(loc)); };
  // My Exercise: 👁 Progress (violet) + 📋 Log (green); open = filled navy "✕ Progress"
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await check(page.getByRole("button", { name: "👁 Progress" }).first(), VIOLET);
  await check(page.getByRole("button", { name: "📋 Log", exact: true }).first(), GREEN);
  await page.getByRole("button", { name: "👁 Progress" }).first().click();
  await expect(page.getByRole("button", { name: "✕ Progress" })).toHaveCSS("background-color", NAVY);
  await check(page.getByRole("button", { name: /^Open week/ }).first(), BLUE);
  // My Eating: 📷 Snap (= Open) + Open + 👁 Progress
  await tab(page, "My Eating");
  await check(page.getByRole("button", { name: "Snap a photo of your food" }).first(), BLUE);
  await check(page.getByRole("button", { name: "Add to this meal" }).first(), BLUE);
  await check(page.getByRole("button", { name: "👁 Progress" }).first(), VIOLET);
  await page.getByRole("button", { name: "👁 Progress" }).first().click();
  await expect(page.getByRole("button", { name: "✕ Progress" }).first()).toHaveCSS("background-color", NAVY);
  // My Body: card 👁 Progress, Measurements 👁 Progress + 📋 Log, 📷 Snap
  await tab(page, "My Body");
  await check(page.getByTitle("View Weight detail"), VIOLET);
  const covered = await page.evaluate(() => [...document.querySelectorAll('button[title^="View "]')].flatMap((b) => { const r = b.getBoundingClientRect();   // card button never covers card text
    return [...b.parentElement.querySelectorAll("div,span")].filter((e) => !b.contains(e) && !e.children.length && e.textContent.trim()).filter((e) => { const rg = document.createRange(); rg.selectNodeContents(e); const t = rg.getBoundingClientRect(); return t.right > r.left && t.left < r.right && t.bottom > r.top && t.top < r.bottom; }).map((e) => b.title + ": " + e.textContent.trim()); }));
  expect(covered).toEqual([]);
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
  await check(page.getByRole("button", { name: "👁 Progress" }).first(), VIOLET);
  await check(page.getByRole("button", { name: "📋 Log", exact: true }).first(), GREEN);
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "✕ Log" })).toHaveCSS("background-color", NAVY);
  await check(page.getByTestId("meas-snap"), BLUE);
  expect([...shapes]).toHaveLength(1);                                                  // one shared shape
  expect(errors).toEqual([]);
});

test("v2.13.4: Weigh In stat cards — every 👁 Progress button in a row lines up (360px and 412px)", async ({ page }) => {
  const { errors } = await openApp(page);
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 900 });
    await tab(page, "My Body");
    const boxes = await page.locator('button[title^="View "]').evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); const c = b.parentElement.getBoundingClientRect(); return { top: Math.round(c.top), cardBottom: Math.round(c.bottom), bottom: Math.round(r.bottom) }; }));
    expect(boxes.length).toBeGreaterThan(4);
    for (let i = 0; i + 1 < boxes.length; i += 2) {                                    // two cards per row
      expect(boxes[i].top).toBe(boxes[i + 1].top);
      expect(boxes[i].cardBottom).toBe(boxes[i + 1].cardBottom);                          // equal height
      expect(boxes[i].bottom).toBe(boxes[i + 1].bottom);                                  // buttons aligned
      expect(boxes[i].cardBottom - boxes[i].bottom).toBeLessThan(16);                     // pinned to the bottom
    }
  }
  expect(errors).toEqual([]);
});
