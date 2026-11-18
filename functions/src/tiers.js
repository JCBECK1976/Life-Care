// v2.22.0 (JC, 17 Nov 2026; ADR 0017): the four plans. DEFAULTS — the admin can change them in apps/{appId}/config/tiers
// without a code change. The SAME file is kept at functions/src/tiers.js (a test checks they are identical), so the app
// and the server agree on what each plan includes.
// Principle: the three pillars (Health, Eating, Exercise) are in every plan. Bronze = manual tracking, no AI.
// Silver = + the Companion (AI feedback, auto-generated info). Gold = + automatic planning. Platinum = Gold for up to 5.

export var TIER_ORDER = ["bronze", "silver", "gold", "platinum"];

export var TIER_NAMES = { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum Family" };

// Feature switches. Every AI call in the app carries one of these (header x-lc-feature); the server checks it too.
export var FEATURES = {
  foodRatings: "Food ratings",
  snap: "Snap (photo checks)",
  myOwnItem: "My own item",
  aiFeedback: "Companion feedback",
  chat: "Chat with your Companion",
  aiHelp: "Ask the Companion in Help",
  autoInfo: "Auto-generated info",
  bodyBalance: "Body balance",
  healthSync: "Steps and health sync",
  mealGenerator: "Generate meals",
  shoppingGenerator: "Generate shopping list",
  aiPlans: "AI training plans",
  household: "Household sharing",
  buyEnergy: "Companion Energy top-up",
  editNutrition: "Editing nutrition values",
  gpSummary: "GP prep summary",
};

var NONE = { foodRatings: false, snap: false, myOwnItem: false, aiFeedback: false, chat: false, aiHelp: false, autoInfo: false, bodyBalance: false, healthSync: false,
  mealGenerator: false, shoppingGenerator: false, aiPlans: false, household: false, buyEnergy: false, editNutrition: false, gpSummary: false };
var SILVER = Object.assign({}, NONE, { foodRatings: true, snap: true, myOwnItem: true, aiFeedback: true, chat: true, aiHelp: true, autoInfo: true, bodyBalance: true, healthSync: true, buyEnergy: true, editNutrition: true, gpSummary: true });
var GOLD = Object.assign({}, SILVER, { mealGenerator: true, shoppingGenerator: true, aiPlans: true });

// Prices in pence. energy = Companion Energy included per month (JC 17/18 Nov: Silver 300, Gold 500, Platinum 1,500 —
// one shared family pool). allowancePence = the AI cost that Energy stands for (Energy = AI cost in pence × 2).
export var DEFAULT_TIERS = {
  bronze: Object.assign({}, NONE, { energy: 0, pricePence: 0, yearlyPence: 0, allowancePence: 0, maxMembers: 1, sharedPool: false }),
  silver: Object.assign({}, SILVER, { energy: 300, pricePence: 599, yearlyPence: 4900, allowancePence: 150, maxMembers: 1, sharedPool: false }),
  gold: Object.assign({}, GOLD, { energy: 500, pricePence: 999, yearlyPence: 7900, allowancePence: 250, maxMembers: 1, sharedPool: false }),
  platinum: Object.assign({}, GOLD, { energy: 1500, household: true, pricePence: 1599, yearlyPence: 15900, allowancePence: 750, maxMembers: 5, sharedPool: true }),
};

// The Energy top-up: one product, £5 → £2.50 of AI cost; Silver and up (Platinum: into the family pool).
export var TOP_UP = { productId: "energy_5", pricePence: 500, creditPence: 250, energy: 500 };
// Every AI call costs Energy = its real AI cost in pence × 2 (the mark-up that pays for the plan).
export var ENERGY_PER_AI_PENNY = 2;

// Store product IDs (Google Play now, StoreKit later with the same IDs).
export var STORE_PRODUCTS = { silver: "silver", gold: "gold", platinum: "platinum" };
export var BASE_PLANS = { monthly: "monthly", yearly: "yearly" };

// v2.27.3: the Energy explanation in My Plan. Typical Energy per action (AI cost × 2, rounded; Sonnet prices) — the admin
// can change these in apps/{appId}/config/energyGuide (and each plan's monthly Energy in config/tiers) without a code change.
export var ENERGY_GUIDE = {
  typical: [
    { k: "chat", label: "A chat reply", energy: 2 },
    { k: "snap", label: "A photo check (Snap)", energy: 2 },
    { k: "aiFeedback", label: "Companion feedback (a day, a session, a week)", energy: 3 },
    { k: "aiPlans", label: "A training plan or warm-up", energy: 4 },
    { k: "gpSummary", label: "A GP prep summary", energy: 5 },
    { k: "mealGenerator", label: "A week of meals", energy: 8 },
    { k: "aiHelp", label: "An answer in Help (it reads the parts of the guide that match your question)", energy: 3 },   // v2.32.2: only the matching sections (was 12, then 8)
  ],
};

// v2.24.0 (DPIA §3/§7): which of a person's consents each feature needs. A declined or withdrawn consent switches the
// feature off whatever the plan — in the app (lib/accountConsent.js) and on the server (aiProxy).
export var CONSENT_NEEDS = {
  snap: ["ai", "photos"], bodyBalance: ["ai", "photos", "bodyBalance"], healthSync: ["health"],
  foodRatings: ["ai"], myOwnItem: ["ai"], aiFeedback: ["ai"], chat: ["ai"], aiHelp: ["ai"], autoInfo: ["ai"],
  mealGenerator: ["ai"], shoppingGenerator: ["ai"], aiPlans: ["ai"], editNutrition: ["ai"],
  gpSummary: ["ai"],
  // v2.30.0 (pilot features): symptom + HRT tracking has its own consent (no AI; the record itself is special category data)
  symptoms: ["symptoms"],
};

/** Does this plan include the feature? (tiers = config/tiers or DEFAULT_TIERS) */
export function tierAllows(tier, feature, tiers) {
  var t = (tiers || DEFAULT_TIERS)[tier] || (tiers || DEFAULT_TIERS).bronze;
  return !!t && t[feature] === true;
}

/** The lowest plan that includes the feature ("silver", "gold", "platinum"), or null. */
export function minTierFor(feature, tiers) {
  for (var i = 0; i < TIER_ORDER.length; i++) if (tierAllows(TIER_ORDER[i], feature, tiers)) return TIER_ORDER[i];
  return null;
}

/** "[Feature] is part of Silver." — the gating line (JC's wording). */
export function gateMessage(feature, tiers) {
  var t = minTierFor(feature, tiers);
  return (FEATURES[feature] || "This") + " is part of " + (t ? TIER_NAMES[t].replace(" Family", "") : "a higher plan") + ".";
}

/** £5.99 / £49 — prices for display. */
export function money(pence) { var p = Number(pence) || 0; return "£" + (p % 100 === 0 ? String(p / 100) : (p / 100).toFixed(2)); }
