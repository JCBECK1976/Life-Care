// Platform handlers as plain functions (deps injected), so they run in Cloud Functions and in emulator tests alike.
import { DEFAULT_APP, DEFAULT_TIERS, MEDICATION_RULE, MODEL, P, PACKS, costPence } from "./config.js";

export class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const need = (cond, code, msg) => { if (!cond) throw new HttpsError(code, msg); };
const appOf = (data) => (data && /^[a-z0-9-]{2,20}$/.test(data.appId || "") ? data.appId : DEFAULT_APP);
const day = (now) => new Date(now).toISOString().slice(0, 10);

export async function isAdmin(db, uid) { return !!uid && (await db.ref(P.admin(uid)).once("value")).val() === true; }

export async function tierOf(db, app, uid) {
  const e = (await db.ref(P.ent(app, uid)).once("value")).val();
  return (e && e.tier) || "bronze";
}
export async function featureAllowed(db, app, uid, feature) {
  const tiers = (await db.ref(P.tiers(app)).once("value")).val() || DEFAULT_TIERS;
  const t = tiers[await tierOf(db, app, uid)] || {};
  return t[feature] === true;
}

/* ---------- energy ledger (server only; pence of AI cost; no content) ---------- */
export async function balance(db, app, uid) { return ((await db.ref(P.energy(app, uid)).once("value")).val() || {}).balancePence || 0; }
async function move(db, app, uid, delta, kind, ref, key, now) {
  const entryRef = key ? db.ref(P.ledger(app, uid) + "/" + key) : db.ref(P.ledger(app, uid)).push();
  if (key && (await entryRef.once("value")).exists()) return { duplicate: true, balancePence: await balance(db, app, uid) };
  const r = await db.ref(P.energy(app, uid)).transaction((cur) => {
    const c = cur || { balancePence: 0 };
    return { balancePence: Math.round(((c.balancePence || 0) + delta) * 10000) / 10000, updated: now };
  });
  await entryRef.set({ at: now, kind, pence: Math.abs(delta), ref: String(ref || "").slice(0, 80) });
  const bal = r.snapshot.val().balancePence;
  await db.ref(P.account(app, uid)).update({ balancePence: bal, updated: now });
  return { duplicate: false, balancePence: bal };
}
export const credit = (db, app, uid, pence, ref, key, now = Date.now()) => move(db, app, uid, +pence, "credit", ref, key, now);
export const debit = (db, app, uid, pence, ref, now = Date.now()) => move(db, app, uid, -pence, "debit", ref, null, now);

/* ---------- aiProxy ---------- */
export function withRule(system) {
  if (Array.isArray(system)) return [{ type: "text", text: MEDICATION_RULE }].concat(system);
  return MEDICATION_RULE + (system ? "\n\n" + system : "");
}
export async function aiProxy({ uid, data }, { db, callClaude, now = Date.now() }) {
  need(uid, "unauthenticated", "Sign in first.");
  const app = appOf(data); const feature = (data && data.feature) || "aiFeedback";   // help | aiFeedback | snap | mealGenerator | bodyBalance | aiPlans
  need(await featureAllowed(db, app, uid, feature), "permission-denied", "Your plan doesn't include this feature.");
  need(await balance(db, app, uid) > 0, "resource-exhausted", "Companion Energy is empty.");
  const req = (data && data.request) || {};
  need(Array.isArray(req.messages) && req.messages.length, "invalid-argument", "No messages.");
  const body = { model: MODEL, max_tokens: Math.min(parseInt(req.max_tokens) || 1000, 4000), messages: req.messages, system: withRule(req.system) };
  const result = await callClaude(body);
  const cost = costPence(result && result.usage);
  await debit(db, app, uid, cost, "ai:" + feature, now);
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
  need(["bronze", "silver", "gold"].includes(tier) && data.uid, "invalid-argument", "tier and uid needed.");
  await db.ref(P.ent(app, data.uid)).set({ tier, since: now, source: "admin" });
  await db.ref(P.account(app, data.uid)).update({ tier, updated: now });
  return { ok: true };
}
export async function adminAccounts({ uid, data }, { db }) {
  need(await isAdmin(db, uid), "permission-denied", "Admins only.");
  // Only the admin view: status, tier, balance. Never users/* (health data).
  return (await db.ref(`apps/${appOf(data)}/admin/accounts`).once("value")).val() || {};
}

/* ---------- payments (Stripe, test mode) ---------- */
export async function createCheckout({ uid, data }, { stripe, baseUrl }) {
  need(uid, "unauthenticated", "Sign in first.");
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
  const r = await credit(db, appOf({ appId: m.appId }), m.uid, pack.creditPence, "stripe:" + m.pack, "stripe_" + s.id.replace(/[^A-Za-z0-9_]/g, "_"), now);
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
