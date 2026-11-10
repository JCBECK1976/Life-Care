import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.6.5 (Architect requirement before any beta PR): the CURRENT prod release must tolerate the new data shapes,
// because beta and prod share the real data. Run against an older release's dev server, e.g.
//   git worktree add ../lc-prod260 v2.6.0 && (cd ../lc-prod260 && npx vite --port 5180)
//   PROD_COMPAT_URL=http://127.0.0.1:5180/Life-Care/ npx playwright test compat-prod --project app
// Skipped in the normal suite.
const BASE = process.env.PROD_COMPAT_URL;
test.skip(!BASE, "set PROD_COMPAT_URL to run");
test.use({ baseURL: BASE });

const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k + ".json" + NS;
const getKey = async (k) => { const v = await (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
const setKey = (k, obj) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

test("prod tolerates v2.6.1–v2.6.5 data shapes (_snap, per-set arrays, addedSugar, Check me, RAG bands)", async ({ page }) => {
  const { errors } = await openApp(page);
  // per-set exercise entry (v2.6.1)
  const d = await getKey("dashboard:data"); const ex = d.jc.exercises.sunday.find((e) => !e.stopped);
  ex.prog = [...(ex.prog || []), { wk: 99, w: "63kg", r: "10/8/8", sets: [{ w: "63", r: "10" }, { w: "56", r: "8" }, { w: "63", r: "8" }], goodForm: "good", fullRange: "good" }];
  await setKey("dashboard:data", d);
  // list items with the new fields (v2.6.2–v2.6.5)
  const item = { id: "compat_b", name: "Compat Oats (612 kcal)", jcKcal: 612, beckKcal: 612, protein: 27, satFat: 3, addedSugar: 7, rating: "RED", ragFreq: "weekly", ragReason: "RED (weekly treat): …", prevRating: "GOOD", _ragChanged: true, _ragChangedSeen: false, checkMe: true, checkReason: "Nutrition looks off: …", assumed: ["7g honey"], servingSize: "28g bar", source: "photo", itemType: "ingredient", ingredients: ["95g oats"] };
  await setKey("custom_breakfasts", [item, ...((await getKey("custom_breakfasts")) || [])]);
  // week plan with snapshots, a deleted item and an old renamed id (v2.6.2, v2.6.5 repair)
  const base = new Date(2026, 6, 19), now = new Date(); const ws = new Date(base); ws.setDate(ws.getDate() + Math.floor((now - base) / (7 * 864e5)) * 7);
  const key = "mealplan:" + ws.getFullYear() + "-" + String(ws.getMonth() + 1).padStart(2, "0") + "-" + String(ws.getDate()).padStart(2, "0") + ":jc";
  const today = DAYS[now.getDay()];
  await setKey(key, { [today]: { b: "compat_b", b2: "custom_gone_1", l: "spag_bol" }, _snap: { [today + ":b"]: { id: "compat_b", name: "Compat Oats (612 kcal)", kcal: 612, rating: "RED" }, [today + ":b2"]: { id: "custom_gone_1", name: "Old Granola", kcal: 300, rating: "GOOD", approx: true, repaired: "list" }, [today + ":l"]: { id: "spag_bol", name: "Spaghetti Bolognese", kcal: 550, approx: true, repaired: "oldId" } } });
  await setKey("portion_overrides:jc", { [today]: { b: { kcal: 600, protein: 25, name: "Compat Oats" } } });
  await page.reload();
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  const visit = async (name) => { await tab(page, name); await page.waitForTimeout(400); };
  for (const t of ["Home", "My Exercise", "My Body", "My Health", "My Shop"]) await visit(t);
  await visit("My Exercise");
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await page.getByRole("button", { name: "👁 Progress" }).first().click();
  await expect(page.getByText(/63kg/).first()).toBeVisible();
  await visit("My Eating");
  await expect(page.getByText("Compat Oats (612 kcal)").first()).toBeVisible();
  await page.screenshot({ path: "test-results/compat-prod-eating-day.png", fullPage: true });
  await page.getByText("Week", { exact: true }).first().click();
  await page.screenshot({ path: "test-results/compat-prod-eating-week.png", fullPage: true });
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await expect(page.getByText(/Compat Oats/).first()).toBeVisible();
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/section error|\[object Object\]|_snap|undefined kcal|NaN/);
  console.log("PROD VERSION UNDER TEST: " + (body.match(/v\d+\.\d+\.\d+\S*/) || ["?"])[0]);
  expect(errors).toEqual([]);
});
