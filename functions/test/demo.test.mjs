// v2.31.2: the store-review demo account (admin only; synthetic data; Gold; no household; never the joint account).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
const admin = (await import("firebase-admin")).default;
const core = await import("../src/core.js");
const { createReviewDemo } = await import("../src/demo.js");
const app = admin.initializeApp({ projectId: "life-care-app-64d04", databaseURL: "http://127.0.0.1:9000?ns=lc-demo-test" }, "demo-test");
const db = app.database();
const A = "lifecare", NOW = Date.UTC(2026, 10, 18);
// a stand-in for Firebase Auth
const users = { "joint@example.com": "3iEIfsbZlaUMwUiGY6Lro4jAQef1", "admin2@example.com": "uid-admin2", "real@example.com": "uid-real", "fam@example.com": "uid-fam" };
const auth = {
  getUserByEmail: async (e) => { if (!users[e]) throw new Error("auth/user-not-found"); return { uid: users[e], email: e }; },
  createUser: async ({ email }) => { users[email] = "uid-new-" + Object.keys(users).length; return { uid: users[email], email }; },
};
before(async () => {
  await db.ref().set({ platform: { admins: { "uid-admin": true, "uid-admin2": true } }, apps: { [A]: {
    users: { "uid-real": { profile: { name: "Real Person" }, data: { body: { "dashboard:data": "{}" } } } },
    memberOf: { "uid-fam": "h1" } } } });
});

test("refuses: non-admins, the joint account, an admin, a family member, an account with its own data", async () => {
  const call = (uid, email) => createReviewDemo({ uid, data: { email } }, { db, auth, now: NOW });
  await assert.rejects(call("someone", "x@example.com"), { code: "permission-denied" });
  await assert.rejects(call("uid-admin", "joint@example.com"), { code: "failed-precondition", message: "Never the joint or an admin account." });
  await assert.rejects(call("uid-admin", "admin2@example.com"), { code: "failed-precondition" });
  await assert.rejects(call("uid-admin", "fam@example.com"), { message: "The demo account must not be in a family." });
  await assert.rejects(call("uid-admin", "real@example.com"), { message: /already has its own data/ });
  assert.deepEqual((await db.ref(`apps/${A}/users/uid-real/data`).once("value")).val(), { body: { "dashboard:data": "{}" } });   // untouched
});

test("creates: its own UID, synthetic data by area (one made-up person, no JC/Becks, no key), Gold with its Energy, no household; re-running refreshes it", async () => {
  const r = await createReviewDemo({ uid: "uid-admin", data: { email: "Review.Demo@Example.com" } }, { db, auth, now: NOW });
  assert.equal(r.created, true); assert.match(r.uid, /^uid-new-/); assert.equal(r.email, "review.demo@example.com");
  const u = (await db.ref(`apps/${A}/users/${r.uid}`).once("value")).val();
  assert.equal(u.demo.review, true); assert.equal(u.privacy.visible, false); assert.equal(u.consent, undefined);   // the reviewer sees the real onboarding
  const all = JSON.stringify(u);
  assert.doesNotMatch(all, /\bJC\b|Becks|becks|anthropic|dev-placeholder/);
  const parts = Object.values(u.data).map((a) => a.dashboard_data).filter(Boolean).map((x) => JSON.parse(x));
  assert.ok(parts.some((d) => d.jc && d.jc.profile && d.jc.profile.name === "Alex (demo)"), "the person is Alex (demo)");
  assert.ok(u.data.exercise && u.data.body && u.data.eating, "data by area");
  assert.equal((await db.ref(`apps/${A}/entitlements/${r.uid}`).once("value")).val().tier, "gold");
  assert.equal((await db.ref(`apps/${A}/memberOf/${r.uid}`).once("value")).val(), null);
  assert.equal(await core.balance(db, A, r.uid), 500);                                            // Gold's monthly Energy
  const again = await createReviewDemo({ uid: "uid-admin", data: { email: "review.demo@example.com" } }, { db, auth, now: NOW + 1000 });
  assert.equal(again.uid, r.uid); assert.equal(again.created, false);
  assert.equal(await core.balance(db, A, r.uid), 500);                                            // not credited twice in a month
});

test("the fixture generator is shared by the app's scripts and the server; areas.js is the same file on both sides", () => {
  assert.equal(fs.readFileSync(new URL("../src/areas.js", import.meta.url), "utf8"), fs.readFileSync(new URL("../../src/lib/areas.js", import.meta.url), "utf8"));
  assert.match(fs.readFileSync(new URL("../../scripts/make-fixture.mjs", import.meta.url), "utf8"), /from "\.\.\/functions\/src\/fixture\.js"/);
});

test.after(async () => { await app.delete(); });
