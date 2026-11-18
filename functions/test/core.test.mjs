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

const ALL = { accepted: true, adult: true, termsVersion: "t", privacyVersion: "t", ai: true, photos: true, health: true, bodyBalance: true };
before(async () => {
  const users = {}; for (const u of ["u1", "u2", "u3", "fo", "fm1", "fm2", "fm3", "fm4", "dg"]) users[u] = { consent: ALL };   // v2.24.0: these test users said yes to everything
  await db.ref().set({ platform: { admins: { "uid-admin": true } }, apps: { [A]: { users } } });
});

test("ledger: credit and debit move the balance; a credit with the same key counts once", async () => {
  await core.credit(db, A, "u1", 250, "test", "k1");
  const again = await core.credit(db, A, "u1", 250, "test", "k1");
  assert.equal(again.duplicate, true);
  await core.debit(db, A, "u1", 10.5, "ai");
  assert.equal(await core.balance(db, A, "u1"), 239.5);
  const ledger = (await db.ref(`apps/${A}/ledger/u1`).once("value")).val();
  assert.equal(Object.keys(ledger).length, 2);
  for (const e of Object.values(ledger)) assert.deepEqual(Object.keys(e).sort(), ["at", "energy", "kind", "ref"]);   // no content
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
  await db.ref(`apps/${A}/users/u-del`).set({ data: { settings: { dashboard_data: "{}" } }, consent: { ai: true, history: { h: { at: "t" } } } });
  await db.ref(`apps/${A}/memberOf/u-del`).set("hd"); await db.ref(`apps/${A}/households/hd`).set({ owner: "ox", members: { ox: true, "u-del": true } });
  await db.ref(`apps/${A}/energy/u-del`).set({ balancePence: 10 });
  const r = await core.deleteAccount({ uid: "u-del", data: {} }, { db, deleteUser, now: Date.UTC(2026, 10, 17) });
  assert.deepEqual(r, { ok: true });
  assert.deepEqual(deleted, ["u-del"]);
  assert.equal((await db.ref(`apps/${A}/entitlements/u-del`).once("value")).val(), null);
  assert.equal((await db.ref(`apps/${A}/energy/u-del`).once("value")).val(), null);
  assert.equal((await db.ref(`apps/${A}/users/u-del`).once("value")).val(), null);              // store + consent history gone
  assert.deepEqual((await db.ref(`apps/${A}/households/hd/members`).once("value")).val(), { ox: true });
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
  assert.equal(Math.round((before - await core.balance(db, A, "u1")) * 10000) / 10000, Math.round(cost * 2 * 10000) / 10000);   // v2.26.0: Energy = AI cost × 2
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
  assert.equal(await core.balance(db, A, "u3"), 500);   // £5 pack = £2.50 of AI cost = 500 Energy
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
  assert.deepEqual(["bronze", "silver", "gold", "platinum"].map((t) => T[t].energy), [0, 300, 500, 1500]);       // JC: Energy a month
  for (const t of ["silver", "gold", "platinum"]) assert.equal(T[t].energy, T[t].allowancePence * 2);              // Energy = AI cost × 2
  assert.equal(TOP_UP.energy, 500);
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
  await assert.rejects(core.adminTopUp({ uid: "fm1", data: { uid: "fo", energy: 1500 } }, { db }), { code: "permission-denied" });
  await core.adminTopUp({ uid: "uid-admin", data: { uid: "fm2", energy: 0.2 } }, { db });                     // a member's top-up goes into the pool
  assert.equal(await core.walletBalance(db, p.wallet), 0.2);
  assert.equal(await core.balance(db, A, "fm2"), 0);                                                         // nothing in a personal balance
  await core.aiProxy({ uid: "fm1", data: { ...req, feature: "mealGenerator" } }, { db, callClaude: fakeClaude });   // costs about 0.47p, more than the pool holds
  assert.equal(await core.walletBalance(db, p.wallet), 0);                                                  // capped at zero, never negative
  await assert.rejects(core.aiProxy({ uid: "fm3", data: req }, { db, callClaude: fakeClaude }), { code: "resource-exhausted" });   // empty for the whole family
  await core.adminTopUp({ uid: "uid-admin", data: { uid: "fo", energy: 1500 } }, { db });
  await core.aiProxy({ uid: "fm3", data: req }, { db, callClaude: fakeClaude });
  assert.ok(await core.walletBalance(db, p.wallet) < 1500);
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

test("consent (v2.24.0): each opt-in switches its features off on the server; terms must be accepted; the joint account is exempt", async () => {
  await db.ref(`apps/${A}/entitlements/cs`).set({ tier: "gold", source: "admin" });
  await core.adminTopUp({ uid: "uid-admin", data: { uid: "cs", energy: 500 } }, { db });
  const call = (feature) => core.aiProxy({ uid: "cs", data: { ...req, feature } }, { db, callClaude: fakeClaude });
  await assert.rejects(call("aiFeedback"), { code: "failed-precondition", message: "Accept the Terms and Privacy Notice first." });   // no consent record
  await db.ref(`apps/${A}/users/cs/consent`).set({ ...ALL, ai: false, photos: false, bodyBalance: false });
  for (const f of ["aiFeedback", "chat", "mealGenerator", "foodRatings"]) await assert.rejects(call(f), { code: "failed-precondition", message: "This is off in your privacy choices (ai)." });
  await db.ref(`apps/${A}/users/cs/consent`).set({ ...ALL, photos: false });
  await call("aiFeedback");                                                             // AI on
  await assert.rejects(call("snap"), { message: "This is off in your privacy choices (photos)." });
  await db.ref(`apps/${A}/users/cs/consent`).set({ ...ALL, bodyBalance: false });
  await call("snap");
  await assert.rejects(call("bodyBalance"), { message: "This is off in your privacy choices (bodyBalance)." });
  assert.equal(await core.consentMissing(db, A, "3iEIfsbZlaUMwUiGY6Lro4jAQef1", "aiFeedback"), null);   // the joint account: exempt
});

test("pilot test users (v2.25.0): admin invites by email with a plan (default Gold); only that email can accept, once; it lands as an admin grant", async () => {
  await assert.rejects(core.createPilotInvite({ uid: "u1", data: { email: "t@example.com" } }, { db }), { code: "permission-denied" });
  const { code } = await core.createPilotInvite({ uid: "uid-admin", data: { email: "Tester@Example.com" } }, { db, makeCode: () => "pil1" });
  await assert.rejects(core.acceptPilotInvite({ uid: "t1", email: "other@example.com", data: { code } }, { db }), { code: "permission-denied" });
  const r = await core.acceptPilotInvite({ uid: "t1", email: "tester@example.com", data: { code } }, { db });
  assert.equal(r.tier, "gold");
  const e = (await db.ref(`apps/${A}/entitlements/t1`).once("value")).val();
  assert.deepEqual([e.tier, e.source, e.pilot, e.expires], ["gold", "admin", true, undefined]);
  await assert.rejects(core.acceptPilotInvite({ uid: "t2", email: "tester@example.com", data: { code } }, { db }), { code: "not-found" });   // once
  const s2 = (await core.createPilotInvite({ uid: "uid-admin", data: { email: "s@example.com", tier: "silver" } }, { db, makeCode: () => "pil2" })).code;
  assert.equal((await core.acceptPilotInvite({ uid: "t3", email: "s@example.com", data: { code: s2 } }, { db })).tier, "silver");
  const old = (await core.createPilotInvite({ uid: "uid-admin", data: { email: "o@example.com" } }, { db, now: 0, makeCode: () => "pil3" })).code;
  await assert.rejects(core.acceptPilotInvite({ uid: "t4", email: "o@example.com", data: { code: old } }, { db }), { code: "deadline-exceeded" });
});

test("monthly allowance (v2.26.0): admin grants get 300/500/1,500 Energy once a month (Platinum into the pool; members nothing extra)", async () => {
  const mo = Date.UTC(2026, 11, 3);
  await db.ref(`apps/${A}/entitlements`).update({ ma_s: { tier: "silver", source: "admin" }, ma_p: { tier: "platinum", source: "admin" }, ma_play: { tier: "gold", source: "play", expires: mo + 9e9 } });
  const before = await core.balance(db, A, "ma_s");
  const r = await core.grantMonthly(db, A, mo);
  assert.ok(r.credited >= 2);
  assert.equal(await core.balance(db, A, "ma_s") - before, 300);
  assert.equal(((await db.ref(`apps/${A}/familyEnergy/ma_p`).once("value")).val() || {}).balance, 1500);
  assert.equal(await core.balance(db, A, "ma_play"), 0);                                  // Play plans: on renewal instead
  await core.grantMonthly(db, A, mo + 86400000);                                          // the next day: nothing more
  assert.equal(await core.balance(db, A, "ma_s") - before, 300);
  await core.debit(db, A, "ma_s", 100, "ai");                                             // 200 of this month's 300 left
  await core.grantMonthly(db, A, Date.UTC(2027, 0, 2));                                    // next month: reset to 300, no rollover
  assert.equal(await core.balance(db, A, "ma_s") - before, 300);
});

test("export (v2.26.0, Step 2): everything about the signed-in person — and nobody else; recorded in the audit trail", async () => {
  await db.ref(`apps/${A}/users/ex1`).set({ data: { body: { dashboard_data: "{\"jc\":{}}" } }, profile: { name: "Ex" }, consent: { ai: true } });
  await db.ref(`apps/${A}/users/ex2`).set({ data: { journal: { secret: "not yours" } } });
  await assert.rejects(core.exportMyData({ uid: null, data: {} }, { db }), { code: "unauthenticated" });
  const out = await core.exportMyData({ uid: "ex1", data: {} }, { db, now: Date.UTC(2026, 10, 18) });
  assert.equal(out.profile.name, "Ex"); assert.ok(out.data.body.dashboard_data); assert.equal(out.consent.ai, true);
  assert.ok(!JSON.stringify(out).includes("not yours"));
  const audit = Object.values((await db.ref(`apps/${A}/audit`).once("value")).val()).map((x) => x.action);
  assert.ok(audit.includes("export-my-data"));
});

test("Vertex AI (EU) with a fallback to the direct API only when Vertex is down; the model and region are configurable", async () => {
  const { pickBackend } = await import("../src/backends.js");
  const prev = process.env.AI_BACKEND; process.env.AI_BACKEND = "vertex";
  const urls = [];
  const ok = { ok: true, json: async () => ({ content: [{ type: "text", text: "v" }], usage: {} }) };
  const down = { ok: false, status: 503 };
  let vertexUp = true;
  const fetchImpl = async (url) => { urls.push(url.replace(/projects\/[^/]*/, "projects/P")); return url.includes("aiplatform") ? (vertexUp ? ok : down) : ok; };
  const b = pickBackend({ fallback: "direct", vertexToken: "t", fetchImpl, vertexModel: "claude-sonnet-4-6" });
  await b({ model: "claude-sonnet-4-6", max_tokens: 5, messages: [] });
  assert.match(urls[0], /^https:\/\/europe-west1-aiplatform\.googleapis\.com\/v1\/projects\/P\/locations\/europe-west1\/publishers\/anthropic\/models\/claude-sonnet-4-6:rawPredict$/);
  vertexUp = false;
  await assert.rejects(b({ model: "claude-sonnet-4-6", max_tokens: 5, messages: [] }), /Vertex AI HTTP 503/);   // v2.31.1: no US fallback by default
  assert.ok(!urls.some((u) => u.includes("api.anthropic.com")));
  const r = await b({ model: "claude-sonnet-4-6", max_tokens: 5, messages: [] }, { allowDirect: true });       // only when the admin allows it
  assert.equal(r.backend, "direct-fallback"); assert.equal(urls[urls.length - 1], "https://api.anthropic.com/v1/messages");
  const strict = pickBackend({ vertexToken: "t", fetchImpl });                             // no fallback set → the error stands
  await assert.rejects(strict({ model: "m", messages: [] }), /Vertex AI HTTP 503/);
  process.env.AI_BACKEND = prev;
});

test("Energy pots (v2.27.3): monthly Energy resets each month (no rollover); top-ups never expire; AI uses the monthly pot first", async () => {
  const t0 = Date.UTC(2027, 1, 3);
  await db.ref(`apps/${A}/entitlements/pots`).set({ tier: "silver", source: "admin" });
  await core.grantMonthly(db, A, t0);                                                      // 300 monthly
  await core.adminTopUp({ uid: "uid-admin", data: { uid: "pots", energy: 500 } }, { db });   // 500 top-up
  let e = (await db.ref(`apps/${A}/energy/pots`).once("value")).val();
  assert.deepEqual([e.monthly, e.topup, e.balance], [300, 500, 800]);
  await core.debit(db, A, "pots", 350, "ai");                                              // 300 from monthly, 50 from top-up
  e = (await db.ref(`apps/${A}/energy/pots`).once("value")).val();
  assert.deepEqual([e.monthly, e.topup, e.balance], [0, 450, 450]);
  await core.grantMonthly(db, A, Date.UTC(2027, 2, 3));                                    // next month
  e = (await db.ref(`apps/${A}/energy/pots`).once("value")).val();
  assert.deepEqual([e.monthly, e.topup, e.balance], [300, 450, 750]);                     // top-up kept, monthly reset
  await core.debit(db, A, "pots", 100, "ai");
  await core.grantMonthly(db, A, Date.UTC(2027, 3, 3));
  e = (await db.ref(`apps/${A}/energy/pots`).once("value")).val();
  assert.deepEqual([e.monthly, e.topup], [300, 450]);                                      // unused 200 did NOT roll over
});

test("pilot features (v2.30.0): the GP prep summary is Silver and up and needs AI consent; every request says HRT is a record only", async () => {
  const call = (uid) => core.aiProxy({ uid, data: { ...req, feature: "gpSummary" } }, { db, callClaude: fakeClaude });
  await db.ref(`apps/${A}/entitlements/gpb`).set({ tier: "bronze", source: "admin" });
  await assert.rejects(call("gpb"), { code: "permission-denied" });                                    // Bronze: not included
  await db.ref(`apps/${A}/entitlements/gps`).set({ tier: "silver", source: "admin" });
  await core.adminTopUp({ uid: "uid-admin", data: { uid: "gps", energy: 100 } }, { db });
  await db.ref(`apps/${A}/users/gps/consent`).set({ ...ALL, ai: false });
  await assert.rejects(call("gps"), { message: "This is off in your privacy choices (ai)." });
  await db.ref(`apps/${A}/users/gps/consent`).set({ ...ALL, symptoms: false });                    // the symptom consent doesn't block it
  sent = [];
  await call("gps");
  assert.match(sent[0].system, /HRT \(hormone replacement therapy\): HRT entries are the person's own record only/);
  assert.match(MEDICATION_RULE, /never comment on or advise about HRT/);
});

test("prompt caching (v2.31.0): aiProxy marks a long system prompt for caching on every backend; the usage ledger keeps cache tokens per feature", async () => {
  await db.ref(`apps/${A}/entitlements/pc`).set({ tier: "gold", source: "admin" });
  await core.adminTopUp({ uid: "uid-admin", data: { uid: "pc", energy: 500 } }, { db });
  await db.ref(`apps/${A}/users/pc/consent`).set(ALL);
  const usageClaude = async (body) => { sent.push(body); return { content: [{ type: "text", text: "ok" }], usage: { input_tokens: 300, output_tokens: 200, cache_creation_input_tokens: 22000, cache_read_input_tokens: 0 } }; };
  sent = [];
  const big = "Guide. ".repeat(1200);
  await core.aiProxy({ uid: "pc", data: { feature: "aiHelp", request: { max_tokens: 100, system: big, messages: [{ role: "user", content: "q" }] } } }, { db, callClaude: usageClaude, now: Date.UTC(2026, 10, 18) });
  const sys = sent[0].system;
  assert.ok(Array.isArray(sys) && sys[sys.length - 1].cache_control, "cache breakpoint at the end of the system prompt");
  assert.ok(sys.map((b) => b.text).join("").startsWith(MEDICATION_RULE));                    // the rule still first
  const u = (await db.ref(`apps/${A}/usage/pc/2026-11-18`).once("value")).val();
  assert.deepEqual([u.n, u.cw, u.cr, u.f.aiHelp.n, u.f.aiHelp.cw], [1, 22000, 0, 1, 22000]);
  const { readFileSync } = await import("node:fs");
  assert.equal(readFileSync(new URL("../src/caching.js", import.meta.url), "utf8"), readFileSync(new URL("../../src/lib/caching.js", import.meta.url), "utf8"));
});

test("no US fallback (v2.31.1): Vertex down → 'Your Companion is unavailable right now', nothing charged; config/allowDirectFallback = true lets the direct API answer", async () => {
  const { pickBackend } = await import("../src/backends.js");
  const prev = process.env.AI_BACKEND; process.env.AI_BACKEND = "vertex";
  const hits = [];
  const fetchImpl = async (url) => { hits.push(url); return url.includes("aiplatform") ? { ok: false, status: 503 } : { ok: true, json: async () => ({ content: [{ type: "text", text: "direct" }], usage: { input_tokens: 10, output_tokens: 10 } }) }; };
  const callClaude = pickBackend({ fallback: "direct", vertexToken: "t", fetchImpl });
  await db.ref(`apps/${A}/entitlements/nf`).set({ tier: "gold", source: "admin" });
  await db.ref(`apps/${A}/users/nf/consent`).set(ALL);
  await core.adminTopUp({ uid: "uid-admin", data: { uid: "nf", energy: 100 } }, { db });
  const before = await core.balance(db, A, "nf");
  await db.ref(`apps/${A}/config/allowDirectFallback`).remove();                            // default: not set = false
  await assert.rejects(core.aiProxy({ uid: "nf", data: req }, { db, callClaude }), { code: "unavailable", message: "Your Companion is unavailable right now." });
  assert.ok(!hits.some((u) => u.includes("api.anthropic.com")), "the US API was never called");
  assert.equal(await core.balance(db, A, "nf"), before);                                      // nothing charged
  await db.ref(`apps/${A}/config/allowDirectFallback`).set(true);                             // the admin allows it (e.g. an outage)
  const r = await core.aiProxy({ uid: "nf", data: req }, { db, callClaude });
  assert.equal(r.backend, "direct-fallback");
  await db.ref(`apps/${A}/config/allowDirectFallback`).remove();
  process.env.AI_BACKEND = prev;
});
