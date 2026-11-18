import { test, expect } from "@playwright/test";
import { execFileSync, spawnSync } from "node:child_process";
import { openApp, ensureUser, USERS, mockAnthropic } from "./helpers.js";
import { storeFor, personOfKey } from "../scripts/migrate-accounts.mjs";
import { makeFixture } from "../scripts/make-fixture.mjs";

// v2.25.0 (Step 5; flag useAccounts): individual accounts, invites, pilot test users, the JC/Becks migration script.
const DB = "http://127.0.0.1:9000";
const NS = "life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (p, ns = NS) => (await fetch(`${DB}/${p}.json?ns=${ns}`, { headers: H })).json();
const put = (p, v, ns = NS) => fetch(`${DB}/${p}.json?ns=${ns}`, { method: "PUT", headers: H, body: JSON.stringify(v) });
const ME = "test-uid-member";
const fn = (page, name, reply) => page.route(new RegExp("cloudfunctions\\.net/" + name + "$"), async (r) => { const b = r.request().postDataJSON(); fn.calls.push([name, b.data]); await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(typeof reply === "function" ? reply(b.data) : reply) }); });
fn.calls = [];
async function signIn(page, who, url) {
  await ensureUser(who);
  await page.goto(url || "./");
  await page.waitForFunction(() => typeof window.__lcTestSignIn === "function");
  await page.getByTestId("sign-in").waitFor({ timeout: 20000 });
  const u = USERS[who];
  await page.evaluate(([e, pw]) => window.__lcTestSignIn(e, pw), [u.email, u.password]);
}
test.beforeEach(async () => { await put("apps/lifecare", null); fn.calls = []; });
test.afterAll(async () => { await put("apps/lifecare", null); });

test("sign-in options (flag): Google, Apple, Email link (sends a link; no password) and the desktop hint", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAccounts: true })));
  await page.goto("./");
  const s = page.getByTestId("sign-in");
  await expect(s.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(s.getByTestId("apple-sign-in")).toBeVisible();
  await expect(s).toContainText("Try another way");
  await s.getByLabel("Your email address").fill("newperson@example.com");
  await s.getByTestId("email-link-send").click();
  await expect(s.getByTestId("email-link-sent")).toContainText("newperson@example.com");
  const codes = await (await fetch("http://127.0.0.1:9099/emulator/v1/projects/life-care-app-64d04/oobCodes")).json();
  expect(codes.oobCodes.some((c) => c.email === "newperson@example.com" && c.requestType === "EMAIL_SIGNIN")).toBe(true);
});

test("an individual account gets its OWN empty store — never the shared household data; the joint account keeps the shared data", async ({ page }) => {
  execFileSync("node", ["scripts/seed-emulator.mjs"], { stdio: "ignore" });
  await mockAnthropic(page);
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAccounts: true })));
  await signIn(page, "member");
  await expect.poll(async () => (await get(`apps/lifecare/users/${ME}/store`)) && Object.keys(await get(`apps/lifecare/users/${ME}/store`)).length).toBeGreaterThan(0);
  const d = JSON.parse((await get(`apps/lifecare/users/${ME}/store`))["dashboard:data"]);
  expect(Object.keys(d).sort()).toEqual(["config", "jc"]);
  expect(d.jc.profile.name).toBe("member-test");
  expect(d.jc.meds).toEqual([]); expect(d.jc.body.weight).toEqual([]);                     // empty, not JC's
  await expect(page.getByRole("button", { name: "Becks", exact: true })).toHaveCount(0);
  expect(await page.evaluate(async () => (await import("/Life-Care/src/lib/firebase.js")).DATA_ROOT)).toBe("apps/lifecare/users/test-uid-member/store");
  const shared = JSON.parse(await get("data/dashboard%3Adata"));
  expect(shared.jc.profile.name).not.toBe("member-test");                                  // the household data untouched
});

test("the joint/admin account still uses the shared data with useAccounts on", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAccounts: true })));
  await openApp(page, "jc");
  expect(await page.evaluate(async () => (await import("/Life-Care/src/lib/firebase.js")).DATA_ROOT)).toBe("data");
  await expect(page.getByRole("button", { name: "Becks", exact: true }).first()).toBeVisible();
});

test("family invite link → sign in → join (email checked by the server) → Hidden by default; Visible + log for me saved", async ({ page }) => {
  await fn(page, "acceptInvite", { result: { hid: "h9" } });
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAccounts: true })));
  await signIn(page, "member", "./?join=h9.code9");
  const s = page.getByTestId("invite-screen");
  await expect(s).toContainText("Join a Platinum Family plan");
  await expect(s.getByTestId("invite-email")).toHaveText("member-test@example.com");
  await s.getByTestId("invite-join").click();
  expect(fn.calls[0]).toEqual(["acceptInvite", { appId: "lifecare", hid: "h9", code: "code9" }]);
  await expect(s.getByTestId("vis-hidden")).toBeChecked();                                  // default Hidden
  await expect(s.getByTestId("log-for-me")).toBeDisabled();
  await s.getByTestId("vis-visible").check();
  await s.getByTestId("log-for-me").check();
  await s.getByTestId("privacy-save").click();
  await expect(s.getByTestId("invite-done")).toContainText("they can log for you");
  expect(await get(`apps/lifecare/users/${ME}/privacy`)).toEqual({ visible: true, logForMe: true });
  await s.getByTestId("invite-continue").click();
  await expect(s).toHaveCount(0);
  expect(page.url()).not.toContain("join=");
});

test("wrong email: the server's refusal is shown in plain English", async ({ page }) => {
  await page.route(/cloudfunctions\.net\/acceptInvite$/, (r) => r.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { status: "PERMISSION_DENIED", message: "Sign in with the email the invite was sent to." } }) }));
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAccounts: true })));
  await signIn(page, "member", "./?join=h9.code9");
  await page.getByTestId("invite-join").click();
  await expect(page.getByTestId("invite-error")).toContainText("Sign in with the email the invite was sent to. Sign out and sign in with the invited address.");
});

test("pilot test users: the admin creates an invite (default Gold); the tester opens ?pilot= and accepts", async ({ page, browser }) => {
  await fn(page, "createPilotInvite", (d) => ({ result: { code: "pc1", tier: d.tier } }));
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAccounts: true })));
  await openApp(page, "jc");
  await page.locator('button[title="Settings"]').first().click();
  const card = page.getByTestId("pilot-invite");
  await card.getByLabel("Tester's email").fill("tester@example.com");
  await expect(card.getByLabel("Plan")).toHaveValue("gold");
  await card.getByTestId("pilot-create").click();
  await expect(card.getByTestId("pilot-msg")).toContainText("?pilot=pc1");
  expect(fn.calls[0]).toEqual(["createPilotInvite", { appId: "lifecare", email: "tester@example.com", tier: "gold" }]);
  const p2 = await browser.newPage();
  await p2.route(/cloudfunctions\.net\/acceptPilotInvite$/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { tier: "gold" } }) }));
  await p2.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAccounts: true })));
  await signIn(p2, "member", "./?pilot=pc1");
  await expect(p2.getByTestId("invite-screen")).toContainText("You're invited to test Lifecare Companion");
  await p2.getByTestId("invite-join").click();
  await expect(p2.getByTestId("invite-done")).toContainText("Your test plan is active");
  await p2.close();
});

test("migration script (pure): each person's store has only their records; secrets never copied; per-person shared records reduced", () => {
  const root = {
    "dashboard:data": JSON.stringify({ config: { week: 9 }, jc: { profile: { name: "JC" } }, becks: { profile: { name: "Becks" } } }),
    journal_jc: "j1", journal_becks: "b1", "eat_children:becks:x": "c", "mealplan:2026-11-15:jc": "m",
    custom_breakfasts: "[1,2]", qa_history: JSON.stringify({ jc: ["jc chat"], becks: ["becks chat"] }),
    anthropic_api_key: "secret", google_client_id: "x", companion_energy: "{}", "consent:jc": "{}", ai_usage: {}, audit: {},
  };
  const b = storeFor(root, "becks");
  expect(Object.keys(b.store).sort()).toEqual(["custom_breakfasts", "dashboard:data", "eat_children:becks:x", "journal_becks", "qa_history"]);
  expect(JSON.parse(b.store["dashboard:data"])).toEqual({ config: { week: 9 }, becks: { profile: { name: "Becks" } } });   // keeps her own key
  expect(JSON.parse(b.store.qa_history)).toEqual({ becks: ["becks chat"] });
  expect(JSON.stringify(b.store)).not.toContain("secret");
  expect(JSON.stringify(b.store)).not.toContain("jc chat");
  expect(b.counts).toEqual({ own: 3, shared: 1, reduced: 1, skippedOther: 2, never: 6 });
  expect([personOfKey("journal_jc"), personOfKey("mealplan:2026-11-15:becks"), personOfKey("custom_meals"), personOfKey("jcKcal")]).toEqual(["jc", "becks", null, null]);
});

test("migration script (emulator): --dry-run prints COUNTS only and writes nothing; a real run needs the backup flag, writes both stores + the Platinum grant once", () => {
  const ns = "lc-migrate-test";
  const run = (extra) => spawnSync("node", ["scripts/migrate-accounts.mjs", "--jc-uid", "uid-jc-new", "--becks-uid", "uid-becks-new", "--emulator", ns, ...extra], { encoding: "utf8" });
  const seed = makeFixture();                                                               // synthetic data, never real
  return (async () => {
    await put("", null, ns);
    await put("data", seed, ns);
    const dry = run(["--dry-run"]);
    expect(dry.status).toBe(0);
    expect(dry.stdout).toMatch(/DRY RUN — nothing written/);
    expect(dry.stdout).toMatch(/Person 1: \d+ items/);
    expect(dry.stdout).not.toMatch(/JC|Becks|journal|anthropic|kg/i);                        // counts only
    expect(await get("apps", ns)).toBeNull();
    expect(run([]).status).toBe(2);                                                          // refuses without the backup flag
    const real = run(["--i-have-a-fresh-backup"]);
    expect(real.stdout).toMatch(/✓ Person 1/); expect(real.stdout).toMatch(/✓ Platinum grant/);
    expect(real.status).toBe(0);
    const becks = await get("apps/lifecare/users/uid-becks-new/store", ns);
    expect(Object.keys(JSON.parse(becks["dashboard:data"])).sort()).toEqual(["becks", "config"]);
    expect(Object.keys(becks).some((k) => /(^|[_:])jc([_:]|$)/.test(k))).toBe(false);
    expect(becks.anthropic_api_key).toBeUndefined();
    expect(await get("apps/lifecare/entitlements/uid-jc-new", ns)).toMatchObject({ tier: "platinum", source: "admin" });
    expect((await get("apps/lifecare/households/h_family", ns)).owner).toBe("uid-jc-new");
    expect(await get("apps/lifecare/users/uid-becks-new/privacy", ns)).toEqual({ visible: true, logForMe: true });
    expect(Object.keys(await get("data", ns)).length).toBeGreaterThan(0);                     // the shared data is untouched
    expect(run(["--i-have-a-fresh-backup"]).status).toBe(3);                                 // never twice
  })();
});

test("household view: a Visible member's records show under their own tab; writes reach their store only with 'log for me'", async ({ page }) => {
  const OTHER = "test-uid-other";
  const store = (who, person) => ({ "dashboard:data": JSON.stringify({ config: { week: 3, session: 15, trainingStart: "2026-07-19" }, [who]: person }) });
  const person = (name) => ({ profile: { name, sex: "Female" }, meds: [], medsHistory: [], body: { weight: [{ wk: 1, v: 10.5 }] }, measurements: {}, bloods: [], exercises: {} });
  await put("apps/lifecare", { users: {
    [ME]: { store: store("jc", person("Jay")), profile: { name: "Jay" }, privacy: { visible: true, logForMe: false } },
    [OTHER]: { store: Object.assign(store("becks", person("Bee")), { journal_becks: "\"her journal\"" }), profile: { name: "Bee" }, privacy: { visible: true, logForMe: false } } },
    households: { h1: { owner: ME, members: { [ME]: true, [OTHER]: true } } }, memberOf: { [ME]: "h1", [OTHER]: "h1" } });
  await ensureUser("other");
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useAccounts: true })));
  await mockAnthropic(page);
  await signIn(page, "member");
  await expect(page.getByRole("button", { name: "Bee", exact: true }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("button", { name: "Jay", exact: true }).first()).toBeVisible();
  const r = await page.evaluate(async () => {
    const st = await import("/Life-Care/src/lib/storage.js");
    const j = await st.sGet("journal_becks");
    await st.sSet("journal_becks", "\"changed by Jay\"");                         // read-only: not written
    const d = JSON.parse(await st.sGet("dashboard:data"));
    d.becks.profile.notes = "x"; await st.sSet("dashboard:data", JSON.stringify(d));
    return { j, keys: Object.keys(d).sort() };
  });
  expect(r.j).toBe("\"her journal\"");
  expect(r.keys).toEqual(["becks", "config", "jc"]);
  expect(await get(`apps/lifecare/users/${OTHER}/store/journal_becks`)).toBe("\"her journal\"");
  expect(JSON.parse(await get(`apps/lifecare/users/${OTHER}/store/dashboard%3Adata`)).becks.profile.notes).toBeUndefined();
  expect(Object.keys(JSON.parse(await get(`apps/lifecare/users/${ME}/store/dashboard%3Adata`))).sort()).toEqual(["config", "jc"]);   // her data never copied into mine
  // she turns on "log for me" → the same writes now reach her store
  await put(`apps/lifecare/users/${OTHER}/privacy`, { visible: true, logForMe: true });
  await page.reload();
  await expect(page.getByRole("button", { name: "Bee", exact: true }).first()).toBeVisible({ timeout: 20000 });
  await page.evaluate(async () => { const st = await import("/Life-Care/src/lib/storage.js"); await st.sSet("journal_becks", "\"logged by Jay\""); });
  expect(await get(`apps/lifecare/users/${OTHER}/store/journal_becks`)).toBe("\"logged by Jay\"");
  // she hides → her tab and data are gone after reload
  await put(`apps/lifecare/users/${OTHER}/privacy`, { visible: false, logForMe: false });
  await page.reload();
  await expect(page.getByRole("button", { name: "Jay", exact: true }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("hidden-tab")).toHaveText("🔒 Bee");                     // v2.27.3: a greyed tab, no data
  expect(await page.evaluate(() => Object.keys(window._lcMembers || {}))).toEqual([]);
});
