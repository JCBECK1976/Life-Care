import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp } from "./helpers.js";

// v2.23.0 (N6): steps from Health Connect. The health store is a stand-in (window.__lcHealth, development only).
const DB = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const getKey = async (k) => { const v = await (await fetch(DB(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const TODAY = iso(new Date());

// The stand-in: steps 9,000 + day index; active calories 300; permission answers set per test.
async function fakeHealth(page, opts) {
  await page.addInitScript((o) => {
    localStorage.setItem("lc_flags", JSON.stringify({ useSteps: true }));
    if (o.device) localStorage.setItem("lc_steps_device", JSON.stringify(o.device));
    window.__hc = { asked: [] };
    window.__lcHealth = {
      platform: "android",
      isAvailable: async () => (o.available === false ? { available: false, reason: o.reason || "Health Connect is not installed" } : { available: true }),
      requestAuthorization: async (r) => { window.__hc.asked.push(r); return { readAuthorized: o.deny ? [] : r.read, readDenied: o.deny ? r.read : [], writeAuthorized: [], writeDenied: [] }; },
      queryAggregated: async (q) => {
        window.__hc.asked.push(q.dataType);
        const start = new Date(q.startDate), out = [];
        for (let i = 0; i < 8; i++) { const d = new Date(start); d.setDate(d.getDate() + i); out.push({ startDate: d.toISOString(), endDate: d.toISOString(), value: q.dataType === "steps" ? 9000 + i : 300, values: {}, unit: "count" }); }
        return { samples: out };
      },
      openHealthConnectSettings: async () => { window.__hc.opened = true; },
    };
  }, opts || {});
}
const settings = (page) => page.locator('button[title="Settings"]').first().click();

test("calorie model: no steps → activity factor; steps → BMR × 1.15 + steps above the allowance + exercise; active calories → used as-is; source shown", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async (today) => {
    const g = await import("/Life-Care/src/lib/goals.js");
    const data = window._lcData; const p = JSON.parse(JSON.stringify(data.jc));
    p.dailyActivity = {}; p.googleDaily = {};
    const a = g.dayTable(p, today);
    p.dailyActivity[today] = { steps: 12000, source: "Health Connect" };
    const b = g.dayTable(p, today);
    p.dailyActivity[today] = { steps: 12000, activeKcal: 400, source: "Health Connect" };
    const c = g.dayTable(p, today);
    return { a: [a.measured, a.exercise.mode, a.burn, a.bmr], b: [b.measured, b.exercise.mode, b.burn, b.bmr, b.exercise.steps, b.exercise.source], c: [c.exercise.mode, c.exercise.actual, c.exercise.activeKcal, c.goal.actual - c.burn - c.aim.kcal] };
  }, TODAY);
  expect(r.a[0]).toBe(false); expect(r.a[1]).toBe("parts");
  expect(r.b[0]).toBe(true); expect(r.b[2]).toBe(Math.round(r.b[3] * 1.15));             // steps override the activity factor
  expect(r.b[4]).toBeGreaterThan(0); expect(r.b[5]).toBe("Health Connect");
  expect(r.c[0]).toBe("active"); expect(r.c[2]).toBe(400);
  expect(r.c[1]).toBeGreaterThan(0);
});

test("joint account: 'Whose steps are on this phone?' → Becks → Connect: steps (only) read, written to Becks only; JC untouched", async ({ page }) => {
  await fakeHealth(page);
  const { errors } = await openApp(page);
  const jcBefore = JSON.stringify(((await getKey("dashboard:data")).jc.dailyActivity) || {});
  await settings(page);
  const card = page.getByTestId("steps-card");
  await expect(card.getByTestId("steps-connect")).toBeDisabled();                         // choose whose steps first
  await card.getByLabel("Becks").check();
  await card.getByTestId("steps-connect").click();
  await expect(card.getByTestId("steps-connected")).toContainText("Health Connect · steps for Becks");
  await expect(card.getByTestId("steps-msg")).toContainText("last 8 days");
  expect(await page.evaluate(() => window.__hc.asked[0])).toEqual({ read: ["steps"], write: [] });   // steps only; nothing written
  await expect.poll(async () => (((await getKey("dashboard:data")).becks.dailyActivity || {})[TODAY] || {}).steps).toBe(9007);
  const d = await getKey("dashboard:data");
  expect(d.becks.dailyActivity[TODAY]).toMatchObject({ steps: 9007, source: "Health Connect" });
  expect(d.becks.dailyActivity[TODAY].activeKcal).toBeUndefined();
  expect(JSON.stringify(d.jc.dailyActivity || {})).toBe(jcBefore);                         // per-person isolation
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem("lc_steps_device"))).person).toBe("becks");   // per device
  expect(errors).toEqual([]);
});

test("active calories toggle: asks for both, stores activeKcal; the choice and the person can be changed later", async ({ page }) => {
  await fakeHealth(page, { device: { source: "none", person: "jc", activeCalories: true } });
  await openApp(page);
  await settings(page);
  const card = page.getByTestId("steps-card");
  await card.getByTestId("steps-connect").click();
  await expect(card.getByTestId("steps-connected")).toContainText("steps for JC");
  expect(await page.evaluate(() => window.__hc.asked[0])).toEqual({ read: ["steps", "calories"], write: [] });
  await expect.poll(async () => (((await getKey("dashboard:data")).jc.dailyActivity || {})[TODAY] || {}).activeKcal).toBe(300);
  await card.getByLabel("Becks").check();                                                  // change whose phone
  await card.getByTestId("steps-sync").click();
  await expect.poll(async () => (((await getKey("dashboard:data")).becks.dailyActivity || {})[TODAY] || {}).steps).toBe(9007);
});

test("app open syncs a connected phone; Disconnect keeps the totals, or deletes only what Health Connect wrote", async ({ page }) => {
  await fakeHealth(page, { device: { source: "healthConnect", person: "becks", activeCalories: false } });
  await openApp(page);
  await expect.poll(async () => (((await getKey("dashboard:data")).becks.dailyActivity || {})[TODAY] || {}).steps).toBe(9007);   // on open
  await settings(page);
  const card = page.getByTestId("steps-card");
  await card.getByTestId("steps-delete").check();
  await card.getByTestId("steps-disconnect").click();
  await expect(card.getByTestId("steps-msg")).toContainText("8 stored daily totals deleted");
  await expect.poll(async () => JSON.stringify((await getKey("dashboard:data")).becks.dailyActivity || {})).not.toContain("Health Connect");
  await expect(card.getByTestId("steps-connect")).toBeVisible();
});

test("guide: Health Connect missing → Play Store link + Samsung Health steps; permission denied → open Health Connect settings", async ({ page }) => {
  await fakeHealth(page, { available: false, device: { person: "jc" } });
  await openApp(page);
  await settings(page);
  const card = page.getByTestId("steps-card");
  await card.getByTestId("steps-connect").click();
  const g = card.getByTestId("steps-guide");
  await expect(g).toContainText("isn't on this phone yet");
  await expect(g.getByTestId("hc-play-link")).toHaveAttribute("href", "https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata");
  await expect(g).toContainText("Samsung Health → Settings → Health Connect");
});

test("guide when steps are refused; Bronze sees 'part of Silver' instead of Connect", async ({ page }) => {
  await fakeHealth(page, { deny: true, device: { person: "jc" } });
  await openApp(page);
  await settings(page);
  const card = page.getByTestId("steps-card");
  await card.getByTestId("steps-connect").click();
  await expect(card.getByTestId("steps-guide")).toContainText("Steps weren't allowed");
  await card.getByTestId("hc-open-settings").click();
  expect(await page.evaluate(() => window.__hc.opened)).toBe(true);
  // Bronze (an ordinary account with plans on)
  await page.evaluate(async () => { localStorage.setItem("lc_flags", JSON.stringify({ useSteps: true, useTiers: true })); });
});

test("Bronze: Connect my steps is part of Silver", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useSteps: true, useTiers: true })));
  await openApp(page, "member");
  await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  await settings(page);
  await expect(page.getByTestId("steps-card").getByTestId("plan-gate-healthSync")).toContainText("Steps and health sync is part of Silver.");
});

test("Android: only READ_STEPS and READ_ACTIVE_CALORIES_BURNED are requested; the rationale screen links the privacy policy; minSdk 26", () => {
  const m = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
  const kept = [...m.matchAll(/<uses-permission android:name="(android\.permission\.health\.[A-Z0-9_]+)" \/>/g)].map((x) => x[1]);
  expect(kept.sort()).toEqual(["android.permission.health.READ_ACTIVE_CALORIES_BURNED", "android.permission.health.READ_STEPS"]);
  const plugin = fs.readFileSync("node_modules/@capgo/capacitor-health/android/src/main/AndroidManifest.xml", "utf8");
  for (const p of [...plugin.matchAll(/android:name="(android\.permission\.health\.[A-Z0-9_]+)"/g)].map((x) => x[1]))
    if (!kept.includes(p)) expect(m, p).toContain('"' + p + '" tools:node="remove"');
  expect(fs.readFileSync("android/app/src/main/res/values/strings.xml", "utf8")).toContain("https://jcbeck1976.github.io/Life-Care/privacy-policy.html");
  expect(fs.readFileSync("android/variables.gradle", "utf8")).toMatch(/minSdkVersion = 26/);
});
