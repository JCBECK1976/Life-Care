// database.rules.next.json (NOT deployed): people only reach their own data; household needs mutual consent;
// balance/tier/ledger are server-only; the admin can't read anyone's health data (Architect hard rule, 13 Nov).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { asOwner, asUser, loadRules, token } from "./helpers.mjs";

const NS = "lc-rules-test";
let alice, bob, adm;
const ok = async (p) => assert.equal((await p).status, 200);
const denied = async (p) => assert.equal((await p).status, 401);

before(async () => {
  await loadRules(NS);
  [alice, bob, adm] = [await token("alice"), await token("bob"), await token("admin")];
  await asOwner(NS, "", "PUT", { platform: { admins: { [adm.uid]: true } }, apps: { lifecare: {
    users: { [alice.uid]: { data: { weight: 13 } }, [bob.uid]: { data: { weight: 11 } } },
    energy: { [alice.uid]: { balancePence: 100 } }, entitlements: { [alice.uid]: { tier: "bronze" } },
    admin: { accounts: { [alice.uid]: { tier: "bronze", balancePence: 100 } } } } } });
});

test("own data: read/write yes; someone else's: no", async () => {
  await ok(asUser(NS, alice, `apps/lifecare/users/${alice.uid}`));
  await ok(asUser(NS, alice, `apps/lifecare/users/${alice.uid}/data/weight`, "PUT", 12.9));
  await denied(asUser(NS, alice, `apps/lifecare/users/${bob.uid}`));
  await denied(asUser(NS, alice, `apps/lifecare/users/${bob.uid}/data/weight`, "PUT", 1));
});

test("household: one-sided consent is not enough; mutual consent allows view and log; withdrawal stops it", async () => {
  await ok(asUser(NS, alice, `apps/lifecare/consents/${alice.uid}/${bob.uid}`, "PUT", true));
  await denied(asUser(NS, bob, `apps/lifecare/users/${alice.uid}`));
  await denied(asUser(NS, bob, `apps/lifecare/consents/${bob.uid}/${alice.uid}`.replace(bob.uid + "/", alice.uid + "/"), "PUT", true)); // can't set the other's consent
  await ok(asUser(NS, bob, `apps/lifecare/consents/${bob.uid}/${alice.uid}`, "PUT", true));
  await ok(asUser(NS, bob, `apps/lifecare/users/${alice.uid}`));
  await ok(asUser(NS, bob, `apps/lifecare/users/${alice.uid}/data/note`, "PUT", "logged by Bob"));
  await ok(asUser(NS, alice, `apps/lifecare/consents/${alice.uid}/${bob.uid}`, "PUT", false));
  await denied(asUser(NS, bob, `apps/lifecare/users/${alice.uid}`));
});

test("balance, tier, ledger: readable by the owner, never writable from the app", async () => {
  await ok(asUser(NS, alice, `apps/lifecare/energy/${alice.uid}`));
  await denied(asUser(NS, alice, `apps/lifecare/energy/${alice.uid}/balancePence`, "PUT", 999999));
  await denied(asUser(NS, alice, `apps/lifecare/entitlements/${alice.uid}/tier`, "PUT", "gold"));
  await denied(asUser(NS, alice, `apps/lifecare/ledger/${alice.uid}/x`, "PUT", { pence: 1 }));
  await denied(asUser(NS, bob, `apps/lifecare/energy/${alice.uid}`));
  await denied(asUser(NS, alice, `platform/admins/${alice.uid}`, "PUT", true));
});

test("admin: sees the account list, never users' health data", async () => {
  await ok(asUser(NS, adm, "apps/lifecare/admin/accounts"));
  await denied(asUser(NS, adm, `apps/lifecare/users/${alice.uid}`));
  await denied(asUser(NS, adm, "apps/lifecare/users"));
  await denied(asUser(NS, alice, "apps/lifecare/admin/accounts"));
  await ok(asUser(NS, adm, "apps/lifecare/config/tiers", "PUT", { bronze: { ai: true } }));
  await denied(asUser(NS, alice, "apps/lifecare/config/tiers", "PUT", { bronze: { ai: true, photos: true } }));
});

test("tracker: users can add their own entry, can't read others'; admin reads", async () => {
  await ok(asUser(NS, alice, "apps/lifecare/tracker/t1", "PUT", { uid: alice.uid, text: "bug" }));
  await denied(asUser(NS, alice, "apps/lifecare/tracker/t1", "PUT", { uid: alice.uid, text: "edit" }));
  await denied(asUser(NS, alice, "apps/lifecare/tracker"));
  await ok(asUser(NS, adm, "apps/lifecare/tracker"));
});
