import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.56.1 (Architect night batch 25 Nov, PART 6 — WCAG 1.4.3): the kcal numbers on the day tabs meet 4.5:1 on the dark bar
// and on the white selected tab, keeping green (on or under) / red (over).
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k.replace(/[.#$/[\]]/g, "_") + ".json" + NS;
const getKey = async (k) => { const v = await (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
const setKey = (k, obj) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
function thisWeek() {
  const base = new Date(2026, 6, 19), now = new Date();
  const ws = new Date(base); ws.setDate(ws.getDate() + Math.floor((now - base) / (7 * 864e5)) * 7);
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  return { key: "mealplan:" + ymd(ws) + ":jc", childKey: "eat_children:jc:" + ymd(ws) };
}
const LOW = { id: "t_low", name: "Test Low", jcKcal: 500, beckKcal: 500, rating: "GOOD" }, HIGH = { id: "t_high", name: "Test High", jcKcal: 2600, beckKcal: 2600, rating: "RED" };

test("day-tab kcal numbers: ≥ 4.5:1 contrast on the dark bar and on the selected tab; green/red kept", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openApp(page);
  const { key, childKey } = thisWeek();
  await setKey("custom_breakfasts", [LOW, HIGH, ...((await getKey("custom_breakfasts")) || [])]);
  await setKey(key, { sunday: { b: LOW.id }, monday: { b: HIGH.id } });
  await page.waitForTimeout(300); await fetch(url(childKey), { method: "DELETE", headers: { Authorization: "Bearer owner" } }); await page.reload();
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Week", exact: true }).first().click();
  const ratios = async () => page.getByTestId("tab-kcal").evaluateAll((els) => els.map((el) => {
    const rgb = (c) => c.match(/[\d.]+/g).map(Number);
    const lum = (c) => { const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    let bg = null, n = el; while (n && !bg) { const c = getComputedStyle(n).backgroundColor; const a = c.match(/[\d.]+/g); if (a && (a.length < 4 || Number(a[3]) > 0.5)) bg = c; n = n.parentElement; }
    const L1 = lum(getComputedStyle(el).color), L2 = lum(bg); return { over: el.dataset.over, ratio: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05), color: getComputedStyle(el).color };
  }));
  for (const sel of ["Week", "Sun", "Mon"]) {
    await page.getByRole("button", { name: new RegExp("^" + sel + "( \\d+)?") }).first().click();
    const r = await ratios();
    expect(r.length).toBeGreaterThanOrEqual(2);
    for (const x of r) expect(x.ratio, sel + " " + x.color).toBeGreaterThanOrEqual(4.5);
    expect(r.some((x) => x.over === "1") && r.some((x) => x.over === "0")).toBe(true);               // red and green both present
  }
  await page.getByRole("button", { name: "Week", exact: true }).first().click();
  await page.locator('[data-testid="tab-kcal"]').first().locator("xpath=ancestor::div[1]").screenshot({ path: "test-results/v2561-shots/day-tabs-360.png" });
});
