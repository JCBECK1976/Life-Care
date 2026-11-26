import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.22.1 (Architect, 17 Nov 2026): food ratings are a Silver feature. On Bronze NO rating colour, word, badge, cue,
// dot or frequency warning shows anywhere; records, portions and calories do. Stored ratings are never changed, so they
// come back on upgrade. All display goes through src/lib/rating.js / components/Rating.jsx.
function thisWeek() { const DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"]; const base = new Date(2026, 6, 19), now = new Date(); const ws = new Date(base); ws.setDate(ws.getDate() + Math.floor((now - base) / (7 * 864e5)) * 7); const d = ws.getFullYear() + "-" + String(ws.getMonth() + 1).padStart(2, "0") + "-" + String(ws.getDate()).padStart(2, "0"); return { key: "mealplan:" + d + ":jc", today: DAYS[now.getDay()] }; }
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const DB = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json" + NS;
const put = (path, v) => fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { method: "PUT", headers: H, body: JSON.stringify(v) });
const getKey = async (k) => { const v = await (await fetch(DB(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const setKey = (k, v) => fetch(DB(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const ME = "test-uid-member";
const RED = { id: "t_red", name: "Test Fry Up", jcKcal: 900, beckKcal: 800, satFat: 20, rating: "RED", ragReason: "RED: 20 g sat fat" };

// Everything that would show a rating on the current screen.
const sweep = (page) => page.evaluate(() => {
  const RAG = ["rgb(185, 28, 28)", "rgb(180, 83, 9)", "rgb(21, 128, 61)", "rgb(220, 38, 38)", "rgb(217, 119, 6)", "rgb(22, 163, 74)", "rgb(245, 158, 11)"];
  const vis = (e) => !!(e.offsetParent || e.getClientRects().length);
  const out = [];
  document.querySelectorAll('[data-testid="rag-cue"],[data-testid="view-rating"],[data-testid="slot-rating"],[data-testid="snap-rating"],[data-testid="save-rating"],[data-testid="rating"]').forEach((e) => { if (vis(e) && e.textContent.trim()) out.push("badge:" + e.dataset.testid); });
  document.querySelectorAll("[data-rag]").forEach((e) => { if (e.dataset.rag) out.push("data-rag:" + e.dataset.rag); });
  document.querySelectorAll('[data-testid="selected-item"]').forEach((e) => { if (vis(e) && RAG.includes(getComputedStyle(e).color)) out.push("coloured-name:" + e.textContent.trim().slice(0, 20)); });
  document.querySelectorAll("span,div,b").forEach((e) => {
    if (!vis(e) || e.children.length) return;
    const t = e.textContent.trim(), cs = getComputedStyle(e);
    if (/^(RED|AMBER|GREAT|GOOD|GREEN)( ·.*)?$/.test(t)) out.push("word:" + t);
    if (!t && cs.width === "7px" && RAG.includes(cs.backgroundColor)) out.push("dot");
  });
  return out;
});
async function setup(page, tier) {
  await put("apps/lifecare", tier ? { entitlements: { [ME]: { tier, source: "admin" } } } : null);
  await page.addInitScript(() => { localStorage.setItem("lc_flags", JSON.stringify({ useTiers: true })); });
  const r = await openApp(page, "member");
  const { key, today } = thisWeek();
  await setKey("custom_breakfasts", [RED, ...((await getKey("custom_breakfasts")) || [])]);
  await setKey(key, { [today]: { b: RED.id } });
  await page.reload();
  await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  return r;
}
// Home, My Eating (the day with a RED item), the lists + an item's view, My Shop — collected into one list.
async function screens(page) {
  const found = {};
  await tab(page, "Home"); await page.waitForTimeout(300); found.home = await sweep(page);
  await tab(page, "My Eating"); await page.waitForTimeout(300); found.eating = await sweep(page);
  await openFryUp(page);
  await page.waitForTimeout(200); found.lists = await sweep(page);
  await tab(page, "My Shop"); await page.waitForTimeout(300); found.shop = await sweep(page);
  return found;
}
// The lists stay open between visits (the button's name changes), so open them only when closed.
async function openFryUp(page) {
  const row = page.getByRole("button", { name: "Open Test Fry Up" }).first();
  if (!(await row.isVisible().catch(() => false))) await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await row.click();
}
const all = (f) => [].concat(...Object.values(f));
const replan = (page, tier) => put("apps/lifecare/entitlements/" + ME, { tier, source: "admin" }).then(() => page.evaluate(async () => { const m = await import("/Life-Care/src/lib/myPlan.js"); await m.loadPlan(); }));

test.afterAll(async () => { await put("apps/lifecare", null); });

test("Silver: ratings unchanged — the word, cue, colours and the item's rating are shown", async ({ page }) => {
  const { errors } = await setup(page, "silver");
  const f = await screens(page);
  expect(all(f).length).toBeGreaterThan(0);
  expect(f.eating.some((x) => /rag-cue|data-rag:RED|coloured-name/.test(x))).toBe(true);
  await tab(page, "My Eating");
  await openFryUp(page);
  await expect(page.getByTestId("view-rating")).toContainText("RED");
  await expect(page.getByTestId("ratings-hint")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Bronze: no rating colour, word, badge, cue or dot on any main screen; calories still shown; one hint on the list header", async ({ page }) => {
  const { errors, aiCalls } = await setup(page, null);
  const f = await screens(page);
  expect(f).toEqual({ home: [], eating: [], lists: [], shop: [] });
  await tab(page, "My Eating");
  await openFryUp(page);
  await expect(page.getByTestId("item-view").getByTestId("view-kcal")).toBeVisible();          // the record and calories stay
  await expect(page.getByTestId("view-rating")).toHaveCount(0);
  const hint = page.getByTestId("ratings-hint");
  await expect(hint).toHaveCount(1);                                                           // the list header only, not per row
  await expect(hint).toHaveText("🔒 Ratings: Silver");
  await hint.click();
  await expect(page.getByTestId("my-plan-toggle")).toHaveAttribute("aria-expanded", "true");
  expect(aiCalls.length).toBe(0);
  expect(errors).toEqual([]);
});

test("downgrade then upgrade: ratings hidden on Bronze, the ORIGINAL ratings back on Silver; stored ratings never touched", async ({ page }) => {
  await setup(page, "silver");
  const before = JSON.stringify(await getKey("custom_breakfasts"));
  const silver = await screens(page);
  await replan(page, "bronze");
  const bronze = await screens(page);
  expect(all(bronze)).toEqual([]);
  await replan(page, "silver");
  const again = await screens(page);
  expect(again).toEqual(silver);                                                               // exactly as before
  expect(JSON.stringify(await getKey("custom_breakfasts"))).toBe(before);                     // nothing rewritten
  expect((await getKey("custom_breakfasts")).find((x) => x.id === "t_red").rating).toBe("RED");
});

test("one place: no rating colour logic is left outside lib/rating.js", async () => {
  const fs = await import("node:fs");
  for (const f of ["src/sections/Eating.jsx", "src/sections/Shop.jsx", "src/components/ReviewItemOverlay.jsx"]) {
    const s = fs.readFileSync(f, "utf8");
    expect(s, f).not.toMatch(/\.rating === "RED" \? "#/);
    expect(s, f).not.toMatch(/calcRAG\(prod\) === "RED" \? "#/);
  }
});
