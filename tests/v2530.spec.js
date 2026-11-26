import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.53.0 (Architect night batch 25 Nov, PART 2): My Eating → Week: "Week Summary" (no Avg next to the header), two pills
// (Average daily calories · Week to date), the days hidden by default (Show/Hide), Body Burn − Deficit + Exercise = Goal,
// "Target Surplus" when the goal adds calories, future days "—", and Full Breakdown = the days + the detail box.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const num = (t) => Number(String(t).replace(/[^\d−-]/g, "").replace("−", "-"));
const week = async (page) => { await tab(page, "My Eating"); await page.getByRole("button", { name: "Week", exact: true }).first().click(); };

test("Week Summary: title, no Avg by the header, two pills on one row, days hidden by default; Show → the table; the maths", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await week(page);
  await expect(page.getByTestId("week-head")).not.toContainText("Avg");
  const ws = page.getByTestId("week-summary");
  await expect(ws).toContainText("Week Summary");
  await expect(ws).not.toContainText("Planned");
  const [a, b] = [await ws.getByTestId("sum-avg").boundingBox(), await ws.getByTestId("sum-wtd").boundingBox()];
  expect(Math.abs(a.y - b.y)).toBeLessThan(2); expect(a.x).toBeLessThan(b.x);                         // one row, left/right
  await expect(ws.getByTestId("sum-avg")).toContainText("Average daily calories:");
  await expect(ws.getByTestId("sum-wtd")).toContainText("Week to date:");
  await expect(ws.getByTestId("week-sum-table")).toHaveCount(0);                                     // hidden by default
  await ws.screenshot({ path: "test-results/v2530-shots/week-summary-hidden-360.png" });
  await ws.getByTestId("sum-toggle").click();
  const t = ws.getByTestId("week-sum-table");
  expect(await t.locator("thead th").allInnerTexts()).toEqual(["Day", "Body\nBurn", "Target\nDeficit", "Exercise\nBenefit", "Goal", "Actual", "On\nTrack"]);
  await expect(t.getByTestId("sum-row")).toHaveCount(7);
  for (const r of await t.getByTestId("sum-row").all()) {
    const v = async (c) => num(await r.locator(`[data-col="${c}"]`).innerText());
    expect(await v("burn") - await v("target") + await v("exercise")).toBe(await v("goal"));         // Body Burn − Deficit + Exercise = Goal
  }
  const today = new Date().toISOString().slice(0, 10);
  for (const r of await t.locator('[data-testid="sum-row"]').all()) if ((await r.getAttribute("data-date")) > today) {
    await expect(r.locator('[data-col="actual"]')).toHaveText("—"); await expect(r.locator('[data-col="ontrack"]')).toHaveText("—");
  }
  await ws.screenshot({ path: "test-results/v2530-shots/week-summary-expanded-360.png" });
  await ws.getByTestId("sum-toggle").click();
  await expect(t).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Full Breakdown opens the days AND the detail box; a calorie-adding goal says 'Target Surplus'", async ({ page }) => {
  await openApp(page);
  const d = await get("dashboard:data"); d.jc.goal = Object.assign({}, d.jc.goal, { id: "build" }); await put("dashboard:data", d);
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await week(page);
  await page.getByRole("button", { name: "Week full breakdown" }).click();
  await expect(page.getByTestId("week-sum-table")).toBeVisible();
  await expect(page.getByText("Week — Nutrition Overview (g)")).toBeVisible();
  const head = await page.getByTestId("sum-target-head").innerText();
  expect(head.replace(/\s+/g, " ")).toBe("Target Surplus");
});
