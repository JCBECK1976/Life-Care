import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// v2.35.0 (Architect, cyber review 18 Nov — UNDER-18 CONTROLS): at onboarding the app store's age signal (Google Play
// Age Signals API; Apple Declared Age Range, iOS 26+) refuses under-18 accounts kindly; otherwise the 18+ confirmation
// stays. The store's answer is a stand-in here (window.__lcAgeSignal, dev server only); the plugins are compiled by CI.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const put = (path, v) => fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { method: "PUT", headers: H, body: JSON.stringify(v) });
const get = async (path) => (await fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { headers: H })).json();
const ME = "test-uid-member";
test.afterAll(async () => { await put("apps/lifecare", null); });

async function go(page, answer, opts = {}) {
  await put("apps/lifecare", null);
  await page.addInitScript(([a, o]) => {
    localStorage.setItem("lc_flags", JSON.stringify({ useOnboarding: true }));
    if (a !== undefined) window.__lcAgeSignal = { check: () => new Promise((res) => setTimeout(() => res(a), o.delay || 0)) };
  }, [answer, opts]);
  if (opts.viewport) await page.setViewportSize(opts.viewport);
  const r = await openApp(page, "member");
  return { ...r, ob: page.getByTestId("onboarding") };
}

test("the reading of the store's answer: under 18 only when the top of the range is under 18; anything unclear = unknown", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async () => {
    const m = await import("/Life-Care/src/lib/ageSignal.js"); const v = m.readAgeSignal;
    return [v({ available: true, shared: true, lower: 13, upper: 15 }), v({ available: true, shared: true, lower: 16, upper: 17 }), v({ available: true, shared: true, lower: 18 }),
      v({ available: true, shared: true, lower: 0, upper: 12 }), v({ available: true, shared: true, lower: 16 }), v({ available: true, shared: false }), v({ available: false }), v(null),
      await m.storeAgeSignal()];   // the web: no store to ask
  });
  expect(r).toEqual(["under18", "under18", "adult", "under18", "unknown", "unknown", "unknown", "unknown", { verdict: "unknown", source: "none" }]);
});

test("Google Play says under 18: a kind refusal, no age choices, no Continue, nothing saved; Sign out works", async ({ page }) => {
  const { ob, errors } = await go(page, { available: true, source: "play", shared: true, lower: 13, upper: 15 }, { viewport: { width: 360, height: 780 } });
  const no = ob.getByTestId("ob-store-under18");
  await expect(no).toContainText("Sorry, Lifecare Companion is only for adults.");
  await expect(no).toContainText("Your Google Play account says you're under 18");
  await expect(ob.getByTestId("ob-adult")).toHaveCount(0);
  await expect(ob.getByTestId("ob-next-1")).toHaveCount(0);
  await page.screenshot({ path: "test-results/v2350-shots/under18-360.png" });
  expect(await get("apps/lifecare/users/" + ME + "/consent")).toBeNull();
  await no.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByTestId("sign-in")).toBeVisible();
  expect(errors.filter((e) => !/permission|PERMISSION_DENIED/i.test(e))).toEqual([]);
});

test("Apple says 18+: the person still confirms their age (kept), then carries on as before", async ({ page }) => {
  const { ob } = await go(page, { available: true, source: "apple", shared: true, lower: 18 }, { delay: 600 });
  await expect(ob.getByText("Checking with your app store…")).toBeVisible();
  await expect(ob.getByTestId("ob-adult")).toBeDisabled();                                  // until the store has answered
  await expect(ob.getByTestId("ob-adult")).toBeEnabled();
  await expect(ob.getByTestId("ob-next-1")).toBeDisabled();
  await ob.getByTestId("ob-adult").check();
  await ob.getByTestId("ob-next-1").click();
  await expect(ob.getByTestId("ob-next-2")).toBeVisible();
});

test("Apple under 18 names the Apple account; no answer from the store (declined, error or a slow store) = the 18+ confirmation as before", async ({ page, browser }) => {
  const { ob } = await go(page, { available: true, source: "apple", shared: true, lower: 13, upper: 17 });
  await expect(ob.getByTestId("ob-store-under18")).toContainText("Your Apple account says you're under 18");
  for (const a of [{ available: true, source: "apple", shared: false }, { available: false, source: "play", reason: "PLAY_STORE_NOT_FOUND" }]) {
    const p = await (await browser.newContext()).newPage();
    const { ob: o } = await go(p, a);
    await expect(o.getByTestId("ob-adult")).toBeEnabled();
    await expect(o.getByTestId("ob-store-under18")).toHaveCount(0);
  }
  const slow = await page.evaluate(async () => { const m = await import("/Life-Care/src/lib/ageSignal.js");
    window.__lcAgeSignal = { check: () => new Promise(() => {}) }; const t = Date.now(); const r = await m.storeAgeSignal({ timeoutMs: 300 }); return [r.verdict, Date.now() - t < 2000]; });
  expect(slow).toEqual(["unknown", true]);
});
