import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// v2.31.2 (Architect, 18 Nov): the admin creates the store-review demo account (the server makes it: see
// functions/test/demo.test.mjs). Here: the card is admin-only and calls createReviewDemo with the email.
test("Settings → Store review demo account: admin only; sends the email to createReviewDemo and shows what was made", async ({ page }) => {
  const calls = [];
  await page.route(/cloudfunctions\.net\/createReviewDemo$/, async (r) => { const b = r.request().postDataJSON(); calls.push(b.data); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true, uid: "uid-demo", email: b.data.email, created: true } }) }); });
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAccounts: true })));
  await openApp(page, "jc");
  await page.locator('button[title="Settings"]').first().click();
  const card = page.getByTestId("review-demo");
  await expect(card.getByTestId("demo-create")).toBeDisabled();
  await card.getByLabel("Review account's email").fill("review.demo@example.com");
  await card.getByTestId("demo-create").click();
  await expect(card.getByTestId("demo-msg")).toContainText("Review demo account created for review.demo@example.com — made-up data, Gold, no family");
  expect(calls).toEqual([{ appId: "lifecare", email: "review.demo@example.com" }]);
});

test("not shown to anyone else (an ordinary account)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAccounts: true })));
  await openApp(page, "member");
  await page.waitForTimeout(800); await page.evaluate(() => { const g = document.querySelector('[data-testid="goal-setup"]'); if (g) g.style.display = "none"; });
  await page.locator('button[title="Settings"]').first().dispatchEvent("click");
  await expect(page.getByText("Data Admin").first()).toBeVisible();                        // Settings is open
  await expect(page.getByTestId("review-demo")).toHaveCount(0);
});
