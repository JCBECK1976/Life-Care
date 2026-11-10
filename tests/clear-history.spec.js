import { test, expect } from "@playwright/test";
import { openApp, person } from "./helpers.js";
import { planClearHistory, currentWeekSunday } from "../src/lib/meals.js";

// v2.6.5 (JC decision): Settings → Data tools → "Clear old eating history" — meal week plans only.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const getRaw = async () => (await fetch("http://127.0.0.1:9000/data.json" + NS, { headers: { Authorization: "Bearer owner" } })).json();
const openSettings = (page) => page.locator("button").nth(1).click();

test("planner (pure): only mealplan weeks before the date, counted per person; current week Sunday default", () => {
  const plans = {
    "mealplan:2026-08-23": { sun: "spag_bol", mon: "x", _notes: { a: 1 } },
    "mealplan:2026-09-06:jc": { monday: { b: "a", l: "__empty__", o1: "c" }, _snap: { "monday:b": { id: "a" } } },
    "mealplan:2026-09-06:becks": { tuesday: { d: "d" } },
    "mealplan:2026-11-08:jc": { monday: { b: "a" } },
    "custom_breakfasts": [], "dashboard:data": {},
  };
  const r = planClearHistory(plans, "2026-11-08");
  expect(r.keys).toEqual(["mealplan:2026-08-23", "mealplan:2026-09-06:becks", "mealplan:2026-09-06:jc"]);
  expect(r).toMatchObject({ weeks: 3, selections: 5, perPerson: { "shared (old format)": { weeks: 1, selections: 2 }, jc: { weeks: 1, selections: 2 }, becks: { weeks: 1, selections: 1 } } });
  expect(currentWeekSunday(new Date(2026, 10, 10))).toBe("2026-11-08");
  expect(currentWeekSunday(new Date(2026, 10, 8))).toBe("2026-11-08");
});

test("emulator: dry run counts only → Delete removes only old meal week plans → second dry run finds nothing", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  const before = await getRaw();
  const sunday = currentWeekSunday();
  const old = Object.keys(before).filter((k) => /^mealplan:(\d{4}-\d{2}-\d{2})/.test(k) && k.slice(9, 19) < sunday);
  await person(page, "JC");
  await openSettings(page);
  await page.getByRole("button", { name: "Open Data tools" }).click();
  await expect(page.getByLabel("Delete weeks starting before")).toHaveValue(sunday);
  await page.getByRole("button", { name: "Dry run (counts only)" }).click();
  const res = page.getByTestId("clear-history-result");
  await expect(res).toContainText(`Before ${sunday}: ${old.length} week plans`);
  console.log("EMULATOR DRY RUN: " + await res.innerText());
  expect(JSON.stringify(await getRaw())).toBe(JSON.stringify(before));                 // dry run changed nothing
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByTestId("clear-history-msg")).toHaveText(`✓ Deleted ${old.length} meal week plans from before ${sunday}.`);
  const after = await getRaw();
  for (const k of old) expect(after[k]).toBeUndefined();
  for (const k of Object.keys(before).filter((k) => !old.includes(k))) expect(after[k]).toEqual(before[k]);   // lists, exercise, body, health, settings, newer weeks untouched
  await page.getByRole("button", { name: "Dry run (counts only)" }).click();
  await expect(res).toContainText(`Before ${sunday}: 0 week plans · 0 selections`);
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
