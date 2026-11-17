// Platform handlers against the DATABASE EMULATOR (admin SDK, namespace lc-fn-test). AI and Stripe are fakes/test mode.
import { test, before } from "node:test";
import assert from "node:assert/strict";
process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
const admin = (await import("firebase-admin")).default;
const Stripe = (await import("stripe")).default;
const core = await import("../src/core.js");
const { costPence, MEDICATION_RULE } = await import("../src/config.js");

const app = admin.initializeApp({ projectId: "life-care-app-64d04", databaseURL: "http://127.0.0.1:9000?ns=lc-fn-test" }, "fn-test");
const db = app.database();
const A = "lifecare";
let sent = [];
const fakeClaude = async (body) => { sent.push(body); return { content: [{ type: "text", text: "hi" }], usage: { input_tokens: 1000, output_tokens: 200 } }; };
const req = { feature: "aiHelp", request: { max_tokens: 100, system: "You are the Companion.", messages: [{ role: "user", content: "hello" }] } };

before(async () => { await db.ref().set({ platform: { admins: { "uid-admin": true } } }); });

test("ledger: credit and debit move the balance; a credit with the same key counts once", async () => {
  await core.credit(db, A, "u1", 250, "test", "k1");
  const again = await core.credit(db, A, "u1", 250, "test", "k1");
  assert.equal(again.duplicate, true);
  await core.debit(db, A, "u1", 10.5, "ai");
  assert.equal(await core.balance(db, A, "u1"), 239.5);
  const ledger = (await db.ref(`apps/${A}/ledger/u1`).once("value")).val();
  assert.equal(Object.keys(ledger).length, 2);
  for (const e of Object.values(ledger)) assert.deepEqual(Object.keys(e).sort(), ["at", "kind", "pence", "ref"]);   // no content
});

test("deleteAccount (v2.21.1): refuses a platform admin and the rules-locked UID before changing anything; deletes a normal account", async () => {
  const deleted = [];
  const deleteUser = async (uid) => { deleted.push(uid); };
  await db.ref(`apps/${A}/entitlements/uid-admin`).set({ tier: "gold" });
  await assert.rejects(core.deleteAccount({ uid: "uid-admin", data: {} }, { db, deleteUser }), { code: "permission-denied", message: "This account can't be deleted here: contact the developer." });
  await assert.rejects(core.deleteAccount({ uid: "3iEIfsbZlaUMwUiGY6Lro4jAQef1", data: {} }, { db, deleteUser }), { code: "permission-denied" });
  await assert.rejects(core.deleteAccount({ uid: null, data: {} }, { db, deleteUser }), { code: "unauthenticated" });
  assert.deepEqual(deleted, []);                                                                  // nothing deleted
  assert.deepEqual((await db.ref(`apps/${A}/entitlements/uid-admin`).once("value")).val(), { tier: "gold" });
  await db.ref(`apps/${A}/entitlements/u-del`).set({ tier: "silver" });
  await db.ref(`apps/${A}/energy/u-del`).set({ balancePence: 10 });
  const r = await core.deleteAccount({ uid: "u-del", data: {} }, { db, deleteUser, now: Date.UTC(2026, 10, 17) });
  assert.deepEqual(r, { ok: true });
  assert.deepEqual(deleted, ["u-del"]);
  assert.equal((await db.ref(`apps/${A}/entitlements/u-del`).once("value")).val(), null);
  assert.equal((await db.ref(`apps/${A}/energy/u-del`).once("value")).val(), null);
});

test("aiProxy: needs sign-in, an allowed tier and energy; adds the medication rule; debits the real cost; records usage", async () => {
  await assert.rejects(core.aiProxy({ uid: null, data: req }, { db, callClaude: fakeClaude }), { code: "unauthenticated" });
  await assert.rejects(core.aiProxy({ uid: "u1", data: req }, { db, callClaude: fakeClaude }), { code: "permission-denied" });     // Bronze: no AI at all
  await db.ref(`apps/${A}/entitlements/u1`).set({ tier: "silver", source: "admin" });
  await db.ref(`apps/${A}/entitlements/u2`).set({ tier: "silver", source: "admin" });
  await assert.rejects(core.aiProxy({ uid: "u2", data: req }, { db, callClaude: fakeClaude }), { code: "resource-exhausted" });
  await assert.rejects(core.aiProxy({ uid: "u1", data: { ...req, feature: "mealGenerator" } }, { db, callClaude: fakeClaude }), { code: "permission-denied" }); // Silver: no meal generator
  sent = [];
  const before = await core.balance(db, A, "u1");
  const r = await core.aiProxy({ uid: "u1", data: { ...req, request: { ...req.request, model: "something-else" } } }, { db, callClaude: fakeClaude, now: Date.UTC(2026, 10, 14) });
  assert.equal(r.content[0].text, "hi");
  assert.equal(sent[0].model, "claude-sonnet-4-6");                       // the app's model, whatever the client sends
  assert.ok(sent[0].system.startsWith(MEDICATION_RULE));
  const cost = costPence({ input_tokens: 1000, output_tokens: 200 });
  assert.ok(cost > 0);
  assert.equal(Math.round((before - await core.balance(db, A, "u1")) * 10000) / 10000, cost);
  const u = (await db.ref(`apps/${A}/usage/u1/2026-11-14`).once("value")).val();
  assert.deepEqual({ n: u.n, in: u.in, out: u.out }, { n: 1, in: 1000, out: 200 });
});

test("setTier / adminAccounts: admin only; the admin view has no health data", async () => {
  await assert.rejects(core.setTier({ uid: "u1", data: { uid: "u1", tier: "gold" } }, { db }), { code: "permission-denied" });
  await core.setTier({ uid: "uid-admin", data: { uid: "u1", tier: "silver" } }, { db });
  assert.equal(await core.tierOf(db, A, "u1"), "silver");
  assert.equal(await core.featureAllowed(db, A, "u1", "snap"), true);
  assert.equal(await core.featureAllowed(db, A, "u1", "household"), false);
  await db.ref(`apps/${A}/users/u1/data`).set({ healthNotes: "private" });
  const list = await core.adminAccounts({ uid: "uid-admin", data: {} }, { db });
  assert.equal(list.u1.tier, "silver");
  assert.ok(!JSON.stringify(list).includes("private"));
  await assert.rejects(core.adminAccounts({ uid: "u1", data: {} }, { db }), { code: "permission-denied" });
});

test("Stripe (test mode): a signed checkout.session.completed credits £2.50 of AI cost for a £5 pack, once; bad signature refused", async () => {
  const stripe = new Stripe("sk_test_placeholder_not_a_real_key");
  const secret = "whsec_test_placeholder";
  const ev = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_status: "paid", metadata: { uid: "u3", appId: A, pack: "pack5" } } } });
  const sig = stripe.webhooks.generateTestHeaderString({ payload: ev, secret });
  assert.equal((await core.stripeWebhook(ev, "t=1,v1=bad", { stripe, secret, db })).status, 400);
  assert.equal((await core.stripeWebhook(ev, sig, { stripe, secret, db })).body, "credited");
  assert.equal((await core.stripeWebhook(ev, sig, { stripe, secret, db })).body, "already credited");
  assert.equal(await core.balance(db, A, "u3"), 250);
  // createCheckout builds a GBP £5 session for the signed-in user (fake Stripe client)
  let made; const fake = { checkout: { sessions: { create: async (o) => { made = o; return { url: "https://checkout.stripe.test/x", id: "cs_x" }; } } } };
  await assert.rejects(core.createCheckout({ uid: "u3", data: { pack: "pack5" } }, { stripe: fake, baseUrl: "https://example.test/" }), { code: "failed-precondition" });   // v2.22.0: off unless enabled
  await assert.rejects(core.createCheckout({ uid: "u3", data: { pack: "pack5", native: true } }, { stripe: fake, baseUrl: "", webEnabled: true }), { code: "failed-precondition" }); // never in the native app
  assert.equal(made, undefined);
  await core.createCheckout({ uid: "u3", data: { pack: "pack5" } }, { stripe: fake, baseUrl: "https://example.test/", webEnabled: true });
  assert.equal(made.line_items[0].price_data.unit_amount, 500);
  assert.equal(made.metadata.uid, "u3");
  await assert.rejects(core.createCheckout({ uid: null, data: { pack: "pack5" } }, { stripe: fake, baseUrl: "" }), { code: "unauthenticated" });
});

test("households: owner creates + invites; invitee joins with a matching email; owner removes; no data access granted", async () => {
  await assert.rejects(core.createHousehold({ uid: "o1", data: {} }, { db }), { code: "permission-denied" });     // v2.22.0: Platinum only
  for (const o of ["o1", "o2"]) await db.ref(`apps/${A}/entitlements/${o}`).set({ tier: "platinum", source: "admin" });
  const { hid } = await core.createHousehold({ uid: "o1", data: {} }, { db });
  await assert.rejects(core.createHousehold({ uid: "o1", data: {} }, { db }), { code: "failed-precondition" });
  await assert.rejects(core.inviteMember({ uid: "m1", data: { email: "m1@example.com" } }, { db }), { code: "permission-denied" });
  const { code } = await core.inviteMember({ uid: "o1", data: { email: "M1@example.com" } }, { db, makeCode: () => "abc123" });
  await assert.rejects(core.acceptInvite({ uid: "m1", email: "other@example.com", data: { hid, code } }, { db }), { code: "permission-denied" });
  await core.acceptInvite({ uid: "m1", email: "m1@example.com", data: { hid, code } }, { db });
  await assert.rejects(core.acceptInvite({ uid: "m2", email: "m1@example.com", data: { hid, code } }, { db }), { code: "not-found" });  // used once
  const h = (await db.ref(`apps/${A}/households/${hid}`).once("value")).val();
  assert.deepEqual(Object.keys(h.members).sort(), ["m1", "o1"]);
  assert.equal(h.owner, "o1");
  assert.equal(JSON.stringify(h).includes("data"), false);                    // membership only; data access is the rules + privacy
  await assert.rejects(core.removeMember({ uid: "m1", data: { uid: "o1" } }, { db }), { code: "permission-denied" });
  await assert.rejects(core.leaveHousehold({ uid: "o1", data: {} }, { db }), { code: "failed-precondition" });
  await core.removeMember({ uid: "o1", data: { uid: "m1" } }, { db });
  assert.equal((await db.ref(`apps/${A}/memberOf/m1`).once("value")).val(), null);
  await core.leaveHousehold({ uid: "o1", data: {} }, { db });
  assert.equal((await db.ref(`apps/${A}/households/${hid}`).once("value")).val(), null);
  // expired invite
  const h2 = (await core.createHousehold({ uid: "o2", data: {} }, { db })).hid;
  const c2 = (await core.inviteMember({ uid: "o2", data: { email: "x@example.com" } }, { db, now: 0, makeCode: () => "old" })).code;
  await assert.rejects(core.acceptInvite({ uid: "x", email: "x@example.com", data: { hid: h2, code: c2 } }, { db }), { code: "deadline-exceeded" });
});

test.after(async () => { await app.delete(); });

test("tier defaults (JC 17 Nov 2026): four plans, prices, allowances, Bronze has no AI; the top-up is £5 → £2.50", async () => {
  const { DEFAULT_TIERS, PACKS, TOP_UP } = await import("../src/config.js");
  const T = DEFAULT_TIERS;
  assert.deepEqual(["bronze", "silver", "gold", "platinum"].map((t) => T[t].allowancePence), [0, 150, 250, 750]);
  assert.deepEqual(["silver", "gold", "platinum"].map((t) => [T[t].pricePence, T[t].yearlyPence]), [[599, 4900], [999, 7900], [1599, 15900]]);
  const ai = ["foodRatings", "snap", "myOwnItem", "aiFeedback", "chat", "aiHelp", "autoInfo", "bodyBalance", "mealGenerator", "shoppingGenerator", "aiPlans", "buyEnergy"];
  for (const f of ai) assert.equal(T.bronze[f], false, "bronze " + f);
  assert.equal(T.bronze.editNutrition, false);
  for (const f of ["foodRatings", "snap", "myOwnItem", "aiFeedback", "chat", "aiHelp", "autoInfo", "bodyBalance", "healthSync", "buyEnergy"]) assert.equal(T.silver[f], true, "silver " + f);
  for (const f of ["mealGenerator", "shoppingGenerator", "aiPlans"]) { assert.equal(T.silver[f], false); assert.equal(T.gold[f], true); assert.equal(T.platinum[f], true); }
  assert.equal(T.gold.household, false); assert.equal(T.platinum.household, true);                  // household sharing: Platinum only
  assert.equal(T.platinum.maxMembers, 5); assert.equal(T.platinum.sharedPool, true);
  assert.equal(TOP_UP.creditPence * 2, TOP_UP.pricePence);
  for (const p of Object.values(PACKS)) assert.equal(p.creditPence * 2, p.pricePence);   // 100% mark-up
});

test("Platinum family: members get Platinum through the owner; ONE shared pool is debited by everyone and capped at zero", async () => {
  await db.ref(`apps/${A}/entitlements/fo`).set({ tier: "platinum", source: "admin" });
  const { hid } = await core.createHousehold({ uid: "fo", data: {} }, { db });
  for (const m of ["fm1", "fm2", "fm3", "fm4"]) {
    const { code } = await core.inviteMember({ uid: "fo", data: { email: m + "@example.com" } }, { db, makeCode: () => "c" + m });
    await core.acceptInvite({ uid: m, email: m + "@example.com", data: { hid, code } }, { db });
  }
  await assert.rejects(core.inviteMember({ uid: "fo", data: { email: "fifth@example.com" } }, { db }), { code: "resource-exhausted" });   // owner + 4
  const p = await core.planOf(db, A, "fm1");
  assert.deepEqual([p.tier, p.role, p.owner], ["platinum", "member", "fo"]);
  assert.equal((await core.planOf(db, A, "fo")).role, "owner");
  await assert.rejects(core.adminTopUp({ uid: "fm1", data: { uid: "fo", pence: 750 } }, { db }), { code: "permission-denied" });
  await core.adminTopUp({ uid: "uid-admin", data: { uid: "fm2", pence: 0.2 } }, { db });                     // a member's top-up goes into the pool
  assert.equal(await core.walletBalance(db, p.wallet), 0.2);
  assert.equal(await core.balance(db, A, "fm2"), 0);                                                         // nothing in a personal balance
  await core.aiProxy({ uid: "fm1", data: { ...req, feature: "mealGenerator" } }, { db, callClaude: fakeClaude });   // costs about 0.47p, more than the pool holds
  assert.equal(await core.walletBalance(db, p.wallet), 0);                                                  // capped at zero, never negative
  await assert.rejects(core.aiProxy({ uid: "fm3", data: req }, { db, callClaude: fakeClaude }), { code: "resource-exhausted" });   // empty for the whole family
  await core.adminTopUp({ uid: "uid-admin", data: { uid: "fo", pence: 750 } }, { db });
  await core.aiProxy({ uid: "fm3", data: req }, { db, callClaude: fakeClaude });
  assert.ok(await core.walletBalance(db, p.wallet) < 750);
  // removed from the family → back to their own plan (Bronze), nothing deleted
  await db.ref(`apps/${A}/users/fm4/data/body`).set({ weight: [80] });
  await core.removeMember({ uid: "fo", data: { uid: "fm4" } }, { db });
  assert.equal((await core.planOf(db, A, "fm4")).tier, "bronze");
  assert.deepEqual((await db.ref(`apps/${A}/users/fm4/data/body`).once("value")).val(), { weight: [80] });
});

test("downgrade: an expired plan counts as Bronze — AI stops, data stays; an admin grant never expires", async () => {
  const now = Date.UTC(2026, 10, 17);
  await db.ref(`apps/${A}/entitlements/dg`).set({ tier: "gold", source: "play", expires: now - 1000 });
  await db.ref(`apps/${A}/users/dg/data/eating`).set({ meals: { mon: "x" } });
  await core.credit(db, A, "dg", 100, "t", "dgk");
  assert.equal((await core.planOf(db, A, "dg", now)).tier, "bronze");
  await assert.rejects(core.aiProxy({ uid: "dg", data: req }, { db, callClaude: fakeClaude, now }), { code: "permission-denied" });
  assert.deepEqual((await db.ref(`apps/${A}/users/dg/data/eating`).once("value")).val(), { meals: { mon: "x" } });
  await core.setTier({ uid: "uid-admin", data: { uid: "dg", tier: "gold" } }, { db, now });
  const e = (await db.ref(`apps/${A}/entitlements/dg`).once("value")).val();
  assert.equal(e.source, "admin"); assert.equal(e.expires, undefined);
  assert.equal((await core.planOf(db, A, "dg", now + 1e12)).tier, "gold");
});
