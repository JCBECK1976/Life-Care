import { test, expect } from "@playwright/test";
import { openApp, tab, targetSize258 } from "./helpers.js";

// v2.36.0 (Architect brief 23 Nov, PART 1): the 44 px touch minimum (WCAG 2.5.5, AAA) is gone — sizes are back to beta
// v2.20.2. What we must meet is WCAG 2.2 AA 2.5.8 Target Size (Minimum): a target is at least 24 × 24 px, OR a 24 px
// circle centred on it touches no other target (and no other small target's circle). Checked on a phone (touch) at 360 px.

test("phone, 360 px: no 44 px minimum any more (beta sizes); every target meets WCAG 2.5.8 (24 px or spacing) on the main screens", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const { errors } = await openApp(page);
  const out = {};
  for (const s of ["Home", "My Body", "My Exercise", "My Eating", "My Shop", "My Health"]) { await tab(page, s); await page.waitForTimeout(300); out[s] = await targetSize258(page); }
  expect(out).toEqual({ Home: [], "My Body": [], "My Exercise": [], "My Eating": [], "My Shop": [], "My Health": [] });
  expect(await page.evaluate(() => getComputedStyle(document.querySelector("button")).minHeight)).not.toBe("44px");
  expect(errors).toEqual([]);
  await ctx.close();
});
