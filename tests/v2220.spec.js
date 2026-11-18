import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp, tab } from "./helpers.js";
import { DEFAULT_TIERS, FEATURES, TIER_ORDER, tierAllows } from "../src/constants/tiers.js";

// v2.22.0 (ADR 0017, JC 17 Nov 2026): four plans, gating, Settings → My Plan, Play Billing (client side; the server side
// is in functions/test). The flag useTiers is set per test (on /build/ it is always on).
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const put = (path, v) => fetch("http://127.0.0.1:9000/" + path + ".json" + NS, { method: "PUT", headers: H, body: JSON.stringify(v) });
const ME = "test-uid-member";
// Each test starts from a clean platform: no entitlements, households, energy.
async function platform(p) {
  await put("apps/lifecare", p || null);
}
async function withTiers(page, who, p) {
  await platform(p);
  await page.addInitScript(() => { localStorage.setItem("lc_flags", JSON.stringify({ useTiers: true })); localStorage.removeItem("lc_plan_preview"); });
  const r = await openApp(page, who);
  await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  return r;
}
const openSettings = (page) => page.locator('button[title="Settings"]').first().click();
const openMyPlan = async (page) => { await openSettings(page); await page.getByTestId("my-plan-toggle").click(); return page.getByTestId("my-plan"); };
// Every AI feature, asked from inside the app the way the sections ask (tagged fetch): is it sent?
const tryAll = (page) => page.evaluate(async (feats) => {
  const out = {};
  for (const f of feats) {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-lc-feature": f, "x-api-key": "k", "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 10, messages: [{ role: "user", content: "hi " + f }] }) });
    const j = await r.json(); out[f] = j.type === "error" && j.error.type === "plan" ? j.error.message : "sent";
  }
  return out;
}, ["foodRatings", "snap", "myOwnItem", "aiFeedback", "chat", "aiHelp", "autoInfo", "bodyBalance", "mealGenerator", "shoppingGenerator", "aiPlans"]);

test.afterAll(async () => { await platform(null); });

test("tiers.js is the same file in the app and the server; Bronze has no AI; Platinum = Gold + family", () => {
  expect(fs.readFileSync("src/constants/tiers.js", "utf8")).toBe(fs.readFileSync("functions/src/tiers.js", "utf8"));
  for (const f of Object.keys(FEATURES)) expect(tierAllows("bronze", f)).toBe(false);
  for (const f of Object.keys(FEATURES)) if (f !== "household") expect(tierAllows("platinum", f)).toBe(tierAllows("gold", f));
  expect(DEFAULT_TIERS.platinum.allowancePence).toBe(750);
  // every AI call in the app carries a plan feature
  const src = ["src/App.jsx", ...fs.readdirSync("src/sections").map((f) => "src/sections/" + f), "src/components/MeasureSnap.jsx", "src/lib/clarify.js"];
  for (const f of src) {
    const s = fs.readFileSync(f, "utf8");
    const calls = (s.match(/fetch\("https:\/\/api\.anthropic\.com\/v1\/messages"/g) || []).length;
    const tags = (s.match(/"x-lc-feature": "(\w+)"/g) || []).map((t) => t.split('"')[3]);
    expect(tags.length, f).toBe(calls);
    for (const t of tags) expect(Object.keys(FEATURES)).toContain(t);
  }
});

test("gating per plan, every feature: Bronze sends nothing; Silver no planning; Gold and Platinum everything", async ({ page }) => {
  const { aiCalls } = await withTiers(page, "member");
  const want = (tier) => Object.fromEntries(["foodRatings", "snap", "myOwnItem", "aiFeedback", "chat", "aiHelp", "autoInfo", "bodyBalance", "mealGenerator", "shoppingGenerator", "aiPlans"].map((f) => [f, tierAllows(tier, f) ? "sent" : null]));
  for (const tier of TIER_ORDER) {
    await put("apps/lifecare/entitlements/" + ME, tier === "bronze" ? null : { tier, source: "admin" });
    await page.evaluate(async () => { const m = await import("/Life-Care/src/lib/myPlan.js"); await m.loadPlan(); });
    const before = aiCalls.length;
    const got = await tryAll(page);
    const w = want(tier);
    for (const f of Object.keys(w)) {
      if (w[f]) expect(got[f], tier + " " + f).toBe("sent");
      else expect(got[f], tier + " " + f).toMatch(/ is part of (Silver|Gold|Platinum)\.$/);
    }
    expect(aiCalls.length - before).toBe(Object.values(w).filter(Boolean).length);   // a gated request never leaves the device
    if (tier === "bronze") expect(aiCalls.length - before).toBe(0);
  }
  expect(await page.evaluate(async () => (await import("/Life-Care/src/constants/tiers.js")).gateMessage("mealGenerator"))).toBe("Generate meals is part of Gold.");
});

test("Bronze: chat shows the prompt and See plans opens Settings → My Plan; Help is a searchable guide with no AI; My own and nutrition editing gated", async ({ page }) => {
  const { aiCalls, errors } = await withTiers(page, "member");
  await page.getByRole("button", { name: /chat/i }).first().click();
  const gate = page.getByTestId("plan-gate-chat");
  await expect(gate).toContainText("Chat with your Companion is part of Silver.");
  await gate.getByTestId("see-plans").click();
  await expect(page.getByTestId("my-plan-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("plan-current")).toContainText("You're on Bronze");
  // Help → FAQ
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /help/i }).first().click();
  await page.getByLabel("Search the guide").fill("colour theme");
  await expect(page.getByTestId("faq-entry").first()).toBeVisible();
  await expect(page.getByTestId("help-faq").getByTestId("plan-gate-aiHelp")).toContainText("Ask the Companion in Help is part of Silver.");
  await page.keyboard.press("Escape");
  // My own
  await tab(page, "My Eating");
  await page.getByRole("button", { name: "Update Eating Lists" }).click();
  await page.getByTestId("update-lists").getByRole("tab", { name: "My own" }).click();
  await expect(page.getByTestId("plan-gate-myOwnItem")).toContainText("My own item is part of Silver.");
  expect(await page.evaluate(async () => (await import("/Life-Care/src/lib/myPlan.js")).planAllows("editNutrition"))).toBe(false);
  expect(aiCalls.length).toBe(0);
  expect(errors).toEqual([]);
});

test("Bronze: a gated button shows the prompt dialog; nothing is sent", async ({ page }) => {
  const { aiCalls } = await withTiers(page, "member");
  await tab(page, "My Body");
  await page.getByRole("button", { name: "My Companion Body Feedback" }).click();
  const d = page.getByTestId("plan-gate-dialog");
  await expect(d).toContainText("Companion feedback is part of Silver.");
  await expect(d.getByTestId("see-plans")).toBeVisible();
  expect(aiCalls.length).toBe(0);
  await d.getByRole("button", { name: "Not now" }).click();
  await expect(d).toHaveCount(0);
});

test("My Plan as Bronze: collapsed by default; four plans compared, Bronze highlighted; monthly/yearly prices; no Energy, no top-up", async ({ page }) => {
  await withTiers(page, "member");
  await openSettings(page);
  await expect(page.getByTestId("my-plan-toggle")).toHaveAttribute("aria-expanded", "false");
  await page.getByTestId("my-plan-toggle").click();
  const t = page.getByTestId("plan-compare");
  await expect(t.getByTestId("plan-col-bronze")).toHaveAttribute("aria-current", "true");
  await expect(t.getByTestId("plan-col-silver")).toContainText("£5.99/mo");
  await expect(t.getByTestId("plan-col-platinum")).toContainText("£15.99/mo");
  await page.getByTestId("period-yearly").click();
  await expect(t.getByTestId("plan-col-gold")).toContainText("£79/yr");
  await expect(t.getByTestId("plan-col-platinum")).toContainText("£159/yr");
  await expect(page.getByTestId("plan-energy")).toHaveCount(0);
  await expect(page.getByTestId("plan-topup")).toHaveCount(0);                      // Bronze can't buy Energy
  await t.getByTestId("plan-col-gold").getByRole("button").click();
  await page.getByTestId("plan-upgrade").click();
  await expect(page.getByTestId("plan-msg")).toContainText("bought in the Lifecare Companion app (Google Play on Android, the App Store on iPhone)");   // no Stripe, no web purchase
});

test("My Plan as Silver (Play): renewal date, Energy %, top-up offered, Manage opens Google Play's subscription page", async ({ page }) => {
  const exp = Date.UTC(2026, 11, 17);
  await withTiers(page, "member", { entitlements: { [ME]: { tier: "silver", source: "play", expires: exp + 365 * 86400000 * 5, autoRenew: true, basePlan: "monthly" } }, energy: { [ME]: { balance: 150 } } });
  await openMyPlan(page);
  await expect(page.getByTestId("plan-current")).toContainText("You're on Silver");
  await expect(page.getByTestId("plan-renewal")).toContainText("Renews");
  await expect(page.getByTestId("plan-energy")).toContainText("50%");
  await expect(page.getByTestId("plan-topup")).toHaveText("⚡ Top up Companion Energy: £5");
  await expect(page.getByTestId("plan-manage")).toHaveAttribute("href", /play\.google\.com\/store\/account\/subscriptions\?package=com\.companionappsstudio\.lifecare&sku=silver/);
  await expect(page.getByTestId("my-family")).toHaveCount(0);
});

test("My Plan as a Platinum owner: family members, family pool %, invite by email", async ({ page }) => {
  await withTiers(page, "member", {
    entitlements: { [ME]: { tier: "platinum", source: "admin" } }, familyEnergy: { [ME]: { balance: 750 } },
    households: { h1: { owner: ME, members: { [ME]: true, "uid-sam": true } } }, memberOf: { [ME]: "h1", "uid-sam": "h1" },
    users: { [ME]: { profile: { name: "Alex" } }, "uid-sam": { profile: { name: "Sam" } } },
  });
  let invited = null;
  await page.route(/cloudfunctions\.net\/(createHousehold|inviteMember)/, async (r) => { const b = r.request().postDataJSON(); if (/inviteMember/.test(r.request().url())) invited = b.data.email; await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { code: "abc123" } }) }); });
  await openMyPlan(page);
  await expect(page.getByTestId("plan-current")).toContainText("Platinum Family");
  await expect(page.getByTestId("plan-energy")).toContainText("50%");
  const fam = page.getByTestId("my-family");
  await expect(fam).toContainText("Family Energy pool: 50%");
  await expect(fam.getByTestId("family-member")).toHaveCount(2);
  await expect(fam).toContainText("Sam");
  await expect(fam).toContainText("3 places left");
  await fam.getByLabel(/Invite by email/).fill("pat@example.com");
  await fam.getByTestId("family-invite-btn").click();
  await expect(page.getByTestId("plan-msg")).toContainText("?join=h1.abc123");
  expect(invited).toBe("pat@example.com");
});

test("a Platinum family member sees only the colour theme and 'You're on [owner]'s Platinum Family plan'; everything is on", async ({ page }) => {
  const { aiCalls } = await withTiers(page, "member", {
    entitlements: { "uid-owner": { tier: "platinum", source: "admin" } },
    households: { h2: { owner: "uid-owner", members: { "uid-owner": true, [ME]: true } } }, memberOf: { [ME]: "h2", "uid-owner": "h2" },
    users: { "uid-owner": { profile: { name: "Sam" } } },
  });
  await openSettings(page);
  await expect(page.getByTestId("plan-member-note")).toHaveText("You're on Sam's Platinum Family plan.");
  await expect(page.getByText("My Colour Theme")).toBeVisible();
  await expect(page.getByTestId("my-plan")).toHaveCount(0);
  await expect(page.getByText("Data Admin")).toHaveCount(0);
  await expect(page.getByTestId("delete-account")).toHaveCount(0);
  const got = await tryAll(page);
  expect(Object.values(got).every((v) => v === "sent")).toBe(true);
  expect(aiCalls.length).toBe(11);
  // the owner's plan lapses → the member is back on their own plan (Bronze)
  await put("apps/lifecare/entitlements/uid-owner", { tier: "platinum", source: "play", expires: 1 });
  await page.evaluate(async () => { const m = await import("/Life-Care/src/lib/myPlan.js"); await m.loadPlan(); });
  expect(await page.evaluate(() => window._lcPlan.tier)).toBe("bronze");
});

test("downgrade keeps data: an expired plan → Bronze; the records are all still there and shown", async ({ page }) => {
  await withTiers(page, "member", { entitlements: { [ME]: { tier: "gold", source: "play", expires: Date.now() - 1000 } } });
  expect(await page.evaluate(() => window._lcPlan.tier)).toBe("bronze");
  await tab(page, "My Body");
  await expect(page.getByText("13st 2.0lb").first()).toBeVisible();                     // body records still shown
  const dash = await (await fetch("http://127.0.0.1:9000/data/dashboard%3Adata.json" + NS, { headers: H })).json();
  expect(JSON.parse(dash).jc.body.weight.length).toBeGreaterThan(0);
});

test("the joint/admin account behaves as Platinum (all on) until the migration; on /build/ it can preview another plan", async ({ page }) => {
  const { aiCalls } = await withTiers(page, "jc");
  expect(await page.evaluate(() => [window._lcPlan.tier, window._lcPlan.joint])).toEqual(["platinum", true]);
  await openMyPlan(page);
  await expect(page.getByTestId("plan-current")).toContainText("Shared account");
  await expect(page.getByTestId("plan-topup")).toHaveCount(0);                       // nothing to buy for the shared account
  await page.getByTestId("plan-preview").selectOption("bronze");
  await expect(page.getByTestId("plan-current")).toContainText("You're on Bronze (preview)");
  const n0 = aiCalls.length;
  const got = await tryAll(page);
  expect(Object.values(got).every((v) => v !== "sent")).toBe(true);
  expect(aiCalls.length).toBe(n0);
  await page.getByTestId("plan-preview").selectOption("");
  await expect.poll(() => page.evaluate(() => window._lcPlan.tier + ":" + !!window._lcPlan.preview)).toBe("platinum:false");   // the plan reloads asynchronously
});

test("flag off (prod and beta today): no My Plan, nothing gated", async ({ page }) => {
  await platform(null);
  const { aiCalls } = await openApp(page, "member");
  await openSettings(page);
  await expect(page.getByText("My Colour Theme")).toBeVisible();
  await expect(page.getByTestId("my-plan")).toHaveCount(0);
  const n0 = aiCalls.length;
  await tryAll(page);
  expect(aiCalls.length - n0).toBe(11);
});

test("Play Billing (client): the purchase is started with the base plan and an account tag, then the TOKEN goes to the server; nothing credited here", async ({ page }) => {
  await withTiers(page, "member");
  const r = await page.evaluate(async () => {
    const b = await import("/Life-Care/src/lib/billing.js");
    const calls = [];
    const plugin = { purchaseProduct: async (o) => { calls.push(["buy", o]); return { purchaseToken: "tok-123456789" }; } };
    const call = async (name, data) => { calls.push(["server", name, data]); return { ok: true }; };
    const web = await b.buyPlan("gold", "yearly");
    const ok = await b.buyPlan("gold", "yearly", { native: true, plugin, call });
    const top = await b.buyTopUp({ native: true, plugin, call });
    const cancelled = await b.buyPlan("silver", "monthly", { native: true, plugin: { purchaseProduct: async () => { throw new Error("User cancelled"); } }, call });
    return { web, ok, top, cancelled, calls, tag: await b.accountTag("test-uid-member") };
  });
  expect(r.web.msg).toContain("Google Play");
  expect(r.ok.ok).toBe(true);
  expect(r.cancelled.msg).toBe("Purchase cancelled.");
  const [buy, server, buy2, server2] = r.calls;
  expect(buy[1]).toMatchObject({ productIdentifier: "gold", planIdentifier: "yearly", productType: "subs", autoAcknowledgePurchases: false, appAccountToken: r.tag });
  expect(server).toEqual(["server", "playVerify", { appId: "lifecare", kind: "subscription", productId: "gold", purchaseToken: "tok-123456789" }]);
  expect(buy2[1]).toMatchObject({ productIdentifier: "energy_5", productType: "inapp" });
  expect(server2[2].kind).toBe("topup");
  expect(r.tag).toMatch(/^[0-9a-f]{64}$/);
  // the same tag the server checks (functions/src/play.js accountTag)
  const { accountTag } = await import("../functions/src/play.js");
  expect(accountTag("test-uid-member")).toBe(r.tag);
});
