import { test, expect } from "@playwright/test";
import { mockAnthropic } from "./mock-ai.js";
import { gotoSignedIn, idToken, ensureUser } from "./helpers.js";

// v2.6.0: the emulator runs the REAL database.rules.json (allowed UID = test-uid-jc).
const DB = "http://127.0.0.1:9000";
const NS = "ns=life-care-app-64d04-default-rtdb";
const read = (path, token) => fetch(`${DB}/${path}.json?${NS}${token ? "&auth=" + token : ""}`);

test("rules: signed out is denied; another account is denied; the allowed account can read data and data_build", async () => {
  expect((await read("data")).status).toBe(401);
  expect((await read("data_build")).status).toBe(401);
  expect((await read("anything_else")).status).toBe(401);
  const other = await idToken("other");
  expect((await read("data", other)).status).toBe(401);
  const jc = await idToken("jc");
  expect((await read("data/dashboard:data", jc)).status).toBe(200);
  expect((await read("data_build", jc)).status).toBe(200);
  expect((await read("anything_else", jc)).status).toBe(401); // only data/ and data_build/ are open to the account
  const w = await fetch(`${DB}/data/auth_test_probe.json?${NS}&auth=${jc}`, { method: "PUT", body: '"ok"' });
  expect(w.status).toBe(200);
  const wOther = await fetch(`${DB}/data/auth_test_probe.json?${NS}&auth=${other}`, { method: "PUT", body: '"no"' });
  expect(wOther.status).toBe(401);
});

test("signed out: the sign-in screen shows and no data is loaded", async ({ page }) => {
  await mockAnthropic(page);
  await page.goto("./");
  await expect(page.getByTestId("sign-in")).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
  await expect(page.getByText("Week ", { exact: false })).toHaveCount(0);
});

test("an account without access gets the denied screen with Sign out (never a blank app)", async ({ page }) => {
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await mockAnthropic(page);
  await gotoSignedIn(page, "other");
  await expect(page.getByTestId("access-denied")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("This Google account doesn't have access.")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByTestId("sign-in")).toBeVisible();
  expect(errors).toEqual([]);
});

test("allowed account: app loads; Settings shows the masked account and Sign out works", async ({ page }) => {
  await ensureUser("jc");
  await mockAnthropic(page);
  await gotoSignedIn(page, "jc");
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.locator("button").nth(1).click(); // Settings gear
  const card = page.getByTestId("account-card");
  await expect(card).toContainText("jc•••@example.com");
  await expect(card).not.toContainText("jc-test@example.com");
  await card.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByTestId("sign-in")).toBeVisible();
  // still signed in after a reload (local persistence)
  await gotoSignedIn(page, "jc");
  await page.reload();
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
});
