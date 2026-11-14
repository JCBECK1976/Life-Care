import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { proxyFeature } from "../src/lib/platform.js";

// v2.16.5 Step B: JC's decisions — per-person deficit (JC 500, Becks 400), old Google token keys removed, tier defaults.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const body = { weight: [{ wk: 1, v: 13 }, { wk: 2, v: 13.2 }, { wk: 3, v: 13.1 }], bodyFat: [{ wk: 1, v: 20 }, { wk: 2, v: 21 }, { wk: 3, v: 22 }] };

test("proxy feature mapping for tiers", () => {
  expect(proxyFeature("Help")).toBe("help");
  expect(proxyFeature("My Eating (photo)")).toBe("snap");
  expect(proxyFeature("My Body")).toBe("aiFeedback");
});

test("one-off cleanup: the old google_token_jc / google_token_becks keys are removed on load; nothing else touched", async ({ page }) => {
  await fetch(KEY("google_token_jc"), { method: "PUT", headers: H, body: JSON.stringify("old-token") });
  await fetch(KEY("google_token_becks"), { method: "PUT", headers: H, body: JSON.stringify("old-token") });
  const before = await (await fetch(KEY("custom_breakfasts"), { headers: H })).text();
  const { errors } = await openApp(page);   // openApp reseeds, so put them back and reload
  await fetch(KEY("google_token_jc"), { method: "PUT", headers: H, body: JSON.stringify("old-token") });
  await fetch(KEY("google_token_becks"), { method: "PUT", headers: H, body: JSON.stringify("old-token") });
  await page.reload();
  await expect.poll(async () => (await (await fetch(KEY("google_token_jc"), { headers: H })).json())).toBe(null);
  await expect.poll(async () => (await (await fetch(KEY("google_token_becks"), { headers: H })).json())).toBe(null);
  expect(await (await fetch(KEY("custom_breakfasts"), { headers: H })).text()).toBe(before);
  expect(errors).toEqual([]);
});
