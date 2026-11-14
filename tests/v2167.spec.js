import { test, expect } from "@playwright/test";
import { createRequire } from "node:module"; const require = createRequire(import.meta.url);
import { openApp } from "./helpers.js";
import { collectMyData, deletionUpdate, isPersonKey } from "../src/lib/myDataCore.js";

// v2.16.7 Step E: P9 consent + P8 pilot legal docs (flag pilotConsent, OFF by default), P2 export/deletion/audit.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v; };
const pilot = (page) => page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ pilotConsent: true })));
const settings = (page) => page.locator("button").nth(1).click();

test("flag off (default): no consent screen; the old Privacy Policy stays; Download my data is there", async ({ page }) => {
  const { errors } = await openApp(page);
  await expect(page.getByTestId("consent-screen")).toHaveCount(0);
  await settings(page);
  const c = page.getByTestId("privacy-data-card");
  await expect(c.getByTestId("export-my-data")).toBeVisible();
  await expect(c.getByTestId("delete-my-data")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("pilot flag on: consent screen first; pilot legal docs readable; Continue only after agreeing; stored per person with version + date", async ({ page }) => {
  await pilot(page);
  const { errors } = await openApp(page);
  const s = page.getByTestId("consent-screen");
  await expect(s).toBeVisible();
  await expect(s.getByTestId("consent-continue")).toBeDisabled();
  await s.getByRole("button", { name: "Read the Privacy Notice" }).click();
  await expect(page.getByTestId("legal-text-privacy")).toContainText("Pilot version — 14 November 2026");
  await expect(page.getByTestId("legal-text-privacy")).not.toContainText("DRAFT");
  await page.getByTestId("legal-privacy").getByRole("button", { name: "Close" }).click();
  await s.getByTestId("consent-ai").check();
  await s.getByTestId("consent-agree").check();
  await s.getByTestId("consent-continue").click();
  await expect(page.getByTestId("consent-screen")).toHaveCount(0);
  const c = JSON.parse(await get("consent:jc"));
  expect(c).toMatchObject({ version: "pilot-2026-11-14", accepted: true, ai: true, photos: false, health: false });
  expect(c.at).toMatch(/^\d{4}-\d\d-\d\dT/);
  await expect.poll(async () => Object.values((await get("audit")) || {}).some((a) => a.action === "consent" && a.person === "jc")).toBe(true);
  const au = Object.values((await get("audit")) || {}).find((a) => a.action === "consent");
  expect(au.account).not.toBe("jc-test@example.com"); expect(au.account).toContain("*");   // masked
  // a new legal version asks again
  await fetch(KEY("consent:jc"), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify({ ...c, version: "pilot-old" })) });
  await page.reload();
  await expect(page.getByTestId("consent-screen")).toBeVisible();
  expect(errors).toEqual([]);
});

test("pilot flag on: AI off in the choices → AI requests are not sent", async ({ page }) => {
  await pilot(page);
  const { errors, aiCalls } = await openApp(page);
  const s = page.getByTestId("consent-screen");
  await s.getByTestId("consent-agree").check(); await s.getByTestId("consent-continue").click();   // nothing ticked
  const n0 = aiCalls.length;
  await page.getByRole("button", { name: /^Help/ }).first().click();
  await page.locator("#help-input-jc").fill("hello"); await page.locator("#help-input-jc").locator("xpath=following::button[1]").click();
  await expect(page.getByText(/AI features are off in your privacy choices/).first()).toBeVisible();
  expect(JSON.stringify(aiCalls.slice(n0))).not.toContain("hello");
  expect(errors).toEqual([]);
});

test("P2: Download my data gives a JSON file of that person's data; delete (pilot) erases it from the live app and is audited", async ({ page }) => {
  await pilot(page);
  await fetch(KEY("consent:jc"), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify({ version: "pilot-2026-11-14", accepted: true, ai: true, photos: true, health: true, at: "2026-11-14T00:00:00Z" })) });
  const { errors } = await openApp(page);
  await fetch(KEY("consent:jc"), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify({ version: "pilot-2026-11-14", accepted: true, ai: true, photos: true, health: true, at: "2026-11-14T00:00:00Z" })) });
  await page.reload();
  await settings(page);
  const card = page.getByTestId("privacy-data-card");
  const dl = page.waitForEvent("download");
  await card.getByTestId("export-my-data").click();
  const file = await dl;
  expect(file.suggestedFilename()).toMatch(/^lifecare-my-data-jc-\d{4}-\d\d-\d\d\.json$/);
  const json = JSON.parse(require("node:fs").readFileSync(await file.path(), "utf8"));
  expect(json.person).toBe("jc"); expect(json.record.profile.name).toBe("JC");
  expect(Object.keys(json.items)).toContain("journal_jc");
  expect(JSON.stringify(json)).not.toContain('"becks"');
  await card.getByLabel("Type DELETE to confirm").fill("DELETE");
  await card.getByTestId("delete-my-data").click();
  await expect(card.getByText(/data was deleted from the live app/)).toBeVisible();
  const d = JSON.parse(await get("dashboard:data"));
  expect(d.jc.profile.name).toBe("JC"); expect(d.jc.exercises.sunday).toEqual([]);
  expect(d.becks.exercises.sunday.length).toBeGreaterThan(0);          // nobody else touched
  expect(await get("journal_jc")).toBe(null);
  const audit = Object.values((await get("audit")) || {});
  expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(["export", "delete-data"]));
  expect(JSON.stringify(audit)).not.toContain("Synthetic");             // no content in the audit trail
  expect(errors).toEqual([]);
});

test("P2 helpers: person keys only; shared feedback split per person", () => {
  expect(isPersonKey("journal_jc", "jc")).toBe(true); expect(isPersonKey("eat_children:jc:2026-11-08", "jc")).toBe(true);
  expect(isPersonKey("mealplan:2026-11-08:jc", "jc")).toBe(true); expect(isPersonKey("custom_breakfasts", "jc")).toBe(false);
  expect(isPersonKey("journal_becks", "jc")).toBe(false); expect(isPersonKey("session_feedback_all", "jc")).toBe(false);
  const root = { "dashboard:data": JSON.stringify({ jc: { profile: { name: "JC" }, body: { weight: [1] } }, becks: { profile: { name: "B" } } }), journal_jc: "[1]", feedback_results: JSON.stringify({ jc: { a: 1 }, becks: { b: 2 } }), session_feedback_all: JSON.stringify({ jc_sunday: {}, becks_sunday: {} }) };
  const out = collectMyData(root, "jc", 0);
  expect(out.feedback.feedback_results).toEqual({ a: 1 }); expect(Object.keys(out.feedback.session_feedback_all)).toEqual(["jc_sunday"]);
  const up = deletionUpdate(root, "jc");
  expect(up.journal_jc).toBe(null); expect(JSON.parse(up.feedback_results)).toEqual({ becks: { b: 2 } });
  expect(JSON.parse(up["dashboard:data"]).jc).toEqual({ profile: { name: "JC" }, body: { weight: [] } });
  expect(JSON.parse(up.session_feedback_all)).toEqual({ becks_sunday: {} });
});
