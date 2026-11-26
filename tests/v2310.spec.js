import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp } from "./helpers.js";
import { withCaching, answerPence, CACHE_MIN_CHARS } from "../src/lib/caching.js";

// v2.31.0 (Architect, 18 Nov — HELP/AI COST): prompt caching for large stable context on both AI paths.
const big = "x".repeat(CACHE_MIN_CHARS + 10);
const marks = (b) => JSON.stringify(b).split('"cache_control"').length - 1;

test("withCaching: long system → one breakpoint at its end; Help's own guide mark is kept; history gets one; short prompts untouched; never more than 4", () => {
  const s1 = withCaching({ system: big, messages: [{ role: "user", content: "hi" }] });
  expect(s1.system).toEqual([{ type: "text", text: big, cache_control: { type: "ephemeral" } }]);
  const short = { system: "Be kind.", messages: [{ role: "user", content: "hi" }] };
  expect(withCaching(short)).toEqual(short);                                                 // too short to cache: unchanged
  const help = { system: [{ type: "text", text: "rule" }, { type: "text", text: big, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: "q" }] };
  expect(withCaching(help)).toEqual(help);                                                   // already marked: kept as is
  const conv = { system: big, messages: [{ role: "user", content: big }, { role: "assistant", content: "a1" }, { role: "user", content: "q2" }] };
  const c = withCaching(conv);
  expect(c.messages[1].content).toEqual([{ type: "text", text: "a1", cache_control: { type: "ephemeral" } }]);   // the last earlier turn
  expect(c.messages[2]).toEqual(conv.messages[2]);                                           // the new question isn't
  expect(marks(c)).toBe(2); expect(marks(withCaching(c))).toBe(2);                           // applying twice changes nothing
  expect(conv.messages[1].content).toBe("a1");                                               // the input isn't changed
  expect(fs.readFileSync("src/lib/caching.js", "utf8")).toBe(fs.readFileSync("functions/src/caching.js", "utf8"));   // app = server
});

test("the app's real requests: Help sends the fixed part (cached) + only the matching sections; the rule stays first", async ({ page }) => {
  const { aiCalls } = await openApp(page);
  await page.getByRole("button", { name: /Help/ }).first().click();
  const box = page.locator("#help-input-jc"); const send = box.locator("xpath=following-sibling::button[1]");
  for (const q of ["How do I log a weigh-in?", "And how do I see my progress chart for weight over time?"]) { await box.fill(q); await send.click(); await expect(box).toBeEnabled(); }
  const help = aiCalls.filter((c) => c && Array.isArray(c.system) && JSON.stringify(c.system).includes("=== APP GUIDE ==="));
  expect(help.length).toBe(2);
  for (const h of help) {
    expect(h.system[0].text).toMatch(/^MEDICATION SAFETY/);                                  // the fixed rule first: identical prefix every time
    expect(h.system.filter((b) => b.cache_control).length).toBe(1);
    expect(h.system[h.system.length - 2].cache_control).toEqual({ type: "ephemeral" });       // v2.32.2: the fixed part (instructions + index)
    expect(h.system[h.system.length - 1].text).toMatch(/### My Body → My Body Stats/);           // only the matching sections (weigh-ins first)
  }
  expect(help[0].system[help[0].system.length - 2]).toEqual(help[1].system[help[1].system.length - 2]);   // the cached prefix is identical
  const chars = JSON.stringify(help[0].system).length;
  console.log("Help request: system " + chars + " chars ≈ " + Math.round(chars / 4) + " tokens");
  expect(chars).toBeLessThan(20000);                                                         // v2.32.2: was ~90,000 (the whole guide)
});

test("Energy per Help answer (modelled from the real request: v2.32.2 sends ~5 matching sections, not the whole guide)", async ({ page }) => {
  const { aiCalls } = await openApp(page);
  await page.getByRole("button", { name: /Help/ }).first().click();
  const box = page.locator("#help-input-jc"); const send = box.locator("xpath=following-sibling::button[1]");
  const qs = ["How do I log a weigh-in?", "How do I add a food to my breakfast list?", "Why is my calorie goal so low?", "What is Companion Energy?", "How do I connect my smart scales?"];
  for (const q of qs) { await box.fill(q); await send.click(); await expect(box).toBeEnabled(); }
  const help = aiCalls.filter((c) => c && Array.isArray(c.system) && JSON.stringify(c.system).includes("=== APP GUIDE ==="));
  expect(help.length).toBe(qs.length);
  const tok = (c) => Math.round(JSON.stringify(c.system).length / 4);
  const fixed = Math.round(JSON.stringify(help[0].system.slice(0, -1)).length / 4);                 // rule + instructions + index (the same every time)
  const avgSys = Math.round(help.reduce((a, c) => a + tok(c), 0) / help.length);
  const E = (u) => Math.round(answerPence(u) * 2 * 10) / 10;
  const old = E({ input_tokens: 22500 + 300, output_tokens: 350 });                                   // v2.31: the whole guide every time
  const now = E({ input_tokens: avgSys + 300, output_tokens: 350 });                                  // the fixed part is under the 1,024-token cache minimum
  console.log(JSON.stringify({ avgSystemTokens: avgSys, fixedTokens: fixed, energyBefore: old, energyNow: now }));
  expect(avgSys).toBeLessThan(4500);
  expect(now).toBeLessThan(old / 3);
});
