// P10 retention against the DATABASE EMULATOR (namespace lc-ret-test).
import { test } from "node:test";
import assert from "node:assert/strict";
process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
const admin = (await import("firebase-admin")).default;
const { retention } = await import("../src/retention.js");
const app = admin.initializeApp({ projectId: "life-care-app-64d04", databaseURL: "http://127.0.0.1:9000?ns=lc-ret-test" }, "ret-test");
const db = app.database();
const NOW = Date.UTC(2026, 10, 14), DAY = 86400000;

test("deletes only what is past its period; carries out deletion requests; warns inactive accounts once", async () => {
  await db.ref().set({ apps: { lifecare: {
    users: { u1: { data: { threads: { old: { at: NOW - 400 * DAY }, recent: { at: NOW - 10 * DAY } }, googleDaily: { "2025-10-01": { kcal: 1 }, "2026-11-10": { kcal: 2 } }, body: { weight: 13 } } },
             u2: { data: { body: { weight: 11 } } } },
    usage: { u1: { "2026-06-01": { n: 1 }, "2026-11-01": { n: 2 } } },
    tracker: { t1: { created: new Date(NOW - 800 * DAY).toISOString() }, t2: { created: new Date(NOW - 5 * DAY).toISOString() } },
    audit: { a1: { at: new Date(NOW - 800 * DAY).toISOString() }, a2: { at: new Date(NOW).toISOString() } },
    energy: { u2: { balancePence: 5 } },
    admin: { accounts: { u1: { lastActive: NOW - 600 * DAY }, u2: { deletionRequested: NOW - DAY } } } } } });
  const n = await retention(db, "lifecare", NOW);
  assert.deepEqual(n, { threads: 1, usage: 1, tracker: 1, googleDaily: 1, audit: 1, warned: 1, deletedAccounts: 1 });
  const v = (await db.ref("apps/lifecare").once("value")).val();
  assert.deepEqual(Object.keys(v.users.u1.data.threads), ["recent"]);
  assert.deepEqual(Object.keys(v.users.u1.data.googleDaily), ["2026-11-10"]);
  assert.equal(v.users.u1.data.body.weight, 13);                     // records kept while the account is in use
  assert.deepEqual(Object.keys(v.usage.u1), ["2026-11-01"]);
  assert.deepEqual(Object.keys(v.tracker), ["t2"]);
  assert.deepEqual(Object.keys(v.audit), ["a2"]);
  assert.equal(v.users.u2, undefined); assert.equal(v.energy, undefined);
  assert.equal(v.admin.accounts.u2.status, "deleted");
  assert.equal(v.admin.accounts.u1.inactiveWarned, NOW);
  const again = await retention(db, "lifecare", NOW);                  // idempotent: nothing more to do
  assert.equal(Object.values(again).reduce((a, b) => a + b, 0), 0);
});
test.after(async () => { await app.delete(); });
