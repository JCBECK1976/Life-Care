// Platform handlers as plain functions (deps injected), so they run in Cloud Functions and in emulator tests alike.
import { CONSENT_NEEDS, ENERGY_PER_AI_PENNY, DEFAULT_APP, DEFAULT_TIERS, LOCKED_UIDS, MEDICATION_RULE, MODEL, P, PACKS, STRIPE_WEB_ENABLED, TIER_ORDER, costPence } from "./config.js";

export class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const need = (cond, code, msg) => { if (!cond) throw new HttpsError(code, msg); };
const appOf = (data) => (data && /^[a-z0-9-]{2,20}$/.test(data.appId || "") ? data.appId : DEFAULT_APP);
const day = (now) => new Date(now).toISOString().slice(0, 10);

export async function isAdmin(db, uid) { return !!uid && (await db.ref(P.admin(uid)).once("value")).val() === true; }

/* v2.21.1 SAFETY: account deletion on the server. Refused for the rules-locked UID and any platform admin BEFORE
   anything is changed (deleting that sign-in would lock the household out of its data). For anyone else: the
   person's platform records (entitlements, energy, ledger, usage, admin account row) and the Firebase Auth user.
   deps: { db, deleteUser(uid), now } — deleteUser is admin.auth().deleteUser in Cloud Functions. */
export async function deleteAccount({ uid, data }, { db, deleteUser, now = Date.now() }) {
  need(uid, "unauthenticated", "Sign in first.");
  need(LOCKED_UIDS.indexOf(uid) < 0 && !(await isAdmin(db, uid)), "permission-denied", "This account can't be deleted here: contact the developer.");
  const app = appOf(data);
  const up = {};
  [P.ent(app, uid), P.energy(app, uid), P.ledger(app, uid), P.account(app, uid), `apps/${app}/usage/${uid}`,
   `apps/${app}/users/${uid}`, `apps/${app}/memberOf/${uid}`].forEach((p) => { up[p] = null; });   // v2.26.0: store, consent history, family link
  const hid = (await db.ref(`apps/${app}/memberOf/${uid}`).once("value")).val();
  if (hid) up[`apps/${app}/households/${hid}/members/${uid}`] = null;
  up[`apps/${app}/audit/${now}_${uid.slice(0, 6)}`] = { at: new Date(now).toISOString(), action: "delete-account" };
  await db.ref().update(up);
  await deleteUser(uid);
  return { ok: true };
}

/* ---------- plans (v2.22.0, ADR 0017) ----------
   A person's plan: their own entitlement, or — if they're in a household whose owner is on Platinum — Platinum as a
   family member. Platinum uses ONE shared Energy pool (keyed by the owner); everyone else has their own balance.
   An entitlement with an expiry in the past counts as Bronze. Data is never touched by a plan change. */
export async function tiersConfig(db, app) { return (await db.ref(P.tiers(app)).once("value")).val() || DEFAULT_TIERS; }
const live = (e, now) => e && e.tier && (!e.expires || e.expires > now);
export async function planOf(db, app, uid, now = Date.now()) {
  const own = (await db.ref(P.ent(app, uid)).once("value")).val();
  const hid = (await db.ref(`apps/${app}/memberOf/${uid}`).once("value")).val();
  const h = hid ? (await db.ref(`apps/${app}/households/${hid}`).once("value")).val() : null;
  if (h && h.owner && h.owner !== uid) {
    const oe = (await db.ref(P.ent(app, h.owner)).once("value")).val();
    if (live(oe, now) && oe.tier === "platinum") return { tier: "platinum", role: "member", owner: h.owner, wallet: wallet(app, "pool", h.owner) };
  }
  const tier = live(own, now) ? own.tier : "bronze";
  if (tier === "platinum") return { tier, role: "owner", owner: uid, wallet: wallet(app, "pool", uid) };
  return { tier, role: "solo", owner: uid, wallet: wallet(app, "own", uid) };
}
export async function tierOf(db, app, uid) { return (await planOf(db, app, uid)).tier; }
export async function featureAllowed(db, app, uid, feature) {
  const t = (await tiersConfig(db, app))[await tierOf(db, app, uid)] || {};
  return t[feature] === true;
}

/* ---------- energy ledger (server only; pence of AI cost; no content) ---------- */
function wallet(app, kind, who) { return kind === "pool" ? { energy: P.pool(app, who), ledger: P.poolLedger(app, who), account: null } : { energy: P.energy(app, who), ledger: P.ledger(app, who), account: P.account(app, who) }; }
export async function walletBalance(db, w) { return ((await db.ref(w.energy).once("value")).val() || {}).balance || 0; }   // Energy units
export async function balance(db, app, uid) { return walletBalance(db, wallet(app, "own", uid)); }
export async function move(db, w, delta, kind, ref, key, now) {
  const entryRef = key ? db.ref(w.ledger + "/" + key) : db.ref(w.ledger).push();
  if (key && (await entryRef.once("value")).exists()) return { duplicate: true, balance: await walletBalance(db, w) };
  const r = await db.ref(w.energy).transaction((cur) => {
    // v2.27.3: two pots. MONTHLY Energy (the plan's allowance) is RESET on each renewal / month — no rollover.
    // TOP-UPS (bought or admin-given) never expire. AI calls use the monthly pot first, then top-ups; never below zero.
    const c = cur || {};
    const r4 = (x) => Math.round(x * 10000) / 10000;
    let monthly = c.monthly || 0, topup = c.topup != null ? c.topup : (c.monthly == null ? (c.balance || 0) : 0);   // an older single balance counts as top-up
    if (kind === "allowance") monthly = delta;
    else if (kind === "credit") topup += delta;
    else { let d = -delta; const fromM = Math.min(monthly, d); monthly -= fromM; d -= fromM; topup = Math.max(0, topup - d); }
    monthly = r4(Math.max(0, monthly)); topup = r4(Math.max(0, topup));
    return { monthly, topup, balance: r4(monthly + topup), updated: now };
  });
  await entryRef.set({ at: now, kind, energy: Math.abs(delta), ref: String(ref || "").slice(0, 80) });
  const bal = r.snapshot.val().balance;
  if (w.account) await db.ref(w.account).update({ energy: bal, updated: now });
  return { duplicate: false, balance: bal };
}
/* v2.26.0: balances and the ledger are in Companion ENERGY units (AI cost in pence × 2); credits are allowances / top-ups. */
export const credit = (db, app, uid, energy, ref, key, now = Date.now()) => move(db, wallet(app, "own", uid), +energy, "credit", ref, key, now);
export const debit = (db, app, uid, energy, ref, now = Date.now()) => move(db, wallet(app, "own", uid), -energy, "debit", ref, null, now);
/** Credit the wallet the person's plan uses (Platinum: the family pool). */
export async function creditPlan(db, app, uid, energy, ref, key, now = Date.now(), kind = "credit") { return move(db, (await planOf(db, app, uid, now)).wallet, +energy, kind, ref, key, now); }   // kind "allowance" = monthly reset

/* ---------- aiProxy ---------- */
export function withRule(system) {
  if (Array.isArray(system)) return [{ type: "text", text: MEDICATION_RULE }].concat(system);
  return MEDICATION_RULE + (system ? "\n\n" + system : "");
}
/* v2.24.0 (DPIA §3/§7): an individual account's consents (apps/{app}/users/{uid}/consent). The shared joint/admin
   account predates consent records and is exempt (it is migrated to individual accounts, which go through onboarding). */
export async function consentMissing(db, app, uid, feature) {
  if (LOCKED_UIDS.indexOf(uid) >= 0 || await isAdmin(db, uid)) return null;
  const c = (await db.ref(`apps/${app}/users/${uid}/consent`).once("value")).val() || {};
  if (c.accepted !== true || c.adult !== true) return "terms";
  for (const k of CONSENT_NEEDS[feature] || ["ai"]) if (c[k] !== true) return k;
  return null;
}
export async function aiProxy({ uid, data }, { db, callClaude, now = Date.now() }) {
  need(uid, "unauthenticated", "Sign in first.");
  const app = appOf(data); const feature = (data && data.feature) || "aiFeedback";   // a switch from tiers.js FEATURES
  const plan = await planOf(db, app, uid, now);
  const tiers = await tiersConfig(db, app);
  need((tiers[plan.tier] || {})[feature] === true, "permission-denied", "Your plan doesn't include this feature.");
  const missing = await consentMissing(db, app, uid, feature);
  need(!missing, "failed-precondition", missing === "terms" ? "Accept the Terms and Privacy Notice first." : "This is off in your privacy choices (" + missing + ").");
  need(await walletBalance(db, plan.wallet) > 0, "resource-exhausted", "Companion Energy is empty.");
  const req = (data && data.request) || {};
  need(Array.isArray(req.messages) && req.messages.length, "invalid-argument", "No messages.");
  const body = { model: MODEL, max_tokens: Math.min(parseInt(req.max_tokens) || 1000, 4000), messages: req.messages, system: withRule(req.system) };
  const result = await callClaude(body);
  const cost = costPence(result && result.usage);
  await move(db, plan.wallet, -cost * ENERGY_PER_AI_PENNY, "debit", "ai:" + feature, null, now);   // Energy = AI cost × 2
  await db.ref(P.usage(app, uid, day(now))).transaction((u) => {
    const x = u || { n: 0, in: 0, out: 0, costPence: 0 }; const us = result.usage || {};
    return { n: x.n + 1, in: x.in + (us.input_tokens || 0), out: x.out + (us.output_tokens || 0), costPence: Math.round((x.costPence + cost) * 10000) / 10000 };
  });
  return result;
}

/* ---------- admin ---------- */
export async function setTier({ uid, data }, { db, now = Date.now() }) {
  need(await isAdmin(db, uid), "permission-denied", "Admins only.");
  const app = appOf(data); const tier = data && data.tier;
  need(TIER_ORDER.includes(tier) && data.uid, "invalid-argument", "tier and uid needed.");
  // admin grant (pilot testers, JC and Becks): no payment, no expiry, never billed, never changed by store notifications
  await db.ref(P.ent(app, data.uid)).set({ tier, since: now, source: "admin" });
  await db.ref(P.account(app, data.uid)).update({ tier, updated: now });
  return { ok: true };
}
/** Admin only: free Energy for testing, into the person's plan wallet (Platinum: the family pool). */
export async function adminTopUp({ uid, data }, { db, now = Date.now() }) {
  need(await isAdmin(db, uid), "permission-denied", "Admins only.");
  const energy = Number(data && data.energy); need(data && data.uid && energy > 0 && energy <= 10000, "invalid-argument", "uid and energy (1–10000) needed.");
  return creditPlan(db, appOf(data), data.uid, energy, "admin-top-up", null, now);
}
export async function adminAccounts({ uid, data }, { db }) {
  need(await isAdmin(db, uid), "permission-denied", "Admins only.");
  // Only the admin view: status, tier, balance. Never users/* (health data).
  return (await db.ref(`apps/${appOf(data)}/admin/accounts`).once("value")).val() || {};
}

/* ---------- payments (Stripe, test mode) ---------- */
export async function createCheckout({ uid, data }, { stripe, baseUrl, webEnabled = STRIPE_WEB_ENABLED() }) {
  need(uid, "unauthenticated", "Sign in first.");
  // v2.22.0 PAY1: Stripe is never used in the native apps (Google Play Billing there) and is off for the web unless enabled
  need(!(data && data.native), "failed-precondition", "In the app, plans and top-ups are bought through Google Play.");
  need(webEnabled, "failed-precondition", "Buying on the web isn't available.");
  const pack = PACKS[data && data.pack]; need(pack, "invalid-argument", "Unknown pack.");
  const app = appOf(data);
  const s = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency: "gbp", unit_amount: pack.pricePence, product_data: { name: pack.name } } }],
    metadata: { uid, appId: app, pack: data.pack },
    success_url: baseUrl + "?energy=success", cancel_url: baseUrl + "?energy=cancelled",
  });
  return { url: s.url, id: s.id };
}
export async function stripeWebhook(rawBody, signature, { stripe, secret, db, now = Date.now() }) {
  let ev;
  try { ev = stripe.webhooks.constructEvent(rawBody, signature, secret); } catch (e) { return { status: 400, body: "bad signature" }; }
  if (ev.type !== "checkout.session.completed") return { status: 200, body: "ignored" };
  const s = ev.data.object; const m = s.metadata || {}; const pack = PACKS[m.pack];
  if (!pack || !m.uid || s.payment_status !== "paid") return { status: 200, body: "not credited" };
  const r = await credit(db, appOf({ appId: m.appId }), m.uid, pack.creditPence * ENERGY_PER_AI_PENNY, "stripe:" + m.pack, "stripe_" + s.id.replace(/[^A-Za-z0-9_]/g, "_"), now);
  return { status: 200, body: r.duplicate ? "already credited" : "credited" };
}

/* ---------- households (ADR 0012): one owner; owner = administration only, NO data access ---------- */
const H = (app, hid) => `apps/${app}/households/${hid}`;
const M = (app, uid) => `apps/${app}/memberOf/${uid}`;
async function memberOf(db, app, uid) { return (await db.ref(M(app, uid)).once("value")).val(); }
async function household(db, app, hid) { return hid ? (await db.ref(H(app, hid)).once("value")).val() : null; }

export async function createHousehold({ uid, data }, { db, now = Date.now() }) {
  need(uid, "unauthenticated", "Sign in first.");
  const app = appOf(data);
  need((await planOf(db, app, uid, now)).tier === "platinum", "permission-denied", "Household sharing is part of Platinum Family.");
  need(!(await memberOf(db, app, uid)), "failed-precondition", "You're already in a household.");
  const hid = db.ref(`apps/${app}/households`).push().key;
  await db.ref().update({ [H(app, hid)]: { owner: uid, created: now, members: { [uid]: true } }, [M(app, uid)]: hid });
  return { hid };
}
export async function inviteMember({ uid, data }, { db, now = Date.now(), makeCode }) {
  const app = appOf(data); const hid = await memberOf(db, app, uid); const h = await household(db, app, hid);
  need(h && h.owner === uid, "permission-denied", "Only the household owner can invite.");
  const email = String((data && data.email) || "").trim().toLowerCase();
  need(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), "invalid-argument", "A valid email is needed.");
  const max = ((await tiersConfig(db, app)).platinum || {}).maxMembers || 5;      // owner + 4
  need(Object.keys(h.members || {}).length + Object.keys(h.invites || {}).length < max, "resource-exhausted", "A family plan has room for " + max + " people.");
  const code = (makeCode || (() => db.ref().push().key.replace(/[^A-Za-z0-9]/g, "")))();
  await db.ref(H(app, hid) + "/invites/" + code).set({ email, created: now });
  return { code };                      // the app turns this into an invite link
}
export async function acceptInvite({ uid, email, data }, { db, now = Date.now() }) {
  need(uid, "unauthenticated", "Sign in first.");
  const app = appOf(data); const code = String((data && data.code) || ""); const hid = String((data && data.hid) || "");
  const h = await household(db, app, hid);
  const inv = h && h.invites && h.invites[code];
  need(inv, "not-found", "This invite isn't valid any more.");
  need(inv.email === String(email || "").toLowerCase(), "permission-denied", "Sign in with the email the invite was sent to.");
  need(!(await memberOf(db, app, uid)), "failed-precondition", "You're already in a household.");
  need(now - (inv.created || 0) < 14 * 86400000, "deadline-exceeded", "This invite has expired.");
  need(Object.keys(h.members || {}).length < (((await tiersConfig(db, app)).platinum || {}).maxMembers || 5), "resource-exhausted", "This family plan is full.");
  await db.ref().update({ [H(app, hid) + "/members/" + uid]: true, [H(app, hid) + "/invites/" + code]: null, [M(app, uid)]: hid });
  return { hid };
}
export async function removeMember({ uid, data }, { db }) {
  const app = appOf(data); const hid = await memberOf(db, app, uid); const h = await household(db, app, hid);
  need(h && h.owner === uid, "permission-denied", "Only the household owner can remove members.");
  const who = data && data.uid; need(who && who !== uid && h.members && h.members[who], "invalid-argument", "Not a member.");
  await db.ref().update({ [H(app, hid) + "/members/" + who]: null, [M(app, who)]: null });
  return { ok: true };
}
export async function leaveHousehold({ uid, data }, { db }) {
  const app = appOf(data); const hid = await memberOf(db, app, uid); const h = await household(db, app, hid);
  need(h, "failed-precondition", "Not in a household.");
  need(h.owner !== uid || Object.keys(h.members || {}).length === 1, "failed-precondition", "Remove the other members first (or hand over ownership).");
  await db.ref().update(h.owner === uid ? { [H(app, hid)]: null, [M(app, uid)]: null } : { [H(app, hid) + "/members/" + uid]: null, [M(app, uid)]: null });
  return { ok: true };
}

/* ---------- v2.25.0: pilot test users (admin) ----------
   The admin invites a test user by email with a plan (default Gold). The user opens the link, signs in with that email
   and gets an admin grant (source "admin", pilot, never billed). Their data lives only in apps/{app}/users/{uid}. */
const PI = (app, code) => `apps/${app}/pilotInvites/${code}`;
export async function createPilotInvite({ uid, data }, { db, now = Date.now(), makeCode }) {
  need(await isAdmin(db, uid) || LOCKED_UIDS.indexOf(uid) >= 0, "permission-denied", "Admins only.");
  const app = appOf(data);
  const email = String((data && data.email) || "").trim().toLowerCase();
  need(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), "invalid-argument", "A valid email is needed.");
  const tier = (data && data.tier) || "gold";
  need(TIER_ORDER.includes(tier), "invalid-argument", "Unknown plan.");
  const code = (makeCode || (() => db.ref().push().key.replace(/[^A-Za-z0-9]/g, "")))();
  await db.ref(PI(app, code)).set({ email, tier, created: now, by: uid.slice(0, 6) });
  return { code };
}
export async function acceptPilotInvite({ uid, email, data }, { db, now = Date.now() }) {
  need(uid, "unauthenticated", "Sign in first.");
  const app = appOf(data); const code = String((data && data.code) || "");
  const inv = code ? (await db.ref(PI(app, code)).once("value")).val() : null;
  need(inv, "not-found", "This invite isn't valid any more.");
  need(inv.email === String(email || "").toLowerCase(), "permission-denied", "Sign in with the email the invite was sent to.");
  need(now - (inv.created || 0) < 14 * 86400000, "deadline-exceeded", "This invite has expired.");
  await db.ref().update({
    [P.ent(app, uid)]: { tier: inv.tier, since: now, source: "admin", pilot: true },
    [P.account(app, uid) + "/tier"]: inv.tier, [P.account(app, uid) + "/updated"]: now,
    [PI(app, code)]: null,
  });
  return { tier: inv.tier };
}

/* ---------- v2.26.0: the monthly allowance for admin-granted plans (pilot testers, JC and Becks) ----------
   Play subscriptions get theirs on each renewal (playNotify). Admin grants have no renewals, so a daily job credits
   them once per calendar month: Silver 300 / Gold 500 / Platinum 1,500 (into the family pool; members get nothing
   separately). Idempotent: one ledger entry per month (key admin_YYYY-MM). */
export async function grantMonthly(db, app = DEFAULT_APP, now = Date.now()) {
  const ents = (await db.ref(`apps/${app}/entitlements`).once("value")).val() || {};
  const tiers = await tiersConfig(db, app); const month = new Date(now).toISOString().slice(0, 7);
  let credited = 0;
  for (const [uid, e] of Object.entries(ents)) {
    if (!e || e.source !== "admin" || !e.tier) continue;
    const plan = await planOf(db, app, uid, now);
    if (plan.role === "member") continue;
    const energy = (tiers[plan.tier] || {}).energy || 0; if (!energy) continue;
    const r = await move(db, plan.wallet, +energy, "allowance", "allowance:" + plan.tier, "admin_" + month, now);   // resets the monthly pot
    if (!r.duplicate) credited++;
  }
  return { credited, month };
}

/* ---------- v2.26.0 (Step 2): self-service export — everything held about the signed-in person ----------
   Their own store and profile, privacy, consent (+ history), plan, Energy, ledger and usage. No one else's data. */
export async function exportMyData({ uid, data }, { db, now = Date.now() }) {
  need(uid, "unauthenticated", "Sign in first.");
  const app = appOf(data); const A = `apps/${app}`;
  const read = async (p) => (await db.ref(p).once("value")).val();
  const out = { exportedAt: new Date(now).toISOString(), app, account: uid,
    store: await read(`${A}/users/${uid}/store`), profile: await read(`${A}/users/${uid}/profile`), privacy: await read(`${A}/users/${uid}/privacy`),
    consent: await read(`${A}/users/${uid}/consent`), plan: await read(P.ent(app, uid)), energy: await read(P.energy(app, uid)),
    ledger: await read(P.ledger(app, uid)), usage: await read(`${A}/usage/${uid}`), household: await read(`${A}/memberOf/${uid}`) };
  await db.ref(`${A}/audit/${now}_${uid.slice(0, 6)}`).set({ at: new Date(now).toISOString(), action: "export-my-data" });
  return out;
}
