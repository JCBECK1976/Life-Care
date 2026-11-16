import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp } from "./helpers.js";
import { MOCK_TEXT } from "./mock-ai.js";
import { MEDICATION_RULE, withMedicationRule } from "../src/lib/safety.js";

// v2.15.2: pinch-zoom re-enabled (WCAG 1.4.4); P7 explicit medication rule on every AI request.
const sys = (b) => (Array.isArray(b.system) ? b.system.map((x) => x.text).join("\n") : String(b.system || ""));

test("v2.15.2 pure: the medication rule is added once, for every system-prompt shape", () => {
  const plain = JSON.parse(withMedicationRule(JSON.stringify({ messages: [{ role: "user", content: "hi" }] })));
  expect(plain.system).toBe(MEDICATION_RULE);
  const str = JSON.parse(withMedicationRule(JSON.stringify({ system: "Be kind.", messages: [] })));
  expect(str.system).toBe("Be kind.\n\n" + MEDICATION_RULE);
  const arr = JSON.parse(withMedicationRule(JSON.stringify({ system: [{ type: "text", text: "GUIDE", cache_control: { type: "ephemeral" } }], messages: [] })));
  expect(arr.system[0].text).toBe(MEDICATION_RULE);
  expect(arr.system.at(-1)).toEqual({ type: "text", text: "GUIDE", cache_control: { type: "ephemeral" } });   // cached block still last
  const once = withMedicationRule(JSON.stringify(arr));
  expect(JSON.parse(once).system.length).toBe(2);                                                          // never twice
  expect(withMedicationRule("not json")).toBe("not json");
  expect(MEDICATION_RULE).toMatch(/Never suggest starting, stopping or changing any medication or dose/);
  expect(MEDICATION_RULE).toMatch(/GP or pharmacist/);
});

test("v2.15.2: pinch-zoom is allowed (no maximum-scale / user-scalable=no)", async ({ page }) => {
  const html = fs.readFileSync("index.html", "utf8");
  expect(html).not.toMatch(/user-scalable\s*=\s*no|maximum-scale/);
  const { errors } = await openApp(page);
  expect(await page.locator('meta[name="viewport"]').getAttribute("content")).toBe("width=device-width, initial-scale=1.0");
  expect(errors).toEqual([]);
});

test("v2.15.2: every AI request from the app carries the medication rule (Chat and Help)", async ({ page }) => {
  const { errors, aiCalls } = await openApp(page);
  await page.getByTitle("Chat with your Companion").or(page.getByRole("button", { name: "Chat with your Companion" })).first().click();
  await page.locator("#qa-input-jc").fill("Should I stop my statins?");
  await page.locator("#qa-input-jc").locator("xpath=following-sibling::button").click();
  await expect(page.getByText(MOCK_TEXT).first()).toBeVisible();
  await page.getByRole("button", { name: "Close chat" }).click();   // v2.17.0: the ✕ has a label
  await page.getByRole("button", { name: /Help/ }).first().click();
  const box = page.locator("textarea:visible, input[type=text]:visible").last();
  await box.fill("How do I add a meal?"); await box.press("Enter");
  if (!(await page.getByText(MOCK_TEXT).count())) await page.getByRole("button", { name: /Send|Ask/ }).last().click();
  await expect.poll(() => aiCalls.filter((b) => b && b.max_tokens !== 1).length).toBeGreaterThanOrEqual(2);
  // the daily energy ping ("hi", max_tokens 1, no data) bypasses the wrapper on purpose; everything else carries the rule
  const real = aiCalls.filter((b) => b && b.max_tokens !== 1);
  expect(real.length).toBeGreaterThanOrEqual(2);
  for (const b of real) expect(sys(b)).toContain(MEDICATION_RULE);
  for (const b of aiCalls.filter((b) => b && b.max_tokens === 1)) expect(JSON.stringify(b.messages)).toBe('[{"role":"user","content":"hi"}]');
  const help = aiCalls.find((b) => Array.isArray(b.system) && sys(b).includes("=== APP GUIDE ==="));
  expect(help.system.at(-1).cache_control).toEqual({ type: "ephemeral" });
  expect(errors).toEqual([]);
});
