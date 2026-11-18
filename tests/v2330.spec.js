import { test, expect } from "@playwright/test";
import { openApp, gotoSignedIn, USERS } from "./helpers.js";

// v2.33.0 (Architect, cyber review 18 Nov): optional app lock (the phone's fingerprint / face / PIN), lock after time in
// the background, Sign out everywhere, and "confirm it's you" before Delete my account and Download my data.
// The phone's prompt is a stand-in here (window.__lcAppLock, dev server only); the native plugins are compiled by CI.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const raw = async (k) => (await fetch(KEY(k), { headers: H })).json();
const openSettings = (page) => page.getByRole("button", { name: /Settings/ }).first().click();

/** The flag on, plus a phone stand-in: available (face), and each prompt answers from window.__answers (default yes). */
async function phone(page, opts = {}) {
  await page.addInitScript(([o]) => {
    localStorage.setItem("lc_flags", JSON.stringify({ useAppLock: true }));
    if (o.lock) localStorage.setItem("lc_app_lock", JSON.stringify(o.lock));
    if (o.web) return;
    window.__prompts = []; window.__answers = JSON.parse(sessionStorage.getItem("answers") || "[]");
    window.__lcAppLock = {
      isAvailable: async () => ({ available: o.available !== false, biometry: "face", reason: o.available === false ? "no-screen-lock" : "" }),
      authenticate: async ({ reason }) => { window.__prompts.push(reason); const a = window.__answers.length ? window.__answers.shift() : true; return { ok: a }; },
    };
  }, [opts]);
}
/** Leave the app and come back (as the phone does when you switch apps). */
async function awayAndBack(page) {
  await page.evaluate(() => {
    const set = (v) => { Object.defineProperty(document, "visibilityState", { value: v, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); };
    set("hidden"); set("visible");
  });
}

test("Settings → Lock the app: turned on only after the phone confirms; 'straight away' locks on return; the app is hidden and unreachable until unlocked", async ({ page }) => {
  await phone(page);
  const { errors } = await openApp(page);
  await openSettings(page);
  const box = page.getByTestId("app-lock-settings");
  await expect(box).toContainText("Ask for your face");
  await page.evaluate(() => { window.__answers = [false]; });
  await box.getByTestId("app-lock-toggle").click();                                         // the phone says no
  await expect(box).toContainText("Not turned on");
  await expect(box.getByTestId("app-lock-toggle")).not.toBeChecked();
  await box.getByTestId("app-lock-toggle").check();                                         // the phone says yes
  await expect(box).toContainText("The app lock is on for this phone");
  expect(await page.evaluate(() => window.__prompts)).toEqual(["Turn on the app lock", "Turn on the app lock"]);
  await expect(box.getByTestId("app-lock-after")).toHaveValue("5");                          // default: 5 minutes
  await page.setViewportSize({ width: 360, height: 760 });
  await page.getByTestId("account-card").screenshot({ path: "test-results/v2330-shots/lock-settings-360.png" });
  await awayAndBack(page);
  await expect(page.getByTestId("app-lock")).toHaveCount(0);                                  // a moment away: not locked
  await box.getByTestId("app-lock-after").selectOption("0");
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem("lc_app_lock")))).toEqual({ on: true, minutes: 0 });
  await page.evaluate(() => { window.__answers = [false]; });                                 // the first prompt is cancelled
  await awayAndBack(page);
  const lock = page.getByTestId("app-lock");
  await expect(lock).toBeVisible();
  await expect(lock).toContainText("Not unlocked");
  await expect(page.getByTestId("account-card")).toBeHidden();                               // the app underneath is hidden
  await page.setViewportSize({ width: 360, height: 760 });
  await page.screenshot({ path: "test-results/v2330-shots/lock-screen-360.png" });
  await lock.getByTestId("app-unlock").click();
  await expect(lock).toHaveCount(0);
  await expect(page.getByTestId("account-card")).toBeVisible();                              // where you were, unchanged
  expect(errors).toEqual([]);
});

test("the lock also asks when the app opens; Sign out on the lock screen works; with the flag off there's no lock at all", async ({ page }) => {
  await phone(page, { lock: { on: true, minutes: 5 } });
  await openApp(page);
  await expect(page.getByTestId("app-lock")).toHaveCount(0);                                  // the stand-in said yes straight away
  expect(await page.evaluate(() => window.__prompts)).toEqual(["Unlock Lifecare Companion"]);
  await page.evaluate(() => sessionStorage.setItem("answers", "[false]"));                    // the next opening: cancelled
  await page.reload();
  await expect(page.getByTestId("app-lock")).toBeVisible({ timeout: 20000 });
  await page.getByTestId("app-lock").getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByTestId("sign-in")).toBeVisible();
});

test("no lock without the flag, and on the web the card says it's in the apps", async ({ page, browser }) => {
  await page.addInitScript(() => localStorage.setItem("lc_app_lock", JSON.stringify({ on: true, minutes: 0 })));
  await openApp(page);
  await openSettings(page);
  await expect(page.getByTestId("account-card")).toBeVisible();
  await expect(page.getByTestId("app-lock")).toHaveCount(0);
  await expect(page.getByTestId("app-lock-settings")).toHaveCount(0);
  await expect(page.getByTestId("sign-out-everywhere")).toHaveCount(0);
  const p2 = await (await browser.newContext()).newPage();
  await phone(p2, { web: true });
  await openApp(p2);
  await openSettings(p2);
  await expect(p2.getByTestId("app-lock-unavailable")).toHaveText("The app lock is in the Android and iPhone apps.");
});

test("a phone with no screen lock: the card explains how to set one up", async ({ page }) => {
  await phone(page, { available: false });
  await openApp(page);
  await openSettings(page);
  await expect(page.getByTestId("app-lock-unavailable")).toContainText("Set up a screen lock");
});

test("Download my data asks the phone first; refused = no download", async ({ page }) => {
  await phone(page);
  await openApp(page);
  await openSettings(page);
  await page.evaluate(() => { window.__answers = [false]; });
  let downloads = 0; page.on("download", () => { downloads++; });
  await page.getByTestId("export-my-data").click();
  await expect(page.getByText("Not confirmed, so nothing was done.")).toBeVisible();
  expect(downloads).toBe(0);
  const dl = page.waitForEvent("download");
  await page.getByTestId("export-my-data").click();
  await dl;
  expect(await page.evaluate(() => window.__prompts)).toEqual(["Confirm it's you to download your data", "Confirm it's you to download your data"]);
});

test("Delete my account asks the phone first; refused = nothing deleted", async ({ page }) => {
  await phone(page);
  await openApp(page, "member");
  page.on("dialog", (d) => d.accept());
  await openSettings(page);
  const before = await raw("dashboard:data");
  await page.evaluate(() => { window.__answers = [false]; });
  const box = page.getByTestId("delete-account");
  await box.getByLabel("Type DELETE to delete the account").fill("DELETE");
  await box.getByTestId("delete-my-account").click();
  await expect(page.getByText(/Couldn't delete the account: Not confirmed/)).toBeVisible();
  expect(await raw("dashboard:data")).toEqual(before);                                        // nothing erased
  await expect(page.getByTestId("sign-in")).toHaveCount(0);
});

test("on the web, confirming is with Google unless the sign-in is under 5 minutes old", async ({ page }) => {
  await phone(page, { web: true });
  await openApp(page);
  const r = await page.evaluate(async () => {
    const m = await import("/Life-Care/src/lib/appLock.js"); let asked = 0;
    window.__lcReauth = async () => { asked++; return true; };
    const recent = await m.confirmItsYou("x");
    const later = await m.confirmItsYou("x", { now: Date.now() + 10 * 60000 });
    window.__lcReauth = async () => { throw new Error("closed"); };
    let refused = ""; try { await m.confirmItsYou("x", { now: Date.now() + 10 * 60000 }); } catch (e) { refused = e.message; }
    return { recent, later, asked, refused, lock: [m.shouldLock({ on: true, minutes: 5 }, 0, 299999), m.shouldLock({ on: true, minutes: 5 }, 0, 300000), m.shouldLock({ on: false, minutes: 0 }, 0, 1)] };
  });
  expect(r).toEqual({ recent: "recent", later: "google", asked: 1, refused: "Not confirmed with Google, so nothing was done.", lock: [false, true, false] });
});

test("Sign out everywhere: asks the server to end every sign-in, signs this copy out, and another open copy signs out at once", async ({ page, browser }) => {
  const other = await (await browser.newContext()).newPage();
  await phone(other);
  await openApp(other);                                                                       // signed in elsewhere first
  await phone(page);
  const calls = [];
  await page.route(/cloudfunctions\.net\/signOutEverywhere$/, (r) => { calls.push(r.request().postDataJSON().data); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true } }) }); });
  await gotoSignedIn(page);
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  page.on("dialog", (d) => d.accept());
  await openSettings(page);
  await page.getByTestId("sign-out-everywhere").click();
  await expect(page.getByTestId("sign-in")).toBeVisible();
  expect(calls).toEqual([{ appId: "lifecare" }]);
  expect(Number(await raw("security:signedOutAt"))).toBeGreaterThan(Date.now() - 60000);
  await expect(other.getByTestId("sign-in")).toBeVisible({ timeout: 10000 });                 // the other copy too
  await page.evaluate(([e, pw]) => window.__lcTestSignIn(e, pw), [USERS.jc.email, USERS.jc.password]);
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });   // signing in again works
});
