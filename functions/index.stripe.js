// v2.26.0: the Stripe test-mode web route, kept for a possible web-only purchase route later. NOT exported from
// index.js, so it is never deployed. Never used by the native apps (Google Play Billing / Apple IAP there).
// To use: in index.js, `export const { createCheckout, stripeWebhook } = stripeFunctions({ opts, base, db, wrap });`
import { onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import * as core from "./src/core.js";
export function stripeFunctions({ opts, base, db, wrap }) {
  const STRIPE_KEY = defineSecret("STRIPE_SECRET_KEY");        // test-mode key (sk_test_…)
  const STRIPE_WHSEC = defineSecret("STRIPE_WEBHOOK_SECRET");
  return {
    createCheckout: onCall({ ...opts, secrets: [STRIPE_KEY] }, wrap((c) => core.createCheckout(c, { stripe: new Stripe(process.env.STRIPE_SECRET_KEY), baseUrl: process.env.APP_BASE_URL || "https://jcbeck1976.github.io/Life-Care/" }))),
    stripeWebhook: onRequest({ ...base, secrets: [STRIPE_KEY, STRIPE_WHSEC] }, async (req, res) => {
      const r = await core.stripeWebhook(req.rawBody, req.headers["stripe-signature"], { stripe: new Stripe(process.env.STRIPE_SECRET_KEY), secret: process.env.STRIPE_WEBHOOK_SECRET, db: db() });
      res.status(r.status).send(r.body);
    }),
  };
}
