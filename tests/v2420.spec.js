import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { currentWeek } from "../scripts/make-fixture.mjs";
import { pillOf, pillAfterLog, metTarget, PROGRESSION, PILLS } from "../src/lib/pills.js";

// v2.42.0 (Architect night batch 23 Nov, PART 3 — JC decision): only three pills, worked out on every Log save.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const CW = currentWeek();
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const D = DAYS[new Date().getDay()];
const PRESS = (o = {}) => ({ name: "Chest Press", exType: "weights", status: "consolidating", current: "29kg", reps: "12x3", sets: 3,
  next: { m1: "30", m2: "12", source: "set by you", setAt: "x" }, prog: [{ wk: CW - 1, w: "29kg", r: "12x3", goodForm: "good", fullRange: "good" }], ...o });
const GOOD = { range: "good", form: "good" };
const sets = (w, ...r) => r.map((x) => ({ w: String(w), r: String(x) }));

test("rules: the dropdown, the three pills, met / not met, no target, legacy mapping", () => {
  expect(PROGRESSION.map((o) => o[1])).toEqual(["Standard Progression", "Maintain", "Reduce"]);
  expect(Object.values(PILLS).map((p) => p.label)).toEqual(["Ready to Progress", "Consolidate", "Reduce"]);
  const T = { m1: "30", m2: "12" }, ex = PRESS();
  expect(pillAfterLog("standard", sets(30, 12, 12, 12), GOOD, T, ex)).toBe("move up");
  expect(pillAfterLog("standard", sets(30, 12, 12, 10), GOOD, T, ex)).toBe("consolidate");        // one set short
  expect(pillAfterLog("standard", sets(28, 12, 12, 12), GOOD, T, ex)).toBe("consolidate");        // lighter than the target
  expect(pillAfterLog("standard", sets(30, 12, 12, 12), { range: "working", form: "good" }, T, ex)).toBe("consolidate");
  expect(pillAfterLog("standard", sets(30, 12, 12, 12), { range: "good", form: "working" }, T, ex)).toBe("consolidate");
  expect(pillAfterLog("maintain", sets(30, 15, 15, 15), GOOD, T, ex)).toBe("consolidate");
  expect(pillAfterLog("reduce", sets(30, 15, 15, 15), GOOD, T, ex)).toBe("reduce");
  // no target: the top of the rep range (12–15) on every set
  expect([metTarget(sets(29, 15, 15, 15), null, ex), metTarget(sets(29, 15, 15, 14), null, ex)]).toEqual([true, false]);
  expect(metTarget(sets(0, 60), null, { name: "Plank", exType: "timed_hold" })).toBe(false);
  // legacy display mapping (no data rewrite)
  expect(["ready to move", "Ready to Progress", "reduce", "moved up", "building", "maintaining", "consolidating", "building back up", ""].map(pillOf))
    .toEqual(["move up", "move up", "reduce", "consolidate", "consolidate", "consolidate", "consolidate", "consolidate", "consolidate"]);
});

async function seed(page, list) {
  const dash = await get("dashboard:data"); dash.jc.exercises[D] = list; await put("dashboard:data", dash);
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Exercise");
}
const good = async (page) => { for (const b of await page.getByRole("button", { name: "Good", exact: true }).all()) await b.click(); };
async function logOnce(page, { reps, choice }) {
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  await expect(page.locator("#log-progression-select")).toHaveValue("standard");                   // Standard every time
  if (reps) await page.getByPlaceholder("Reps").last().fill(String(reps));
  if (choice) await page.locator("#log-progression-select").selectOption(choice);
  await good(page);
  await page.getByRole("button", { name: /^(Save|Update)$/ }).first().click();   // the same week again = Update
  await expect(page.getByTestId("log-for")).toHaveCount(0);
  return (await get("dashboard:data")).jc.exercises[D][0];
}

test("every Log save works out the pill: met → Move Up; one set short → Consolidate; Maintain; Reduce", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  await seed(page, [PRESS()]);
  await expect(page.getByTestId("ex-status").first()).toHaveText("Consolidate");                   // legacy "consolidating"
  let ex = await logOnce(page, {});
  expect([ex.status, ex.statusSource]).toEqual(["move up", "rules"]);
  await expect(page.getByTestId("ex-status").first()).toHaveText("Ready to Progress");
  ex = await logOnce(page, { reps: 10 });
  expect(ex.status).toBe("consolidate");
  ex = await logOnce(page, { choice: "maintain" });
  expect(ex.status).toBe("consolidate");
  ex = await logOnce(page, { choice: "reduce" });
  expect(ex.status).toBe("reduce");
  await expect(page.getByTestId("ex-status").first()).toHaveText("Reduce");
  expect(errors).toEqual([]);
});

test("the Progression dropdown has exactly the three options", async ({ page }) => {
  await openApp(page);
  await seed(page, [PRESS()]);
  await page.getByRole("button", { name: "📋 Log", exact: true }).first().click();
  expect(await page.locator("#log-progression-select option").allInnerTexts()).toEqual(["Standard Progression", "Maintain", "Reduce"]);
});

test("precedence: accepted Companion feedback sets the pill; the next Log save works it out again", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  await put("session_feedback_all", { ["jc_" + D]: { summary: "Good", nextSession: "", exercises: [{ name: "Chest Press", verdict: "Form slipped.", icon: "star", newStatus: "reduce", recommendation: "Drop a step" }], _feedbackWeek: 0, _generatedAt: "now" } });
  await seed(page, [PRESS({ status: "move up" })]);
  await page.getByRole("button", { name: "▼ Show Feedback" }).first().click();
  await page.getByRole("button", { name: /Exercise Feedback & Recommendations/ }).click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect.poll(async () => (await get("dashboard:data")).jc.exercises[D][0].status).toBe("reduce");
  expect((await get("dashboard:data")).jc.exercises[D][0].statusSource).toBe("Companion");
  await expect(page.getByTestId("ex-status").first()).toHaveText("Reduce");
  const ex = await logOnce(page, {});
  expect([ex.status, ex.statusSource]).toEqual(["move up", "rules"]);
  expect(errors).toEqual([]);
});
