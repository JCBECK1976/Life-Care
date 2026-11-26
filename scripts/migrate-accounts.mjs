#!/usr/bin/env node
// v2.25.0 (ACCOUNTS_TIERS_ENERGY §5a + §5b) — JC and Becks: shared data → their own accounts, + the Platinum grant.
// ONE approved step. Do NOT run against live data without: JC's go-ahead, a fresh backup that opens, and the Architect
// verifying (GO_LIVE_CHECKLIST, section D). --dry-run prints COUNTS ONLY (no names, keys or values).
//
//   node scripts/migrate-accounts.mjs --jc-uid <uid> --becks-uid <uid> [--root data] --dry-run
//   node scripts/migrate-accounts.mjs --jc-uid <uid> --becks-uid <uid> [--root data] --i-have-a-fresh-backup
//   (emulator, for tests: add --emulator <namespace>)
//
// What it does (nothing is deleted; the shared root stays as it is — rollback = switch the flag back):
//  v2.28.0 (ADR 0018): each person's records go to apps/lifecare/users/{uid}/data/{area}; what JC and Becks share (food
//  lists, "All" defaults, shopping, the name lists) goes ONCE to households/h_family/shared/{area} — not copied to both.
//  1. Each person gets their own areas, holding ONLY their own records:
//     dashboard:data with just their person (each keeps their own key: "jc" / "becks", so per-person fields such as
//     jcKcal / beckKcal keep working); keys named for them (journal_becks, eat_children:becks:…, mealplan:…:becks …);
//     shared lists (custom_breakfasts …) copied to both; shared records that are keyed by person inside
//     (qa_history, feedback, …) reduced to that person's part.
//  2. Never copied: the AI key and other secrets, usage/audit/energy bookkeeping, old consent (each person gives
//     consent again as an individual).
//  3. Platinum grant: JC = Platinum Family owner, Becks = member (source "admin", no payment, no expiry, never billed);
//     the household; both Visible + "Household members can log for me" (as today, per §5a step 5); the family pool
//     starts at £7.50 of Energy.
//  4. Verifies by re-reading and comparing counts.
import { createRequire } from "node:module";
import { toAreas, locate } from "../src/lib/areas.js";
const require = createRequire(new URL("../functions/package.json", import.meta.url));

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
const has = (n) => args.includes("--" + n);
const APP = "lifecare";
const ROOT = arg("root") || "data";
const UID = { jc: arg("jc-uid"), becks: arg("becks-uid") };
const DRY = has("dry-run");
const EMU = arg("emulator");

export const NEVER = /^(anthropic_api_key|google_client_id|companion_energy|ai_usage|audit|consent:.*|debug.*|api_key.*|.*_token.*)$/i;
const PERSON = /(^|[_:])(jc|becks)(?=$|[_:])/i;

/** Which person a key is named for ("jc" | "becks"), or null for a shared key. */
export function personOfKey(k) { const m = PERSON.exec(k); return m ? m[2].toLowerCase() : null; }

/** Pure: the store for one person, from the shared root. Returns { store, counts }. */
export function storeFor(root, who) {
  const store = {}; const counts = { own: 0, shared: 0, reduced: 0, skippedOther: 0, never: 0 };
  for (const [k, v] of Object.entries(root || {})) {
    if (NEVER.test(k)) { counts.never++; continue; }
    if (k === "dashboard:data") {
      const d = JSON.parse(v); const one = { config: d.config }; if (d[who]) one[who] = d[who];
      store[k] = JSON.stringify(one); counts.own++; continue;
    }
    const p = personOfKey(k);
    if (p && p !== who) { counts.skippedOther++; continue; }
    if (p === who) { store[k] = v; counts.own++; continue; }
    if (locate(k).scope === "family") { store[k] = v; counts.shared++; continue; }   // v2.28.0: family lists stay WHOLE (e.g. meal_defaults holds everyone's)
    // shared key: a record kept per person inside → only this person's part
    let parsed = null; try { parsed = typeof v === "string" ? JSON.parse(v) : null; } catch (e) { parsed = null; }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && ("jc" in parsed || "becks" in parsed)) {
      if (parsed[who] !== undefined) { store[k] = JSON.stringify({ [who]: parsed[who] }); counts.reduced++; }
      continue;
    }
    store[k] = v; counts.shared++;
  }
  return { store, counts };
}

/** Pure: every write of the step (paths → values). Counts per person per area, and for the family area. */
export function plan(root, uid, now) {
  const up = {}; const counts = { family: {} };
  let familyDone = false;
  for (const who of ["jc", "becks"]) {
    const { store, counts: c } = storeFor(root, who);
    const own = {}, fam = {};
    for (const k of Object.keys(store)) (k !== "dashboard:data" && locate(k).scope === "family" ? fam : own)[k] = store[k];
    const a = toAreas(own);
    counts[who] = Object.assign({ keys: Object.keys(own).length, areas: Object.fromEntries(Object.entries(a.own).map(([ar, v]) => [ar, Object.keys(v).length])) }, c);
    up[`apps/${APP}/users/${uid[who]}/data`] = a.own;
    if (!familyDone) {   // the family's shared lists: once, from the shared root (identical for both people)
      const f = toAreas(fam).family;
      var familyShared = f;   // written inside the household record below (one path: an update can't hold a path and its parent)
      counts.family = Object.fromEntries(Object.entries(f).map(([ar, v]) => [ar, Object.keys(v).length]));
      familyDone = true;
    }
    const d = JSON.parse(root["dashboard:data"] || "{}");
    up[`apps/${APP}/users/${uid[who]}/profile`] = { name: (d[who] && d[who].profile && d[who].profile.name) || (who === "jc" ? "JC" : "Becks") };
    up[`apps/${APP}/users/${uid[who]}/privacy`] = { visible: true, logForMe: true };
    up[`apps/${APP}/memberOf/${uid[who]}`] = "h_family";
  }
  up[`apps/${APP}/households/h_family`] = { owner: uid.jc, created: now, members: { [uid.jc]: true, [uid.becks]: true }, shared: familyShared || {} };
  up[`apps/${APP}/entitlements/${uid.jc}`] = { tier: "platinum", since: now, source: "admin" };   // Becks: Platinum as a member
  up[`apps/${APP}/familyEnergy/${uid.jc}`] = { balance: 1500, updated: now };   // Platinum: 1,500 Energy a month
  up[`apps/${APP}/audit/${now}_migration`] = { at: new Date(now).toISOString(), action: "migrate-accounts", people: 2 };
  return { up, counts };
}

async function main() {
  if (!UID.jc || !UID.becks || UID.jc === UID.becks) { console.error("Give --jc-uid and --becks-uid (two different accounts)."); process.exit(2); }
  if (!DRY && !has("i-have-a-fresh-backup")) { console.error("Refusing: run with --dry-run first. A real run needs --i-have-a-fresh-backup (JC's go-ahead, backup opened, Architect verifying)."); process.exit(2); }
  if (EMU) process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
  const admin = require("firebase-admin");
  const app = admin.initializeApp(EMU ? { projectId: "life-care-app-64d04", databaseURL: "http://127.0.0.1:9000?ns=" + EMU } : { databaseURL: process.env.FIREBASE_DATABASE_URL });
  const db = app.database();
  const root = (await db.ref(ROOT).once("value")).val() || {};
  const now = Date.now();
  const { up, counts } = plan(root, UID, now);
  const areas = (o) => Object.entries(o || {}).map(([a, n]) => a + " " + n).join(", ");
  const line = (who) => `${who === "jc" ? "Person 1" : "Person 2"}: ${counts[who].keys} items (${counts[who].own} their own, ${counts[who].reduced} shared records reduced to their part; ${counts[who].skippedOther} of the other person's left out; ${counts[who].never} never copied) — by area: ${areas(counts[who].areas)}`;
  console.log((DRY ? "DRY RUN — nothing written. " : "") + "Source: " + Object.keys(root).length + " items.");
  console.log(line("jc")); console.log(line("becks"));
  console.log("Family area (shared once): " + areas(counts.family));
  console.log("Platinum grant: owner + 1 member, family pool 1500 Energy. Both Visible + log-for-me.");
  if (DRY) { await app.delete(); return; }
  for (const who of ["jc", "becks"]) {
    const existing = (await db.ref(`apps/${APP}/users/${UID[who]}/data`).once("value")).val();
    if (existing) { console.error("Refusing: " + (who === "jc" ? "person 1" : "person 2") + " already has a store. Nothing written."); await app.delete(); process.exit(3); }
  }
  await db.ref().update(up);
  // verify: counts re-read from what was written
  let okAll = true;
  for (const who of ["jc", "becks"]) {
    const got = (await db.ref(`apps/${APP}/users/${UID[who]}/data`).once("value")).val() || {};
    const n = Object.values(got).reduce((t, v) => t + Object.keys(v || {}).length, 0);
    const want = Object.values(counts[who].areas).reduce((t, x) => t + x, 0);
    const ok = n === want; okAll = okAll && ok;
    console.log((ok ? "✓ " : "✗ ") + (who === "jc" ? "Person 1" : "Person 2") + ": " + n + " items written");
  }
  const ent = (await db.ref(`apps/${APP}/entitlements/${UID.jc}`).once("value")).val();
  console.log((ent && ent.tier === "platinum" ? "✓" : "✗") + " Platinum grant");
  await app.delete();
  process.exit(okAll ? 0 : 4);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error("Failed: " + e.message); process.exit(1); });
