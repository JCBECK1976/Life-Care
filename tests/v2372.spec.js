import { test, expect } from "@playwright/test";
import { openApp, tab, withBodyPhotos } from "./helpers.js";

// v2.37.2 (Architect brief 23 Nov, PART 4): hidden for now (plan BUG-MEASPHOTO) — the 📷 Snap on Body Measurements, the
// Full Body measurement row, Body Balance (card, "Progress photo" share option, onboarding/Settings opt-in). The code is
// kept behind the device switch useBodyPhotos. The weigh-in scales photo stays.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const put = (path, v) => fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { method: "PUT", headers: H, body: JSON.stringify(v) });

test("hidden by default: no measurement Snap, no Full Body row, no Body Balance card; the weigh-in scales photo stays", async ({ page }) => {
  const { errors } = await openApp(page);
  await tab(page, "My Body");
  await expect(page.locator('input[type="file"][data-share="body"]')).toHaveCount(1);             // scales photo kept
  await expect(page.getByTestId("body-balance")).toHaveCount(0);
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
  await expect(page.getByText(/^Bicep/).first()).toBeVisible();
  await expect(page.getByText(/^Full Body/)).toHaveCount(0);
  await page.getByRole("button", { name: /Log/ }).filter({ hasText: "Log" }).first().click();
  await expect(page.getByText(/^Log: /).first()).toBeVisible();
  await expect(page.getByTestId("meas-snap")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("with the switch on (testing only) they all come back", async ({ page }) => {
  await withBodyPhotos(page);
  await openApp(page);
  await tab(page, "My Body");
  await expect(page.getByTestId("body-balance")).toBeVisible();
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
  await expect(page.getByText(/^Full Body/).first()).toBeVisible();
});

test("a new account's privacy choices don't offer Body Balance while it's hidden", async ({ page }) => {
  await put("apps/lifecare", null);
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useOnboarding: true })));
  await openApp(page, "member");
  const ob = page.getByTestId("onboarding");
  await ob.getByTestId("ob-adult").check(); await ob.getByTestId("ob-next-1").click();
  await expect(ob.getByTestId("ob-next-2")).toBeVisible();
  await ob.locator('input[type="checkbox"]').first().check(); await ob.getByTestId("ob-next-2").click();
  await expect(ob.getByTestId("ob-ai")).toBeVisible();
  await expect(ob.getByTestId("ob-bodyBalance")).toHaveCount(0);
  await put("apps/lifecare", null);
});
