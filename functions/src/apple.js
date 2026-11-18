// v2.29.0 (PAY1, iPhone): StoreKit 2 purchases verified on the SERVER, exactly like Google Play (play.js).
// The app sends only the transaction ID. We fetch the transaction from Apple's App Store Server API, check Apple's
// signature (the JWS certificate chain up to Apple Root CA – G3), the bundle, the product and that the purchase was made
// by this account (appAccountToken), then set the plan or credit Energy. App Store Server Notifications v2 keep plans
// current (renewals credit the allowance; expiry / refund → Bronze, data kept). Idempotent by Apple's transaction ID;
// the ledger holds amount, time and a reference only. Emulator-tested with a test certificate chain; never deployed by the Coder.
import { createHash, createSign, createPrivateKey, verify as cverify, X509Certificate } from "node:crypto";
import { DEFAULT_APP, P, STORE_PRODUCTS, TOP_UP } from "./config.js";
import { HttpsError, creditPlan, move, planOf, tiersConfig } from "./core.js";

export const BUNDLE_ID = "com.companionappsstudio.lifecare";
// SHA-256 fingerprint of Apple Root CA – G3 (https://www.apple.com/certificateauthority/). Tests pass their own root.
export const APPLE_ROOT_G3_SHA256 = "63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79";
const need = (c, code, msg) => { if (!c) throw new HttpsError(code, msg); };
const appOf = (data) => (data && /^[a-z0-9-]{2,20}$/.test(data.appId || "") ? data.appId : DEFAULT_APP);
const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const key = (id) => "apple_" + String(id || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100);
// App Store product IDs: one per plan AND period (Apple has no "base plans"): silver.monthly, silver.yearly, gold.…,
// platinum.…; the top-up is energy_5 as on Google Play.
const TIER_OF = new Proxy({}, { get: (_, id) => { const [t, per] = String(id).split("."); return STORE_PRODUCTS[t] && (per === "monthly" || per === "yearly") ? t : undefined; } });
export const appleProductId = (tier, period) => tier + "." + (period === "yearly" ? "yearly" : "monthly");

/** The appAccountToken the app passes to StoreKit: a UUID made from the account (never the account id itself). */
export function appleTag(uid) {
  const h = sha("lifecare:" + uid);
  const v = h.slice(0, 12) + "5" + h.slice(13, 16) + ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 32);   // UUID v5-style bits
  return (v.slice(0, 8) + "-" + v.slice(8, 12) + "-" + v.slice(12, 16) + "-" + v.slice(16, 20) + "-" + v.slice(20, 32)).toLowerCase();
}

const b64u = (b) => Buffer.from(b).toString("base64url");
/** Verify an Apple-signed JWS (x5c chain → pinned root) and return its payload. */
export function verifyJWS(jws, opts = {}) {
  const now = opts.now || Date.now();
  const parts = String(jws || "").split(".");
  need(parts.length === 3, "failed-precondition", "Apple's answer isn't signed.");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  need(header.alg === "ES256" && Array.isArray(header.x5c) && header.x5c.length >= 3, "failed-precondition", "Apple's answer isn't signed.");
  const certs = header.x5c.map((c) => new X509Certificate(Buffer.from(c, "base64")));
  const [leaf, inter, root] = certs;
  const pin = (opts.rootFingerprint || process.env.APPLE_ROOT_SHA256 || APPLE_ROOT_G3_SHA256).toUpperCase();
  need(root.fingerprint256.toUpperCase() === pin, "permission-denied", "Not signed by Apple.");
  need(root.verify(root.publicKey) && inter.verify(root.publicKey) && leaf.verify(inter.publicKey), "permission-denied", "Not signed by Apple.");
  for (const c of certs) need(Date.parse(c.validFrom) <= now && now <= Date.parse(c.validTo), "permission-denied", "Apple's certificate has expired.");
  const ok = cverify("sha256", Buffer.from(parts[0] + "." + parts[1]), { key: leaf.publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(parts[2], "base64url"));
  need(ok, "permission-denied", "Not signed by Apple.");
  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
}

async function bind(db, app, uid, originalId) {
  const ref = db.ref(P.purchases(app, "apple_" + sha(originalId)));
  const r = await ref.transaction((cur) => (cur && cur.uid !== uid ? undefined : { uid }));
  need(r.committed, "permission-denied", "This purchase belongs to another account.");
}

/** Apply a verified subscription transaction (or its renewal) to the person's plan. */
async function applyTx(db, app, uid, tx, now) {
  const tier = TIER_OF[tx.productId]; need(tier, "invalid-argument", "Unknown subscription.");
  const ent = (await db.ref(P.ent(app, uid)).once("value")).val();
  if (ent && ent.source === "admin") return { tier: ent.tier, note: "admin grant kept" };   // never touched by the store
  const expires = Number(tx.expiresDate) || now;
  const active = !tx.revocationDate && expires > now;
  const basePlan = /\.yearly$/.test(tx.productId) ? "yearly" : "monthly";
  await db.ref(P.ent(app, uid)).set({ tier, source: "apple", since: (ent && ent.since) || now, expires: active ? expires : Math.min(expires, now), basePlan, autoRenew: active });
  await db.ref(P.account(app, uid)).update({ tier: active ? tier : "bronze", updated: now });
  let credited = false;
  if (active) {
    const allowance = ((await tiersConfig(db, app))[tier] || {}).energy || 0;
    if (allowance > 0) credited = !(await creditPlan(db, app, uid, allowance, "apple:" + tier, key(tx.transactionId), now, "allowance")).duplicate;   // monthly pot reset
  }
  return { tier: active ? tier : "bronze", expires, credited };
}

/** Callable: { kind: "subscription" | "topup", productId, transactionId } after a StoreKit 2 purchase. */
export async function appleVerify({ uid, data }, { db, apple, now = Date.now(), rootFingerprint }) {
  need(uid, "unauthenticated", "Sign in first.");
  const app = appOf(data); const id = String((data && data.transactionId) || ""); const productId = String((data && data.productId) || "");
  need(/^\d{1,30}$/.test(id) && productId, "invalid-argument", "A transaction and product are needed.");
  const tx = verifyJWS(await apple.getTransaction(id), { now, rootFingerprint });   // Apple's record, not the app's word
  need(tx.bundleId === BUNDLE_ID, "failed-precondition", "This purchase isn't for Lifecare Companion.");
  need(tx.productId === productId, "failed-precondition", "This purchase doesn't match.");
  need(String(tx.appAccountToken || "").toLowerCase() === appleTag(uid), "permission-denied", "This purchase belongs to another account.");
  need(!tx.revocationDate, "failed-precondition", "This purchase was refunded.");
  await bind(db, app, uid, tx.originalTransactionId || tx.transactionId);
  if (data.kind === "topup") {
    need(productId === TOP_UP.productId, "invalid-argument", "Unknown product.");
    const plan = await planOf(db, app, uid, now);
    need(((await tiersConfig(db, app))[plan.tier] || {}).buyEnergy === true, "permission-denied", "Top-ups are part of Silver and up.");
    const r = await move(db, plan.wallet, +TOP_UP.energy, "credit", "apple:" + TOP_UP.productId, key(tx.transactionId), now);
    return { ok: true, credited: !r.duplicate, pool: plan.role !== "solo" };
  }
  need(TIER_OF[productId], "invalid-argument", "Unknown product.");
  return Object.assign({ ok: true }, await applyTx(db, app, uid, tx, now));
}

/** App Store Server Notifications v2 (HTTPS POST { signedPayload }). Never trusts the body: it checks Apple's signature. */
export async function appleNotify(body, { db, now = Date.now(), rootFingerprint, app = DEFAULT_APP }) {
  let n;
  try { n = verifyJWS(body && body.signedPayload, { now, rootFingerprint }); } catch (e) { return "bad signature"; }
  if (n.notificationType === "TEST") return "test";
  const d = n.data || {};
  if (d.bundleId !== BUNDLE_ID || !d.signedTransactionInfo) return "ignored";
  const tx = verifyJWS(d.signedTransactionInfo, { now, rootFingerprint });
  const owner = (await db.ref(P.purchases(app, "apple_" + sha(tx.originalTransactionId || tx.transactionId))).once("value")).val();
  if (!owner || !owner.uid) return "unknown purchase";                         // verified by the app first (appleVerify)
  if (!TIER_OF[tx.productId]) return "ignored";
  if (["EXPIRED", "REVOKE", "REFUND", "GRACE_PERIOD_EXPIRED"].includes(n.notificationType)) tx.revocationDate = tx.revocationDate || now;
  const r = await applyTx(db, app, owner.uid, tx, now);
  return "applied:" + r.tier + (r.credited ? ":credited" : "");
}

/* ---------- the real App Store Server API client (secrets from the environment, never the repo) ---------- */
export function appleApi({ fetchImpl = fetch, keyId = process.env.APPLE_IAP_KEY_ID, issuerId = process.env.APPLE_IAP_ISSUER_ID, privateKey = process.env.APPLE_IAP_PRIVATE_KEY, bundleId = BUNDLE_ID } = {}) {
  const jwt = () => {
    const h = b64u(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
    const t = Math.floor(Date.now() / 1000);
    const p = b64u(JSON.stringify({ iss: issuerId, iat: t, exp: t + 1200, aud: "appstoreconnect-v1", bid: bundleId }));
    const sig = createSign("sha256").update(h + "." + p).sign({ key: createPrivateKey(privateKey), dsaEncoding: "ieee-p1363" });
    return h + "." + p + "." + b64u(sig);
  };
  const get = async (host, id) => fetchImpl(`https://${host}/inApps/v1/transactions/${encodeURIComponent(id)}`, { headers: { Authorization: "Bearer " + jwt() } });
  return {
    // Production first; a sandbox (TestFlight) purchase answers 404 there, so the sandbox is asked next (Apple's advice).
    getTransaction: async (id) => {
      let r = await get("api.storekit.itunes.apple.com", id);
      if (r.status === 404) r = await get("api.storekit-sandbox.itunes.apple.com", id);
      if (!r.ok) throw new HttpsError("failed-precondition", "Apple couldn't confirm this purchase.");
      return (await r.json()).signedTransactionInfo;
    },
  };
}
