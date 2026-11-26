import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";

// v2.55.0 (Architect night batch 25 Nov, PART 4): a matched exercise is the main action ("Running · Cardio", one label),
// "Add custom" is secondary; Sessions as tall as Type; while the Companion prepares the plan the measures are EMPTY and
// disabled with the status ABOVE them (never in Progression Rules); slow/failed → a friendly message + Try again / Fill in myself.
const aiJson = (obj) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: JSON.stringify(obj) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) });
const RUN = { exerciseType: "cardio", sets: 1, metric1: 25, metric2: 4, progressionNotes: "Add 2 minutes a week.", equipmentNotes: "" };

async function search(page, q) {
  await tab(page, "My Exercise");
  await page.getByRole("button", { name: "+ Add Exercise" }).first().click();
  await page.getByPlaceholder("Search exercises or type new name...").fill(q);
}

test("search 'Running': the match is a full-width main button 'Running · Cardio' (one label); 'Add custom' is outlined below", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { errors } = await openApp(page);
  await search(page, "Running");
  const m = page.getByTestId("ex-match").filter({ hasText: /^Running · / }).first();
  await expect(m).toHaveText("Running · Cardio");
  const c = page.getByTestId("ex-add-custom");
  await expect(c).toHaveText("Add custom: Running");
  const [mb, cb] = [await m.boundingBox(), await c.boundingBox()];
  expect(mb.height).toBeGreaterThanOrEqual(44); expect(mb.y).toBeLessThan(cb.y);
  expect(await m.evaluate((e) => getComputedStyle(e).backgroundImage)).toContain("gradient");             // main button style
  expect(await c.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe("rgb(255, 255, 255)");         // outlined secondary
  await page.screenshot({ path: "test-results/v2550-shots/exercise-search-360.png" });
  expect(errors).toEqual([]);
});

test("while preparing (matched): measures empty + disabled, status above the fields, nothing in Progression Rules; Sessions = Type height", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openApp(page);
  let release; const gate = new Promise((r) => { release = r; });
  await page.route("https://api.anthropic.com/**", async (r) => { if (!/New exercise: Running/.test(r.request().postData() || "")) return r.fallback(); await gate; return r.fulfill(aiJson(RUN)); });
  await search(page, "Running");
  await page.getByTestId("ex-match").filter({ hasText: /^Running · / }).first().click();
  const st = page.getByTestId("ex-generating");
  await expect(st).toHaveText(/Your Companion is looking for recommendations…/);
  const f = page.locator("[data-testid=ex-add-fields][disabled]");
  await expect(f).toHaveCount(1);
  expect(await f.locator("input:not([type=number])").evaluateAll((els) => els.map((e) => e.value))).toEqual(["", ""]);   // Duration / Distance empty
  await expect(f.locator("textarea").first()).toHaveValue("");                                          // no "Loading…" in Progression Rules
  expect((await st.boundingBox()).y).toBeLessThan((await f.boundingBox()).y);                            // status above the fields
  const [tb, sb] = [await f.getByTestId("ex-type").boundingBox(), await f.locator("input[type=number]").boundingBox()];
  expect(Math.abs(tb.height - sb.height)).toBeLessThanOrEqual(1);                                         // Sessions as tall as Type
  await page.getByTestId("ex-generating").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/v2550-shots/generating-360.png" });
  release();
  await expect(st).toHaveCount(0);
  const g = page.locator("fieldset[data-testid=ex-add-fields]").filter({ has: page.getByText("Duration (min)") });
  expect(await g.locator("input:not([type=number])").evaluateAll((els) => els.map((e) => e.value))).toEqual(["25", "4"]);
});

test("slow generation: a friendly message within 20 s with Try again / Fill in myself", async ({ page }) => {
  await openApp(page);
  await page.addInitScript(() => { window.__lcExGenTimeout = 1500; });
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  let calls = 0;
  await page.route("https://api.anthropic.com/**", async (r) => { if (!/New exercise: Rowing/.test(r.request().postData() || "")) return r.fallback(); calls++; if (calls === 1) return; return r.fulfill(aiJson({ ...RUN, metric1: 15 })); });   // the first one never answers
  await search(page, "Rowing");
  await page.getByTestId("ex-match").filter({ hasText: /^Rowing/ }).first().click();
  const failed = page.getByTestId("ex-gen-failed");
  await expect(failed).toContainText("couldn't prepare a plan", { timeout: 5000 });
  await failed.getByTestId("ex-gen-retry").click();                                                     // Try again
  await expect(page.getByTestId("ex-generating")).toHaveCount(0, { timeout: 5000 });
  await expect(failed).toHaveCount(0);
  // Fill in myself: the form is free to fill in
  await page.unroute("https://api.anthropic.com/**");
  await page.route("https://api.anthropic.com/**", (r) => /New exercise: Zumba Gold/.test(r.request().postData() || "") ? new Promise(() => {}) : r.fallback());
  await page.getByRole("button", { name: "Cancel" }).last().click();
  await search(page, "Zumba Gold");
  await page.getByTestId("ex-add-custom").click();
  await expect(page.getByTestId("ex-gen-failed")).toBeVisible({ timeout: 5000 });
  await page.getByTestId("ex-gen-self").click();
  await expect(page.locator("[data-testid=ex-add-fields][disabled]")).toHaveCount(0);
  await expect(page.getByTestId("ex-gen-type-first")).toContainText("Choose the type first");
});
