// Companion platform Cloud Functions (ADR 0011). EMULATOR ONLY until JC's go-live setup (HANDOVER Step 4).
// Never `firebase deploy` from a Coder session.
import { onCall, onRequest, HttpsError as FnError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { playApi, playVerify as playVerifyCore, playNotify as playNotifyCore } from "./src/play.js";
import { appleApi, appleVerify as appleVerifyCore, appleNotify as appleNotifyCore } from "./src/apple.js";
import { retention } from "./src/retention.js";
import { defineSecret } from "firebase-functions/params";
import admin from "firebase-admin";
import { REGION } from "./src/config.js";
import { pickBackend } from "./src/backends.js";
import { createReviewDemo as createReviewDemoImpl } from "./src/demo.js";
import * as core from "./src/core.js";

admin.initializeApp();
const db = () => admin.database();
const ANTHROPIC_KEY = defineSecret("ANTHROPIC_API_KEY");     // only for AI_BACKEND=direct
// v2.26.0: App Check (Play Integrity / reCAPTCHA) is verified on every callable; ENFORCE_APP_CHECK=true makes it
// mandatory (off until JC has registered the apps in Firebase App Check — GO_LIVE_CHECKLIST C).
const base = { region: REGION };   // non-callable functions (Pub/Sub, schedules, the webhook)
const opts = { ...base, enforceAppCheck: process.env.ENFORCE_APP_CHECK === "true" };

const wrap = (fn) => async (req) => {
  try { return await fn({ uid: req.auth && req.auth.uid, email: req.auth && req.auth.token && req.auth.token.email, data: req.data }); }
  catch (e) { if (e instanceof core.HttpsError) throw new FnError(e.code, e.message); throw new FnError("internal", "Something went wrong."); }
};
export const aiProxy = onCall({ ...opts, secrets: [ANTHROPIC_KEY] }, wrap((c) => core.aiProxy(c, { db: db(), callClaude: pickBackend({ anthropicKey: process.env.ANTHROPIC_API_KEY }) })));
export const exportMyData = onCall(opts, wrap((c) => core.exportMyData(c, { db: db() })));   // v2.26.0 Step 2
export const createHousehold = onCall(opts, wrap((c) => core.createHousehold(c, { db: db() })));
// v2.31.2: the store-review demo account (admin only; synthetic data, Gold, no household; never the joint account)
export const createReviewDemo = onCall(opts, wrap((c) => createReviewDemoImpl(c, { db: db(), auth: admin.auth() })));
// v2.21.1: account deletion — refuses the rules-locked UID and platform admins before changing anything
export const deleteAccount = onCall(opts, wrap((c) => core.deleteAccount(c, { db: db(), deleteUser: (uid) => admin.auth().deleteUser(uid) })));
export const signOutEverywhere = onCall(opts, wrap((c) => core.signOutEverywhere(c, { db: db(), revoke: (uid) => admin.auth().revokeRefreshTokens(uid) })));   // v2.33.0
export const inviteMember = onCall(opts, wrap((c) => core.inviteMember(c, { db: db() })));
export const acceptInvite = onCall(opts, wrap((c) => core.acceptInvite(c, { db: db() })));
export const removeMember = onCall(opts, wrap((c) => core.removeMember(c, { db: db() })));
export const leaveHousehold = onCall(opts, wrap((c) => core.leaveHousehold(c, { db: db() })));
export const setTier = onCall(opts, wrap((c) => core.setTier(c, { db: db() })));
export const createPilotInvite = onCall(opts, wrap((c) => core.createPilotInvite(c, { db: db() })));   // v2.25.0 admin: a pilot test user
export const acceptPilotInvite = onCall(opts, wrap((c) => core.acceptPilotInvite(c, { db: db() })));
export const adminTopUp = onCall(opts, wrap((c) => core.adminTopUp(c, { db: db() })));   // admin: free Energy for testing
export const adminAccounts = onCall(opts, wrap((c) => core.adminAccounts(c, { db: db() })));
// v2.26.0: the Stripe web route is OFF and not deployed (it would need Stripe secrets). To bring it back, export the two
// functions from ./index.stripe.js here and set STRIPE_WEB_ENABLED=true (never for the native apps).

// v2.22.0 PAY1: Google Play Billing, verified on the server (Play Developer API with the default service account, which
// JC links in Play Console → API access, J22). The app sends only the purchase token.
const play = playApi();
export const playVerify = onCall(opts, wrap((c) => playVerifyCore(c, { db: db(), play })));
// Real-time developer notifications: Play → Pub/Sub topic "play-rtdn" (J22) → renewals, cancellations, expiry.
export const playNotify = onMessagePublished({ ...base, topic: "play-rtdn" }, async (ev) => {
  const r = await playNotifyCore(ev.data.message, { db: db(), play });
  console.log("playNotify: " + r);   // outcome only, no tokens
});

// v2.29.0 PAY1 (iPhone): StoreKit 2, verified on the server with the App Store Server API (key ID + issuer from the
// environment's variables; the private key from Secret Manager — APPLE_IAP_PRIVATE_KEY, J15). The app sends only the
// transaction ID. App Store Server Notifications v2 → appleNotify (the URL is entered in App Store Connect, J15).
const APPLE_KEY = defineSecret("APPLE_IAP_PRIVATE_KEY");
export const appleVerify = onCall({ ...opts, secrets: [APPLE_KEY] }, wrap((c) => appleVerifyCore(c, { db: db(), apple: appleApi() })));
export const appleNotify = onRequest({ ...base }, async (req, res) => {
  const r = await appleNotifyCore(req.body, { db: db() });
  console.log("appleNotify: " + r);   // outcome only
  res.status(r === "bad signature" ? 400 : 200).send(r);
});

// v2.26.0: the monthly Energy allowance for admin-granted plans (daily; credits once per month).
export const grantMonthly = onSchedule({ ...base, schedule: "20 3 * * *", timeZone: "Europe/London" }, async () => {
  const r = await core.grantMonthly(db(), "lifecare");
  console.log("grantMonthly: " + JSON.stringify(r));   // counts only
});

// v2.16.7 P10: daily retention clean-up (Europe/London 03:10). Emulator-tested only; never deployed by the Coder.
export const retentionDaily = onSchedule({ ...base, schedule: "10 3 * * *", timeZone: "Europe/London" }, async () => {
  const r = await retention(db(), "lifecare");
  console.log("retention: " + JSON.stringify(r));   // counts only
});
