import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { collectErrors, mockAnthropic, gotoSignedIn, tab } from "./helpers.js";

// RELEASE READINESS (Architect, 18 Nov — prod jumps v2.15.1 → v2.30.x). With ALL new flags OFF (this test project is
// not the "build" environment, and no device flags are set) the joint account must behave as today on REAL-SHAPED
// data: the 3 Nov backup, loaded into the LOCAL emulator only (API key replaced), never printed — COUNTS ONLY.
// Skipped wherever the backup isn't present (CI, other machines).
const BACKUP = process.env.SEED_FILE || "/home/user/firebase-backup/lifecare_firebase_backup_2026-11-03.json";
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const NEW_PERSON_FIELDS = ["weighIns", "symptoms", "hrt", "gpSummaries", "tips"];   // only written by build-only features
test.skip(!fs.existsSync(BACKUP), "needs the local backup (never in CI)");
test.setTimeout(240000);

const parse = (v) => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch (e) { return v; } };
/** Shape counts only — never values. */
function counts(root) {
  const c = { keys: Object.keys(root || {}).length };
  const dash = parse(root["dashboard:data"]) || {};
  for (const [who, p] of Object.entries(dash)) {
    if (who === "config" || !p || typeof p !== "object") continue;
    const n = (a) => (Array.isArray(a) ? a.length : a && typeof a === "object" ? Object.keys(a).length : 0);
    c[who + ".fields"] = Object.keys(p).length;
    c[who + ".weight"] = n(p.body && p.body.weight); c[who + ".bodyFat"] = n(p.body && p.body.bodyFat);
    c[who + ".measurements"] = Object.values(p.measurements || {}).reduce((a, x) => a + n(x), 0);
    c[who + ".exercises"] = Object.values(p.exercises || {}).reduce((a, x) => a + n(x), 0);
    c[who + ".progress"] = Object.values(p.exercises || {}).reduce((a, day) => a + (Array.isArray(day) ? day.reduce((b, e) => b + n(e && e.prog), 0) : 0), 0);
    for (const f of ["meds", "medsHistory", "bloods", "vitals", "healthLog", "progressPhotos"]) c[who + "." + f] = n(p[f]);
    for (const f of NEW_PERSON_FIELDS) if (p[f] != null) c[who + ".NEW." + f] = 1;
  }
  for (const k of ["custom_breakfasts", "custom_lunches", "custom_meals", "custom_snacks", "custom_desserts", "custom_drinks", "shop_defaults"]) { const v = parse(root[k]); if (v != null) c[k] = Array.isArray(v) ? v.length : Object.keys(v).length; }
  c["journal.entries"] = Object.keys(root).filter((k) => /^journal_/.test(k)).reduce((a, k) => { const v = parse(root[k]); return a + (Array.isArray(v) ? v.length : 0); }, 0);
  c["eat_children.weeks"] = Object.keys(root).filter((k) => /^eat_children:/.test(k)).length;
  return c;
}
const read = async () => (await (await fetch("http://127.0.0.1:9000/data.json" + NS, { headers: H })).json()) || {};

test("joint account, every new flag OFF, real-shaped data: every section opens with no errors, no new feature shows, nothing is lost and no new-format data is written", async ({ page }) => {
  execSync("SEED_REAL=1 node scripts/seed-emulator.mjs", { stdio: "ignore" });
  await fetch("http://127.0.0.1:9000/apps.json" + NS, { method: "PUT", headers: H, body: "null" });
  const before = counts(await read());
  expect(Object.keys(before).length).toBeGreaterThan(10);
  const errors = collectErrors(page);
  await mockAnthropic(page);
  await page.route(/\/plan\.json(\?|$)/, (r) => r.fulfill({ status: 404, body: "" }));
  await page.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"products":[]}' }));
  let fnCalls = 0; await page.route(/cloudfunctions\.net/, (r) => { fnCalls++; return r.fulfill({ status: 500, body: "{}" }); });
  await gotoSignedIn(page, "jc");
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 30000 });
  expect(await page.evaluate(() => localStorage.getItem("lc_flags"))).toBeNull();                 // no device flags: as on beta/prod
  // the mandatory goal setup (v2.18.0, already on beta) opens for data saved before goals existed: expected after the
  // release (RELEASE_v2.30_CHECKLIST) — set aside here so every section can be visited
  await page.waitForTimeout(1500);
  const goalSetup = await page.getByTestId("goal-setup").count();
  console.log("compat: goal setup shown on first open = " + (goalSetup > 0));
  await page.evaluate(() => { const g = document.querySelector('[data-testid="goal-setup"]'); if (g) g.style.display = "none"; });
  const people = await page.getByRole("button", { name: /^(JC|Becks)$/ }).count();
  expect(people).toBeGreaterThanOrEqual(2);
  for (const s of ["Home", "My Body", "My Exercise", "My Eating", "My Shop", "My Health"]) {
    await tab(page, s); await page.waitForTimeout(600);
    await expect(page.getByText(/Something went wrong/i)).toHaveCount(0);
  }
  for (const v of ["General", "Vitals", "Medications", "Bloods"]) { await page.getByRole("button", { name: v, exact: true }).first().click(); await page.waitForTimeout(200); }
  // none of the build-only features shows
  for (const id of ["health-tab-symptoms", "weighins-panel", "scales-ask", "review-demo", "pilot-invite", "family-sharing", "account-consent", "onboarding", "preview-bar", "golive-useAiProxy"]) await expect(page.getByTestId(id)).toHaveCount(0);
  await page.locator('button[title="Settings"]').first().click(); await page.waitForTimeout(800);
  for (const id of ["review-demo", "pilot-invite", "family-sharing", "weighins-settings", "my-plan"]) await expect(page.getByTestId(id)).toHaveCount(0);
  await tab(page, "Home"); await page.waitForTimeout(1500);                                         // let any background saves finish
  const after = counts(await read());
  const newFields = Object.keys(after).filter((k) => k.includes(".NEW."));
  expect(newFields, "new-feature fields written").toEqual([]);
  const apps = await (await fetch("http://127.0.0.1:9000/apps.json" + NS, { headers: H })).json();
  expect(apps, "nothing written to the per-person/area layout").toBeNull();
  for (const k of Object.keys(before)) if (k !== "keys" && !k.endsWith(".fields") && k !== "eat_children.weeks") expect(after[k], "count of " + k).toBe(before[k]);   // nothing lost
  expect(after.keys).toBeGreaterThanOrEqual(before.keys);
  expect(fnCalls, "no server functions are called").toBe(0);
  expect(errors).toEqual([]);
  console.log("compat: " + Object.keys(before).length + " counts compared; keys " + before.keys + " → " + after.keys);
});

test.afterAll(() => { execSync("node scripts/seed-emulator.mjs", { stdio: "ignore" }); });   // back to synthetic data
