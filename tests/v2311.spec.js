import { test, expect } from "@playwright/test";
import { mockAnthropic, openApp } from "./helpers.js";
import { areaData } from "./areaHelpers.js";

// v2.31.1 (Architect, 18 Nov): no US AI fallback for pilot users. A per-person account ALWAYS goes through the server
// (EU); if the AI can't be reached the app says "Your Companion is unavailable right now" and tracking carries on.
// The joint household account keeps the direct route until the go-live switch (useAiProxy).
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const put = (p, v) => fetch("http://127.0.0.1:9000/" + p + ".json" + NS, { method: "PUT", headers: H, body: JSON.stringify(v) });
const get = async (p) => (await fetch("http://127.0.0.1:9000/" + p + ".json" + NS, { headers: H })).json();
const UID = "test-uid-solo", EMAIL = "solo-test@example.com";
test.afterAll(async () => { await put("apps/lifecare", null); });

test("per-person account: Chat never calls the US API; the server says unavailable → a plain message; a health note still saves", async ({ page }) => {
  const person = { profile: { name: "Sol", sex: "Female", age: "44", height: "165", goal: "health" }, meds: [], medsHistory: [], body: { weight: [{ wk: 18, v: 70 }] }, measurements: {}, bloods: [], exercises: {} };
  await put("apps/lifecare", { users: { [UID]: { profile: { name: "Sol" }, data: areaData({ "dashboard:data": JSON.stringify({ config: { week: 18, session: 15, trainingStart: "2026-07-19" }, jc: person }) }) } } });
  await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/life-care-app-64d04/accounts", { method: "POST", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ localId: UID, email: EMAIL, password: "test-password" }) });
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAccounts: true })));   // useAiProxy stays OFF
  const direct = await mockAnthropic(page);
  let proxied = 0;
  await page.route(/cloudfunctions\.net\/aiProxy/, (r) => { proxied++; return r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { status: "UNAVAILABLE", message: "Your Companion is unavailable right now." } }) }); });
  await page.goto("./"); await page.waitForFunction(() => typeof window.__lcTestSignIn === "function"); await page.getByTestId("sign-in").waitFor({ timeout: 20000 });
  await page.evaluate(([e]) => window.__lcTestSignIn(e, "test-password"), [EMAIL]);
  await page.waitForFunction(() => !!window._lcIndividual, null, { timeout: 20000 });
  await page.evaluate(() => { const g = document.querySelector('[data-testid="goal-setup"]'); if (g) g.style.display = "none"; });
  await page.getByTitle("Chat with your Companion").or(page.getByRole("button", { name: "Chat with your Companion" })).first().click();
  const box = page.locator('textarea[id^="qa-input-"]').first();
  await box.fill("How am I doing?"); await box.locator("xpath=following-sibling::button[1]").click();
  await expect(page.getByText(/Your Companion is unavailable right now/).first()).toBeVisible();
  expect(proxied).toBeGreaterThan(0);
  expect(direct.filter((c) => c && c.max_tokens > 1)).toEqual([]);                              // nothing went to the US API
  // tracking carries on: a health note saves to the person's own Health area
  await page.keyboard.press("Escape");
  await page.evaluate(async () => { const nd = JSON.parse(JSON.stringify(window._lcData)); const k = Object.keys(nd).find((x) => x !== "config"); nd[k].healthNotes = "still saving"; await window._lcSaveData(nd); });
  await expect.poll(async () => JSON.stringify(await get("apps/lifecare/users/" + UID + "/data/health"))).toContain("still saving");
});

test("the joint household account keeps the direct route until the go-live switch; the unavailable message is plain, not 'Error: Error: …'", async ({ page }) => {
  const { aiCalls } = await openApp(page);
  let proxied = 0; await page.route(/cloudfunctions\.net\/aiProxy/, (r) => { proxied++; return r.fulfill({ status: 500, body: "{}" }); });
  await page.getByTitle("Chat with your Companion").or(page.getByRole("button", { name: "Chat with your Companion" })).first().click();
  const box = page.locator("#qa-input-jc"); await box.fill("Hi"); await box.locator("xpath=following-sibling::button[1]").click(); await expect(box).toBeEnabled();
  expect(aiCalls.filter((c) => c && c.max_tokens > 1).length).toBeGreaterThan(0); expect(proxied).toBe(0);
  const m = await page.evaluate(() => window.aiErrorMsg(new Error("Error: Your Companion is unavailable right now.")));
  expect(m).toBe("Your Companion is unavailable right now. Everything you record is still saved — please try again later.");
});
