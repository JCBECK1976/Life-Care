// Companion platform config (ADR 0011). No keys here: secrets come from Firebase secrets / env at runtime.
export const REGION = "europe-west1";
export const DEFAULT_APP = "lifecare";
export const MODEL = "claude-sonnet-4-6";                 // the app's model; not changed by the proxy
// AI cost → pence. Prices per million tokens in USD (Sonnet), converted at USD_GBP. Check before go-live.
export const PRICES = { inUsd: 3, outUsd: 15, cacheWriteUsd: 3.75, cacheReadUsd: 0.3 };
export const USD_GBP = parseFloat(process.env.USD_GBP || "0.79");
// Energy packs: 100% mark-up — the price is twice the AI cost credited. Stripe fees come out of the margin.
export const PACKS = {   // any tier
  pack5: { pricePence: 500, creditPence: 250, name: "Companion Energy — £5 pack" },
  pack10: { pricePence: 1000, creditPence: 500, name: "Companion Energy — £10 pack" },
};
export const AI_BACKEND = () => process.env.AI_BACKEND || "direct";   // "vertex" (EU) | "direct" (fallback) | "mock" (emulator)
export const VERTEX = { region: process.env.VERTEX_REGION || "europe-west1", project: process.env.GCLOUD_PROJECT || process.env.VERTEX_PROJECT || "" };

// The P7 medication rule (same text as src/lib/safety.js in the app; the server adds it to every request).
export const MEDICATION_RULE = "MEDICATION SAFETY (always applies): Never suggest starting, stopping or changing any medication or dose, including supplements taken as medicine. If medication comes up, say it is a question for their GP or pharmacist.";

export function costPence(usage) {
  const u = usage || {};
  const usd = ((u.input_tokens || 0) * PRICES.inUsd + (u.output_tokens || 0) * PRICES.outUsd
    + (u.cache_creation_input_tokens || 0) * PRICES.cacheWriteUsd + (u.cache_read_input_tokens || 0) * PRICES.cacheReadUsd) / 1e6;
  return Math.round(usd * USD_GBP * 100 * 10000) / 10000;   // pence, 4 dp
}
export const P = {
  energy: (app, uid) => `apps/${app}/energy/${uid}`,
  ledger: (app, uid) => `apps/${app}/ledger/${uid}`,
  usage: (app, uid, day) => `apps/${app}/usage/${uid}/${day}`,
  ent: (app, uid) => `apps/${app}/entitlements/${uid}`,
  tiers: (app) => `apps/${app}/config/tiers`,
  account: (app, uid) => `apps/${app}/admin/accounts/${uid}`,
  admin: (uid) => `platform/admins/${uid}`,
};
// v2.16.5 (JC, 14 Nov): defaults — admin can change them in apps/{appId}/config/tiers without a code change.
// allowancePence = AI cost included per month. Prices in pence; yearly where offered.
export const DEFAULT_TIERS = {
  bronze: { pricePence: 0, allowancePence: 20,
    tracking: true, ratings: true, help: true, aiFeedback: false, snap: false, mealGenerator: false, bodyBalance: false, aiPlans: false, healthSync: false, household: false },
  silver: { pricePence: 599, yearlyPence: 4900, allowancePence: 150,
    tracking: true, ratings: true, help: true, aiFeedback: true, snap: true, mealGenerator: true, bodyBalance: false, aiPlans: false, healthSync: false, household: false },
  gold: { pricePence: 999, yearlyPence: 7900, allowancePence: 250,
    tracking: true, ratings: true, help: true, aiFeedback: true, snap: true, mealGenerator: true, bodyBalance: true, aiPlans: true, healthSync: true, household: true },
};
