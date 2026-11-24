import { test, expect } from "@playwright/test";
import { openApp, tab, PROGRESS } from "./helpers.js";
import { currentWeek } from "../scripts/make-fixture.mjs";
import { PILLS, pillOf } from "../src/lib/pills.js";
import { fromGenerated, measureProse, showMeasure } from "../src/lib/exerciseGen.js";
import { isProse, fmtEntry } from "../src/lib/exercise.js";

// v2.49.0 (Architect night batch 24 Nov, PART 1): "Ready to Progress"; a blank form while the Companion generates a new
// exercise; numbers only in the measures (words → notes); older sentences shown sensibly; the cardio Open form.
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };
const put = (k, v) => fetch(KEY(k), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(v)) });
const CW = currentWeek();
const D = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
const aiJson = (obj) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: JSON.stringify(obj) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) });
const SWIM_PROSE = { exerciseType: "cardio", sets: 1, metric1: "20 minutes continuous at easy conversational pace (RPE 4–5/10)", metric2: "2–3 sessions per week building to 30 min", progressionNotes: "Add 2–3 minutes a week.", equipmentNotes: "Pool" };

test("rules: the pill is 'Ready to Progress' (stored key unchanged); words never become a measure", () => {
  expect(PILLS["move up"].label).toBe("Ready to Progress");
  expect(["ready to progress", "Ready to Progress", "move up", "ready to move"].map(pillOf)).toEqual(["move up", "move up", "move up", "move up"]);
  const g = fromGenerated(SWIM_PROSE, "");
  expect([g.type, g.m1, g.m2]).toEqual(["cardio", "20", "2"]);                                     // the numbers only
  expect(g.progression).toContain("Add 2–3 minutes a week.");
  expect(g.progression).toContain("Duration (min): 20 minutes continuous at easy conversational pace");   // the words → notes
  expect(fromGenerated({ exerciseType: "weights", metric1: 30, metric2: 12 }, "")).toMatchObject({ m1: "30kg", m2: "12" });
  expect([isProse(SWIM_PROSE.metric1), isProse("Red band"), isProse("20kg"), isProse("12x3")]).toEqual([true, false, false, false]);
  expect(showMeasure(SWIM_PROSE.metric2)).toBe("—");
  expect(fmtEntry({ w: SWIM_PROSE.metric1, r: "8" })).toBe("— 8");
  expect(measureProse({ current: SWIM_PROSE.metric1, reps: "10" })).toBe(SWIM_PROSE.metric1);
});

async function addCustom(page, name) {
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "+ Add Exercise" }).first().click();
  await page.getByPlaceholder("Search exercises or type new name...").fill(name);
  await page.getByRole("button", { name: "Add Custom: " + name }).click();
}

test("adding Running: a BLANK form with 'Your Companion is generating a plan…' and inputs off until it arrives; numbers only after", async ({ page }) => {
  const { errors } = await openApp(page);
  let release; const gate = new Promise((r) => { release = r; });
  await page.route("https://api.anthropic.com/**", async (r) => { if (!/New exercise: Running/.test(r.request().postData() || "")) return r.fallback(); await gate; return r.fulfill(aiJson(SWIM_PROSE)); });
  await addCustom(page, "Running");
  await expect(page.getByTestId("ex-generating")).toHaveText(/Your Companion is generating a plan…/);
  await expect(page.locator("[data-testid=ex-add-fields][disabled]")).toHaveCount(1);
  const f = page.locator("[data-testid=ex-add-fields][disabled]");
  await expect(f.getByTestId("ex-type")).toContainText("Choose…");                               // no "Weights"
  await expect(f.locator("input:not([type=number])")).toHaveCount(0);                              // no 0 kg / 10 reps boxes
  await expect(f.locator("input[type=number]")).toHaveValue("");                                  // sets blank too
  await expect(page.getByRole("button", { name: "Add Exercise", exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByTestId("ex-generating").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/v2490-shots/generating-360.png" });
  release();
  await expect(page.getByTestId("ex-generating")).toHaveCount(0);
  await expect(page.locator("[data-testid=ex-add-fields][disabled]")).toHaveCount(0);
  const g = page.getByTestId("ex-type").filter({ hasText: "Cardio" }).locator("xpath=ancestor::fieldset[1]");
  await expect(g).toHaveCount(1);
  const vals = await g.locator("input:not([type=number])").evaluateAll((els) => els.map((e) => e.value));
  expect(vals).toEqual(["20", "2"]);                                                             // numbers only
  await expect(g.locator("textarea").first()).toHaveValue(/20 minutes continuous/);               // the words → progression notes
  expect(errors).toEqual([]);
});

test("if generating fails: a blank form, the type first; the measures follow the type (blank)", async ({ page }) => {
  await openApp(page);
  await page.route("https://api.anthropic.com/**", (r) => /New exercise: Rowing/.test(r.request().postData() || "") ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: [{ type: "text", text: "not json" }] }) }) : r.fallback());
  await addCustom(page, "Rowing");
  await expect(page.getByTestId("ex-gen-failed")).toContainText("Choose the type first");
  const t = page.getByTestId("ex-type").filter({ hasText: "Choose…" });
  await expect(t).toHaveCount(1);
  const f = t.locator("xpath=ancestor::fieldset[1]");
  await expect(page.getByRole("button", { name: "Add Exercise", exact: true })).toBeDisabled();
  await t.click();
  await page.getByRole("dialog", { name: "Choose the exercise type" }).getByRole("option", { name: "Cardio", exact: true }).click();
  const f2 = page.locator("fieldset[data-testid=ex-add-fields]").filter({ has: page.getByText("Duration (min)") });
  await expect(f2).toHaveCount(1);
  expect(await f2.locator("input:not([type=number])").evaluateAll((els) => els.map((e) => e.value))).toEqual(["", ""]);
  await expect(page.getByRole("button", { name: "Add Exercise", exact: true })).toBeEnabled();
});

const SWIM = () => ({ name: "Swimming", exType: "cardio", status: "", current: SWIM_PROSE.metric1, reps: SWIM_PROSE.metric2, sets: 1, prog: [{ wk: CW - 1, w: "20kg", r: "0.8", sets: [{ w: "20", r: "0.8" }], effort: "right" }] });
async function seed(page, list) {
  const dash = await get("dashboard:data"); dash.jc.exercises[D] = list; await put("dashboard:data", dash);
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await tab(page, "My Exercise");
}

test("older Swimming with sentences in its measures: the card shows '—' and the words as a note (nothing rewritten)", async ({ page }) => {
  const { errors } = await openApp(page);
  await seed(page, [{ ...SWIM(), prog: [] }]);
  await expect(page.getByTestId("ex-headline").first()).toHaveText("— · —");
  await expect(page.getByTestId("ex-plan-note")).toContainText("Plan: 20 minutes continuous at easy conversational pace");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByText("Swimming").first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/v2490-shots/swimming-card-360.png" });
  expect((await get("dashboard:data")).jc.exercises[D][0].current).toBe(SWIM_PROSE.metric1);   // no data rewrite
  await seed(page, [SWIM()]);
  await expect(page.getByTestId("ex-headline").first()).toHaveText("20 min · 0.8 km");          // the latest log, in min/km (never "20kg")
  expect(errors).toEqual([]);
});

test("cardio Open: its own measures (no Set 1–3), 'How hard did it feel?' instead of Range/Form; Edit saves the effort", async ({ page }) => {
  const { errors } = await openApp(page);
  page.on("dialog", (d) => d.accept());
  await seed(page, [{ ...SWIM(), name: "Exercise Bike", current: "20", reps: "0.8" }]);   // a bike: no Form (swimming and rowing keep it)
  await page.getByRole("button", { name: PROGRESS }).first().click();
  await page.getByRole("button", { name: "Open week " + (CW - 1) }).click();
  const f = page.getByTestId("prog-open-form");
  await expect(f).toContainText("Log (Duration / Distance)");
  await expect(f.getByText("Set 1", { exact: true })).toHaveCount(0);
  await expect(f.getByTestId("entry-set-1")).toContainText("20 min · 0.8 km");
  await expect(f.getByTestId("entry-set-2")).toHaveCount(0);
  await expect(f.getByTestId("entry-effort-chip")).toHaveText("About right");
  await expect(f.getByTestId("entry-fullRange")).toHaveCount(0);
  await expect(f.getByTestId("entry-goodForm")).toHaveCount(0);
  await f.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(f.getByRole("button", { name: "+ Add set" })).toHaveCount(0);
  await f.getByTestId("entry-effort").getByRole("button", { name: "Easy" }).click();
  await page.setViewportSize({ width: 360, height: 800 });
  await f.screenshot({ path: "test-results/v2490-shots/cardio-open-360.png" });
  await f.getByRole("button", { name: "Save", exact: true }).click();
  await expect(f.getByTestId("open-form-msg")).toContainText("saved");
  const e = (await get("dashboard:data")).jc.exercises[D][0].prog.find((x) => x.wk === CW - 1);
  expect([e.effort, e.fullRange, e.goodForm]).toEqual(["easy", undefined, undefined]);
  expect(errors).toEqual([]);
});
