// database.rules.next.json (NOT deployed): own data only; household members read only Visible people (ADR 0012), write only with log-for-me;
// balance/tier/ledger are server-only; the admin can't read anyone's health data (Architect hard rule, 13 Nov).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { asOwner, asUser, loadRules, token } from "./helpers.mjs";

const NS = "lc-rules-test";
let alice, bob, adm, carol;
const ok = async (p) => assert.equal((await p).status, 200);
const denied = async (p) => assert.equal((await p).status, 401);

before(async () => {
  await loadRules(NS);
  [alice, bob, adm, carol] = [await token("alice"), await token("bob"), await token("admin"), await token("carol")];
  // Household h1: owner alice, member bob. carol is outside. Everyone starts Hidden (default).
  await asOwner(NS, "", "PUT", { platform: { admins: { [adm.uid]: true } }, apps: { lifecare: {
    users: { [alice.uid]: { profile: { name: "Alice" }, data: { body: { weight: 13 }, exercise: { squat: 40 } } }, [bob.uid]: { profile: { name: "Bob" }, data: { body: { weight: 11 } } } },
    households: { h1: { owner: alice.uid, members: { [alice.uid]: true, [bob.uid]: true } } },
    memberOf: { [alice.uid]: "h1", [bob.uid]: "h1" },
    energy: { [alice.uid]: { balancePence: 100 } }, entitlements: { [alice.uid]: { tier: "bronze" } },
    admin: { accounts: { [alice.uid]: { tier: "bronze", balancePence: 100 } } } } } });
});
const U = (u) => `apps/lifecare/users/${u.uid}`;

test("own data: read/write yes; someone else's: no", async () => {
  await ok(asUser(NS, alice, U(alice) + "/data/body"));
  await ok(asUser(NS, alice, U(alice) + "/data/body/weight", "PUT", 12.9));
  await denied(asUser(NS, carol, U(alice) + "/data/body"));
  await denied(asUser(NS, carol, U(alice) + "/data/body/weight", "PUT", 1));
});

test("Hidden (default): the owner and other members can't read the data, but see the name + private flag (greyed tab)", async () => {
  await denied(asUser(NS, alice, U(bob) + "/data/body"));          // alice is the OWNER: still no access
  await denied(asUser(NS, alice, U(bob) + "/data"));
  await ok(asUser(NS, alice, U(bob) + "/profile"));
  await ok(asUser(NS, alice, U(bob) + "/privacy"));
  await denied(asUser(NS, carol, U(bob) + "/profile"));             // outsiders see nothing
  await denied(asUser(NS, alice, U(bob) + "/privacy/visible", "PUT", true));   // only Bob sets his privacy
});

test("Visible: members read; log-for-me needs Visible AND the toggle; outsiders never", async () => {
  await denied(asUser(NS, bob, U(bob) + "/privacy/logForMe", "PUT", true));    // not while Hidden
  await ok(asUser(NS, bob, U(bob) + "/privacy/visible", "PUT", true));
  await ok(asUser(NS, alice, U(bob) + "/data/body"));
  await denied(asUser(NS, carol, U(bob) + "/data/body"));
  await denied(asUser(NS, alice, U(bob) + "/data/body/weight", "PUT", 10));    // log-for-me off
  await ok(asUser(NS, bob, U(bob) + "/privacy/logForMe", "PUT", true));
  await ok(asUser(NS, alice, U(bob) + "/data/body/weight", "PUT", 10.9));      // joint workout logging
  await ok(asUser(NS, bob, U(bob) + "/privacy/visible", "PUT", false));        // back to Hidden: everything stops
  await denied(asUser(NS, alice, U(bob) + "/data/body"));
  await denied(asUser(NS, alice, U(bob) + "/data/body/weight", "PUT", 11));
});

test("per-area sharing (designed for later): exercise yes, body no", async () => {
  await ok(asUser(NS, alice, U(alice) + "/privacy", "PUT", { visible: true, logForMe: false, areas: { exercise: true, body: false } }));
  await ok(asUser(NS, bob, U(alice) + "/data/exercise"));
  await denied(asUser(NS, bob, U(alice) + "/data/body"));
});

test("households and membership: server-written only; can't join yourself", async () => {
  await denied(asUser(NS, carol, "apps/lifecare/households/h1/members/" + carol.uid, "PUT", true));
  await denied(asUser(NS, carol, "apps/lifecare/memberOf/" + carol.uid, "PUT", "h1"));
  await ok(asUser(NS, bob, "apps/lifecare/households/h1"));
  await denied(asUser(NS, carol, "apps/lifecare/households/h1"));
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
