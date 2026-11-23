import { test, expect } from "@playwright/test";
import { makeFixture } from "../scripts/make-fixture.mjs";
import { collectErrors, gotoSignedIn, tab, mockAnthropic } from "./helpers.js";

// PART 0 (Architect, 23 Nov) — VISUAL FREEZE vs BETA v2.20.2. Existing screens must look like beta unless JC or the
// Architect asked for the change, or it fixes a named WCAG failure (see CLAUDE.md). 360 px screenshots of the main
// screens on FIXED synthetic data at a FIXED date are compared with the baselines in tests/visual-baseline/, which were
// taken from beta v2.20.2. A baseline changes ONLY with an approval note in HANDOVER.md.
// Re-make the baselines from a beta checkout:  VISUAL_BASE=http://127.0.0.1:5180/Life-Care/ npx playwright test --project visual --update-snapshots
const NOW = new Date(2026, 10, 18, 10, 0, 0);   // Wed 18 Nov 2026, 10:00
const SEED = "http://127.0.0.1:9000/data.json?ns=life-care-app-64d04-default-rtdb";
if (process.env.VISUAL_BASE) test.use({ baseURL: process.env.VISUAL_BASE });
test.use({ viewport: { width: 360, height: 780 } });

async function open(page) {
  const r = await fetch(SEED, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(makeFixture(NOW)) });
  expect(r.ok).toBe(true);
  const errors = collectErrors(page);
  await mockAnthropic(page);
  await page.route(/\/plan\.json(\?|$)/, (r) => r.fulfill({ status: 404, body: "" }));
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"products":[]}' }));
  await page.clock.setFixedTime(NOW);
  await gotoSignedIn(page);
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1200);
  return errors;
}
async function snap(page, name) {
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.evaluate(async () => { await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
  await expect.soft(page).toHaveScreenshot(name + ".png", {
    fullPage: true, animations: "disabled", caret: "hide",
    mask: [page.getByText(/^v2\.\d+\.\d+/)],   // the footer version differs by design
    threshold: 0.2, maxDiffPixelRatio: 0.01,   // "a small threshold": ≤ 1% of pixels may differ (anti-aliasing, fonts)
  });
}

// Part 0 ships the test before Part 1 restores the beta sizes; until then build is EXPECTED to differ (test.fail).
const PART1_DONE = false;
test.fail(!PART1_DONE && !process.env.VISUAL_BASE, "build still has the 44 px buttons; Part 1 restores the beta sizes and sets PART1_DONE");

test("360 px: Home, My Body, My Exercise (a session), My Eating (day + Update Lists), My Shop, My Health, Settings match beta v2.20.2", async ({ page }) => {
  test.setTimeout(120000);
  await open(page);
  await snap(page, "home");
  await tab(page, "My Body"); await page.waitForTimeout(400); await snap(page, "my-body");
  await tab(page, "My Exercise"); await page.getByRole("button", { name: "Sun", exact: true }).click(); await page.waitForTimeout(400); await snap(page, "my-exercise-session");
  await tab(page, "My Eating"); await page.waitForTimeout(400); await snap(page, "my-eating-day");
  await page.getByRole("button", { name: "Update Eating Lists" }).click(); await page.waitForTimeout(600); await snap(page, "my-eating-update-lists");
  await page.keyboard.press("Escape").catch(() => {});
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 }); await page.waitForTimeout(800);
  await tab(page, "My Shop"); await page.waitForTimeout(400); await snap(page, "my-shop");
  await tab(page, "My Health"); await page.waitForTimeout(400); await snap(page, "my-health");
  await page.getByRole("button", { name: /Settings/ }).first().click(); await page.waitForTimeout(600); await snap(page, "settings");
});
