// v2.29.0: StoreKit 2 purchases verified on the server — Apple's signed answers are made with a TEST certificate chain
// (openssl: root → intermediate → leaf), pinned in place of Apple Root CA – G3. Nothing is credited from the client.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createSign, X509Certificate } from "node:crypto";
process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
const admin = (await import("firebase-admin")).default;
const core = await import("../src/core.js");
const { appleVerify, appleNotify, appleTag, verifyJWS, BUNDLE_ID, APPLE_ROOT_G3_SHA256 } = await import("../src/apple.js");

const app = admin.initializeApp({ projectId: "life-care-app-64d04", databaseURL: "http://127.0.0.1:9000?ns=lc-apple-test" }, "apple-test");
const db = app.database();
const A = "lifecare", NOW = Date.now() + 60000, DAY = 86400000;   // a minute ahead: the test certificates (made just below) are valid by then

// a test chain
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "apple-chain-"));
const sh = (...a) => execFileSync("openssl", a, { cwd: dir, stdio: "pipe" });
const chain = (name) => {
  sh("ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", name + "root.key");
  sh("req", "-x509", "-new", "-key", name + "root.key", "-subj", "/CN=Test Root " + name, "-days", "3650", "-out", name + "root.pem");
  fs.writeFileSync(path.join(dir, "ca.ext"), "basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n");
  sh("ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", name + "int.key");
  sh("req", "-new", "-key", name + "int.key", "-subj", "/CN=Test Intermediate", "-out", name + "int.csr");
  sh("x509", "-req", "-in", name + "int.csr", "-CA", name + "root.pem", "-CAkey", name + "root.key", "-CAcreateserial", "-days", "3650", "-extfile", "ca.ext", "-out", name + "int.pem");
  sh("ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", name + "leaf.key");
  sh("req", "-new", "-key", name + "leaf.key", "-subj", "/CN=Test Leaf", "-out", name + "leaf.csr");
  sh("x509", "-req", "-in", name + "leaf.csr", "-CA", name + "int.pem", "-CAkey", name + "int.key", "-CAcreateserial", "-days", "3650", "-out", name + "leaf.pem");
  const der = (f) => new X509Certificate(fs.readFileSync(path.join(dir, f))).raw.toString("base64");
  return { x5c: [der(name + "leaf.pem"), der(name + "int.pem"), der(name + "root.pem")], key: fs.readFileSync(path.join(dir, name + "leaf.key")), root: new X509Certificate(fs.readFileSync(path.join(dir, name + "root.pem"))).fingerprint256 };
};
const C = chain("a"), EVIL = chain("b");
const jws = (payload, c = C) => {
  const h = Buffer.from(JSON.stringify({ alg: "ES256", x5c: c.x5c })).toString("base64url");
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const s = createSign("sha256").update(h + "." + p).sign({ key: c.key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return h + "." + p + "." + s;
};
const PIN = { rootFingerprint: C.root };
// "Apple": what the App Store Server API holds for each transaction
const T = {};
const apple = { getTransaction: async (id) => { if (!T[id]) throw new core.HttpsError("failed-precondition", "Apple couldn't confirm this purchase."); return T[id]; } };
const sub = (uid, productId, txId, orig, expires = NOW + 30 * DAY, extra = {}) => jws(Object.assign({ bundleId: BUNDLE_ID, productId, transactionId: txId, originalTransactionId: orig, expiresDate: expires, appAccountToken: appleTag(uid), type: "Auto-Renewable Subscription" }, extra));
const ent = async (uid) => (await db.ref(`apps/${A}/entitlements/${uid}`).once("value")).val();
before(async () => { await db.ref().set({ platform: { admins: { "uid-admin": true } } }); });

test("the pinned root is Apple Root CA – G3 (checked against the macOS keychain in the iOS workflow); appleTag is a stable UUID", () => {
  assert.match(APPLE_ROOT_G3_SHA256, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  assert.match(appleTag("u1"), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(appleTag("u1"), appleTag("u1")); assert.notEqual(appleTag("u1"), appleTag("u2"));
});

test("JWS: Apple's chain + signature verified; a tampered payload, another root or a missing chain is refused", () => {
  const good = jws({ hello: 1 });
  assert.deepEqual(verifyJWS(good, PIN), { hello: 1 });
  const [h, , s] = good.split(".");
  assert.throws(() => verifyJWS(h + "." + Buffer.from(JSON.stringify({ hello: 2 })).toString("base64url") + "." + s, PIN), { code: "permission-denied" });
  assert.throws(() => verifyJWS(jws({ hello: 1 }, EVIL), PIN), { code: "permission-denied" });          // signed by someone else
  assert.throws(() => verifyJWS(good), { code: "permission-denied" });                                    // the real Apple pin: not this test root
  assert.throws(() => verifyJWS("a.b"), { code: "failed-precondition" });
});

test("subscription: Gold until expiry, the allowance credited ONCE, the purchase tied to this account", async () => {
  T["1001"] = sub("i1", "gold.monthly", "1001", "9001");
  const r = await appleVerify({ uid: "i1", data: { kind: "subscription", productId: "gold.monthly", transactionId: "1001" } }, { db, apple, now: NOW, ...PIN });
  assert.deepEqual([r.tier, r.credited], ["gold", true]);
  const e = await ent("i1"); assert.deepEqual([e.tier, e.source, e.expires], ["gold", "apple", NOW + 30 * DAY]);
  assert.equal(await core.balance(db, A, "i1"), 500);
  const again = await appleVerify({ uid: "i1", data: { kind: "subscription", productId: "gold.monthly", transactionId: "1001" } }, { db, apple, now: NOW, ...PIN });
  assert.equal(again.credited, false); assert.equal(await core.balance(db, A, "i1"), 500);
  await assert.rejects(appleVerify({ uid: "intruder", data: { kind: "subscription", productId: "gold.monthly", transactionId: "1001" } }, { db, apple, now: NOW, ...PIN }), { code: "permission-denied" });   // appAccountToken
  await assert.rejects(appleVerify({ uid: "i1", data: { kind: "subscription", productId: "platinum.monthly", transactionId: "1001" } }, { db, apple, now: NOW, ...PIN }), { code: "failed-precondition" });
  await assert.rejects(appleVerify({ uid: "i1", data: { kind: "subscription", productId: "gold.monthly", transactionId: "99999" } }, { db, apple, now: NOW, ...PIN }), { code: "failed-precondition" });   // Apple doesn't know it
  T["1002"] = jws({ bundleId: "com.other.app", productId: "gold.monthly", transactionId: "1002", originalTransactionId: "1002", expiresDate: NOW + DAY, appAccountToken: appleTag("i1") });
  await assert.rejects(appleVerify({ uid: "i1", data: { kind: "subscription", productId: "gold.monthly", transactionId: "1002" } }, { db, apple, now: NOW, ...PIN }), { code: "failed-precondition" });   // another app
});

test("notifications v2: a renewal resets the monthly Energy (new transaction ID); expiry and refunds → Bronze, data kept; forged notices ignored", async () => {
  await db.ref(`apps/${A}/users/i1/data/body`).set({ dashboard_data: "{}" });
  await core.debit(db, A, "i1", 100, "ai");
  const note = (type, tx, c = C) => ({ signedPayload: jws({ notificationType: type, data: { bundleId: BUNDLE_ID, signedTransactionInfo: tx } }, c) });
  assert.equal(await appleNotify(note("DID_RENEW", sub("i1", "gold.monthly", "1003", "9001", NOW + 60 * DAY)), { db, now: NOW + 30 * DAY, ...PIN }), "applied:gold:credited");
  assert.equal(await appleNotify(note("DID_RENEW", sub("i1", "gold.monthly", "1003", "9001", NOW + 60 * DAY)), { db, now: NOW + 30 * DAY, ...PIN }), "applied:gold");   // replay
  assert.equal(await core.balance(db, A, "i1"), 500);                                                  // reset to 500, not 900
  assert.equal(await appleNotify(note("EXPIRED", sub("i1", "gold.monthly", "1003", "9001", NOW + 60 * DAY)), { db, now: NOW + 61 * DAY, ...PIN }), "applied:bronze");
  assert.equal((await core.planOf(db, A, "i1", NOW + 61 * DAY)).tier, "bronze");
  assert.deepEqual((await db.ref(`apps/${A}/users/i1/data/body`).once("value")).val(), { dashboard_data: "{}" });
  assert.equal(await appleNotify(note("DID_RENEW", sub("i1", "gold.monthly", "1004", "9001"), EVIL), { db, now: NOW, ...PIN }), "bad signature");
  assert.equal(await appleNotify(note("DID_RENEW", sub("x", "gold.monthly", "1005", "7777")), { db, now: NOW, ...PIN }), "unknown purchase");
  assert.equal(await appleNotify({ signedPayload: jws({ notificationType: "TEST" }) }, { db, now: NOW, ...PIN }), "test");
});

test("Energy top-up (energy_5): Bronze refused; Silver credited 500 once; a refunded purchase refused; an admin grant never changed", async () => {
  T["2001"] = jws({ bundleId: BUNDLE_ID, productId: "energy_5", transactionId: "2001", originalTransactionId: "2001", appAccountToken: appleTag("b1"), type: "Consumable" });
  await assert.rejects(appleVerify({ uid: "b1", data: { kind: "topup", productId: "energy_5", transactionId: "2001" } }, { db, apple, now: NOW, ...PIN }), { code: "permission-denied" });
  await db.ref(`apps/${A}/entitlements/s1`).set({ tier: "silver", source: "admin" });
  T["2002"] = jws({ bundleId: BUNDLE_ID, productId: "energy_5", transactionId: "2002", originalTransactionId: "2002", appAccountToken: appleTag("s1"), type: "Consumable" });
  assert.equal((await appleVerify({ uid: "s1", data: { kind: "topup", productId: "energy_5", transactionId: "2002" } }, { db, apple, now: NOW, ...PIN })).credited, true);
  await appleVerify({ uid: "s1", data: { kind: "topup", productId: "energy_5", transactionId: "2002" } }, { db, apple, now: NOW, ...PIN });
  assert.equal(await core.balance(db, A, "s1"), 500);
  T["2003"] = jws({ bundleId: BUNDLE_ID, productId: "energy_5", transactionId: "2003", originalTransactionId: "2003", appAccountToken: appleTag("s1"), revocationDate: NOW - 1 });
  await assert.rejects(appleVerify({ uid: "s1", data: { kind: "topup", productId: "energy_5", transactionId: "2003" } }, { db, apple, now: NOW, ...PIN }), { code: "failed-precondition" });
  T["2004"] = sub("s1", "platinum.monthly", "2004", "2004");
  const r = await appleVerify({ uid: "s1", data: { kind: "subscription", productId: "platinum.monthly", transactionId: "2004" } }, { db, apple, now: NOW, ...PIN });
  assert.equal(r.note, "admin grant kept"); assert.equal((await ent("s1")).tier, "silver");
});

test.after(async () => { await app.delete(); fs.rmSync(dir, { recursive: true, force: true }); });
