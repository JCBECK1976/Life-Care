import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { mockReplyFor } from "./mock-ai.js";
import { applyAiAdj, calcTarget, decideSuggestion, katchMcArdle, kcalLimit, leanMass, pendingSuggestion, r5PromptContext, recordAdj, toKg, weekDates } from "../src/lib/calories.js";
import { dailyTotals, fetchWeekCalories, mergeDaily } from "../src/lib/googleHealth.js";

// v2.16.2: R6 calorie target from measured burn, R4 Google Health rebuilt (fake Google service), R5 activity adjustment.
const DB = "http://127.0.0.1:9000/data/dashboard:data.json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const readData = async () => JSON.parse(await (await fetch(DB, { headers: H })).json());
const writeData = async (d) => fetch(DB, { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(d)) });
const body = { weight: [{ wk: 1, v: 13 }, { wk: 2, v: 13.2 }, { wk: 3, v: 13.1 }, { wk: 4, v: 13.1 }], bodyFat: [{ wk: 2, v: 20 }, { wk: 3, v: 21 }, { wk: 4, v: 22 }] };

test("R6 maths: stone → kg, rolling lean mass, Katch-McArdle, estimate without Google data", () => {
  expect(toKg(13)).toBeCloseTo(82.55, 1); expect(toKg(82)).toBe(82); expect(toKg("")).toBe(null);
  const lean = leanMass(body);
  expect(lean.n).toBe(3); expect(lean.leanKg).toBeCloseTo(83.07 * 0.79, 0);
  expect(katchMcArdle(65)).toBe(1774);
  expect(leanMass({ weight: body.weight, bodyFat: body.bodyFat.slice(0, 2) })).toBe(null);   // needs 3 weigh-ins
  const est = calcTarget({ body }, new Date(2026, 10, 14));
  expect(est.estimate).toBe(true); expect(est.target).toBe(Math.round(est.bmr * 1.2) - 500);
  expect(weekDates(new Date(2026, 10, 14))).toEqual(["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"]);
});

test("R6/R5 maths: activity credit = total − BMR (not below 0), × adjustment, label; limit only when active", () => {
  const p = { body, googleDaily: { "2026-11-09": { kcal: 2600 }, "2026-11-10": { kcal: 1500 }, "2026-11-01": { kcal: 9999 } } };
  const c = calcTarget(p, new Date(2026, 10, 14));
  const bmr = c.bmr;
  expect(c.days).toHaveLength(2);
  expect(c.avgCredit).toBe(Math.round((Math.max(0, 2600 - bmr) + 0) / 2));
  expect(c.label).toBe(c.avgBurned + " kcal burned · " + bmr + " deducted for your BMR (from body composition) · +" + c.avgCredit + " kcal from activity");
  p.calorieSettings = { adjPct: 50 };
  expect(calcTarget(p, new Date(2026, 10, 14)).avgCredit).toBe(Math.round(Math.max(0, 2600 - bmr) / 2 * 0.5));
  expect(kcalLimit(p, 2200)).toBe(2200);                      // R6 off → the fixed limit
  p.calorieSettings.r6Active = true;
  expect(kcalLimit(p, 2200)).not.toBe(2200);
});

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

test("UI: Home shows the calculated target 'not active'; Google sync with a fake Google service stores daily totals only; admin switch makes it active", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lc_gh_token_jc", JSON.stringify({ token: "fake-device-token", exp: Date.now() + 3600000 })));
  const { errors } = await openApp(page);
  let ghCalls = 0;
  await page.route("https://health.googleapis.com/**", (r) => { ghCalls++; const today = new Date(); today.setHours(9); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dataPoints: [{ startTime: today.toISOString(), value: { kcal: 2900 } }] }) }); });
  await tab(page, "My Body");
  const card = page.getByTestId("calorie-card");
  await card.scrollIntoViewIfNeeded();
  await expect(card.getByTestId("calorie-status")).toHaveText("Calculated (not active)");
  await expect(card).toContainText("estimate");
  // Settings → Google Health
  await page.locator("button").nth(1).click();
  const gh = page.getByTestId("gh-card");
  await expect(gh.getByTestId("gh-status")).toContainText("Connected on this device");
  await gh.getByRole("button", { name: /Sync this week's calories/ }).click();
  await expect(page.getByText(/Synced — 1 day\(s\) of calories burned this week/)).toBeVisible();
  expect(ghCalls).toBe(1);
  const d = await readData();
  expect(Object.values(d.jc.googleDaily)).toEqual([{ kcal: 2900, at: expect.any(String) }]);
  const all = await (await fetch("http://127.0.0.1:9000/data.json?ns=life-care-app-64d04-default-rtdb", { headers: H })).text();
  expect(all).not.toContain("fake-device-token");                     // token never in the database
  await expect(gh.getByTestId("gh-status")).toContainText("1 day(s) read");
  await gh.getByTestId("r6-switch").click();
  await expect(gh.getByTestId("r6-switch")).toHaveText("On");
  await tab(page, "My Body");
  await expect(page.getByTestId("calorie-status")).toHaveText("Active");
  await expect(page.getByTestId("calorie-label")).toContainText("2900 kcal burned");
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
  const sug = page.getByTestId("adj-suggestion");
  await sug.scrollIntoViewIfNeeded();
  await expect(sug).toContainText("Companion suggests 85% — Weight is falling slower than predicted.");
  await sug.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByTestId("adj-suggestion")).toHaveCount(0);
  const h = (await readData()).jc.calorieSettings;
  expect(h.adjHistory[0]).toMatchObject({ kind: "suggestion", value: 85, decision: "declined" });
  await expect(page.getByTestId("adj-pct")).toHaveText("100%");
  expect(errors).toEqual([]);
});
