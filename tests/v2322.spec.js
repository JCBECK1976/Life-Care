import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { readWeight, withKg, aiBody, stLabel } from "../src/lib/weight.js";

// v2.32.2 (Architect, 18 Nov): ONE weight reader for the legacy "stones.pounds-digits" format + a canonical kg on
// every new weigh-in (additive; stored values never rewritten), and the single minus on the weight change.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const dash = async () => JSON.parse(await (await fetch("http://127.0.0.1:9000/data/dashboard:data.json" + NS, { headers: H })).json());
const putDash = (d) => fetch("http://127.0.0.1:9000/data/dashboard:data.json" + NS, { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(d)) });
const L = (v) => readWeight(v).label;

test("under 10 lb: 14.68 = 14st 6.8lb, 15.03 = 15st 0.3lb, 14.05 = 14st 0.5lb, 14.6 = 14st 6.0lb (the zero lost), 14 = 14st 0.0lb", () => {
  expect([L(14.68), L(15.03), L(14.05), L(14.6), L(14)]).toEqual(["14st 6.8lb", "15st 0.3lb", "14st 0.5lb", "14st 6.0lb", "14st 0.0lb"]);
  expect(readWeight(14.68).kg).toBeCloseTo((14 + 6.8 / 14) * 6.35029, 1);
  for (const v of [14.68, 15.03, 14.05, 14.6, 12.99]) expect(readWeight(v).ambiguous).toBe(false);
});

test("10.0–13.9 lb: three digits read as pounds (14.112 = 14st 11.2lb, 14.105, 14.139); 14.11 / 14.12 / 14.13 / 14.1 are flagged 'check this weigh-in'; a typed string keeps its zero", () => {
  expect([L(14.112), L(14.105), L(14.139), L(9.104)]).toEqual(["14st 11.2lb", "14st 10.5lb", "14st 13.9lb", "9st 10.4lb"]);
  for (const v of [14.112, 14.105, 14.139]) expect(readWeight(v).ambiguous).toBe(false);
  for (const v of [14.11, 14.12, 14.13, 14.1]) { const r = readWeight(v); expect(r.ambiguous).toBe(true); }
  expect(L(14.11)).toBe("14st 1.1lb");                                                       // shown as before, but flagged
  expect([L("14.110"), readWeight("14.110").ambiguous, L("14.11"), readWeight("14.11").ambiguous]).toEqual(["14st 11.0lb", false, "14st 1.1lb", false]);
  expect(L(14.428571)).toBe("14st 6.0lb");                                                   // typed "14st 6lb" / "14:6" → decimal stones
  expect(L(14.579)).toBe("14st 8.1lb");                                                      // 3 digits not 10–13 → decimal stones
});

test("kg: values of 40+ are kilograms; an entry's kg always wins; writers add kg only when the value is unambiguous", () => {
  expect(readWeight(92.4)).toMatchObject({ kg: 92.4, kind: "kg" });
  expect(readWeight({ v: 14.11, kg: 94.8 })).toMatchObject({ kg: 94.8, ambiguous: false });   // canonical kg beats the code
  expect(withKg({ wk: 3, v: 14.11 }, "14.110").kg).toBeCloseTo(93.9, 1);                      // typed text keeps the zero → 11.0 lb
  expect(withKg({ wk: 3, v: 14.11 }).kg).toBeUndefined();                                     // ambiguous number alone → no kg guessed
  expect(stLabel(80.2)).toBe("12st 8.8lb");
  expect(aiBody({ weight: [{ wk: 2, v: 14.112 }] }).weight[0].weight).toBe("14st 11.2lb (94.0 kg)");
  expect(aiBody({ weight: [{ wk: 2, v: 14.11 }] }).weight[0].weight).toMatch(/unclear, ask them to check this weigh-in/);
});

test("imports store kg; the BMR (Katch-McArdle) now reads 13.10 as 13st 1lb, not 13.1 stones — before/after on a fixture", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async () => {
    const c = await import("/Life-Care/src/lib/calories.js"); const w = await import("/Life-Care/src/lib/weighIns.js");
    const p = { profile: { sex: "Male", age: "50", height: "180" }, body: { weight: [{ wk: 1, v: 14.68 }, { wk: 2, v: 14.112 }, { wk: 3, v: 14.5 }], bodyFat: [{ wk: 1, v: 25 }, { wk: 2, v: 25 }, { wk: 3, v: 25 }] } };
    const after = c.bmrOf(p);
    const oldKg = [14.68, 14.112, 14.5].map((v) => v * 6.35029); const oldAvg = oldKg.reduce((a, b) => a + b) / 3;
    const before = Math.round(370 + 21.6 * oldAvg * 0.75);
    const q = { body: { weight: [], bodyFat: [] } };
    w.mergeWeighIns(q, { "2026-11-16": { kg: 80.2, fatPct: 21, source: "Fitdays" } });
    return { after: after.bmr, method: after.method, lean: after.lean.weightKg, before, imp: q.body.weight[0] };
  });
  const expKg = ((14 + 6.8 / 14) + (14 + 11.2 / 14) + (14 + 5 / 14)) / 3 * 6.35029;
  expect(r.method).toBe("katch");
  expect(r.lean).toBeCloseTo(expKg, 1);
  expect(r.after).toBe(Math.round(370 + 21.6 * expKg * 0.75));
  expect(r.before).not.toBe(r.after);                                                         // the old reader was off
  console.log("BMR fixture: before " + r.before + " → after " + r.after + " kcal/day");
  expect(r.imp).toMatchObject({ v: 12.88, kg: 80.2, src: "Fitdays" });
});

test("My Body: typing 14 st 11 lb saves the canonical kg + '14.110'; an ambiguous stored weigh-in shows 'check this weigh-in'; the change has ONE minus", async ({ page }) => {
  await openApp(page);
  const d = await dash(); const wk = d.config.week;
  d.jc.body.weight = [{ wk: wk - 2, v: 15.5 }, { wk: wk - 1, v: 14.11 }];                     // the latest is ambiguous
  await putDash(d); await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Body");
  await expect(page.getByTestId("weight-check")).toContainText("Check this weigh-in");
  await expect(page.getByText(/--\d/)).toHaveCount(0);
  await expect(page.getByText(/-\d+(\.\d)?lb/).first()).toBeVisible();                        // a loss shows as "-…lb"
  await page.getByTitle("View Weight detail").click();
  await expect(page.getByTestId("body-hist-badge")).toContainText("check this weigh-in");
  // record this week's weigh-in as typed: 14.110 = 14 st 11.0 lb
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  const form = page.getByText("Body Composition").locator("xpath=..");
  await form.getByText("Week", { exact: true }).locator("xpath=following::input[1]").fill(String(wk));
  await form.getByTestId("bw-st").fill("14"); await form.getByTestId("bw-lb").fill("11");    // v2.32.3: st + lb boxes
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await dash()).jc.body.weight.find((e) => e.wk === wk)).toMatchObject({ v: "14.110" });   // v2.32.3: the writer keeps the zero
  const saved = (await dash()).jc.body.weight.find((e) => e.wk === wk);
  expect(saved.kg).toBeCloseTo((14 + 11 / 14) * 6.35029, 1);
  await expect(page.getByText("14st 11.0lb").first()).toBeVisible();
  await expect(page.getByTestId("weight-check")).toHaveCount(0);                              // the latest now has its kg
});

test("Help picks the right guide sections for common questions (keyword + heading match, no AI), ≤ 5 and ≈ 3,000 tokens, with an index of every section", async () => {
  const fs = await import("node:fs");
  const { faqEntries, helpSections, helpIndex } = await import("../src/lib/faq.js");
  const e = faqEntries(fs.readFileSync("APP_GUIDE.md", "utf8"));
  const first = (q, tab) => helpSections(e, q, tab)[0].split("\n")[0];
  expect(first("How do I log a weigh-in?", "My Body")).toBe("### My Body → My Body Stats");
  expect(first("How do I log a measurement?", "Home")).toBe("### My Body → My Body Measurements");
  expect(first("How do I add a food to my breakfast list?", "My Eating")).toMatch(/Update Eating Lists/);
  expect(first("Why is my calorie goal so low?", "Home")).toMatch(/Your goal and your calorie goal/);
  expect(first("How do I connect my smart scales?", "Settings")).toMatch(/Connecting smart scales/);
  expect(first("How do I delete my account?", "Settings")).toMatch(/Signing in/);
  expect(first("Can I upgrade to Gold?", "Settings")).toMatch(/My Plan/);
  expect(first("What is Companion Energy?", "Home")).toMatch(/Companion Energy/);
  for (const q of ["How do I log a weigh-in?", "How does everything work?", "xyzzy"]) { const s = helpSections(e, q, "My Body"); expect(s.length).toBeLessThanOrEqual(5); expect(s.join("").length).toBeLessThanOrEqual(12100); }
  expect(helpSections(e, "xyzzy", "My Body").length).toBeGreaterThan(0);                      // nothing matches → the tab's own sections
  const idx = helpIndex(e); for (const x of e) expect(idx).toContain(x.title);
});
