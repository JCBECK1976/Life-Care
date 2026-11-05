import { expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { mockAnthropic } from "./mock-ai.js";

export { mockAnthropic };

export function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

// Re-seed the emulator, then open the app with AI and Open Food Facts mocked; wait until data has loaded.
// v2.6.0: fake Google accounts in the Auth emulator. test-uid-jc is the UID the emulator's rules allow.
const AUTH = "http://127.0.0.1:9099";
export const USERS = {
  jc: { uid: "test-uid-jc", email: "jc-test@example.com", password: "test-password" },
  other: { uid: "test-uid-other", email: "other-test@example.com", password: "test-password" },
};
export async function ensureUser(who) {
  const u = USERS[who];
  await fetch(AUTH + "/identitytoolkit.googleapis.com/v1/projects/life-care-app-64d04/accounts", {
    method: "POST", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ localId: u.uid, email: u.email, password: u.password }),
  }); // already existing is fine
}
export async function idToken(who) {
  await ensureUser(who);
  const u = USERS[who];
  const r = await fetch(AUTH + "/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, password: u.password, returnSecureToken: true }),
  });
  return (await r.json()).idToken;
}
// Open the app and sign in (as JC's account by default).
export async function gotoSignedIn(page, who = "jc") {
  await ensureUser(who);
  await page.goto("./");
  await page.waitForFunction(() => typeof window.__lcTestSignIn === "function");
  await page.getByTestId("sign-in").waitFor({ timeout: 20000 });
  const u = USERS[who];
  await page.evaluate(([e, pw]) => window.__lcTestSignIn(e, pw), [u.email, u.password]);
}

export async function openApp(page) {
  execSync("node scripts/seed-emulator.mjs", { stdio: "ignore" }); // fresh data for every test
  const errors = collectErrors(page);
  const aiCalls = await mockAnthropic(page);
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"products":[]}' }));
  await gotoSignedIn(page);
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  return { errors, aiCalls };
}

export const tab = (page, name) => page.getByRole("button", { name, exact: true }).first().click();
export const person = (page, name) => page.getByRole("button", { name, exact: true }).first().click();
