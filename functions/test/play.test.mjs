// v2.22.0 PAY1: Play purchases verified on the server — Google's answers are mocked; nothing is credited from the client.
import { test, before } from "node:test";
import assert from "node:assert/strict";
process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
const admin = (await import("firebase-admin")).default;
const core = await import("../src/core.js");
const { playVerify, playNotify, accountTag, playApi } = await import("../src/play.js");

const app = admin.initializeApp({ projectId: "life-care-app-64d04", databaseURL: "http://127.0.0.1:9000?ns=lc-play-test" }, "play-test");
const db = app.database();
const A = "lifecare";
const NOW = Date.UTC(2026, 10, 17);
const DAY = 86400000;
// A fake Google: what Play "really" holds for each token
const G = { subs: {}, products: {}, acks: [], consumed: [] };
const play = {
  getSubscription: async (t) => { if (!G.subs[t]) throw new core.HttpsError("failed-precondition", "Google Play couldn't confirm this purchase."); return G.subs[t]; },
  acknowledge: async (id, t) => { G.acks.push(id + ":" + t); },
  getProduct: async (id, t) => { if (!G.products[t]) throw new core.HttpsError("failed-precondition", "x"); return G.products[t]; },
  consume: async (id, t) => { G.consumed.push(t); G.products[t].consumptionState = 1; },
};
const sub = (uid, productId, order, state = "SUBSCRIPTION_STATE_ACTIVE", expiry = NOW + 30 * DAY) => ({ subscriptionState: state, latestOrderId: order, acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
  lineItems: [{ productId, expiryTime: new Date(expiry).toISOString(), offerDetails: { basePlanId: "monthly" } }], externalAccountIdentifiers: { obfuscatedExternalAccountId: accountTag(uid) } });
const rtdn = (token, type) => ({ data: Buffer.from(JSON.stringify({ packageName: "com.companionappsstudio.lifecare", subscriptionNotification: { notificationType: type, purchaseToken: token, subscriptionId: "gold" } })).toString("base64") });
const ent = async (uid) => (await db.ref(`apps/${A}/entitlements/${uid}`).once("value")).val();

before(async () => { await db.ref().set({ platform: { admins: { "uid-admin": true } } }); });

test("subscription: verified with Google, sets Gold until the paid-period end, credits the allowance ONCE, acknowledges", async () => {
  G.subs["tok-gold-0001"] = sub("p1", "gold", "GPA.1111");
  await assert.rejects(playVerify({ uid: null, data: { kind: "subscription", productId: "gold", purchaseToken: "tok-gold-0001" } }, { db, play, now: NOW }), { code: "unauthenticated" });
  const r = await playVerify({ uid: "p1", data: { kind: "subscription", productId: "gold", purchaseToken: "tok-gold-0001" } }, { db, play, now: NOW });
  assert.equal(r.tier, "gold"); assert.equal(r.credited, true);
  const e = await ent("p1");
  assert.deepEqual([e.tier, e.source, e.expires], ["gold", "play", NOW + 30 * DAY]);
  assert.equal(await core.balance(db, A, "p1"), 500);   // Gold: 500 Energy
  assert.deepEqual(G.acks, ["gold:tok-gold-0001"]);
  // the same token again (the app retries): nothing more credited
  const again = await playVerify({ uid: "p1", data: { kind: "subscription", productId: "gold", purchaseToken: "tok-gold-0001" } }, { db, play, now: NOW });
  assert.equal(again.credited, false);
  assert.equal(await core.balance(db, A, "p1"), 500);   // Gold: 500 Energy
  const ledger = (await db.ref(`apps/${A}/ledger/p1`).once("value")).val();
  assert.deepEqual(Object.keys(ledger), ["play_GPA_1111"]);
  for (const x of Object.values(ledger)) assert.deepEqual(Object.keys(x).sort(), ["at", "energy", "kind", "ref"]);   // no content
});

test("nothing from the client is trusted: a token Google doesn't know, a wrong product, someone else's purchase", async () => {
  await assert.rejects(playVerify({ uid: "p2", data: { kind: "subscription", productId: "gold", purchaseToken: "made-up-token-xyz" } }, { db, play, now: NOW }), { code: "failed-precondition" });
  G.subs["tok-silver-0001"] = sub("p2", "silver", "GPA.2222");
  await assert.rejects(playVerify({ uid: "p2", data: { kind: "subscription", productId: "platinum", purchaseToken: "tok-silver-0001" } }, { db, play, now: NOW }), { code: "failed-precondition" });
  await assert.rejects(playVerify({ uid: "intruder", data: { kind: "subscription", productId: "gold", purchaseToken: "tok-gold-0001" } }, { db, play, now: NOW }), { code: "permission-denied" });
  assert.equal(await ent("p2"), null); assert.equal(await ent("intruder"), null);
});

test("RTDN: a renewal credits the next allowance (new order ID); a replay changes nothing; expiry → Bronze, data kept", async () => {
  await db.ref(`apps/${A}/users/p1/data/exercise`).set({ log: [1, 2, 3] });
  G.subs["tok-gold-0001"] = sub("p1", "gold", "GPA.1111..0", "SUBSCRIPTION_STATE_ACTIVE", NOW + 60 * DAY);
  assert.equal(await playNotify(rtdn("tok-gold-0001", 2), { db, play, now: NOW + 30 * DAY }), "applied:gold:credited");
  assert.equal(await playNotify(rtdn("tok-gold-0001", 2), { db, play, now: NOW + 30 * DAY }), "applied:gold");          // replay
  assert.equal(await core.balance(db, A, "p1"), 1000);
  G.subs["tok-gold-0001"] = sub("p1", "gold", "GPA.1111..0", "SUBSCRIPTION_STATE_EXPIRED", NOW + 60 * DAY);
  assert.equal(await playNotify(rtdn("tok-gold-0001", 13), { db, play, now: NOW + 61 * DAY }), "applied:bronze");
  assert.equal((await core.planOf(db, A, "p1", NOW + 61 * DAY)).tier, "bronze");
  assert.deepEqual((await db.ref(`apps/${A}/users/p1/data/exercise`).once("value")).val(), { log: [1, 2, 3] });      // data kept
  assert.equal(await playNotify(rtdn("never-verified-token", 2), { db, play }), "unknown token");
  assert.equal(await playNotify({ data: Buffer.from(JSON.stringify({ packageName: "other.app" })).toString("base64") }, { db, play }), "ignored");
});

test("an admin grant (pilot, JC and Becks) is never changed by the store", async () => {
  await core.setTier({ uid: "uid-admin", data: { uid: "p3", tier: "platinum" } }, { db, now: NOW });
  G.subs["tok-p3-silver"] = sub("p3", "silver", "GPA.3333");
  const r = await playVerify({ uid: "p3", data: { kind: "subscription", productId: "silver", purchaseToken: "tok-p3-silver" } }, { db, play, now: NOW });
  assert.equal(r.note, "admin grant kept");
  assert.deepEqual([(await ent("p3")).tier, (await ent("p3")).source], ["platinum", "admin"]);
});

test("Energy top-up: Bronze refused; Silver credited £2.50 of AI cost once and consumed; Platinum top-ups go into the family pool", async () => {
  G.products["tok-topup-0001"] = { purchaseState: 0, consumptionState: 0, orderId: "GPA.5555", obfuscatedExternalAccountId: accountTag("b1") };
  await assert.rejects(playVerify({ uid: "b1", data: { kind: "topup", productId: "energy_5", purchaseToken: "tok-topup-0001" } }, { db, play, now: NOW }), { code: "permission-denied" });   // Bronze
  G.products["tok-topup-0002"] = { purchaseState: 0, consumptionState: 0, orderId: "GPA.6666", obfuscatedExternalAccountId: accountTag("p2") };
  await db.ref(`apps/${A}/entitlements/p2`).set({ tier: "silver", source: "admin" });
  const r = await playVerify({ uid: "p2", data: { kind: "topup", productId: "energy_5", purchaseToken: "tok-topup-0002" } }, { db, play, now: NOW });
  assert.equal(r.credited, true);
  await playVerify({ uid: "p2", data: { kind: "topup", productId: "energy_5", purchaseToken: "tok-topup-0002" } }, { db, play, now: NOW });
  assert.equal(await core.balance(db, A, "p2"), 500);   // £5 top-up = 500 Energy
  assert.deepEqual(G.consumed, ["tok-topup-0002"]);
  G.products["tok-topup-0003"] = { purchaseState: 0, consumptionState: 0, orderId: "GPA.7777", obfuscatedExternalAccountId: accountTag("p3") };
  const r3 = await playVerify({ uid: "p3", data: { kind: "topup", productId: "energy_5", purchaseToken: "tok-topup-0003" } }, { db, play, now: NOW });
  assert.equal(r3.pool, true);
  assert.equal(((await db.ref(`apps/${A}/familyEnergy/p3`).once("value")).val() || {}).balance, 500);
  G.products["tok-topup-0004"] = { purchaseState: 1, orderId: "GPA.8888", obfuscatedExternalAccountId: accountTag("p2") };   // cancelled / pending
  await assert.rejects(playVerify({ uid: "p2", data: { kind: "topup", productId: "energy_5", purchaseToken: "tok-topup-0004" } }, { db, play, now: NOW }), { code: "failed-precondition" });
});

test("the real client calls the Play Developer API v3 paths with the service-account token", async () => {
  const calls = [];
  const f = async (url, o) => { calls.push((o && o.method || "GET") + " " + url.replace(/\?.*/, "")); return { ok: true, json: async () => ({ access_token: "t", expires_in: 3600 }), text: async () => "{}" }; };
  const api = playApi({ fetchImpl: f });
  await api.getSubscription("a/b"); await api.acknowledge("gold", "a"); await api.getProduct("energy_5", "a"); await api.consume("energy_5", "a");
  assert.deepEqual(calls, ["GET http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    "GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.companionappsstudio.lifecare/purchases/subscriptionsv2/tokens/a%2Fb",
    "POST https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.companionappsstudio.lifecare/purchases/subscriptions/gold/tokens/a:acknowledge",
    "GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.companionappsstudio.lifecare/purchases/products/energy_5/tokens/a",
    "POST https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.companionappsstudio.lifecare/purchases/products/energy_5/tokens/a:consume"]);
});

test.after(async () => { await app.delete(); });
