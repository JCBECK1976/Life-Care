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
const req = { feature: "help", request: { max_tokens: 100, system: "You are the Companion.", messages: [{ role: "user", content: "hello" }] } };

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

test("aiProxy: needs sign-in, an allowed tier and energy; adds the medication rule; debits the real cost; records usage", async () => {
  await assert.rejects(core.aiProxy({ uid: null, data: req }, { db, callClaude: fakeClaude }), { code: "unauthenticated" });
  await assert.rejects(core.aiProxy({ uid: "u2", data: req }, { db, callClaude: fakeClaude }), { code: "resource-exhausted" });
  await assert.rejects(core.aiProxy({ uid: "u1", data: { ...req, feature: "snap" } }, { db, callClaude: fakeClaude }), { code: "permission-denied" }); // bronze has no Snap
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
  await core.createCheckout({ uid: "u3", data: { pack: "pack5" } }, { stripe: fake, baseUrl: "https://example.test/" });
  assert.equal(made.line_items[0].price_data.unit_amount, 500);
  assert.equal(made.metadata.uid, "u3");
  await assert.rejects(core.createCheckout({ uid: null, data: { pack: "pack5" } }, { stripe: fake, baseUrl: "" }), { code: "unauthenticated" });
});

test.after(async () => { await app.delete(); });

test("tier defaults (JC 14 Nov) and packs", async () => {
  const { DEFAULT_TIERS, PACKS } = await import("../src/config.js");
  assert.deepEqual([DEFAULT_TIERS.bronze.allowancePence, DEFAULT_TIERS.silver.allowancePence, DEFAULT_TIERS.gold.allowancePence], [20, 150, 250]);
  assert.deepEqual([DEFAULT_TIERS.silver.pricePence, DEFAULT_TIERS.silver.yearlyPence, DEFAULT_TIERS.gold.pricePence, DEFAULT_TIERS.gold.yearlyPence], [599, 4900, 999, 7900]);
  assert.equal(DEFAULT_TIERS.bronze.help && !DEFAULT_TIERS.bronze.aiFeedback, true);
  assert.equal(DEFAULT_TIERS.gold.household && !DEFAULT_TIERS.silver.household, true);
  for (const p of Object.values(PACKS)) assert.equal(p.creditPence * 2, p.pricePence);   // 100% mark-up
});
