import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.24.0 (Step 4, DPIA §3/§7; flag useOnboarding): onboarding + consent for NEW individual accounts.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const put = (path, v) => fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { method: "PUT", headers: H, body: JSON.stringify(v) });
const get = async (path) => (await fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { headers: H })).json();
const ME = "test-uid-member";
const FEATS = ["foodRatings", "snap", "myOwnItem", "aiFeedback", "chat", "aiHelp", "autoInfo", "bodyBalance", "mealGenerator", "shoppingGenerator", "aiPlans"];
const tryAll = (page) => page.evaluate(async (feats) => {
  const out = {};
  for (const f of feats) {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-lc-feature": f, "x-api-key": "k", "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 10, messages: [{ role: "user", content: "hi" }] }) });
    const j = await r.json(); out[f] = j.type === "error" ? j.error.message : "sent";
  }
  return out;
}, FEATS);
async function go(page, who, consent) {
  await put("apps/lifecare", consent ? { users: { [ME]: { consent } } } : null);
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useOnboarding: true, useSteps: true })));
  const r = await openApp(page, who);
  await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  return r;
}
const ALL = { accepted: true, adult: true, termsVersion: "pilot-2026-11-14", privacyVersion: "pilot-2026-11-14", ai: true, photos: true, health: true, bodyBalance: true };
test.afterAll(async () => { await put("apps/lifecare", null); });

test("the shared joint/admin account never sees onboarding", async ({ page }) => {
  const { errors } = await go(page, "jc");
  await page.waitForTimeout(500);
  await expect(page.getByTestId("onboarding")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a new account: under 18 stops here (nothing saved); 18+ → Terms/Privacy → choices (all off by default) → recorded with versions", async ({ page }) => {
  const { errors } = await go(page, "member");
  const ob = page.getByTestId("onboarding");
  await expect(ob).toContainText("Step 1 of 3");
  await ob.getByTestId("ob-under18").check();
  await expect(ob.getByTestId("ob-too-young")).toContainText("only for people aged 18 and over");
  await expect(ob.getByTestId("ob-next-1")).toBeDisabled();
  expect(await get("apps/lifecare/users/" + ME + "/consent")).toBeNull();
  await ob.getByTestId("ob-adult").check();
  await ob.getByTestId("ob-next-1").click();
  await expect(ob.getByTestId("ob-next-2")).toBeDisabled();
  await ob.getByTestId("ob-agree").check();
  await ob.getByTestId("ob-next-2").click();
  for (const k of ["ai", "photos", "health", "bodyBalance"]) await expect(ob.getByTestId("ob-" + k)).not.toBeChecked();
  await expect(ob.getByTestId("ob-photos")).toBeDisabled();                                // needs AI first
  await ob.getByTestId("ob-health").check();
  await expect(ob.getByTestId("ob-no-ai-note")).toBeVisible();
  await ob.getByTestId("ob-finish").click();
  await expect(ob).toHaveCount(0);
  const c = await get("apps/lifecare/users/" + ME + "/consent");
  expect(c).toMatchObject({ accepted: true, adult: true, termsVersion: "pilot-2026-11-14", privacyVersion: "pilot-2026-11-14", ai: false, photos: false, health: true, bodyBalance: false });
  expect(Object.values(c.history)[0].change).toMatchObject({ first: true, health: true });
  expect(errors).toEqual([]);
});

test("AI declined: every AI feature is off whatever the plan (calm note + 'Privacy choices', never 'See plans'); manual tracking still works", async ({ page }) => {
  const { aiCalls } = await go(page, "member", { ...ALL, ai: false, photos: false, bodyBalance: false });
  const got = await tryAll(page);
  for (const f of FEATS) expect(got[f], f).toContain("off");
  expect(aiCalls.length).toBe(0);
  await page.getByRole("button", { name: /chat/i }).first().click();
  const gate = page.getByTestId("plan-gate-chat");
  await expect(gate).toContainText("AI features are off because you chose not to use AI processing");
  await expect(gate.getByTestId("see-plans")).toHaveCount(0);
  await gate.getByTestId("privacy-choices").click();
  await expect(page.getByTestId("account-consent")).toBeInViewport();
  await tab(page, "My Body");
  await expect(page.getByText("13st 2.0lb").first()).toBeVisible();                    // records still there
});

test("withdraw and give consent in Settings: AI on → sent; photos off → Snap off; health off → steps off; body balance needs photos", async ({ page }) => {
  const { aiCalls } = await go(page, "member", { ...ALL, ai: false, photos: false, bodyBalance: false });
  await page.locator('button[title="Settings"]').first().click();
  const card = page.getByTestId("account-consent");
  await card.getByTestId("withdraw-ai").check();
  await expect(card.getByTestId("consent-msg")).toContainText("Turned on");
  let got = await tryAll(page);
  expect(got.aiFeedback).toBe("sent"); expect(got.snap).toContain("Photo checks are off");
  expect(got.bodyBalance).toContain("off");
  expect(aiCalls.length).toBeGreaterThan(0);
  await page.keyboard.press("Escape");                                                  // close the prompt the blocked calls opened
  await card.getByTestId("withdraw-photos").check();
  await card.getByTestId("withdraw-bodyBalance").check();
  got = await tryAll(page);
  expect(Object.values(got).every((v) => v === "sent")).toBe(true);
  await page.keyboard.press("Escape");
  await card.getByTestId("withdraw-health").uncheck();
  await expect(page.getByTestId("steps-card").getByTestId("plan-gate-healthSync")).toContainText("Health sync is off in your privacy choices");
  await card.getByTestId("withdraw-ai").uncheck();                                     // withdrawing AI also turns photos + body balance off
  const c = await get("apps/lifecare/users/" + ME + "/consent");
  expect([c.ai, c.photos, c.bodyBalance, c.health]).toEqual([false, false, false, false]);
  expect(Object.keys(c.history).length).toBeGreaterThanOrEqual(4);                     // each change recorded
});
