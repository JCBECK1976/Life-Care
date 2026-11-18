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
    energy: { [alice.uid]: { balance: 100 } }, entitlements: { [alice.uid]: { tier: "bronze" } },
    admin: { accounts: { [alice.uid]: { tier: "bronze", balance: 100 } } } } } });
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
  await denied(asUser(NS, alice, `apps/lifecare/energy/${alice.uid}/balance`, "PUT", 999999));
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

/* ---------- v2.25.0 final rules: the individual store, consent, server-only paths ---------- */
test("areas (v2.28.0): own read/write; a family member reads an area only when Visible AND that area is on; writes need that area's log-for-me", async () => {
  await ok(asUser(NS, carol, U(carol) + "/data/body/dashboard_data", "PUT", "{}"));
  await ok(asOwner(NS, U(bob) + "/data", "PUT", { exercise: { dashboard_data: "{}" }, body: { dashboard_data: "{}" }, companion: { qa_history: "[]" } }));
  await ok(asOwner(NS, U(bob) + "/privacy", "PUT", { visible: true, logForMe: false, areas: { body: false } }));
  await ok(asUser(NS, alice, U(bob) + "/data/exercise"));                // exercise visible
  await denied(asUser(NS, alice, U(bob) + "/data/body"));                // body hidden
  await denied(asUser(NS, alice, U(bob) + "/data/companion"));           // AI chats: never shown to anyone else
  await denied(asUser(NS, alice, U(bob) + "/data/exercise/x", "PUT", "1"));   // no log-for-me
  await ok(asOwner(NS, U(bob) + "/privacy", "PUT", { visible: true, logForMe: false, areas: { body: false }, logAreas: { exercise: true } }));
  await ok(asUser(NS, alice, U(bob) + "/data/exercise/x", "PUT", "1"));  // log for me: exercise only
  await denied(asUser(NS, alice, U(bob) + "/data/eating/x", "PUT", "1"));
  await ok(asOwner(NS, U(bob) + "/privacy", "PUT", { visible: false, logForMe: false, areas: { exercise: true } }));
  await denied(asUser(NS, alice, U(bob) + "/data/exercise"));            // Hidden overrides every area
  await denied(asUser(NS, carol, U(alice) + "/data/exercise"));          // an outsider: never
  await ok(asOwner(NS, U(bob) + "/privacy", "PUT", { visible: false, logForMe: false }));
});

test("family shared area (v2.28.0): members read and write it (a Hidden member too); a non-member and the admin can't; leaving removes access at once", async () => {
  const F = "apps/lifecare/households/h1/shared";
  await ok(asUser(NS, bob, F + "/eating/shop_defaults", "PUT", JSON.stringify(["milk"])));     // Bob is Hidden: the family area still works for him
  await ok(asUser(NS, alice, F + "/eating/shop_defaults", "PUT", JSON.stringify(["milk", "eggs"])));   // a member edits the family shopping list
  await ok(asUser(NS, bob, F + "/eating"));
  await denied(asUser(NS, alice, U(bob) + "/data/eating"));                   // …while his own areas stay private
  await denied(asUser(NS, carol, F));                                         // a non-member
  await denied(asUser(NS, carol, F + "/eating/shop_defaults", "PUT", "[]"));
  await denied(asUser(NS, adm, F));                                           // the admin
  await ok(asOwner(NS, "apps/lifecare", "PATCH", { ["memberOf/" + bob.uid]: null, ["households/h1/members/" + bob.uid]: null }));   // Bob leaves (as leaveHousehold / removeMember do)
  await denied(asUser(NS, bob, F + "/eating"));                               // at once
  await denied(asUser(NS, bob, F + "/eating/shop_defaults", "PUT", "[]"));
  await ok(asOwner(NS, "apps/lifecare", "PATCH", { ["memberOf/" + bob.uid]: "h1", ["households/h1/members/" + bob.uid]: true }));
  await ok(asUser(NS, carol, U(carol) + "/shared/eating/shop_defaults", "PUT", "[]"));   // not in a family: a personal shared area
  await denied(asUser(NS, alice, U(carol) + "/shared"));
});

test("consent (v2.24.0/v2.25.0): own only; history entries can be added, never changed or removed", async () => {
  await ok(asUser(NS, carol, U(carol) + "/consent", "PATCH", { accepted: true, adult: true, ai: false }));
  await ok(asUser(NS, carol, U(carol) + "/consent/history/h1", "PUT", { at: "t", change: { ai: false } }));
  await denied(asUser(NS, carol, U(carol) + "/consent/history/h1", "PUT", { at: "t", change: { ai: true } }));   // can't rewrite
  await denied(asUser(NS, carol, U(carol) + "/consent/history/h1", "DELETE"));
  await denied(asUser(NS, alice, U(carol) + "/consent"));
  await denied(asUser(NS, adm, U(carol) + "/consent"));                 // not even the admin
});

test("server-only paths: nobody writes plans, energy, pools, ledgers, households, membership, purchases or pilot invites from the app", async () => {
  for (const p of ["entitlements/" + carol.uid, "energy/" + carol.uid, "familyEnergy/" + carol.uid, "familyLedger/" + carol.uid + "/x", "ledger/" + carol.uid + "/x", "households/hx", "memberOf/" + carol.uid, "purchases/abc", "pilotInvites/abc", "usage/" + carol.uid + "/d"])
    await denied(asUser(NS, carol, "apps/lifecare/" + p, "PUT", { tier: "platinum", balance: 99999 }));
  await denied(asUser(NS, carol, "apps/lifecare/purchases/abc"));
  await denied(asUser(NS, adm, "apps/lifecare/pilotInvites"));          // read through the function only
  await denied(asUser(NS, adm, U(alice) + "/data/body"));                // the admin never reads anyone's data
  await denied(asUser(NS, adm, U(alice) + "/data"));
  await ok(asUser(NS, adm, "apps/lifecare/admin/accounts"));
});

test("family pool and plans: a family member reads the owner's pool and plan; an outsider can't", async () => {
  await ok(asOwner(NS, "apps/lifecare/familyEnergy/" + alice.uid, "PUT", { balance: 500 }));
  await ok(asUser(NS, bob, "apps/lifecare/familyEnergy/" + alice.uid));
  await ok(asUser(NS, bob, "apps/lifecare/entitlements/" + alice.uid));
  await denied(asUser(NS, carol, "apps/lifecare/familyEnergy/" + alice.uid));
  await denied(asUser(NS, carol, "apps/lifecare/entitlements/" + alice.uid));
  await denied(asUser(NS, bob, "apps/lifecare/familyLedger/" + alice.uid));   // the ledger: the owner only
});

test("go-live switches (v2.27.0): anyone can read them (even signed out); only a platform admin can change them; booleans only", async () => {
  await ok(fetch("http://127.0.0.1:9000/platform/publicFlags.json?ns=" + NS));
  await denied(asUser(NS, carol, "platform/publicFlags/useTiers", "PUT", true));
  await ok(asUser(NS, adm, "platform/publicFlags/useTiers", "PUT", true));
  await denied(asUser(NS, adm, "platform/publicFlags/useTiers", "PUT", "yes"));   // booleans only (the emulator reports a failed validation as 401)
  await ok(asUser(NS, adm, "platform/publicFlags/useTiers", "PUT", false));
});
