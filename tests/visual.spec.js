import { test, expect } from "@playwright/test";
import { openApp, tab, person } from "./helpers.js";

// Pixel comparison of every main view, used while splitting App.jsx to prove the
// app still renders identically. Opt-in (VISUAL=1) because the baseline images hold
// personal data and live outside the repo: create them with VISUAL=1 npx playwright test visual --update-snapshots
test.skip(!process.env.VISUAL, "visual check runs only with VISUAL=1");

const VIEWS = ["Home", "My Body", "My Exercise", "My Eating", "My Shop", "My Health"];

async function open(page) {
  await page.clock.setFixedTime(new Date("2026-11-03T14:00:00"));
  await openApp(page);
  await page.waitForTimeout(1500);
}
const snap = async (page, name, fullPage = true) => {
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0)); // e.g. the header logo after a reload
  return expect.soft(page).toHaveScreenshot(name + ".png", { fullPage, animations: "disabled", caret: "hide", threshold: 0 });
};

for (const who of ["JC", "Becks"]) {
  test(`views for ${who}`, async ({ page }) => {
    await open(page);
    await person(page, who);
    for (const v of VIEWS) {
      await tab(page, v);
      if (v === "My Exercise") await page.getByRole("button", { name: "Sun", exact: true }).click();
      await page.waitForTimeout(500);
      await snap(page, `${who}-${v}`);
    }
    await page.locator("button").nth(1).click(); // Settings gear (next to Help)
    await page.waitForTimeout(500);
    await snap(page, `${who}-Settings`);
  });
}

test("panels: eating lists, help, chat", async ({ page }) => {
  await open(page);
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.waitForTimeout(500);
  await snap(page, "panel-eating-lists");
  await page.getByRole("button", { name: /Help/ }).first().click();
  await page.waitForTimeout(500);
  await snap(page, "panel-help");
  await page.reload();
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Chat with your Companion" }).or(page.getByTitle("Chat with your Companion")).first().click();
  await page.waitForTimeout(500);
  await snap(page, "panel-chat", false); // fixed overlay: full-page mode resizes the window and jitters its scroll
});
