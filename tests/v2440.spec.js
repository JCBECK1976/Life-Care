import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { eatCategoryFor, EAT_CATEGORIES } from "../src/lib/eatShare.js";

// v2.44.0 (Architect night batch 23 Nov, PART 6): a) the Snap re-check hint on the note box; b) a shared photo →
// "Add to today's eating" (category by time of day, person) → My Eating today, a NEW row, the normal Snap flow (Silver+).
const BASE = "/Life-Care/";
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

async function shareImage(page) {
  await page.evaluate(async (base) => { await navigator.serviceWorker.register(base + "sw.js", { scope: base }); await navigator.serviceWorker.ready; }, BASE);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.evaluate(async ([base, b64]) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const fd = new FormData(); fd.append("images", new File([bytes], "meal.png", { type: "image/png" }));
    await fetch(base + "share-target", { method: "POST", body: fd });
  }, [BASE, PNG_B64]);
}

test("category by time of day; the six categories", () => {
  const at = (h, m) => eatCategoryFor(new Date(2026, 10, 24, h, m));
  expect([at(7, 0), at(10, 29), at(10, 30), at(14, 29), at(15, 0), at(17, 0), at(21, 29), at(22, 0), at(2, 0)]).toEqual(["b", "b", "l", "l", "o", "d", "d", "o", "b"]);
  expect(EAT_CATEGORIES.map((c) => c[1])).toEqual(["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Drink"]);
});

test("share → Add to today's eating → My Eating today, a new row in that category, the normal Snap result with the re-check hint", async ({ page }) => {
  const { errors, aiCalls } = await openApp(page);
  await shareImage(page);
  await page.goto("./?share=1");
  const picker = page.getByTestId("share-picker");
  await expect(picker).toBeVisible({ timeout: 20000 });
  await picker.getByTestId("share-eat").click();
  await expect(picker.locator("#share-eat-cat")).toHaveValue(eatCategoryFor(new Date()));
  await picker.locator("#share-eat-cat").selectOption("ds");
  await page.setViewportSize({ width: 360, height: 800 });
  await picker.screenshot({ path: "test-results/v2440-shots/share-choice-360.png" });
  await picker.getByRole("button", { name: "Add and check with Snap" }).click();
  await expect(picker).toHaveCount(0);
  await expect(page.getByTestId("snap-values")).toContainText("kcal");                       // the normal Snap result
  expect(JSON.stringify(aiCalls)).toContain('"media_type":"image/png"');                     // the shared photo was sent
  const hint = page.getByTestId("snap-recheck-hint");
  await expect(hint).toContainText("Additional Information – for improved accuracy, you may provide any known weight, calories or portion sizes to help your companion analysis");   // v2.52.0 wording
  await expect(hint).toHaveCSS("border-top-color", "rgb(245, 158, 11)");
  await hint.screenshot({ path: "test-results/v2440-shots/snap-recheck-hint-360.png" });
  // the new row is today's first dessert row, and the shared copy is gone
  const today = DAYS[new Date().getDay()];
  expect(await page.evaluate(async () => (await (await caches.open("lc-share")).keys()).length)).toBe(0);
  expect(errors).toEqual([]);
});

test("Android: an image handed over by the app shell opens 'What is this?'", async ({ page }) => {
  await openApp(page);
  await page.evaluate(async (b64) => {
    const { SHARE_CACHE } = await import("/Life-Care/src/components/SharePicker.jsx");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    await (await caches.open(SHARE_CACHE)).put("/lc-share/1", new Response(new Blob([bytes], { type: "image/png" }), { headers: { "Content-Type": "image/png", "X-Name": "a.png" } }));
    window.dispatchEvent(new CustomEvent("lc-shared"));
  }, PNG_B64);
  await expect(page.getByTestId("share-picker")).toBeVisible();
});
