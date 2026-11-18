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

test("the app's real requests: Help keeps the guide breakpoint; follow-up questions also cache the conversation; the rule stays first", async ({ page }) => {
  const { aiCalls } = await openApp(page);
  await page.getByRole("button", { name: /Help/ }).first().click();
  const box = page.locator("#help-input-jc"); const send = box.locator("xpath=following-sibling::button[1]");
  for (const q of ["How do I log a weigh-in?", "And how do I see my progress chart for weight over time?"]) { await box.fill(q); await send.click(); await expect(box).toBeEnabled(); }
  const help = aiCalls.filter((c) => c && Array.isArray(c.system) && JSON.stringify(c.system).includes("app guide"));
  expect(help.length).toBe(2);
  for (const h of help) {
    expect(h.system[0].text).toMatch(/^MEDICATION SAFETY/);                                  // the fixed rule first: identical prefix every time
    expect(h.system.filter((b) => b.cache_control).length).toBe(1);
    expect(h.system[h.system.length - 1].cache_control).toEqual({ type: "ephemeral" });       // the guide: cached
  }
  const chars = JSON.stringify(help[0].system).length;
  console.log("Help request: system " + chars + " chars ≈ " + Math.round(chars / 4) + " tokens");
  expect(chars).toBeGreaterThan(60000);                                                      // the whole guide goes with every question
});

test("Energy per Help answer (modelled from the real request size, Sonnet prices): ~12 with no cache hit, ~14 first in a session, ~2 for follow-ups", () => {
  const guideTokens = Math.round(fs.readFileSync("APP_GUIDE.md", "utf8").length / 4) + 400;   // + instructions and the rule
  const E = (u) => Math.round(answerPence(u) * 2 * 10) / 10;                                 // Energy = AI cost in pence × 2
  const before = E({ input_tokens: guideTokens + 300, output_tokens: 350 });
  const first = E({ input_tokens: 300, cache_creation_input_tokens: guideTokens, output_tokens: 350 });
  const follow = E({ input_tokens: 300, cache_read_input_tokens: guideTokens, output_tokens: 350 });
  console.log(JSON.stringify({ guideTokens, before, first, follow, avg2: (first + follow) / 2, avg3: (first + 2 * follow) / 3 }));
  expect(before).toBeGreaterThan(10); expect(before).toBeLessThan(14);
  expect(follow).toBeLessThan(before / 4);
});

test("Chat: the persona, profile summary and data go in the (cached) system prompt — identical from one question to the next; the message is only the question", async ({ page }) => {
  const { aiCalls } = await openApp(page);
  await page.getByTitle("Chat with your Companion").or(page.getByRole("button", { name: "Chat with your Companion" })).first().click();
  const box = page.locator("#qa-input-jc"); const send = box.locator("xpath=following-sibling::button[1]");
  for (const q of ["How is my week going?", "What should I eat tonight?"]) { await box.fill(q); await send.click(); await expect(box).toBeEnabled(); }
  const chats = aiCalls.filter((c) => c && c.max_tokens > 1 && JSON.stringify(c.messages).includes("Question: "));
  expect(chats.length).toBe(2);
  expect(chats[0].system).toEqual(chats[1].system);                                          // same prefix → the second reads it from the cache
  expect(chats[0].system[chats[0].system.length - 1].cache_control).toEqual({ type: "ephemeral" });
  expect(JSON.stringify(chats[0].system)).toContain("Lifecare Companion");                   // the persona and profile moved, words unchanged
  expect(JSON.stringify(chats[0].system)).toContain("MEDICATION SAFETY");
  expect(chats[1].messages[chats[1].messages.length - 1]).toEqual({ role: "user", content: "Question: What should I eat tonight?" });
});
