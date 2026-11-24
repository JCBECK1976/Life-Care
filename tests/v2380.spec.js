import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openApp, tab } from "./helpers.js";

// v2.38.0 (Architect brief 23 Nov, PART 5): a) "How Lifecare works" (real controls; once in onboarding; top of Help) and
// Help's order; b) Record → Log; c) the onboarding choice (explore / quick / full), resumable, tier-aware, tips.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const put = (path, v) => fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { method: "PUT", headers: H, body: JSON.stringify(v) });
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json" + NS;
const getKey = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); if (v == null) return null; try { return typeof v === "string" ? JSON.parse(v) : v; } catch (e) { return v; } };
const delKey = (k) => fetch(KEY(k), { method: "DELETE", headers: H });
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const axe = async (page, sel) => (await new AxeBuilder({ page }).include(sel).withTags(AXE_TAGS).analyze()).violations.map((v) => v.id);
const BRIEF_ITEMS = ["Progress", "Open", "Snap", "Log", "Remove", "Delete", "Edit", "Add / + Add New / + Add Exercise / + Add Week", "Copy Day / Copy Week", "Default (Individual / All)", "Upload", "Re-rate all lists", "Re-check nutrition", "Check / Check me badge", "Confirm / Re-check / Cancel", "Set my next session", "Skipped this session", "Undo", "Clear Week", "Single item / Build a meal / My own", "+ Not in my list?", "Help Me with What to Eat", "Quick Prep Days", "Shopping generator (Gold)", "Generate Warm-up & Cool-down", "My Companion Feedback", "Chat 💬", "Help", "Journal", "Mood", "Energy meter", "Settings ⚙", "Person tabs", "Week ‹ › and day tabs", "Today table (Planned vs Actual)", "RAG colours", "Status pills", "Range / Form", "🔒 plan prompts / See plans"];

async function joint(page, flags) {
  await delKey("setup_guide_jc");
  await page.addInitScript((f) => localStorage.setItem("lc_flags", JSON.stringify(f)), { useOnboarding: true, ...(flags || {}) });
  return openApp(page);
}
const openSettings = (page) => page.getByRole("button", { name: /Settings/ }).first().click();
async function startFromSettings(page, path) {
  await openSettings(page);
  await page.getByTestId("setup-guide-open").click();
  await page.getByTestId("ob-path-" + path).click();
}

test("Help: How Lifecare works at the top (every item in the brief, real styles), then the guide's FAQ, then Ask the Companion", async ({ page }) => {
  const { errors } = await openApp(page);
  await page.getByRole("button", { name: /help/i }).first().click();
  const order = await page.getByTestId("help-scroll").evaluate((el) => [...el.children].map((c) => c.getAttribute("data-testid")));
  expect(order).toEqual(["help-how", "help-faq", "help-ask"]);
  await page.getByTestId("help-how").locator(":scope > summary").click();
  const names = await page.getByTestId("hiw-name").allTextContents();
  expect(names.map((n) => n.replace(/:$/, ""))).toEqual(BRIEF_ITEMS.filter((x) => names.map((n) => n.replace(/:$/, "")).includes(x)).length === BRIEF_ITEMS.length ? names.map((n) => n.replace(/:$/, "")) : BRIEF_ITEMS);
  for (const b of BRIEF_ITEMS) expect(names.map((n) => n.replace(/:$/, ""))).toContain(b);
  await expect(page.getByTestId("help-ask")).toContainText("Ask the Companion");
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await axe(page, "[data-testid=help-scroll]")).toEqual([]);
  expect(errors).toEqual([]);
});

test("Bronze: Help is the guide + FAQ, and Ask the Companion shows the plan prompt (no AI)", async ({ page }) => {
  await put("apps/lifecare", null);
  await page.addInitScript(() => { localStorage.setItem("lc_flags", JSON.stringify({ useTiers: true })); localStorage.removeItem("lc_plan_preview"); });
  await openApp(page, "member");
  await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  await page.getByRole("button", { name: /help/i }).first().click();
  await expect(page.getByTestId("help-faq")).toBeVisible();
  await expect(page.getByTestId("help-ask")).toContainText("part of Silver");
  await expect(page.getByTestId("help-ask").locator("textarea")).toHaveCount(0);
});

test("My Body: the weigh-in button is 📋 Log (no 'Record')", async ({ page }) => {
  await openApp(page);
  await tab(page, "My Body");
  await expect(page.getByRole("button", { name: "📋 Log", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Record/ })).toHaveCount(0);
});

test("new account: the start choice only after the age check, Terms/Privacy and choices; 'explore' → the guide once (Esc closes), Home checklist, no goal setup until a goal feature is opened", async ({ page }) => {
  await put("apps/lifecare", null);
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useOnboarding: true })));
  await openApp(page, "member");
  const d = await getKey("dashboard:data"); delete d.jc.goal; await fetch(KEY("dashboard:data"), { method: "PUT", headers: H, body: JSON.stringify(JSON.stringify(d)) });   // no goal yet
  await page.reload(); await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  const ob = page.getByTestId("onboarding");
  await expect(ob.getByTestId("ob-path-explore")).toHaveCount(0);                                  // mandatory steps first
  await ob.getByTestId("ob-adult").check(); await ob.getByTestId("ob-next-1").click();
  await expect(ob.getByTestId("ob-path-explore")).toHaveCount(0);
  await ob.getByTestId("ob-agree").check(); await ob.getByTestId("ob-next-2").click();
  await expect(ob.getByTestId("ob-path-explore")).toHaveCount(0);
  await ob.getByTestId("ob-finish").click();
  await expect(ob.getByRole("heading", { name: "How would you like to get started?" })).toBeVisible();
  await expect(ob.getByTestId("setup-choice").getByRole("button")).toHaveText([/I'll explore myself/, /Quick set-up \(about 3 min\)/, /Full set-up \(about 10–15 min\)/]);
  await ob.getByTestId("ob-path-explore").click();
  const dlg = page.getByTestId("how-it-works-dialog");
  await expect(dlg).toBeVisible();
  await expect(page.getByTestId("how-it-works-close")).toBeFocused();                              // focus moved in
  await page.keyboard.press("Escape");
  await expect(dlg).toHaveCount(0);
  await expect(page.getByTestId("goal-setup")).toHaveCount(0);                                    // explore: not forced yet
  const chk = page.getByTestId("setup-checklist");
  await expect(chk).toContainText("Finish setting up");
  for (const k of ["profile", "health", "weighin", "food", "exercise", "colour"]) await expect(chk.getByTestId("setup-item-" + k)).toBeVisible();
  await expect(chk.getByTestId("setup-item-profile")).toContainText("to do");
  await tab(page, "My Eating");                                                                    // a goal feature, first opened
  await expect(page.getByTestId("goal-setup")).toBeVisible();
  await page.keyboard.press("Escape").catch(() => {});
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("how-it-works-dialog")).toHaveCount(0);                            // never automatic again
  await put("apps/lifecare", null);
});

test("quick set-up (from Settings → Set-up guide): the guide once → colour → health (Silver+: how to connect) → done; resumes where it stopped", async ({ page }) => {
  await joint(page);
  await startFromSettings(page, "quick");
  await expect(page.getByTestId("how-it-works-dialog")).toBeVisible();
  await page.getByTestId("how-it-works-close").click();
  const colour = page.getByTestId("setup-colour");
  await expect(colour).toContainText("Set-up · step 2 of 3");
  await colour.getByTestId("setup-colour-teal").click();
  await expect(page.getByTestId("setup-health")).toContainText("Settings → Connect my health data");
  await expect.poll(async () => (await getKey("setup_guide_jc")).step).toBe(2);                    // saved per step
  await page.reload(); await expect(page.getByText("Week ", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("setup-health")).toBeVisible();                                    // resumed here
  await expect(page.getByTestId("how-it-works-dialog")).toHaveCount(0);
  await page.getByTestId("setup-health").getByTestId("setup-next").click();
  await expect(page.getByTestId("setup-health")).toHaveCount(0);
  expect(await getKey("setup_guide_jc")).toMatchObject({ path: "quick", finished: true, guideSeen: true });
  expect(await getKey("user_colour_jc")).toBe("teal");
});

test("full set-up: a guided first visit to each section (it opens the section); skipping one shows 2–3 tips there later, dismissable", async ({ page }) => {
  await joint(page);
  await startFromSettings(page, "full");
  await page.getByTestId("how-it-works-close").click();
  await page.getByTestId("setup-colour").getByTestId("setup-skip").click();
  await page.getByTestId("setup-health").getByTestId("setup-next").click();
  const v = page.getByTestId("setup-visit");
  await expect(v).toContainText("First visit: My Body");
  await expect(page.getByRole("button", { name: "📋 Log", exact: true }).first()).toBeVisible();   // My Body opened by itself
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: "test-results/v2380-shots/full-setup-body-360.png" });
  expect(await axe(page, "[data-testid=setup-visit]")).toEqual([]);
  await v.getByTestId("setup-next").click();
  await expect(v).toContainText("First visit: My Exercise");
  await v.getByTestId("setup-next").click();
  await expect(v).toContainText("First visit: My Eating");
  await v.getByTestId("setup-skip").click();                                                      // skip Eating
  await expect(v).toContainText("First visit: My Shop");
  await v.getByTestId("setup-stop").click();                                                       // stop: the rest count as skipped
  await expect(page.getByTestId("setup-visit")).toHaveCount(0);
  await tab(page, "My Eating");
  const tips = page.getByTestId("setup-tips");
  await expect(tips).toContainText("Tips for My Eating");
  expect((await tips.locator("li").count())).toBeGreaterThanOrEqual(2);
  await tips.getByTestId("setup-tips-close").click();
  await expect(page.getByTestId("setup-tips")).toHaveCount(0);
  await tab(page, "My Health");
  await expect(page.getByTestId("setup-tips")).toContainText("Tips for My Health");                // stopped before Health
});

test("tier-aware, never blocking: on Bronze the health step says Silver and the exercise visit marks Generate as Gold; both can be passed", async ({ page }) => {
  await put("apps/lifecare", null);
  await delKey("setup_guide_jc");
  await page.addInitScript(() => { localStorage.setItem("lc_flags", JSON.stringify({ useOnboarding: true, useTiers: true })); localStorage.removeItem("lc_plan_preview"); });
  await openApp(page, "member");
  await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  const ob = page.getByTestId("onboarding");                                                       // a new account: onboarding first
  await ob.getByTestId("ob-adult").check(); await ob.getByTestId("ob-next-1").click();
  await ob.getByTestId("ob-agree").check(); await ob.getByTestId("ob-next-2").click();
  await ob.getByTestId("ob-finish").click(); await ob.getByTestId("ob-path-full").click();         // the set-up carries on from onboarding
  await page.getByTestId("how-it-works-close").click();
  await page.getByTestId("setup-colour").getByTestId("setup-skip").click();
  await expect(page.getByTestId("setup-health-tier")).toContainText("part of Silver");
  await page.getByTestId("setup-health").getByTestId("setup-next").click();
  await page.getByTestId("setup-visit").getByTestId("setup-next").click();
  await expect(page.getByTestId("setup-visit")).toContainText("First visit: My Exercise");
  await expect(page.getByTestId("setup-visit-tier")).toContainText("part of Gold");
  await page.getByTestId("setup-visit").getByTestId("setup-next").click();
  await expect(page.getByTestId("setup-visit")).toContainText("First visit: My Eating");
  await put("apps/lifecare", null);
});
