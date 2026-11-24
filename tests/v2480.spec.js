import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { trainingStyleCtx, companionProfileCtx } from "../src/lib/profileCtx.js";

// v2.48.0 (Architect brief 24 Nov, P3): the person's training style (Strength + Cardio) and goal go to EVERY Companion.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const STYLE = { focus: "muscle", pace: "steady", cardio: { focus: "endurance", pace: "consolidate" } };
const LINE = "TRAINING STYLE (their own choice in My Profile";

test("the line: Strength + Cardio, and how eating and body advice use it", () => {
  const t = trainingStyleCtx({ trainingStyle: STYLE });
  expect(t).toContain("Strength — Muscle · 8–12 reps · Steady small steps");
  expect(t).toContain("Cardio — Endurance (go longer at a steady pace) · Consolidate a week, then move");
  expect(t).toMatch(/protein emphasis .* carbohydrate timing/);
  expect(t).toMatch(/some weight gain can be muscle/);
  expect(trainingStyleCtx({})).toContain("Strength — Mixed (your current ranges) · Steady small steps; Cardio — focus not chosen · pace not chosen");
  expect(companionProfileCtx({ trainingStyle: STYLE })).toContain(LINE);
});

test("every Companion's request includes the style: Chat, Help, Home, Eating, Body, Health, Session feedback, Meals Generator", async ({ page }) => {
  test.setTimeout(180000);
  const calls = [];
  await openApp(page);
  await page.route("https://api.anthropic.com/**", (r) => { calls.push({ b: r.request().postData() || "" }); return r.fallback(); });   // record, then the usual mock (the plan-feature tag is removed on the device, so it can't be checked here)
  const dash = await get("dashboard:data"); dash.jc.trainingStyle = STYLE; await put("dashboard:data", dash);
  const fr = (await get("feedback_results")) || {}; fr.jc = { summary: "Good week", good: ["a"], opportunities: ["b"], focus: ["c"] }; await put("feedback_results", fr);
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  const sent = async (label, feature, act) => {
    const n0 = calls.length; await act();
    const mine = () => calls.slice(n0);
    await expect.poll(() => mine().length, { message: label + " sent no request" }).toBeGreaterThan(0);
    await page.waitForTimeout(300);
    expect(mine().every((c) => c.b.includes(LINE)), label + ": every request it sent carries the style (" + feature + ")").toBe(true);
  };
  const ask = async (sel, q) => { const box = page.locator(sel); await box.fill(q); await box.locator("xpath=following-sibling::button[1]").click(); };
  await sent("Chat", "chat", async () => { await page.getByTitle("Chat with your Companion").or(page.getByRole("button", { name: "Chat with your Companion" })).first().click(); await ask("#qa-input-jc", "What should I eat after training?"); });
  await page.keyboard.press("Escape");
  await sent("Help", "aiHelp", async () => { await page.getByRole("button", { name: /Help/ }).first().click(); await ask("#help-input-jc", "Where is my training style?"); });
  await page.keyboard.press("Escape");
  await sent("Home", "aiFeedback", async () => { await tab(page, "Home"); await page.getByRole("button", { name: "▼ Show Feedback" }).first().click(); await ask("#thread-input-home-jc", "Anything to change?"); });
  await sent("Eating", "aiFeedback", async () => { await tab(page, "My Eating"); await page.getByRole("button", { name: "My Companion Eating Feedback" }).first().click(); });
  await sent("Meals Generator", "mealGenerator", async () => { await page.getByText("Week", { exact: true }).first().click(); await page.getByRole("button", { name: "My Companion Meals Generator" }).click(); });
  await sent("Body", "aiFeedback", async () => { await tab(page, "My Body"); await page.getByRole("button", { name: "My Companion Body Feedback" }).first().click(); });
  await sent("Health", "aiFeedback", async () => { await tab(page, "My Health"); await page.getByRole("button", { name: "My Companion Health Feedback" }).first().click(); });
  await sent("Session feedback", "aiFeedback", async () => { await tab(page, "My Exercise"); await page.getByRole("button", { name: "Sun", exact: true }).click(); await page.getByRole("button", { name: "My Companion Session Feedback" }).first().click(); });
});
