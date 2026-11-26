import { test, expect } from "@playwright/test";
import { openApp, person } from "./helpers.js";
import { MOCK_TEXT } from "./mock-ai.js";
import { phaseTotals, planEntry, planKey } from "../src/lib/plan.js";
import { redact, summariseReply } from "../src/lib/debugLog.js";

// v2.15.0: plan in the Tracker (B), admin Settings sections, Reset removed, Debug Mode (C).
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k + ".json" + NS;
const getRaw = async (k) => (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json();
const put = (k, v) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(v) });
const del = (k) => fetch(url(k), { method: "DELETE", headers: { Authorization: "Bearer owner" } });
const openSettings = (page) => page.locator("button").nth(1).click();

const PLAN = (over = {}) => ({ updated: "2026-11-12", phases: ["Release", "House in order", "Delivered"], items: [
  { id: "R1", title: "Small fixes", category: "Defect", phase: "Release", status: "In progress", priority: "High", tokenPct: 1, version: "", notes: "on build" },
  { id: "R3", title: "Add the 3 secrets", category: "Task", phase: "Release", status: "Planned", priority: "High", tokenPct: 2, version: "", notes: "" },
  { id: "H1", title: "SAD + threat model", category: "Task", phase: "House in order", status: "Blocked", priority: "Medium", tokenPct: 7, version: "", notes: "" },
  { id: "D1", title: "Person switch mixed entries", category: "Defect", phase: "Delivered", status: "Done", priority: "", tokenPct: null, version: "v2.6.1", notes: "" },
  { id: "F2", title: "Body balance check", category: "Feature", phase: "Delivered", status: "Won't do", priority: "", tokenPct: 3, version: "", notes: "" },
  ...(over.extra || []),
].map((i) => Object.assign({}, i, (over.patch || {})[i.id] || {})) });
// The prod copy is the first URL tried; a missing prod copy falls back to GitHub's main branch.
async function servePlan(page, plan, { prod = true } = {}) {
  const hits = [];
  await page.route(/\/Life-Care\/plan\.json/, (r) => { hits.push("prod"); return prod ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(plan()) }) : r.fulfill({ status: 404, body: "" }); });
  await page.route(/raw\.githubusercontent\.com\/.*\/plan\.json/, (r) => { hits.push("github"); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(plan()) }); });
  return hits;
}
const openTracker = async (page) => { await openSettings(page); const t = page.getByTestId("tracker"); await t.getByRole("button", { name: /📝 Tracker/ }).click(); await expect(t.getByTestId("tracker-plan-status")).toContainText("Plan: "); return t; };

test("v2.15.0 pure: plan entries keep the admin note; open Token % per phase", () => {
  const now = new Date("2026-11-12T10:00:00Z");
  const a = planEntry({ id: "R1", title: "T", category: "Defect", phase: "Release", status: "Planned", tokenPct: 1 }, null, now, 0);
  expect(a.changed).toBe(true); expect(a.entry).toMatchObject({ id: "plan_R1", planId: "R1", source: "plan", note: "", status: "Planned" });
  const b = planEntry({ id: "R1", title: "T", category: "Defect", phase: "Release", status: "Done", tokenPct: 1 }, Object.assign({}, a.entry, { note: "mine" }), now, 0);
  expect(b.changed).toBe(true); expect(b.entry).toMatchObject({ status: "Done", note: "mine" });
  expect(planEntry({ id: "R1", title: "T", category: "Defect", phase: "Release", status: "Done", tokenPct: 1 }, b.entry, now, 0).changed).toBe(false);
  expect(planKey("1b-5.x")).toBe("plan_1b-5_x");
  expect(phaseTotals([{ source: "plan", phase: "A", status: "Planned", tokenPct: 2 }, { source: "plan", phase: "A", status: "Done", tokenPct: 5 }, { source: "plan", phase: "B", status: "Blocked", tokenPct: 1.5 }, { source: "feedback", status: "New" }], ["B", "A"]))
    .toEqual([{ phase: "B", pct: 1.5 }, { phase: "A", pct: 2 }]);
});

test("v2.15.0: Tracker loads the plan; Outstanding by default; Completed only when chosen; Token % per phase; feedback untouched", async ({ page }) => {
  const { errors } = await openApp(page); await del("tracker");
  const fb = { id: "t1", created: "2026-11-11T20:00:00.000Z", updated: "2026-11-11T20:00:00.000Z", category: "Feedback", status: "New", priority: "", note: "", ref: "", text: "Water tracker please", source: "feedback", kind: "feature", person: "jc", account: "j***@e***.com", env: "prod", version: "v2.14.3" };
  await put("tracker/t1", fb);
  const hits = await servePlan(page, () => PLAN());
  const t = await openTracker(page);
  await expect(t.getByTestId("tracker-plan-status")).toHaveText("Plan: 5 items (updated 2026-11-12), 5 changed");
  expect(hits).toEqual(["prod"]);
  // default = Outstanding: feedback + R1, R3, H1 (not D1 Done, not F2 Won't do)
  await expect(t.getByLabel("Filter status")).toHaveValue("Outstanding");
  await expect(t.getByTestId("tracker-row")).toHaveCount(4);
  await expect(t.locator("[data-plan=D1]")).toHaveCount(0);
  await expect(t.getByTestId("tracker-phase-total")).toHaveText([/Release\s*3%/, /House in order\s*7%/]);
  await t.getByLabel("Filter status").selectOption("Completed");
  await expect(t.getByTestId("tracker-row")).toHaveCount(2);
  await expect(t.locator("[data-plan=D1]")).toContainText("v2.6.1");
  await t.getByLabel("Filter status").selectOption("Outstanding");
  await t.getByLabel("Filter category").selectOption("Task");
  await expect(t.getByTestId("tracker-row")).toHaveCount(2);
  await t.getByLabel("Filter phase").selectOption("House in order");
  await expect(t.getByTestId("tracker-row")).toHaveCount(1);
  await expect(t.locator("[data-plan=H1]")).toContainText("Blocked");
  await t.getByLabel("Filter category").selectOption("All"); await t.getByLabel("Filter phase").selectOption("All"); await t.getByLabel("Filter priority").selectOption("High");
  await expect(t.getByTestId("tracker-row")).toHaveCount(2);
  // the badge counts feedback only, and the feedback entry is exactly as it was
  await expect(t.getByTestId("tracker-new-badge")).toHaveText("1 new");
  const all = await getRaw("tracker");
  expect(all.t1).toEqual(fb);
  expect(Object.keys(all).sort()).toEqual(["plan_D1", "plan_F2", "plan_H1", "plan_R1", "plan_R3", "t1"]);
  expect(all.plan_R1).toMatchObject({ planId: "R1", source: "plan", category: "Defect", phase: "Release", status: "In progress", priority: "High", tokenPct: 1, planNotes: "on build", note: "" });
  expect(errors).toEqual([]);
});

test("v2.15.0: plan items are managed by plan: only the admin note is editable, and it survives a sync", async ({ page }) => {
  const { errors } = await openApp(page); await del("tracker");
  let plan = PLAN();
  await servePlan(page, () => plan, { prod: false });               // no prod copy yet → GitHub's main copy
  let t = await openTracker(page);
  await t.getByRole("button", { name: "Open R3" }).click();
  const form = t.getByTestId("tracker-open-form");
  await expect(form).toContainText("Managed by plan");
  await expect(form.getByRole("button", { name: "Remove" })).toHaveCount(0);
  await form.getByRole("button", { name: "Edit" }).click();
  await expect(form.getByLabel("Status")).toHaveCount(0); await expect(form.getByLabel("Category")).toHaveCount(0); await expect(form.getByLabel("Priority")).toHaveCount(0);
  await form.getByLabel("Admin note").fill("JC adds them on Friday");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByTestId("open-form-msg")).toHaveText("✓ Saved");
  // the plan moves on: R3 starts, a new item appears
  plan = PLAN({ patch: { R3: { status: "In progress", tokenPct: 3, notes: "secrets guide in HANDOVER" } }, extra: [{ id: "H2", title: "DPIA", category: "Task", phase: "House in order", status: "Planned", priority: "Medium", tokenPct: 3, version: "", notes: "" }] });
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  t = await openTracker(page);
  await expect(t.getByTestId("tracker-plan-status")).toHaveText("Plan: 6 items (updated 2026-11-12), 2 changed");
  const r3 = (await getRaw("tracker")).plan_R3;
  expect(r3).toMatchObject({ status: "In progress", tokenPct: 3, planNotes: "secrets guide in HANDOVER", note: "JC adds them on Friday" });
  await expect(t.getByTestId("tracker-phase-total")).toHaveText([/Release\s*4%/, /House in order\s*10%/]);
  expect(errors).toEqual([]);
});

test("v2.15.0: no plan available → a clear message; saved entries still listed", async ({ page }) => {
  const { errors } = await openApp(page); await del("tracker");
  await put("tracker/t1", { id: "t1", created: "2026-11-11T20:00:00.000Z", category: "Defect", status: "New", text: "x", source: "admin" });
  await openSettings(page);
  const t = page.getByTestId("tracker"); await t.getByRole("button", { name: /📝 Tracker/ }).click();
  await expect(t.getByTestId("tracker-plan-status")).toHaveText("⚠️ Couldn't read the plan (plan.json): showing what's saved.");
  await expect(t.getByTestId("tracker-row")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("v2.15.0: admin Settings in sections; Reset to Default Data is gone; Data & backups opens each tool", async ({ page }) => {
  const { errors } = await openApp(page);
  await openSettings(page);
  for (const id of ["app-ai", "data", "firebase", "github", "integrations", "tracker", "docs"]) await expect(page.getByTestId("admin-section-" + id)).toBeVisible();
  await expect(page.getByRole("heading")).toContainText(["App & AI", "Data & backups", "Firebase", "GitHub & releases", "Integrations", "Tracker", "Documentation"]);
  await expect(page.getByText(/Reset to Default/)).toHaveCount(0);
  await expect(page.getByText("⚠ Reset Data")).toHaveCount(0);
  await expect(page.getByTestId("integrations").getByText("Google OAuth Client ID (for Health Connect)")).toBeVisible();
  await expect(page.getByTestId("firebase-info")).toContainText("life-care-app-64d04");
  await expect(page.getByTestId("docs-links").getByRole("link", { name: "Plan (plan.json)" })).toHaveAttribute("href", "https://jcbeck1976.github.io/Life-Care/plan.json");
  await expect(page.getByTestId("vault-docs")).toContainText("DPIA");
  await expect(page.getByTestId("vault-docs").getByRole("link")).toHaveCount(0);
  for (const [name, id] of [["Open Download backup", "backup"], ["Open Restore", "restore-export"]]) {
    await page.getByRole("button", { name }).click();
    await expect(page.getByTestId(id)).toBeInViewport();
    await page.getByRole("button", { name: "← Back to Settings" }).click();
  }
  // 360px: section links and Open buttons fit
  await page.setViewportSize({ width: 360, height: 800 });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test("v2.15.0: Becks sees no admin sections", async ({ page }) => {
  const { errors } = await openApp(page);
  await person(page, "Becks"); await openSettings(page);
  await expect(page.getByText("🎨 My Colour Theme")).toBeVisible();
  await expect(page.locator("[data-testid^=admin-section-]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("v2.15.0 pure: the debug log never holds keys, addresses or reply text", () => {
  expect(redact('Error: key sk-ant-api03-abcDEF_123 for jc@example.com said "I have knee pain"')).toBe('Error: key sk-ant-… for …@… said "…"');
  const s = summariseReply({ content: [{ type: "text", text: "Your blood pressure is fine" }], stop_reason: "end_turn", usage: { input_tokens: 12, output_tokens: 34 } });
  expect(s).toBe("stop: end_turn · tokens in 12 / out 34 · reply 27 characters (text not logged)");
  expect(summariseReply({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key sk-ant-api03-zzz" } })).toBe("API error: authentication_error · invalid x-api-key sk-ant-…");
});

test("v2.15.0: Debug Mode turns on, shows a badge, logs a safe summary, stays on after reload, turns off", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.evaluate(() => localStorage.removeItem("lc_debug_mode"));
  await openSettings(page);
  const dbg = page.getByTestId("debug-mode");
  await expect(page.getByTestId("debug-badge")).toHaveCount(0);
  await dbg.getByRole("button", { name: "Turn On" }).click();
  await expect(page.getByTestId("debug-badge")).toHaveText("🔧 DEBUG ON");
  await expect(dbg.getByTestId("debug-panel")).toContainText("No API calls yet.");
  // Ask a Question (Chat) → logged
  await page.getByTitle("Chat with your Companion").or(page.getByRole("button", { name: "Chat with your Companion" })).first().click();
  await page.locator("#qa-input-jc").fill("Is my blood pressure OK?");
  await page.locator("#qa-input-jc").locator("xpath=following-sibling::button").click();
  await expect(page.getByText(MOCK_TEXT).first()).toBeVisible();
  await page.getByRole("button", { name: "Close chat" }).click();   // v2.17.0: the ✕ has a label
  await openSettings(page);
  const panel = page.getByTestId("debug-panel");
  await expect(panel).toContainText("Ask API"); await expect(panel).toContainText("HTTP: 200");
  await expect(panel).toContainText("stop: end_turn · tokens in 10 / out 10");
  await expect(panel).not.toContainText(MOCK_TEXT); await expect(panel).not.toContainText("blood pressure");
  // remembered after reload; the log itself is not
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("debug-badge")).toBeVisible();
  await openSettings(page);
  await expect(page.getByTestId("debug-panel")).toContainText("No API calls yet.");
  await page.getByTestId("debug-mode").getByRole("button", { name: "ON — Turn Off" }).click();
  await expect(page.getByTestId("debug-badge")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("lc_debug_mode"))).toBe(null);
  expect(errors).toEqual([]);
});
