import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// v2.46.0 (Architect brief 24 Nov, P1): My training style lives in My Profile (after the goal), per person, in a Strength
// subsection; gone from Settings; same stored values; in the Help guide as "My training style: in My Profile".
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });

test("My Profile → My training style, after the goal, per person; stored values unchanged; not in Settings", async ({ page }) => {
  const { errors } = await openApp(page);
  const dash = await get("dashboard:data");
  dash.jc.trainingStyle = { focus: "muscle", pace: "bigger", perExercise: { "Leg Press": { focus: "strength", pace: "steady" } } };
  delete dash.becks.trainingStyle;
  await put("dashboard:data", dash); await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "▼ My Profile" }).click();
  const card = page.getByTestId("training-style");
  await expect(card.getByTestId("training-style-strength")).toContainText("Strength");
  await expect(card.locator("#ts-focus")).toHaveValue("muscle");                                   // the stored value, read as before
  await expect(card.locator("#ts-pace")).toHaveValue("bigger");
  const tops = await page.evaluate(() => ["my-goal", "training-style"].map((id) => document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect().top));
  expect(tops[0]).toBeLessThan(tops[1]);                                                           // after the goal
  expect((await get("dashboard:data")).jc.trainingStyle).toEqual({ focus: "muscle", pace: "bigger", perExercise: { "Leg Press": { focus: "strength", pace: "steady" } } });
  // per person: Becks has her own (default) style
  await page.getByRole("button", { name: "Becks", exact: true }).first().click();
  await expect(page.getByTestId("training-style").locator("#ts-focus")).toHaveValue("mixed");
  // gone from Settings
  await page.evaluate(() => window._lcGo("admin"));
  await expect(page.getByRole("heading", { name: /Data Admin|Settings/ }).first().or(page.getByText("Data Admin").first())).toBeVisible();
  await expect(page.getByTestId("training-style")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Help: 'My training style: in My Profile'", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: /help/i }).first().click();
  await page.getByTestId("help-how").locator(":scope > summary").click();
  await page.locator("#hiw-search").fill("training style");
  const row = page.getByTestId("hiw-item").filter({ hasText: "My training style" });
  await expect(row).toContainText("My training style: in My Profile");
  await expect(row).toContainText("My Profile (Home → ▼ My Profile)");
});
