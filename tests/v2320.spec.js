import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.32.0 (Architect, 18 Nov): automatic weigh-ins, the guided health setup and the scales advice (flag useWeighIns).
// The health store is a stand-in (window.__lcHealth, development only): steps by day + weight/body-fat samples.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const dash = async () => JSON.parse(await (await fetch("http://127.0.0.1:9000/data/dashboard:data.json" + NS, { headers: H })).json());
const putDash = (d) => fetch("http://127.0.0.1:9000/data/dashboard:data.json" + NS, { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(d)) });
const ready = (page) => expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });

/** A phone with Health Connect: steps (o.steps per day, 0 = none arriving) and weigh-ins o.weights = [[daysAgo, "HH:MM", kg, fat?, app]]. */
async function phone(page, o = {}) {
  await page.addInitScript((o) => {
    localStorage.setItem("lc_flags", JSON.stringify(Object.assign({ useSteps: true, useWeighIns: true }, o.flags || {})));
    if (o.device && !localStorage.getItem("lc_steps_device")) localStorage.setItem("lc_steps_device", JSON.stringify(o.device));   // the phone's settings survive a reload
    window.__hc = { asked: [] };
    const at = (ago, hm) => { const d = new Date(); d.setDate(d.getDate() - ago); const [h, m] = hm.split(":"); d.setHours(+h, +m, 0, 0); return d.toISOString(); };
    window.__lcHealth = {
      platform: o.platform || "android",
      isAvailable: async () => (o.available === false ? { available: false, reason: "Health Connect is not installed" } : { available: true }),
      requestAuthorization: async (r) => { window.__hc.asked.push(r.read.join("+")); return { readAuthorized: o.denyWeight && r.read.includes("weight") ? [] : r.read, readDenied: [] }; },
      queryAggregated: async (q) => {
        const start = new Date(q.startDate), out = [];
        for (let i = 0; i < 8; i++) { const d = new Date(start); d.setDate(d.getDate() + i); out.push({ startDate: d.toISOString(), endDate: d.toISOString(), value: q.dataType === "steps" ? (o.steps == null ? 4200 + i : o.steps) : 300, unit: "count" }); }
        return { samples: out };
      },
      readSamples: async (q) => {
        window.__hc.asked.push("read:" + q.dataType + ":" + Math.round((new Date(q.endDate) - new Date(q.startDate)) / 86400000));
        const ws = o.weights || [];
        return { samples: ws.filter((w) => q.dataType === "weight" || w[3] != null).map((w) => ({ dataType: q.dataType, value: q.dataType === "weight" ? w[2] : w[3], unit: q.dataType === "weight" ? "kilogram" : "percent", startDate: at(w[0], w[1]), endDate: at(w[0], w[1]), sourceName: w[4] || "com.fitdays.fitdays" })) };
      },
      openHealthConnectSettings: async () => { window.__hc.asked.push("open-settings"); },
    };
  }, o);
}

test("pure: one reading per day (the earliest), the app's name, typed weigh-ins win ('also recorded'), the rolling BMR follows, disconnect deletes only imports", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async () => {
    const w = await import("/Life-Care/src/lib/weighIns.js"); const c = await import("/Life-Care/src/lib/calories.js");
    const s = (iso, v, src) => ({ startDate: iso, value: v, sourceName: src });
    const days = w.perDay([s("2026-11-16T19:00:00", 72.4, "com.fitdays.fitdays"), s("2026-11-16T07:05:00", 71.8, "com.fitdays.fitdays"), s("2026-11-09T07:00:00", 72.6, "Renpho Health"), s("2026-11-02T07:10:00", 73.1, "com.withings.wiscale2"), s("2026-11-15T07:00:00", 999, "x")],
      [s("2026-11-16T07:05:00", 0.241), s("2026-11-09T07:00:00", 24.6), s("2026-11-02T07:00:00", 25.0)]);
    const p = { profile: { sex: "Female", age: "46", height: "165" }, body: { weight: [{ wk: 16, v: 73.4 }], bodyFat: [] } };   // a typed weigh-in for week 16 (1–7 Nov)
    const before = c.bmrOf(p).method;
    const changed = w.mergeWeighIns(p, days);
    const after = c.bmrOf(p);
    const again = w.mergeWeighIns(p, days);
    const also = w.alsoRecorded(p, 16);
    const q = JSON.parse(JSON.stringify(p)); const n = w.removeWeighIns(q);
    return { days, changed, again, weight: p.body.weight, fat: p.body.bodyFat, before, after, also, n, left: q.body.weight, labels: ["com.fitdays.fitdays", "Renpho Health", "com.sec.android.app.shealth", "com.example.mybodyapp", ""].map(w.sourceLabel), manual: w.manualCount(p) };
  });
  expect(r.days["2026-11-16"]).toEqual({ kg: 71.8, source: "Fitdays", time: "07:05", fatPct: 24.1 });          // the earliest; a fraction → %
  expect(Object.keys(r.days).sort()).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);                      // 999 kg ignored
  expect(r.days["2026-11-02"].source).toBe("Withings");
  expect(r.weight).toEqual([{ wk: 16, v: 73.4 }, { wk: 17, v: 72.6, src: "Renpho", day: "2026-11-09" }, { wk: 18, v: 71.8, src: "Fitdays", day: "2026-11-16" }]);   // typed week 16 kept
  expect(r.fat.map((x) => x.wk)).toEqual([16, 17, 18]);                                                        // body fat for every imported week (none typed)
  expect([r.changed, r.again]).toEqual([true, false]);                                                         // re-reading the same days changes nothing
  expect(r.also).toMatchObject({ day: "2026-11-02", kg: 73.1, source: "Withings" });                           // shown as "also recorded"
  expect(r.before).not.toBe("katch"); expect(r.after.method).toBe("katch");                                    // 3 weigh-ins with body fat → Katch-McArdle
  expect(r.n).toBe(3); expect(r.left).toEqual([{ wk: 16, v: 73.4 }]);                                          // delete: imports only
  expect(r.labels).toEqual(["Fitdays", "Renpho", "Samsung Health", "Mybodyapp", "your scales app"]);
  expect(r.manual).toBe(1);
});

test("Settings: Import my weigh-ins — asks for weight + body fat only, reads 30 days the first time, stores them for the person on this phone only (shared account), then 8 days", async ({ page }) => {
  await phone(page, { device: { source: "healthConnect", person: "becks" }, weights: [[0, "07:02", 64.2, 27.5], [0, "08:30", 64.9, null], [3, "07:00", 64.6, 27.9], [9, "07:10", 65.1, 28.1]] });
  const { errors } = await openApp(page);
  await page.locator('button[title="Settings"]').first().click();
  await page.getByTestId("weighins-toggle").check();
  await expect(page.getByTestId("steps-msg")).toContainText("Weigh-ins on: found 3 from Fitdays");
  const asked = await page.evaluate(() => window.__hc.asked);
  expect(asked).toContain("weight+bodyFat");                                                                   // only these two
  expect(asked).toContain("read:weight:30");
  const d = await dash();
  expect(Object.keys(d.becks.weighIns || {}).length).toBe(3);
  expect(d.jc.weighIns).toBeUndefined();                                                                       // never the other person
  expect(Object.values(d.becks.weighIns).map((x) => x.kg).sort()).toEqual([64.2, 64.6, 65.1]);                 // 07:02 beats 08:30 the same day
  await page.reload(); await ready(page);                                                                      // the next open: the last 8 days only
  await expect.poll(() => page.evaluate(() => window.__hc.asked.filter((a) => a.startsWith("read:weight")))).toContain("read:weight:8");
  expect(errors).toEqual([]);
});

test("My Body: the weigh-ins list says where each came from; a typed weigh-in that week wins and the import shows as 'also recorded'", async ({ page }) => {
  await phone(page, { device: { source: "healthConnect", person: "jc", weighIns: true }, weights: [[0, "07:00", 80.2, 21.0], [1, "07:00", 80.6, 21.2]] });
  await openApp(page);
  await expect.poll(async () => Object.keys((await dash()).jc.weighIns || {}).length).toBe(2);                 // the first import has been saved
  const d = await dash(); const wkNow = d.config.week;
  d.jc.body.weight = (d.jc.body.weight || []).filter((e) => e.wk !== wkNow).concat([{ wk: wkNow, v: 81 }]);   // JC typed this week's weigh-in
  await putDash(d); await page.reload(); await ready(page);
  await tab(page, "My Body");
  await expect(page.getByTestId("weighins-list")).toContainText("from Fitdays");
  await expect(page.getByTestId("also-recorded").first()).toContainText("your typed weigh-in for week");
  const after = await dash();
  expect(after.jc.body.weight.find((e) => e.wk === wkNow)).toEqual({ wk: wkNow, v: 81 });                      // the typed one is kept
});

test("disconnect: switching weigh-ins off stops the import and (if ticked) deletes imported readings — typed weigh-ins untouched", async ({ page }) => {
  await phone(page, { device: { source: "healthConnect", person: "jc", weighIns: true }, weights: [[0, "07:00", 80.2, 21.0], [8, "07:00", 80.9, 21.4]] });
  await openApp(page);
  await expect.poll(async () => Object.keys((await dash()).jc.weighIns || {}).length).toBe(2);
  const typedBefore = (await dash()).jc.body.weight.filter((e) => !e.src);
  await page.locator('button[title="Settings"]').first().click();
  await page.getByTestId("weighins-delete").check();
  await page.getByTestId("weighins-toggle").click();                                                          // switching off finishes after the save
  await expect(page.getByTestId("steps-msg")).toContainText("2 imported readings deleted; your typed weigh-ins are kept");
  const d = await dash();
  expect(d.jc.weighIns).toBeUndefined();
  expect(d.jc.body.weight.filter((e) => e.src)).toEqual([]);
  expect(d.jc.body.weight).toEqual(typedBefore);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("lc_steps_device")).weighIns)).toBe(false);
});

test("guided setup: Allow → data arrives → '✓ Connected: today so far N steps' → scales Yes → '✓ Found weigh-ins from Fitdays'", async ({ page }) => {
  await phone(page, { device: { person: "jc" }, steps: 5321, weights: [[1, "07:00", 80.2, 21.0]] });
  await openApp(page);
  await page.locator('button[title="Settings"]').first().click();
  await page.getByTestId("health-setup-open").click();
  const s = page.getByTestId("health-setup");
  await s.getByTestId("hs-allow").click();
  await expect(s.getByTestId("hs-connected")).toContainText("today so far 5,321 steps");
  await s.getByTestId("hs-scales-yes").click();
  await expect(s.getByTestId("hs-scales-found")).toContainText("Found weigh-ins from Fitdays — latest 80.2 kg · 21% body fat");
});

test("guided setup check paths: no Health Connect → Play link; nothing arriving → the fix for the phone (Samsung) + Open Health Connect; no weigh-ins → how to turn on sync; skippable", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36" }));
  await phone(page, { device: { person: "jc" }, steps: 0, weights: [] });
  await openApp(page);
  await page.locator('button[title="Settings"]').first().click();
  await page.getByTestId("health-setup-open").click();
  const s = page.getByTestId("health-setup");
  await s.getByTestId("hs-allow").click();
  await expect(s.getByTestId("hs-fix-nodata")).toContainText("no steps have arrived in the last 24 hours");
  await expect(s.getByTestId("hs-fix-samsung")).toContainText("Samsung Health → ⋮ → Settings → Health Connect");
  await s.getByTestId("hs-open-hc").click();
  expect(await page.evaluate(() => window.__hc.asked)).toContain("open-settings");
  await s.getByTestId("hs-skip").click();
  await expect(page.getByTestId("health-setup")).toHaveCount(0);
});

test("guided setup: Health Connect missing → the Google Play link", async ({ page }) => {
  await phone(page, { device: { person: "jc" }, available: false });
  await openApp(page);
  await page.locator('button[title="Settings"]').first().click();
  await page.getByTestId("health-setup-open").click();
  await page.getByTestId("hs-allow").click();
  await expect(page.getByTestId("hs-play-link")).toHaveAttribute("href", /id=com\.google\.android\.apps\.healthdata/);
});

test("guided setup: scales with no weigh-ins yet → how to turn on sync in the scales app (never claims to see other apps first)", async ({ page }) => {
  await phone(page, { device: { person: "jc" }, steps: 100, weights: [] });
  await openApp(page);
  await page.locator('button[title="Settings"]').first().click();
  await page.getByTestId("health-setup-open").click();
  await page.getByTestId("hs-allow").click();
  await expect(page.getByTestId("hs-scales-yes")).toBeVisible();
  expect(await page.getByTestId("health-setup").innerText()).not.toMatch(/Found weigh-ins/);                    // nothing claimed before permission
  await page.getByTestId("hs-scales-yes").click();
  await expect(page.getByTestId("hs-scales-none")).toContainText("Turn on Health Connect sync in your scales app");
});

test("My Body: the scales question on the phone app → Yes connects and finds the weigh-ins", async ({ page }) => {
  await phone(page, { device: { source: "healthConnect", person: "jc" }, weights: [[0, "07:00", 80.2, 21.0]] });
  await openApp(page);
  await tab(page, "My Body");
  await expect(page.getByTestId("scales-ask")).toContainText("Do you use smart scales or a weight app?");
  await page.getByTestId("scales-yes").click();
  await expect(page.getByTestId("scales-msg")).toContainText("Found weigh-ins from Fitdays");
});

test("My Body: after 3 typed weigh-ins without an import, one gentle tip — dismissed, it never shows again", async ({ page }) => {
  await phone(page, { device: { source: "healthConnect", person: "jc" } });
  await openApp(page);
  await expect.poll(async () => Object.keys((await dash()).jc.dailyActivity || {}).length).toBeGreaterThan(0);   // the opening steps sync has saved
  const d = await dash(); delete d.jc.weighIns; d.jc.body.weight = [{ wk: 15, v: 81 }, { wk: 16, v: 80.8 }, { wk: 17, v: 80.5 }]; d.jc.tips = { scalesAsk: true };
  await putDash(d); await page.reload(); await ready(page);
  await tab(page, "My Body");
  await expect(page.getByTestId("scales-tip")).toContainText("Use smart scales? Connect them and your weigh-ins arrive automatically.");
  await page.getByTestId("scales-tip-dismiss").click();
  await expect(page.getByTestId("scales-tip")).toHaveCount(0);
  await expect.poll(async () => (await dash()).jc.tips).toEqual({ scalesAsk: true, scalesTip: true });
  await page.reload(); await ready(page); await tab(page, "My Body");
  await expect(page.getByTestId("weighins-panel")).toBeAttached();
  await expect(page.getByTestId("scales-tip")).toHaveCount(0);                                                 // never again
});

test("plans: on Bronze (individual account) the weigh-ins import is part of Silver; the guide covers it", async ({ page }) => {
  await phone(page, { flags: { useTiers: true } });
  await openApp(page, "member");
  const r = await page.evaluate(async () => { const w = await import("/Life-Care/src/lib/weighIns.js"); localStorage.setItem("lc_steps_device", JSON.stringify({ person: "jc", weighIns: true })); return w.syncWeighIns({ jc: {} }, async () => {}, {}); });
  expect(r).toEqual({ skipped: "plan" });
  const guide = await (await fetch("http://127.0.0.1:5173/Life-Care/APP_GUIDE.md")).text();
  expect(guide).toContain("### Connecting smart scales and health apps");
  expect(guide).toMatch(/we can't see any other app until you give permission/);
});

test("onboarding: after the privacy choices, if health sync was chosen (Silver+), the guided setup follows as an optional last step; Skip closes it", async ({ page }) => {
  await fetch("http://127.0.0.1:9000/apps/lifecare.json" + NS, { method: "PUT", headers: H, body: "null" });
  await phone(page, { flags: { useOnboarding: true }, device: { person: "jc" } });
  await openApp(page, "member");
  const ob = page.getByTestId("onboarding");
  await ob.getByTestId("ob-adult").check(); await ob.getByTestId("ob-next-1").click();
  await ob.getByTestId("ob-agree").check(); await ob.getByTestId("ob-next-2").click();
  await expect(ob.getByText("Health sync (steps and weigh-ins)")).toBeVisible();                            // the choice says weigh-ins before anyone agrees
  await ob.getByTestId("ob-health").check();
  await ob.getByTestId("ob-finish").click();
  await expect(ob.getByTestId("health-setup")).toBeVisible();
  await expect(ob).toContainText("Last step (optional)");
  await ob.getByTestId("hs-skip").click();
  await expect(page.getByTestId("onboarding")).toHaveCount(0);
  await fetch("http://127.0.0.1:9000/apps/lifecare.json" + NS, { method: "PUT", headers: H, body: "null" });
});
