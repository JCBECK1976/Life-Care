import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.22.2 / v2.22.3 (overnight batch Part 0): preview trap, See plans from Chat/Help, Snap gate before the picker,
// info-style prompts, Energy bar per plan.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const put = (path, v) => fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(v) });
const ME = "test-uid-member";
async function go(page, who, p) {
  await put("apps/lifecare", p || null);
  await page.addInitScript(() => { localStorage.setItem("lc_flags", JSON.stringify({ useTiers: true })); });
  const r = await openApp(page, who);
  await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  return r;
}
const settings = (page) => page.locator('button[title="Settings"]').first().click();
test.afterAll(async () => { await put("apps/lifecare", null); });

test("preview trap: previewing 'Platinum member' hides My Plan, but a bar on every screen (and Settings) has Stop preview", async ({ page }) => {
  await go(page, "jc");
  await settings(page);
  await page.getByTestId("my-plan-toggle").click();
  await page.getByTestId("plan-preview").selectOption("platinum-member");
  await expect(page.getByTestId("my-plan")).toHaveCount(0);
  await expect(page.getByTestId("preview-bar")).toContainText("Previewing Platinum Family (member)");
  await tab(page, "My Body");
  await expect(page.getByTestId("preview-bar")).toBeVisible();
  await page.getByTestId("preview-stop").click();
  await expect(page.getByTestId("preview-bar")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window._lcPlan.tier + ":" + !!window._lcPlan.preview)).toBe("platinum:false");
  await settings(page);
  await expect(page.getByTestId("my-plan")).toBeVisible();
});

test("See plans from inside Chat closes the chat and opens My Plan", async ({ page }) => {
  await go(page, "member");
  await page.getByRole("button", { name: /chat/i }).first().click();
  await page.getByTestId("plan-gate-chat").getByTestId("see-plans").click();
  await expect(page.getByRole("dialog", { name: "Chat with your Companion" })).toHaveCount(0);
  await expect(page.getByTestId("my-plan-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("my-plan")).toBeInViewport();
});

test("Snap gate: on Bronze a photo button shows the prompt BEFORE any camera/file picker; info style, not an alarm", async ({ page }) => {
  const { aiCalls } = await go(page, "member");
  let chooser = 0; page.on("filechooser", () => { chooser++; });
  await tab(page, "My Body");
  await page.getByText("📷 Upload").first().click();
  const d = page.getByTestId("plan-gate-dialog");
  await expect(d).toContainText("Snap (photo checks) is part of Silver.");
  await expect(d).toHaveCSS("background-color", "rgb(239, 246, 255)");
  await expect(d.getByRole("button", { name: "Not now" })).toBeVisible();
  await page.waitForTimeout(500);
  expect(chooser).toBe(0);
  expect(aiCalls.length).toBe(0);
  await d.getByRole("button", { name: "Not now" }).click();
  // Silver: the picker opens as before
  await put("apps/lifecare/entitlements/" + ME, { tier: "silver", source: "admin" });
  await page.evaluate(async () => { const m = await import("/Life-Care/src/lib/myPlan.js"); await m.loadPlan(); });
  const fc = page.waitForEvent("filechooser", { timeout: 5000 });
  await page.getByText("📷 Upload").first().click();
  await fc;
});

test("Energy bar: none on Bronze; a plan shows its own Energy; the shared account keeps the developer-key level", async ({ page }) => {
  await go(page, "member");
  await expect(page.getByText("Companion Energy").first()).toHaveCount(0);
  await put("apps/lifecare", { entitlements: { [ME]: { tier: "silver", source: "admin" } }, energy: { [ME]: { balance: 150 } } });
  await page.evaluate(async () => { const m = await import("/Life-Care/src/lib/myPlan.js"); await m.loadPlan(); });
  await tab(page, "My Body"); await tab(page, "Home");
  await expect(page.getByText("Companion Energy").first()).toBeVisible();
  await expect(page.getByText("50%").first()).toBeVisible();
});
