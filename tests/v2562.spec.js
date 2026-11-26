import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.56.2 (JC, before beta): Summary tables — every row the same height (future days too), headers and numbers centred
// (Day left); ONE week-to-date rule everywhere: the days up to AND INCLUDING today, today's row marked "(today, so far)".
// The week pills equal the sum / average of the table rows shown.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k.replace(/[.#$/[\]]/g, "_") + ".json" + NS;
const getKey = async (k) => { const v = await (await fetch(url(k), { headers: { Authorization: "Bearer owner" } })).json(); return v == null ? null : JSON.parse(v); };
const setKey = (k, obj) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
function thisWeek() {
  const base = new Date(2026, 6, 19), now = new Date();
  const ws = new Date(base); ws.setDate(ws.getDate() + Math.floor((now - base) / (7 * 864e5)) * 7);
  return { key: "mealplan:" + ymd(ws) + ":jc", childKey: "eat_children:jc:" + ymd(ws) };
}
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const A = { id: "t_wtd_a", name: "Test WTD Breakfast", jcKcal: 650, beckKcal: 600, protein: 30, satFat: 4, carbs: 80, fibre: 6, salt: 1, rating: "GOOD" };
const num = (t) => Number(String(t).split("\n")[0].replace(/[^\d−-]/g, "").replace("−", "-"));

async function seed(page) {
  const { key, childKey } = thisWeek();
  await setKey("custom_breakfasts", [A, ...((await getKey("custom_breakfasts")) || [])]);
  const plan = { sunday: { b: A.id } }; plan[DAYS[new Date().getDay()]] = { b: A.id };   // Sunday + today
  await setKey(key, plan);
  await page.waitForTimeout(300); await fetch(url(childKey), { method: "DELETE", headers: { Authorization: "Bearer owner" } }); await page.reload();
}

test("week pills = the rows shown, today included and marked '(today, so far)'; the day Summary for today agrees", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await seed(page);
  await tab(page, "My Eating"); await page.getByRole("button", { name: "Week", exact: true }).first().click();
  const ws = page.getByTestId("week-summary");
  await ws.getByTestId("sum-toggle").click();
  const today = ymd(new Date());
  const rows = [];
  for (const r of await ws.getByTestId("sum-row").all()) {
    const d = await r.getAttribute("data-date"), ot = await r.locator('[data-col="ontrack"]').innerText();
    if (d <= today && ot.trim() !== "—") rows.push({ d, actual: num(await r.locator('[data-col="actual"]').innerText()), ontrack: num(ot) });
  }
  expect(rows.map((r) => r.d)).toContain(today);                                                      // today counts
  const sum = rows.reduce((s, r) => s + r.ontrack, 0), avg = Math.round(rows.reduce((s, r) => s + r.actual, 0) / rows.length);
  await expect(ws.getByTestId("sum-wtd")).toContainText("Week to date: " + (sum > 0 ? "+" : sum < 0 ? "−" : "±") + Math.abs(sum).toLocaleString("en-GB") + " kcal");
  await expect(ws.getByTestId("sum-avg")).toHaveText("Average daily calories: " + avg.toLocaleString("en-GB"));
  const tr = ws.locator(`[data-testid="sum-row"][data-date="${today}"]`);
  await expect(tr.getByTestId("sum-today")).toHaveText("(today, so far)");
  await expect(ws.getByTestId("sum-today")).toHaveCount(1);
  const wtdWeek = await ws.getByTestId("sum-wtd").innerText();
  await page.getByRole("button", { name: new RegExp("^" + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()] + "( \\d+)?$") }).first().click();
  await expect(page.getByTestId("day-summary").getByTestId("sum-wtd")).toHaveText(wtdWeek);          // the same rule on the day
  expect(errors).toEqual([]);
});

test("tables: every row the same height (future days too); headers and numbers centred, Day left", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openApp(page);
  await seed(page);
  await tab(page, "My Eating"); await page.getByRole("button", { name: "Week", exact: true }).first().click();
  const ws = page.getByTestId("week-summary");
  await ws.getByTestId("sum-toggle").click();
  const t = ws.getByTestId("week-sum-table");
  const hs = await t.getByTestId("sum-row").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  expect(hs.length).toBe(7); expect(Math.max(...hs) - Math.min(...hs)).toBeLessThanOrEqual(1);
  const geo = await t.evaluate((tb) => {
    const heads = [...tb.querySelectorAll("thead th")], row = tb.querySelector('tbody tr'), cells = [...row.children];
    const mid = (e) => { const r = e.getBoundingClientRect(); return r.left + r.width / 2; };
    return { align: heads.map((h) => getComputedStyle(h).textAlign), cellAlign: cells.map((c) => getComputedStyle(c).textAlign), off: heads.slice(1).map((h, i) => Math.abs(mid(h) - mid(cells[i + 1]))) };
  });
  expect(geo.align).toEqual(["left", "center", "center", "center", "center", "center", "center"]);
  expect(geo.cellAlign).toEqual(["left", "center", "center", "center", "center", "center", "center"]);
  for (const o of geo.off) expect(o).toBeLessThanOrEqual(1);
  const fit = await t.evaluate((tb) => tb.parentElement.scrollWidth <= tb.parentElement.clientWidth + 1);
  expect(fit).toBe(true);                                                                            // no sideways scroll at 360 px
  await ws.screenshot({ path: "test-results/v2562-shots/week-summary-table-360.png" });
  await page.getByRole("button", { name: new RegExp("^" + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()] + "( \\d+)?$") }).first().click();
  await page.getByTestId("day-summary").screenshot({ path: "test-results/v2562-shots/day-summary-360.png" });
});
