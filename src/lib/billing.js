// v2.22.0 PAY1 (ADR 0017): buying a plan or a top-up. NATIVE ONLY — Google Play Billing on Android (StoreKit later,
// same product IDs). The app starts the purchase and sends the purchase token to the server (playVerify), which asks
// Google what was bought, then sets the plan or credits Energy. Nothing is credited here. No Stripe in the native app.
import { isNative } from "./native.js";
import { auth } from "./firebase.js";
import { callFunction, APP_ID } from "./platform.js";
import { STORE_PRODUCTS, TOP_UP } from "../constants/tiers.js";

export var PLAY_PACKAGE = "com.companionappsstudio.lifecare";
export var WEB_MSG = "Plans and top-ups are bought in the Lifecare Companion app for Android (Google Play).";

/** Ties a purchase to the signed-in person without sending the uid (= functions/src/play.js accountTag). */
export async function accountTag(uid) {
  var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("lifecare:" + uid));
  return Array.from(new Uint8Array(b)).map(function(x) { return x.toString(16).padStart(2, "0"); }).join("").slice(0, 64);
}

/** Google Play's own subscription page (manage or cancel). Works on the web and in the app. */
export function manageUrl(tier) { return "https://play.google.com/store/account/subscriptions?package=" + PLAY_PACKAGE + (STORE_PRODUCTS[tier] ? "&sku=" + STORE_PRODUCTS[tier] : ""); }

async function plugin() { return (await import("@capgo/native-purchases")).NativePurchases; }

async function verify(kind, productId, token, deps) {
  var t = await auth.currentUser.getIdToken();
  return (deps && deps.call || callFunction)("playVerify", { appId: APP_ID, kind: kind, productId: productId, purchaseToken: token }, t);
}

/** Subscribe / change plan: tier = silver | gold | platinum, period = monthly | yearly. Returns { ok, msg }. */
export async function buyPlan(tier, period, deps) {
  if (!(deps && deps.native) && !isNative()) return { ok: false, msg: WEB_MSG };
  try {
    var NP = (deps && deps.plugin) || await plugin();
    var tx = await NP.purchaseProduct({ productIdentifier: STORE_PRODUCTS[tier], planIdentifier: period === "yearly" ? "yearly" : "monthly", productType: "subs",
      appAccountToken: await accountTag(auth.currentUser.uid), autoAcknowledgePurchases: false });   // the server acknowledges after verifying
    if (!tx || !tx.purchaseToken) return { ok: false, msg: "The purchase didn't finish." };
    await verify("subscription", STORE_PRODUCTS[tier], tx.purchaseToken, deps);
    return { ok: true, msg: "✓ You're on " + tier.charAt(0).toUpperCase() + tier.slice(1) + "." };
  } catch (e) { return { ok: false, msg: /cancel/i.test(String(e && e.message)) ? "Purchase cancelled." : String((e && e.message) || e) }; }
}

/** £5 Companion Energy top-up (Silver and up; Platinum → the family pool). */
export async function buyTopUp(deps) {
  if (!(deps && deps.native) && !isNative()) return { ok: false, msg: WEB_MSG };
  try {
    var NP = (deps && deps.plugin) || await plugin();
    var tx = await NP.purchaseProduct({ productIdentifier: TOP_UP.productId, productType: "inapp", appAccountToken: await accountTag(auth.currentUser.uid), isConsumable: false, autoAcknowledgePurchases: false });   // the server consumes it
    if (!tx || !tx.purchaseToken) return { ok: false, msg: "The purchase didn't finish." };
    await verify("topup", TOP_UP.productId, tx.purchaseToken, deps);
    return { ok: true, msg: "✓ Companion Energy topped up." };
  } catch (e) { return { ok: false, msg: /cancel/i.test(String(e && e.message)) ? "Purchase cancelled." : String((e && e.message) || e) }; }
}
