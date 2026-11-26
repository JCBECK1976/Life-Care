import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// v2.27.0: the go-live switches — one place, for everyone (platform/publicFlags), flipped by the admin in order.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const put = (p, v) => fetch("http://127.0.0.1:9000/" + p + ".json" + NS, { method: "PUT", headers: H, body: JSON.stringify(v) });
const get = async (p) => (await fetch("http://127.0.0.1:9000/" + p + ".json" + NS, { headers: H })).json();
test.afterEach(async () => { await put("platform/publicFlags", null); await put("platform/admins/test-uid-jc", null); await put("apps/lifecare", null); });

test("a switch turned on for everyone works on a device with no local flags (here: plans)", async ({ page }) => {
  await put("platform/publicFlags", { useTiers: true });
  await openApp(page, "member");
  await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  expect(await page.evaluate(() => localStorage.getItem("lc_flags"))).toBeNull();
  await page.locator('button[title="Settings"]').first().click();
  await expect(page.getByTestId("my-plan")).toBeVisible();
});

test("with no switches on, nothing new appears (as beta and prod today)", async ({ page }) => {
  await openApp(page, "member");
  await page.locator('button[title="Settings"]').first().click();
  await expect(page.getByText("My Colour Theme")).toBeVisible();
  for (const id of ["my-plan", "steps-card", "account-consent", "go-live-switches"]) await expect(page.getByTestId(id)).toHaveCount(0);
});

test("the admin card lists the switches in go-live order and flips them for everyone", async ({ page }) => {
  await put("platform/admins/test-uid-jc", true);
  await openApp(page, "jc");
  await page.locator('button[title="Settings"]').first().click();
  const card = page.getByTestId("go-live-switches");
  const labels = await card.locator("label b").allInnerTexts();
  expect(labels.map((l) => l.replace(/^\d+\. /, ""))).toEqual(["AI through our server", "Individual accounts", "Plans", "Onboarding + consent", "Steps from Health Connect", "Buying"]);
  await card.getByTestId("golive-useAiProxy").check();
  await expect(card.getByTestId("golive-msg")).toContainText("✓ On: AI through our server");
  expect(await get("platform/publicFlags")).toEqual({ useAiProxy: true });
  await card.getByTestId("golive-useAiProxy").uncheck();
  expect(await get("platform/publicFlags")).toEqual({ useAiProxy: false });
});
