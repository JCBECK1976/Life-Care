import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp, tab } from "./helpers.js";
import { makePdf } from "../src/lib/pdf.js";

// v2.30.0 (FINAL DROP Part 5, flag usePilotFeatures — on for build; switched on per test here): symptom check-in + trends, the HRT log (record only,
// never sent to the AI), the GP prep summary (Silver+, reviewed before saving, PDF), and the separate consent.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const put = (path, v) => fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { method: "PUT", headers: H, body: JSON.stringify(v) });
const get = async (path) => (await fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { headers: H })).json();
const dash = async () => JSON.parse(await get("data/dashboard:data"));
const ME = "test-uid-member";
const ALL = { accepted: true, adult: true, termsVersion: "pilot-2026-11-14", privacyVersion: "pilot-2026-11-14", ai: true, photos: true, health: true, bodyBalance: true };
const HRT_PRODUCT = "Evorel Sequi 50 TESTMARK";
const health = async (page, view) => { await tab(page, "My Health"); await page.getByTestId("health-tab-" + view).click(); };
const flags = (page, f) => page.addInitScript((v) => localStorage.setItem("lc_flags", JSON.stringify(v)), Object.assign({ usePilotFeatures: true }, f || {}));
test.afterAll(async () => { await put("apps/lifecare", null); });

test("pure helpers: one check-in per day, trends + their text alternative, current HRT, the GP facts keep HRT and medicines away from the AI", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async () => {
    const m = await import("/Life-Care/src/lib/pilot.js");
    let l = m.upsertCheckIn([], { d: "2026-11-01", s: { hot_flushes: 3, sleep: 2, bad: 7 }, n: " hot night " });
    l = m.upsertCheckIn(l, { d: "2026-11-02", s: { hot_flushes: 1 } });
    l = m.upsertCheckIn(l, { d: "2026-11-01", s: { hot_flushes: 2, sleep: 3 }, n: "replaced" });
    const st = m.trendStats(l, "2026-11-01", "2026-11-07");
    const hrt = [{ d: "2026-10-01", action: "started", product: "Gel A", dose: "2 pumps" }, { d: "2026-10-20", action: "changed", product: "Gel A", dose: "3 pumps" }, { d: "2026-10-05", action: "started", product: "Pill B" }, { d: "2026-11-01", action: "stopped", product: "Pill B" }];
    const p = { profile: { name: "Sam" }, symptoms: l, hrt, meds: [{ name: "Levothyroxine", dose: "50mcg", active: true }], healthLog: [{ date: "2026-11-03", note: "GP booked" }], vitals: [{ date: "2026-11-02", time: "08:00", systolic: 128, diastolic: 82, hr: 66 }], body: { weight: [{ wk: 16, v: 71.2 }] } };
    const f = m.gpFacts(p, "2026-11-01", "2026-11-07", ["symptoms", "hrt", "meds", "vitals", "weight", "notes"]);
    const pr = m.gpPrompt(f);
    const doc = m.gpDocument("Sam", f, "Symptoms\n- Hot flushes on 2 of 2 days");
    return { l, st, text: m.trendText(st, "2026-11-01", "2026-11-07"), cur: m.hrtCurrent(hrt), f, pr, doc, txt: m.gpText(doc), wk: m.weekStart(16) };
  });
  expect(r.l).toEqual([{ d: "2026-11-01", s: { hot_flushes: 2, sleep: 3 }, n: "replaced" }, { d: "2026-11-02", s: { hot_flushes: 1 } }]);   // replaced, not doubled; bad scores dropped
  const hf = r.st.per.find((x) => x.k === "hot_flushes");
  expect([r.st.days, hf.avg, hf.max, hf.modPlus]).toEqual([2, 1.5, 2, 1]);
  expect(r.text).toContain("2 check-ins between 1 Nov 2026 and 7 Nov 2026");
  expect(r.text).toContain("sleep problems 3 of 3");
  expect(r.cur.map((e) => e.product + " " + (e.dose || ""))).toEqual(["Gel A 3 pumps"]);                    // the change wins; the stopped one is gone
  expect(r.wk).toBe("2026-11-01");                                                                          // week 16 starts 1 Nov 2026
  expect(r.f.weight).toEqual(["week of 2026-11-01: 71.2 kg"]);
  expect(r.f.vitals[0]).toContain("BP 128/82 mmHg");
  // the AI request: facts to describe, never HRT or medicines, and the no-diagnosis/no-advice rules
  expect(r.pr.user).not.toMatch(/Gel A|Pill B|Levothyroxine/);
  expect(r.pr.system).toMatch(/Do NOT diagnose/); expect(r.pr.system).toMatch(/Do NOT mention medication or HRT/);
  // ...while the document lists them as recorded, with the GP note
  expect(r.txt).toContain("HRT (as I recorded it)"); expect(r.txt).toContain("Current: Gel A · 3 pumps");
  expect(r.txt).toContain("Levothyroxine · 50mcg");
  expect(r.doc.note).toMatch(/^For discussion with your GP\..*not a diagnosis/);
});

test("PDF: a valid file (header, cross-reference offsets, trailer), several pages for a long summary, the GP note on each page", () => {
  const doc = { title: "GP appointment summary — Sam", period: "1 Aug 2026 to 7 Nov 2026", note: "For discussion with your GP. Not a diagnosis.",
    sections: [{ h: "Summary of my records", lines: Array.from({ length: 90 }, (_, i) => "- Line " + i + " with (brackets) and a £ sign – dash") }] };
  const b = makePdf(doc); const s = Buffer.from(b).toString("latin1");
  expect(s.startsWith("%PDF-1.4")).toBe(true); expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
  const xref = Number(/startxref\n(\d+)/.exec(s)[1]); expect(s.slice(xref, xref + 4)).toBe("xref");
  const offs = [...s.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
  offs.forEach((o, i) => expect(s.slice(o, o + String(i + 1).length + 6)).toBe((i + 1) + " 0 obj"));   // every offset points at its object
  const pages = Number(/\/Type \/Pages .*\/Count (\d+)/.exec(s)[1]); expect(pages).toBeGreaterThan(1);
  expect((s.match(/For discussion with your GP/g) || []).length).toBe(pages);
  expect(s).toContain("Page 2 of " + pages);
  expect(s).toContain("\\(brackets\\)"); expect(s).toContain("\xa3 sign \x96 dash");                         // escaped; £ and – in WinAnsi
  for (const m of s.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) expect(s.slice(m.index + m[0].length + Number(m[1]), m.index + m[0].length + Number(m[1]) + 10)).toBe("\nendstream");
});

test("symptom check-in (joint account): score, note, save; the same day updates; trends show a chart with a text alternative and a table", async ({ page }) => {
  await flags(page);
  const { errors } = await openApp(page);
  await health(page, "symptoms");
  const s = page.getByTestId("symptoms");
  await s.getByTestId("sym-hot_flushes-3").click();
  await s.getByTestId("sym-sleep-2").click();
  await expect(s.getByTestId("sym-hot_flushes-3")).toHaveAttribute("aria-checked", "true");
  await s.getByTestId("sym-notes").fill("Bad night");
  await s.getByTestId("sym-save").click();
  await expect(s.getByTestId("sym-msg")).toContainText("Check-in saved");
  await expect.poll(async () => ((await dash()).jc.symptoms || []).length).toBe(1);
  await s.getByTestId("sym-hot_flushes-1").click();
  await s.getByTestId("sym-save").click();
  await expect.poll(async () => (await dash()).jc.symptoms).toEqual([expect.objectContaining({ s: { hot_flushes: 1, sleep: 2 }, n: "Bad night" })]);
  await expect(s.getByTestId("sym-trend-text")).toContainText("1 check-in between");
  await expect(s.getByTestId("sym-chart")).toHaveAttribute("aria-label", /Daily total symptom score.*Highest on average: sleep problems 2 of 3/);
  await expect(s.getByTestId("sym-table")).toContainText("Hot flushes");
  await s.getByTestId("sym-range-90").click();
  await expect(s.getByTestId("sym-chart")).toHaveAttribute("aria-label", /last 90 days/);
  expect(errors).toEqual([]);
});

test("HRT log: a record only — the note says so, the entry is current, and it never reaches the AI (chat, Companion feedback); every AI request carries the HRT rule", async ({ page }) => {
  await flags(page);
  const { errors, aiCalls } = await openApp(page);
  await health(page, "hrt");
  const h = page.getByTestId("hrt");
  await expect(h.getByTestId("hrt-record-only")).toContainText("The Companion never gives advice about HRT");
  await h.getByTestId("hrt-add").click();
  await h.getByTestId("hrt-save").click();
  await expect(h.getByTestId("hrt-msg")).toContainText("product name");                                     // needs a product
  await h.getByTestId("hrt-product").fill(HRT_PRODUCT);
  await h.getByTestId("hrt-type").selectOption("Combined");
  await h.getByTestId("hrt-route").selectOption("Patch");
  await h.getByTestId("hrt-dose").fill("1 patch twice a week");
  await h.getByTestId("hrt-save").click();
  await expect(h.getByTestId("hrt-current")).toContainText(HRT_PRODUCT + " · Combined · Patch · 1 patch twice a week");
  await expect.poll(async () => ((await dash()).jc.hrt || []).length).toBe(1);
  // the AI paths that read health data
  await page.getByRole("button", { name: /My Companion Health Feedback|Health Feedback/ }).first().click();
  await expect.poll(() => aiCalls.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: /chat/i }).first().click();
  const box = page.getByRole("textbox").last(); await box.fill("What do you think of my HRT?"); await box.press("Enter");
  await expect.poll(() => aiCalls.length).toBeGreaterThan(1);
  for (const c of aiCalls) {
    const t = JSON.stringify(c);
    expect(t).not.toContain("TESTMARK");
    if (c && c.max_tokens > 1) expect(t).toContain("HRT entries are the person's own record only");   // (not the 1-token daily Energy ping: no data, no rule)
  }
  // deleting asks first
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await health(page, "hrt");
  page.once("dialog", (d) => d.accept());
  await h.getByTestId("hrt-del").click();
  await expect.poll(async () => ((await dash()).jc.hrt || []).length).toBe(0);
  expect(errors).toEqual([]);
});

test("GP prep summary (joint account = all plans): choose period + areas → the AI gets facts only → review + edit → save; the PDF downloads with the GP note", async ({ page }) => {
  await flags(page);
  const { errors, aiCalls } = await openApp(page);
  const d = await dash();
  const today = new Date(); const ymd = (x) => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  d.jc.symptoms = [{ d: ymd(today), s: { hot_flushes: 3, tiredness: 2 } }];
  d.jc.hrt = [{ id: "a", d: ymd(today), action: "started", product: HRT_PRODUCT, route: "Patch" }];
  await put("data/dashboard:data", JSON.stringify(d));
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await health(page, "gp");
  const g = page.getByTestId("gp");
  await g.getByTestId("gp-last-1").click();
  await g.getByTestId("gp-area-weight").uncheck();
  const before = aiCalls.length;
  await g.getByTestId("gp-prepare").click();
  await expect(g.getByTestId("gp-review")).toBeVisible();
  const sentBody = JSON.stringify(aiCalls.slice(before));
  expect(sentBody).toContain("Do NOT diagnose"); expect(sentBody).toContain("hot_flushes");
  expect(sentBody).not.toContain("TESTMARK");                                                              // HRT never sent
  await expect(g.getByTestId("gp-doc")).toContainText("HRT (as I recorded it)");
  await expect(g.getByTestId("gp-doc")).toContainText(HRT_PRODUCT);                                       // listed as recorded
  await expect(g.getByTestId("gp-doc")).toContainText("For discussion with your GP");
  expect(((await dash()).jc.gpSummaries || []).length).toBe(0);                                            // nothing saved before review
  await g.getByTestId("gp-text").fill("Symptoms\n- Hot flushes severe on 1 day (my edit)");
  const dl = page.waitForEvent("download");
  await g.getByTestId("gp-pdf").click();
  const file = await (await dl).path();
  const pdf = fs.readFileSync(file).toString("latin1");
  expect(pdf.startsWith("%PDF")).toBe(true); expect(pdf).toContain("(my edit)".replace(/[()]/g, (c) => "\\" + c)); expect(pdf).toContain("For discussion with your GP");
  await g.getByTestId("gp-save").click();
  await expect(g.getByTestId("gp-msg")).toContainText("Saved");
  const saved = (await dash()).jc.gpSummaries;
  expect(saved).toHaveLength(1); expect(saved[0].doc.sections[0].lines).toContain("- Hot flushes severe on 1 day (my edit)");
  await expect(g.getByTestId("gp-saved")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("plans + consent (individual account): Bronze → GP prep is 'part of Silver', symptoms still work; the symptom/HRT consent is separate (onboarding + Settings) and switches tracking off", async ({ page }) => {
  await put("apps/lifecare", { users: { [ME]: { consent: Object.assign({}, ALL, { symptoms: false }) } } });
  await flags(page, { useOnboarding: true, useTiers: true });
  const { errors } = await openApp(page, "member");
  await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  await health(page, "gp");
  await expect(page.getByTestId("plan-gate-gpSummary")).toContainText("GP prep summary is part of Silver");
  await page.locator('button[title="Settings"]').first().click();                         // My Plan lists it (pilot only): Silver and up
  await page.getByTestId("my-plan-toggle").click();
  const row = page.getByTestId("my-plan").getByRole("row", { name: /GP prep summary/ });
  await expect(row.getByText("✓")).toHaveCount(3);
  await tab(page, "My Health");
  await page.getByTestId("health-tab-symptoms").click();
  await expect(page.getByTestId("symptoms-off")).toContainText("Symptom and HRT tracking is off in your privacy choices");
  await page.getByTestId("health-tab-hrt").click();
  await expect(page.getByTestId("symptoms-off")).toBeVisible();
  // Settings → My privacy choices: the separate switch
  await page.locator('button[title="Settings"]').first().click();
  const card = page.getByTestId("account-consent");
  await card.getByTestId("withdraw-symptoms").check();
  await expect.poll(async () => (await get("apps/lifecare/users/" + ME + "/consent/symptoms"))).toBe(true);
  await expect.poll(async () => { const h = Object.values((await get("apps/lifecare/users/" + ME + "/consent/history")) || {}); return h.length ? h[h.length - 1].change : null; }).toEqual({ symptoms: true });
  await health(page, "symptoms");
  await expect(page.getByTestId("symptoms")).toBeVisible();                                                // Bronze: tracking is in every plan
  // AI stays off for it if AI consent is withdrawn (server and app use the same CONSENT_NEEDS)
  const r = await page.evaluate(async () => (await import("/Life-Care/src/constants/tiers.js")).CONSENT_NEEDS);
  expect(r.gpSummary).toEqual(["ai"]); expect(r.symptoms).toEqual(["symptoms"]);
  expect(errors).toEqual([]);
});

test("onboarding offers the symptom/HRT choice (off until ticked) while the pilot features are on", async ({ page }) => {
  await put("apps/lifecare", null);
  await flags(page, { useOnboarding: true });
  await openApp(page, "member");
  const ob = page.getByTestId("onboarding");
  await ob.getByTestId("ob-adult").check(); await ob.getByTestId("ob-next-1").click();
  await ob.getByTestId("ob-agree").check(); await ob.getByTestId("ob-next-2").click();
  await expect(ob.getByTestId("ob-symptoms")).not.toBeChecked();
  await ob.getByTestId("ob-symptoms").check();
  await ob.getByTestId("ob-finish").click();
  await expect(ob).toHaveCount(0);
  expect(await get("apps/lifecare/users/" + ME + "/consent/symptoms")).toBe(true);
});
