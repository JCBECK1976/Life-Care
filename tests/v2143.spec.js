import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// v2.14.3: Feedback email edit form closes on Save with a brief "Saved"; Send Feedback says plainly what happens.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k + ".json" + NS;
const put = (k, v) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(v) });
const del = (k) => fetch(url(k), { method: "DELETE", headers: { Authorization: "Bearer owner" } });

test("v2.14.3: Feedback email: Edit → Save closes the form and shows a brief Saved", async ({ page }) => {
  const { errors } = await openApp(page); await del("feedback_email");
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.locator("button").nth(1).click();
  const card = page.getByTestId("contact-email");
  await expect(card.getByTestId("contact-email-value")).toHaveText("Not set (Tracker only)");
  await card.getByRole("button", { name: "Edit" }).click();
  await card.getByLabel("Feedback email").fill("owner@example.com");
  await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByLabel("Feedback email")).toHaveCount(0);                       // form closed
  await expect(card.getByTestId("contact-email-value")).toHaveText("owner@example.com");
  await expect(card.getByRole("status")).toHaveText("✓ Saved");
  await expect(card.getByRole("status")).toHaveCount(0, { timeout: 6000 });            // brief
  await card.getByRole("button", { name: "Edit" }).click();                             // Cancel keeps the saved value
  await card.getByLabel("Feedback email").fill("other@example.com");
  await card.getByRole("button", { name: "Cancel" }).click();
  await expect(card.getByTestId("contact-email-value")).toHaveText("owner@example.com");
  expect(errors).toEqual([]);
});

test("v2.14.3: Send Feedback wording: Tracker always; with an address, press Send in the email app", async ({ page }) => {
  const { errors } = await openApp(page); await del("feedback_email");
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => { window.open = () => null; });
  await page.getByRole("button", { name: "💬 Send Feedback" }).click();
  await expect(page.getByTestId("feedback-how")).toHaveText("It's saved to the Tracker for the app owner to read in the app.");
  await page.getByPlaceholder(/What were you trying to do/).fill("no email");
  await page.getByRole("button", { name: "Send Feedback", exact: true }).click();
  await expect(page.getByTestId("feedback-done")).toHaveText("✓ Saved to the Tracker for the app owner — thank you!");
  await put("feedback_email", "owner@example.com");
  await expect(page.getByTestId("feedback-done")).toHaveCount(0, { timeout: 6000 });
  await page.getByRole("button", { name: "💬 Send Feedback" }).click();
  await expect(page.getByTestId("feedback-how")).toContainText("Press Send there to email it too: the app can't send email itself.");
  await page.getByPlaceholder(/What were you trying to do/).fill("with email");
  await page.getByRole("button", { name: "Send Feedback", exact: true }).click();
  await expect(page.getByTestId("feedback-done")).toHaveText("✓ Saved to the Tracker for the app owner. Your email app should now be open: press Send there to email it too.");
  await del("feedback_email");
  expect(errors).toEqual([]);
});
