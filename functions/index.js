// Companion platform Cloud Functions (ADR 0011). EMULATOR ONLY until JC's go-live setup (HANDOVER Step 4).
// Never `firebase deploy` from a Coder session.
import { onCall, onRequest, HttpsError as FnError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import admin from "firebase-admin";
import Stripe from "stripe";
import { REGION } from "./src/config.js";
import { pickBackend } from "./src/backends.js";
import * as core from "./src/core.js";

admin.initializeApp();
const db = () => admin.database();
const ANTHROPIC_KEY = defineSecret("ANTHROPIC_API_KEY");     // only for AI_BACKEND=direct
const STRIPE_KEY = defineSecret("STRIPE_SECRET_KEY");        // test-mode key (sk_test_…)
const STRIPE_WHSEC = defineSecret("STRIPE_WEBHOOK_SECRET");
const opts = { region: REGION };

const wrap = (fn) => async (req) => {
  try { return await fn({ uid: req.auth && req.auth.uid, email: req.auth && req.auth.token && req.auth.token.email, data: req.data }); }
  catch (e) { if (e instanceof core.HttpsError) throw new FnError(e.code, e.message); throw new FnError("internal", "Something went wrong."); }
};
export const aiProxy = onCall({ ...opts, secrets: [ANTHROPIC_KEY] }, wrap((c) => core.aiProxy(c, { db: db(), callClaude: pickBackend({ anthropicKey: process.env.ANTHROPIC_API_KEY }) })));
export const createHousehold = onCall(opts, wrap((c) => core.createHousehold(c, { db: db() })));
export const inviteMember = onCall(opts, wrap((c) => core.inviteMember(c, { db: db() })));
export const acceptInvite = onCall(opts, wrap((c) => core.acceptInvite(c, { db: db() })));
export const removeMember = onCall(opts, wrap((c) => core.removeMember(c, { db: db() })));
export const leaveHousehold = onCall(opts, wrap((c) => core.leaveHousehold(c, { db: db() })));
export const setTier = onCall(opts, wrap((c) => core.setTier(c, { db: db() })));
export const adminAccounts = onCall(opts, wrap((c) => core.adminAccounts(c, { db: db() })));
export const createCheckout = onCall({ ...opts, secrets: [STRIPE_KEY] }, wrap((c) => core.createCheckout(c, { stripe: new Stripe(process.env.STRIPE_SECRET_KEY), baseUrl: process.env.APP_BASE_URL || "https://jcbeck1976.github.io/Life-Care/" })));
export const stripeWebhook = onRequest({ ...opts, secrets: [STRIPE_KEY, STRIPE_WHSEC] }, async (req, res) => {
  const r = await core.stripeWebhook(req.rawBody, req.headers["stripe-signature"], { stripe: new Stripe(process.env.STRIPE_SECRET_KEY), secret: process.env.STRIPE_WEBHOOK_SECRET, db: db() });
  res.status(r.status).send(r.body);
});
