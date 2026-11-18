// v2.22.0 PAY1 (ADR 0017): Google Play Billing, verified on the SERVER. The app only starts a purchase and sends the
// purchase token here; we ask Google (Play Developer API) what was really bought, then set the plan or credit Energy.
// Nothing is credited from the client. Every credit is keyed by Google's order ID, so a replayed token or notification
// changes nothing (idempotent). The ledger holds amount, time and a reference only — no content.
// Emulator-tested with a fake `play` client; never deployed by the Coder.
import { createHash } from "node:crypto";
import { DEFAULT_APP, P, PLAY_PACKAGE, STORE_PRODUCTS, TOP_UP } from "./config.js";
import { HttpsError, creditPlan, move, planOf, tiersConfig } from "./core.js";

const need = (cond, code, msg) => { if (!cond) throw new HttpsError(code, msg); };
const appOf = (data) => (data && /^[a-z0-9-]{2,20}$/.test(data.appId || "") ? data.appId : DEFAULT_APP);
const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const key = (orderId) => "play_" + String(orderId || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100);
/** What the app passes to Play as obfuscatedAccountId: ties a purchase to the signed-in person without sending the uid. */
export const accountTag = (uid) => sha("lifecare:" + uid).slice(0, 64);
const ACTIVE = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"];
const TIER_OF = Object.fromEntries(Object.entries(STORE_PRODUCTS).map(([t, id]) => [id, t]));

/* The token belongs to one person: the first verification binds it; anyone else is refused. */
async function bindToken(db, app, uid, token) {
  const ref = db.ref(P.purchases(app, sha(token)));
  const r = await ref.transaction((cur) => (cur && cur.uid !== uid ? undefined : { uid }));
  need(r.committed, "permission-denied", "This purchase belongs to another account.");
}

/** Apply a verified subscription (Play subscriptionsv2 resource) to the person's entitlement. */
async function applySubscription(db, app, uid, sub, now) {
  const item = (sub.lineItems || [])[0] || {};
  const tier = TIER_OF[item.productId];
  need(tier, "invalid-argument", "Unknown subscription.");
  const ent = (await db.ref(P.ent(app, uid)).once("value")).val();
  if (ent && ent.source === "admin") return { tier: ent.tier, note: "admin grant kept" };          // never touched by the store
  const expires = Date.parse(item.expiryTime || "") || now;
  const active = ACTIVE.includes(sub.subscriptionState) && expires > now;
  const basePlan = (item.offerDetails && item.offerDetails.basePlanId) || "";
  // a cancelled plan runs to the end of the paid period; expired / revoked → Bronze from `expires` (data kept)
  await db.ref(P.ent(app, uid)).set({ tier, source: "play", since: (ent && ent.since) || now, expires: active ? expires : Math.min(expires, now),
    basePlan, autoRenew: sub.subscriptionState === "SUBSCRIPTION_STATE_ACTIVE" && !(sub.canceledStateContext), state: String(sub.subscriptionState || "") });
  await db.ref(P.account(app, uid)).update({ tier: active ? tier : "bronze", updated: now });
  let credited = null;
  if (active && sub.latestOrderId) {
    const allowance = ((await tiersConfig(db, app))[tier] || {}).energy || 0;   // Energy units
    // one allowance per paid period: each renewal has its own order ID
    if (allowance > 0) credited = await creditPlan(db, app, uid, allowance, "play:" + tier + ":" + basePlan, key(sub.latestOrderId), now, "allowance");   // monthly pot reset (no rollover)
  }
  return { tier: active ? tier : "bronze", expires, credited: credited ? !credited.duplicate : false };
}

/** Callable: the app sends { kind: "subscription" | "topup", productId, purchaseToken } after a purchase. */
export async function playVerify({ uid, data }, { db, play, now = Date.now() }) {
  need(uid, "unauthenticated", "Sign in first.");
  const app = appOf(data); const token = String((data && data.purchaseToken) || ""); const productId = String((data && data.productId) || "");
  need(token.length > 10 && productId, "invalid-argument", "A purchase token and product are needed.");
  if (data.kind === "topup") {
    need(productId === TOP_UP.productId, "invalid-argument", "Unknown product.");
    const plan = await planOf(db, app, uid, now);
    need(((await tiersConfig(db, app))[plan.tier] || {}).buyEnergy === true, "permission-denied", "Top-ups are part of Silver and up.");
    const pur = await play.getProduct(productId, token);                        // Google's record, not the app's word
    need(pur && pur.purchaseState === 0, "failed-precondition", "This purchase isn't complete.");
    need(pur.obfuscatedExternalAccountId === accountTag(uid), "permission-denied", "This purchase belongs to another account.");
    await bindToken(db, app, uid, token);
    const r = await move(db, plan.wallet, +TOP_UP.energy, "credit", "play:" + TOP_UP.productId, key(pur.orderId), now);
    if (pur.consumptionState !== 1) await play.consume(productId, token);       // so it can be bought again
    return { ok: true, credited: !r.duplicate, pool: plan.role !== "solo" };
  }
  need(TIER_OF[productId], "invalid-argument", "Unknown product.");
  const sub = await play.getSubscription(token);
  need(sub && (sub.lineItems || [])[0] && sub.lineItems[0].productId === productId, "failed-precondition", "This purchase doesn't match.");
  need((sub.externalAccountIdentifiers || {}).obfuscatedExternalAccountId === accountTag(uid), "permission-denied", "This purchase belongs to another account.");
  await bindToken(db, app, uid, token);
  const r = await applySubscription(db, app, uid, sub, now);
  if (sub.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") await play.acknowledge(productId, token);   // else Google refunds after 3 days
  return { ok: true, ...r };
}

/** Real-time developer notifications (Pub/Sub push from Play). Never trusts the message: re-reads the purchase from Google. */
export async function playNotify(message, { db, play, now = Date.now(), app = DEFAULT_APP }) {
  let n;
  try { n = JSON.parse(Buffer.from((message && message.data) || "", "base64").toString("utf8")); } catch (e) { return "bad message"; }
  if (!n || n.packageName !== PLAY_PACKAGE) return "ignored";
  if (n.testNotification) return "test";
  const s = n.subscriptionNotification;
  if (!s || !s.purchaseToken) return "ignored";
  const owner = (await db.ref(P.purchases(app, sha(s.purchaseToken))).once("value")).val();
  if (!owner || !owner.uid) return "unknown token";                               // verified by the app first (playVerify)
  const sub = await play.getSubscription(s.purchaseToken);
  const r = await applySubscription(db, app, owner.uid, sub, now);
  return "applied:" + r.tier + (r.credited ? ":credited" : "");
}

/* ---------- the real Play Developer API client (Cloud Functions; default service account) ---------- */
export function playApi({ fetchImpl = fetch, pkg = PLAY_PACKAGE, root = "https://androidpublisher.googleapis.com" } = {}) {
  let cached = null;
  const token = async () => {
    if (cached && cached.exp > Date.now()) return cached.t;
    const r = await fetchImpl("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=https://www.googleapis.com/auth/androidpublisher", { headers: { "Metadata-Flavor": "Google" } });
    const j = await r.json(); cached = { t: j.access_token, exp: Date.now() + ((j.expires_in || 300) - 60) * 1000 }; return cached.t;
  };
  const call = async (method, path) => {
    const r = await fetchImpl(root + "/androidpublisher/v3/applications/" + pkg + path, { method, headers: { Authorization: "Bearer " + await token() } });
    if (!r.ok) throw new HttpsError("failed-precondition", "Google Play couldn't confirm this purchase.");
    const t = await r.text(); return t ? JSON.parse(t) : {};
  };
  const tok = (t) => encodeURIComponent(t);
  return {
    getSubscription: (t) => call("GET", "/purchases/subscriptionsv2/tokens/" + tok(t)),
    acknowledge: (sub, t) => call("POST", "/purchases/subscriptions/" + sub + "/tokens/" + tok(t) + ":acknowledge"),
    getProduct: (id, t) => call("GET", "/purchases/products/" + id + "/tokens/" + tok(t)),
    consume: (id, t) => call("POST", "/purchases/products/" + id + "/tokens/" + tok(t) + ":consume"),
  };
}
