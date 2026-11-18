import { test, expect } from "@playwright/test";
import { mockAnthropic } from "./helpers.js";
import { areaData, getKeyOf, getDashOf } from "./areaHelpers.js";

// v2.27.3 (before pilot): families of BRAND-NEW accounts — every new account keeps its person under "jc" in its own
// store, so the family view gives clashing members their own view key. Own tab first, then Visible members by name.
const NS = "?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const put = (p, v) => fetch("http://127.0.0.1:9000/" + p + ".json" + NS, { method: "PUT", headers: H, body: JSON.stringify(v) });
const get = async (p) => (await fetch("http://127.0.0.1:9000/" + p + ".json" + NS, { headers: H })).json();
const AUTH = "http://127.0.0.1:9099";
const uidOf = (n) => "test-uid-fam" + n;
const emailOf = (n) => "fam" + n + "-test@example.com";
async function makeUser(n) {
  await fetch(AUTH + "/identitytoolkit.googleapis.com/v1/projects/life-care-app-64d04/accounts", { method: "POST", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ localId: uidOf(n), email: emailOf(n), password: "test-password" }) });
}
const jr = (nm, text) => JSON.stringify([{ id: "j1", date: "2026-11-18", text: text || nm + "'s journal" }]);   // the app's journal shape
const person = (name, kg) => ({ profile: { name, sex: "Female" }, meds: [], medsHistory: [], body: { weight: [{ wk: 1, v: kg }] }, measurements: {}, bloods: [], exercises: {} });
/** A family of NEW accounts: each own store with its person under "jc". privacy: per member { visible, logForMe }. */
async function family(names, privacy) {
  const users = {}, members = {}, memberOf = {};
  names.forEach((nm, i) => {
    users[uidOf(i)] = { profile: { name: nm }, privacy: Object.assign({ visible: true, logForMe: false }, privacy[i] || {}),
      data: areaData({ "dashboard:data": JSON.stringify({ config: { week: 2, session: 15, trainingStart: "2026-07-19" }, jc: person(nm, 60 + i) }), journal_jc: jr(nm) }) };   // v2.28.0: by area
    members[uidOf(i)] = true; memberOf[uidOf(i)] = "hf";
  });
  await put("apps/lifecare", { users, households: { hf: { owner: uidOf(0), members } }, memberOf, entitlements: { [uidOf(0)]: { tier: "platinum", source: "admin" } } });
  for (let i = 0; i < names.length; i++) await makeUser(i);
}
async function signInAs(page, n) {
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAccounts: true })));
  await mockAnthropic(page);
  await page.goto("./");
  await page.waitForFunction(() => typeof window.__lcTestSignIn === "function");
  await page.getByTestId("sign-in").waitFor({ timeout: 20000 });
  await page.evaluate(([e]) => window.__lcTestSignIn(e, "test-password"), [emailOf(n)]);
  await expect(page.getByTestId("person-tabs")).toBeVisible({ timeout: 20000 });
}
const tabNames = (page) => page.getByTestId("person-tabs").locator("button").allInnerTexts();
test.afterAll(async () => { await put("apps/lifecare", null); });

test("2 new accounts in one family see each other side by side (own tab first); reads come from the other's store", async ({ page }) => {
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await family(["Ann", "Bob"], [{ visible: true, logForMe: false }, { visible: true, logForMe: false }]);
  await signInAs(page, 0);
  await expect.poll(() => tabNames(page)).toEqual(["Ann", "Bob"]);
  const r = await page.evaluate(async () => {
    const st = await import("/Life-Care/src/lib/storage.js");
    const view = Object.keys(window._lcMembers)[0];
    const d = JSON.parse(await st.sGet("dashboard:data"));
    return { view, mine: d.jc.profile.name, theirs: d[view].profile.name, kg: d[view].body.weight[0].v, journal: await st.sGet("journal_" + view), own: await st.sGet("journal_jc") };
  });
  expect(r.view).not.toBe("jc");                                                      // the clash is resolved
  expect([r.mine, r.theirs, r.kg]).toEqual(["Ann", "Bob", 61]);
  expect(r.journal).toBe(jr("Bob"));
  expect(r.own).toBe(jr("Ann"));
  await page.getByTestId("person-tabs").getByRole("button", { name: "Bob" }).dispatchEvent("click");   // the goal setup covers the header for a new account
  await expect.poll(() => page.evaluate(() => (document.querySelector('[data-testid="person-tabs"] [data-active="true"]') || {}).textContent)).toBe("Bob");
  await page.evaluate(() => { const g = document.querySelector('[data-testid="goal-setup"]'); if (g) g.style.display = "none"; });
  for (const sec of ["Home", "My Body", "My Exercise", "My Eating", "My Shop", "My Health"]) {   // every screen renders for the member
    await page.getByRole("button", { name: sec, exact: true }).first().dispatchEvent("click");
    await page.waitForTimeout(300);
    await expect(page.getByText("Something went wrong in this section")).toHaveCount(0);
  }
  expect(errs).toEqual([]);
});

test("2 new accounts: writes for the member reach THEIR store (under their own key) only with 'log for me'", async ({ page }) => {
  await family(["Ann", "Bob"], [{ visible: true, logForMe: false }, { visible: true, logForMe: false }]);
  await signInAs(page, 0);
  await page.waitForFunction(() => window._lcMembers);
  await page.evaluate(async (val) => { const st = await import("/Life-Care/src/lib/storage.js"); const v = Object.keys(window._lcMembers)[0]; await st.sSet("journal_" + v, val); }, jr("Ann", "by Ann"));
  expect(await getKeyOf(uidOf(1), "journal_jc")).toBe(jr("Bob"));   // refused: no log-for-me
  await put(`apps/lifecare/users/${uidOf(1)}/privacy`, { visible: true, logForMe: true });
  await page.reload();
  await page.waitForFunction(() => window._lcMembers);
  await page.evaluate(async (val) => {
    const st = await import("/Life-Care/src/lib/storage.js"); const v = Object.keys(window._lcMembers)[0];
    await st.sSet("journal_" + v, val);
    const d = JSON.parse(await st.sGet("dashboard:data")); d[v].profile.notes = "joint workout"; await st.sSet("dashboard:data", JSON.stringify(d));
  }, jr("Ann", "logged by Ann"));
  expect(await getKeyOf(uidOf(1), "journal_jc")).toBe(jr("Ann", "logged by Ann"));
  const bob = await getDashOf(uidOf(1));
  expect(Object.keys(bob).sort()).toEqual(["config", "jc"]);                          // stays under HIS own key
  expect(bob.jc.profile.notes).toBe("joint workout");
  const ann = await getDashOf(uidOf(0));
  expect(Object.keys(ann).sort()).toEqual(["config", "jc"]);                          // nothing of his copied into hers
  expect(ann.jc.profile.name).toBe("Ann");
});

test("5 new accounts (owner + 4): every Visible member side by side in name order, each read from their own store", async ({ page }) => {
  await family(["Cara", "Eli", "Ada", "Dev", "Bea"], [{ visible: true }, { visible: true }, { visible: true }, { visible: true }, { visible: true }]);
  await signInAs(page, 0);
  await expect.poll(() => tabNames(page)).toEqual(["Cara", "Ada", "Bea", "Dev", "Eli"]);
  const r = await page.evaluate(async () => {
    const st = await import("/Life-Care/src/lib/storage.js");
    const d = JSON.parse(await st.sGet("dashboard:data"));
    const out = {};
    for (const v of Object.keys(window._lcMembers)) out[d[v].profile.name] = [await st.sGet("journal_" + v), new Set(Object.keys(window._lcMembers)).size];
    return { out, keys: Object.keys(d) };
  });
  for (const n of ["Ada", "Bea", "Dev", "Eli"]) expect(r.out[n][0]).toBe(jr(n));
  expect(new Set(r.keys).size).toBe(6);                                                // config + 5 distinct people
});

test("Hidden members: greyed tabs after everyone else; tapping says '[Name] keeps this private'; their data is never requested", async ({ page }) => {
  await family(["Ann", "Bob", "Zoe", "Cal"], [{ visible: true }, { visible: true, logForMe: false }, { visible: false, logForMe: false }, { visible: false, logForMe: false }]);
  await signInAs(page, 0);
  await expect.poll(() => tabNames(page)).toEqual(["Ann", "Bob", "🔒 Cal", "🔒 Zoe"]);
  const hidden = page.getByTestId("hidden-tab");
  await expect(hidden).toHaveCount(2);
  await expect(hidden.first()).toHaveAttribute("aria-disabled", "true");
  await expect(hidden.first()).toHaveCSS("opacity", "0.55");
  await hidden.filter({ hasText: "Zoe" }).dispatchEvent("click");                     // the goal setup covers the header for a new account
  await expect(page.getByTestId("hidden-note")).toHaveText("Zoe keeps this private.");
  const r = await page.evaluate(() => ({ reads: window._lcHouseholdReads, members: Object.values(window._lcMembers || {}).map((m) => m.name), tab: document.querySelector('[data-testid="person-tabs"] [data-active="true"]').textContent }));
  expect(r.tab).toBe("Ann");                                                           // tapping never switched person
  expect(r.members).toEqual(["Bob"]);
  for (const u of [uidOf(2), uidOf(3)]) {
    expect(r.reads.filter((p) => p.includes(u))).toEqual([`apps/lifecare/users/${u}/privacy`, `apps/lifecare/users/${u}/profile`]);   // name + switch only
    expect(r.reads.some((p) => p.includes(u + "/data"))).toBe(false);
  }
});

/* ---------- item 3: My Plan — the top-up and the Energy explanation (v2.22.2 brief) ---------- */
const ME = "test-uid-member";
async function myPlanAs(page, p) {
  await put("apps/lifecare", p);
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useTiers: true })));
  const { openApp } = await import("./helpers.js");
  await openApp(page, "member");
  await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  await page.locator('button[title="Settings"]').first().click();
  await page.getByTestId("my-plan-toggle").click();
}
for (const [tier, shown] of [["bronze", false], ["silver", true], ["gold", true], ["platinum", true]]) {
  test(`My Plan (${tier}): 'Top up Companion Energy: £5' ${shown ? "shown" : "not shown"}`, async ({ page }) => {
    await myPlanAs(page, tier === "bronze" ? null : { entitlements: { [ME]: { tier, source: "admin" } } });
    if (tier === "platinum") await expect(page.getByTestId("my-family")).toBeVisible();      // the Platinum OWNER
    await expect(page.getByTestId("plan-topup")).toHaveCount(shown ? 1 : 0);
    if (shown) await expect(page.getByTestId("plan-topup")).toHaveText("⚡ Top up Companion Energy: £5");
  });
}

test("My Plan: the Energy explanation — typical Energy per action, 300 / 500 / 1,500, no rollover, top-ups never expire, tracking is free; figures from config", async ({ page }) => {
  await myPlanAs(page, { entitlements: { [ME]: { tier: "silver", source: "admin" } }, energy: { [ME]: { monthly: 150, topup: 450, balance: 600 } } });
  const x = page.getByTestId("energy-explainer");
  for (const t of ["A chat reply: about 2", "A photo check (Snap): about 2", "Companion feedback", "A week of meals: about 8", "Silver 300", "Gold 500", "Platinum Family 1,500 (shared by the family)",
    "Monthly Energy doesn't roll over", "Top-ups never expire", "Tracking never uses Energy"]) await expect(x).toContainText(t);
  await expect(page.getByTestId("plan-energy")).toContainText("this month: 50%");
  await expect(page.getByTestId("plan-topup-left")).toHaveText(" + 450 top-up");
  // the admin changes a figure in config: shown without a code change
  await put("apps/lifecare/config/energyGuide", { typical: [{ k: "chat", label: "A chat reply", energy: 5 }] });
  await page.evaluate(async () => { const m = await import("/Life-Care/src/lib/myPlan.js"); await m.loadPlan(); });
  await expect(x).toContainText("A chat reply: about 5");
});

/* ---------- v2.28.0: the final layout (ADR 0018) — family area and per-area privacy, through the app ---------- */
test("family shared area: a member's change to the shopping list lands ONCE in the family area and another member sees it", async ({ page, browser }) => {
  await family(["Ann", "Bob"], [{ visible: true }, { visible: false }]);              // Bob Hidden: the family lists still shared
  await signInAs(page, 0);
  await page.waitForFunction(() => window._lcFamilyRoot);
  expect(await page.evaluate(() => window._lcFamilyRoot)).toBe("apps/lifecare/households/hf/shared");
  await page.evaluate(async () => { const st = await import("/Life-Care/src/lib/storage.js"); await st.sSet("shop_defaults", JSON.stringify(["milk", "eggs"])); });
  expect(await get("apps/lifecare/households/hf/shared/eating/shop_defaults")).toBe(JSON.stringify(["milk", "eggs"]));
  expect(await get(`apps/lifecare/users/${uidOf(0)}/data/eating/shop_defaults`)).toBeNull();   // not in her own areas
  const p2 = await browser.newPage();
  await signInAs(p2, 1);
  await p2.waitForFunction(() => window._lcFamilyRoot);
  expect(await p2.evaluate(async () => (await import("/Life-Care/src/lib/storage.js")).sGet("shop_defaults"))).toBe(JSON.stringify(["milk", "eggs"]));
  await p2.close();
});

test("per area: Bob shares exercise but hides body — Ann sees his exercise; his body screens are empty, never broken; nothing of his body is requested", async ({ page }) => {
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await family(["Ann", "Bob"], [{ visible: true }, { visible: true, logForMe: false, areas: { body: false } }]);
  await signInAs(page, 0);
  await page.waitForFunction(() => window._lcMembers);
  const r = await page.evaluate(async () => {
    const st = await import("/Life-Care/src/lib/storage.js");
    const v = Object.keys(window._lcMembers)[0]; const d = JSON.parse(await st.sGet("dashboard:data"));
    return { exercises: d[v].exercises, weight: d[v].body.weight, name: d[v].profile.name };
  });
  expect(r.name).toBe("Bob");
  expect(r.weight).toEqual([]);                                                          // body private: shown empty
  expect(r.exercises).toEqual({});
  await page.evaluate(() => { const g = document.querySelector('[data-testid="goal-setup"]'); if (g) g.style.display = "none"; });
  await page.getByTestId("person-tabs").getByRole("button", { name: "Bob" }).dispatchEvent("click");
  for (const sec of ["My Body", "My Exercise"]) { await page.getByRole("button", { name: sec, exact: true }).first().dispatchEvent("click"); await page.waitForTimeout(300); await expect(page.getByText("Something went wrong in this section")).toHaveCount(0); }
  expect(errs).toEqual([]);
});
