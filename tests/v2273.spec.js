import { test, expect } from "@playwright/test";
import { mockAnthropic } from "./helpers.js";

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
const person = (name, kg) => ({ profile: { name, sex: "Female" }, meds: [], medsHistory: [], body: { weight: [{ wk: 1, v: kg }] }, measurements: {}, bloods: [], exercises: {} });
/** A family of NEW accounts: each own store with its person under "jc". privacy: per member { visible, logForMe }. */
async function family(names, privacy) {
  const users = {}, members = {}, memberOf = {};
  names.forEach((nm, i) => {
    users[uidOf(i)] = { profile: { name: nm }, privacy: privacy[i] || { visible: true, logForMe: false },
      store: { "dashboard:data": JSON.stringify({ config: { week: 2, session: 15, trainingStart: "2026-07-19" }, jc: person(nm, 60 + i) }), journal_jc: JSON.stringify(nm + "'s journal") } };
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
  expect(r.journal).toBe(JSON.stringify("Bob's journal"));
  expect(r.own).toBe(JSON.stringify("Ann's journal"));
});

test("2 new accounts: writes for the member reach THEIR store (under their own key) only with 'log for me'", async ({ page }) => {
  await family(["Ann", "Bob"], [{ visible: true, logForMe: false }, { visible: true, logForMe: false }]);
  await signInAs(page, 0);
  await page.waitForFunction(() => window._lcMembers);
  await page.evaluate(async () => { const st = await import("/Life-Care/src/lib/storage.js"); const v = Object.keys(window._lcMembers)[0]; await st.sSet("journal_" + v, JSON.stringify("by Ann")); });
  expect(await get(`apps/lifecare/users/${uidOf(1)}/store/journal_jc`)).toBe(JSON.stringify("Bob's journal"));   // refused: no log-for-me
  await put(`apps/lifecare/users/${uidOf(1)}/privacy`, { visible: true, logForMe: true });
  await page.reload();
  await page.waitForFunction(() => window._lcMembers);
  await page.evaluate(async () => {
    const st = await import("/Life-Care/src/lib/storage.js"); const v = Object.keys(window._lcMembers)[0];
    await st.sSet("journal_" + v, JSON.stringify("logged by Ann"));
    const d = JSON.parse(await st.sGet("dashboard:data")); d[v].profile.notes = "joint workout"; await st.sSet("dashboard:data", JSON.stringify(d));
  });
  expect(await get(`apps/lifecare/users/${uidOf(1)}/store/journal_jc`)).toBe(JSON.stringify("logged by Ann"));
  const bob = JSON.parse(await get(`apps/lifecare/users/${uidOf(1)}/store/dashboard%3Adata`));
  expect(Object.keys(bob).sort()).toEqual(["config", "jc"]);                          // stays under HIS own key
  expect(bob.jc.profile.notes).toBe("joint workout");
  const ann = JSON.parse(await get(`apps/lifecare/users/${uidOf(0)}/store/dashboard%3Adata`));
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
  for (const n of ["Ada", "Bea", "Dev", "Eli"]) expect(r.out[n][0]).toBe(JSON.stringify(n + "'s journal"));
  expect(new Set(r.keys).size).toBe(6);                                                // config + 5 distinct people
});
