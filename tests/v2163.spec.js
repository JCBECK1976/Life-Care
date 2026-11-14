import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { openApp } from "./helpers.js";
import { MOCK_TEXT } from "./mock-ai.js";

// v2.16.3 Step 4 (local build, nothing live): client flags default OFF; the server functions + next rules are emulator-tested.
async function askHelp(page, q) {
  await page.getByRole("button", { name: /^Help/ }).first().click();
  const box = page.locator("#help-input-jc"); await box.fill(q);
  await box.locator("xpath=following::button[1]").click();
}

test("flags off (default): AI goes the current way; the proxy is never called", async ({ page }) => {
  const { errors, aiCalls } = await openApp(page);
  let proxy = 0; await page.route(/cloudfunctions\.net/, (r) => { proxy++; return r.fulfill({ status: 500, body: "{}" }); });
  await askHelp(page, "How do I log?");
  await expect(page.getByText(MOCK_TEXT).first()).toBeVisible();
  expect(proxy).toBe(0); expect(aiCalls.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("flag useAiProxy on: the request goes to the server proxy with the user's token and its reply is shown", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAiProxy: true })));
  const { errors, aiCalls } = await openApp(page);
  const n0 = aiCalls.length;
  let seen = null;
  await page.route(/europe-west1-life-care-app-64d04\.cloudfunctions\.net\/aiProxy/, async (r) => {
    seen = { auth: r.request().headers()["authorization"], body: r.request().postDataJSON() };
    await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { content: [{ type: "text", text: "Reply from the proxy." }], stop_reason: "end_turn", usage: { input_tokens: 5, output_tokens: 5 } } }) });
  });
  await askHelp(page, "How do I log?");
  await expect(page.getByText("Reply from the proxy.").first()).toBeVisible();
  expect(seen.auth).toMatch(/^Bearer ey/);
  expect(seen.body.data).toMatchObject({ appId: "lifecare", feature: "ai" });
  expect(seen.body.data.request.messages.length).toBeGreaterThan(0);
  expect(JSON.stringify(aiCalls.slice(n0))).not.toContain("How do I log?");   // the question never went to api.anthropic.com
  expect(errors).toEqual([]);
});

test("server functions + database.rules.next.json pass their emulator tests", () => {
  const out = execSync("npm --prefix functions test 2>&1", { encoding: "utf8", timeout: 120000 });
  expect(out).toMatch(/# fail 0/);
  expect(out).toMatch(/# pass 9/);
});
