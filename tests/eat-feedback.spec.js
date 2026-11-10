import { test, expect } from "@playwright/test";
import { openApp, tab } from "./helpers.js";
import { dayPhase, weekPhase, readFeedback } from "../src/lib/eatPhase.js";

// v2.9.0 F6: Eating Feedback knows what was eaten (days before today) and what is planned (today onwards).
const NS = "?ns=life-care-app-64d04-default-rtdb";
const url = (k) => "http://127.0.0.1:9000/data/" + k + ".json" + NS;
const setKey = (k, obj) => fetch(url(k), { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(JSON.stringify(obj)) });
const reply = (obj, extra) => ({ status: 200, contentType: "application/json", body: JSON.stringify(Object.assign({ id: "m", type: "message", role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }, extra || {})) });
const FB = { wins: ["Good protein on Monday"], tweaks: ["Swap the chips on Thursday"], outlook: "Solid week." };

test("phase rules (pure) and reply checks", () => {
  expect([dayPhase("2026-11-10", "2026-11-11"), dayPhase("2026-11-11", "2026-11-11"), dayPhase("2026-11-12", "2026-11-11")]).toEqual(["eaten", "planned", "planned"]);
  expect(weekPhase(["2026-11-08", "2026-11-14"], "2026-11-11")).toBe("mixed");
  expect(weekPhase(["2026-11-15", "2026-11-21"], "2026-11-11")).toBe("plan review");
  expect(weekPhase(["2026-11-01", "2026-11-07"], "2026-11-11")).toBe("eaten");
  expect(() => readFeedback({ stop_reason: "max_tokens", content: [{ text: '{"wins":["a"' }] })).toThrow(/cut off/);
  expect(() => readFeedback({ content: [] })).toThrow(/No feedback came back/);
  expect(() => readFeedback({ content: [{ text: "not json" }] })).toThrow(/couldn't read/);
});

async function setup(page) {
  await page.clock.setFixedTime(new Date(2026, 10, 11, 10, 0, 0));          // Wed 11 Nov 2026
  const { errors } = await openApp(page);
  await tab(page, "My Eating"); await page.waitForTimeout(500);
  const item = (id, name) => ({ id, name, jcKcal: 500, beckKcal: 450, protein: 25, satFat: 3, rating: "GOOD" });
  await setKey("custom_meals", [item("t_mon", "Monday Chicken"), item("t_thu", "Thursday Fish")]);
  await fetch(url("eat_children:jc:2026-11-08"), { method: "DELETE", headers: { Authorization: "Bearer owner" } });
  await setKey("mealplan:2026-11-08:jc", { monday: { d: "t_mon" }, thursday: { d: "t_thu" } });
  const prompts = [];
  await page.route("https://api.anthropic.com/**", (r) => { const b = r.request().postDataJSON(); const t = JSON.stringify(b); if (!/reviewing/.test(t)) return r.fallback(); prompts.push(b.messages[0].content); return r.fulfill(reply(FB)); });
  await page.reload(); await tab(page, "My Eating");
  return { errors, prompts };
}

test("week feedback: past days are EATEN, today onwards is the PLAN, and the panel says so", async ({ page }) => {
  const { errors, prompts } = await setup(page);
  await page.getByText("Week", { exact: true }).first().click();
  await page.getByRole("button", { name: "My Companion Week's Feedback" }).click();
  await expect(page.getByTestId("eat-fb-phase")).toHaveText("· So far this week + the rest of your plan");
  const p = prompts[prompts.length - 1];
  expect(p).toContain("mon 2026-11-09 (EATEN): 500kcal");
  expect(p).toContain("thu 2026-11-12 (PLAN): 500kcal");
  expect(p).toContain("So far this week you've eaten");
  expect(errors).toEqual([]);
});

test("a fully future week is a plan review", async ({ page }) => {
  const { errors, prompts } = await setup(page);
  await page.locator("button", { hasText: "›" }).first().click();
  await page.getByText("Week", { exact: true }).first().click();
  await page.getByRole("button", { name: "My Companion Week's Feedback" }).click();
  await expect(page.getByTestId("eat-fb-phase")).toHaveText("· Plan review");
  expect(prompts[prompts.length - 1]).toMatch(/^THIS WHOLE WEEK IS IN THE FUTURE: it is a PLAN REVIEW/);
  expect(errors).toEqual([]);
});

test("day feedback: a past day is reviewed as eaten, today as a plan", async ({ page }) => {
  const { errors, prompts } = await setup(page);
  await page.getByRole("button", { name: /^Mon/ }).first().click();
  await page.getByRole("button", { name: "My Companion Eating Feedback" }).click();
  await expect(page.getByTestId("eat-fb-phase")).toHaveText("· What you ate");
  expect(prompts[prompts.length - 1]).toContain("THIS IS A PAST DAY — WHAT THEY ATE on Monday 2026-11-09 (from their logged meals): Dinner: Monday Chicken");
  await page.getByRole("button", { name: /^Thu/ }).first().click();
  await page.getByRole("button", { name: "My Companion Eating Feedback" }).click();
  await expect(page.getByTestId("eat-fb-phase")).toHaveText("· Your plan");
  expect(prompts[prompts.length - 1]).toContain("THIS IS A FUTURE DAY — THEIR PLAN for Thursday 2026-11-12 (not eaten yet): Dinner: Thursday Fish");
  expect(errors).toEqual([]);
});

test("cut-off feedback and failed chat replies are reported, not swallowed", async ({ page }) => {
  const { errors } = await setup(page);
  let mode = "cut";
  await page.route("https://api.anthropic.com/**", (r) => {
    const t = r.request().postData() || "";
    if (/continuing a conversation about feedback/.test(t)) return mode === "fail" ? r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ type: "error", error: { type: "api_error", message: "Overloaded" } }) }) : r.fulfill(reply("Sure — swap the chips for new potatoes and", { stop_reason: "max_tokens" }));
    if (/reviewing/.test(t)) return r.fulfill(mode === "cut" ? reply('{"wins":["Good', { stop_reason: "max_tokens" }) : reply(FB));
    return r.fallback();
  });
  await page.getByRole("button", { name: /^Mon/ }).first().click();
  await page.getByRole("button", { name: "My Companion Eating Feedback" }).click();
  await expect(page.getByText(/Feedback was cut off before it finished/).first()).toBeVisible();
  mode = "ok";
  await page.getByRole("button", { name: "My Companion Eating Feedback" }).click();
  await expect(page.getByTestId("eat-fb-phase")).toBeVisible();
  const box = page.getByPlaceholder("Respond to this feedback...").first();
  mode = "fail";
  await box.fill("What should I swap?");
  await box.locator("xpath=following-sibling::button[1]").click();
  await expect(page.getByTestId("thread-error")).toContainText("Your message is still in the box.");
  await expect(box).toHaveValue("What should I swap?");
  mode = "cutreply";
  await box.locator("xpath=following-sibling::button[1]").click();
  await expect(page.getByText(/I ran out of room there — ask me to carry on/)).toBeVisible();
  await expect(page.getByTestId("thread-error")).toHaveCount(0);
  expect(errors.filter((e) => !/500|Overloaded/.test(e))).toEqual([]);
});
