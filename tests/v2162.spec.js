import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { mockReplyFor } from "./mock-ai.js";
import { applyAiAdj, decideSuggestion, pendingSuggestion, r5PromptContext, recordAdj } from "../src/lib/calories.js";  // v2.17.1: R6 maths moved to tests/v2171.spec.js
import { dailyTotals, fetchWeekCalories, mergeDaily } from "../src/lib/googleHealth.js";

// v2.16.2: R6 calorie target from measured burn, R4 Google Health rebuilt (fake Google service), R5 activity adjustment.
const DB = "http://127.0.0.1:9000/data/dashboard:data.json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const readData = async () => JSON.parse(await (await fetch(DB, { headers: H })).json());
const writeData = async (d) => fetch(DB, { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(d)) });
const body = { weight: [{ wk: 1, v: 13 }, { wk: 2, v: 13.2 }, { wk: 3, v: 13.1 }, { wk: 4, v: 13.1 }], bodyFat: [{ wk: 2, v: 20 }, { wk: 3, v: 21 }, { wk: 4, v: 22 }] };

test("R5: manual change acknowledged once; suggestion accept/decline; a decline is respected for 4 weeks", () => {
  const p = { body };
  recordAdj(p, { kind: "manual", value: 80 });
  expect(p.calorieSettings.adjPct).toBe(80);
  expect(r5PromptContext(p)).toContain("acknowledge this ONCE");
  applyAiAdj(p, { value: 90, reason: "Weight fell faster than predicted." });
  expect(r5PromptContext(p)).not.toContain("acknowledge this ONCE");
  expect(pendingSuggestion(p)).toMatchObject({ kind: "suggestion", value: 90 });
  decideSuggestion(p, "declined");
  expect(p.calorieSettings.adjPct).toBe(80);
  expect(r5PromptContext(p)).toContain("do NOT suggest again yet");
  expect(r5PromptContext(p, new Date(Date.now() + 30 * 86400000))).toContain("compare the predicted weight change");
  applyAiAdj(p, { value: 95, reason: "x" }); decideSuggestion(p, "accepted");
  expect(p.calorieSettings.adjPct).toBe(95);
  expect(p.calorieSettings.adjHistory.every((e) => Object.keys(e).every((k) => ["date", "kind", "value", "reason", "decision", "decidedOn", "acknowledged"].includes(k)))).toBe(true);
});

test("R4 client: daily totals by date; 401 → expired; other errors honest; merge keeps 12 months", async () => {
  const json = { dataPoints: [{ startTime: "2026-11-09T08:00:00Z", value: { kcal: 1200 } }, { startTime: "2026-11-09T18:00:00Z", value: { floatValue: 1300 } }, { interval: { startTime: "2026-11-10T09:00:00Z" }, value: 2100 }] };
  expect(dailyTotals(json)).toEqual({ "2026-11-09": 2500, "2026-11-10": 2100 });
  const fake = (status, j) => async () => ({ status, ok: status < 300, json: async () => j });
  await expect(fetchWeekCalories("t", new Date(2026, 10, 14), fake(401))).rejects.toMatchObject({ expired: true });
  await expect(fetchWeekCalories("t", new Date(2026, 10, 14), fake(500))).rejects.toThrow("HTTP 500");
  expect(await fetchWeekCalories("t", new Date(2026, 10, 14), fake(200, json))).toEqual({ "2026-11-09": 2500, "2026-11-10": 2100 });
  const p = { googleDaily: { "2025-01-01": { kcal: 1 } } };
  mergeDaily(p, { "2026-11-09": 2500.4 }, new Date(2026, 10, 14).getTime());
  expect(p.googleDaily).toEqual({ "2026-11-09": { kcal: 2500, at: expect.any(String) } });
});

test("UI: Google sync with a fake Google service stores daily totals (calories + steps) only; the token never reaches the database", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lc_gh_token_jc", JSON.stringify({ token: "fake-device-token", exp: Date.now() + 3600000 })));
  const { errors } = await openApp(page);
  await page.route("https://health.googleapis.com/**", (r) => { const today = new Date(); today.setHours(9); const steps = /\/steps\//.test(r.request().url()); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dataPoints: [{ startTime: today.toISOString(), value: steps ? { intValue: 8200 } : { kcal: 2900 } }] }) }); });
  await page.locator("button").nth(1).click();
  const gh = page.getByTestId("gh-card");
  await expect(gh.getByTestId("gh-status")).toContainText("Connected on this device");
  await gh.getByRole("button", { name: /Sync this week's calories/ }).click();
  await expect(page.getByText(/Synced — 1 day\(s\) of calories burned, 1 day\(s\) of steps this week/)).toBeVisible();
  const d = await readData();
  expect(Object.values(d.jc.googleDaily)).toEqual([{ kcal: 2900, at: expect.any(String) }]);
  expect(Object.values(d.jc.dailyActivity)[0]).toMatchObject({ steps: 8200, source: "Google Health" });
  const all = await (await fetch("http://127.0.0.1:9000/data.json?ns=life-care-app-64d04-default-rtdb", { headers: H })).text();
  expect(all).not.toContain("fake-device-token");
  await tab(page, "My Exercise");
  const wd = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
  await page.getByRole("button", { name: wd, exact: true }).click();
  await expect(page.getByTestId("day-steps")).toContainText("8,200 steps (Google Health)");
  expect(errors).toEqual([]);
});

test("UI: an expired Google session says so (no false ✓ Synced) and disconnects", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lc_gh_token_jc", JSON.stringify({ token: "old", exp: Date.now() + 3600000 })));
  const { errors } = await openApp(page);
  await page.route("https://health.googleapis.com/**", (r) => r.fulfill({ status: 401, body: "{}" }));
  await page.locator("button").nth(1).click();
  const gh = page.getByTestId("gh-card");
  await gh.getByRole("button", { name: /Sync this week's calories/ }).click();
  await expect(page.getByText(/expired or not allowed — reconnect/).first()).toBeVisible();
  await expect(gh.getByRole("button", { name: "🔗 Connect Google Health" })).toBeVisible();
  await expect(page.getByText(/✓ Synced/)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("lc_gh_token_jc"))).toBe(null);
  expect(errors).toEqual([]);
});

test("UI R5: Body feedback's suggestion appears on Home; Decline is recorded and kept", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.route("https://api.anthropic.com/**", async (route) => {
    let b = null; try { b = route.request().postDataJSON(); } catch {}
    const prompt = JSON.stringify(b || {});
    if (/ACTIVITY CALORIE ADJUSTMENT/.test(prompt)) {
      const r = mockReplyFor(b); r.content[0].text = JSON.stringify({ wins: ["w"], tweaks: ["t"], outlook: "o", adjSuggestion: { value: 85, reason: "Weight is falling slower than predicted." } });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(r) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockReplyFor(b)) });
  });
  await tab(page, "My Body");
  await page.getByRole("button", { name: "My Companion Body Feedback" }).click();
  await expect.poll(async () => { const d = await readData(); return d.jc.calorieSettings && d.jc.calorieSettings.adjHistory && d.jc.calorieSettings.adjHistory.length; }).toBe(1);
  await tab(page, "Home");
  const sug = page.getByTestId("calorie-home").getByTestId("adj-suggestion");
  await sug.scrollIntoViewIfNeeded();
  await expect(sug).toContainText("Companion suggests 85% — Weight is falling slower than predicted.");
  await sug.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByTestId("calorie-home").getByTestId("adj-suggestion")).toHaveCount(0);
  const h = (await readData()).jc.calorieSettings;
  expect(h.adjHistory[0]).toMatchObject({ kind: "suggestion", value: 85, decision: "declined" });
  await expect(page.getByTestId("calorie-home").getByTestId("adj-pct")).toHaveText("100%");
  expect(errors).toEqual([]);
});
