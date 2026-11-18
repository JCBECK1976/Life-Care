// v2.22.0 PAY1 (ADR 0017): buying a plan or a top-up. NATIVE ONLY — Google Play Billing on Android (StoreKit later,
// same product IDs). The app starts the purchase and sends the purchase token to the server (playVerify), which asks
// Google what was bought, then sets the plan or credits Energy. Nothing is credited here. No Stripe in the native app.
import { isNative, platform } from "./native.js";
import { auth } from "./firebase.js";
import { callFunction, APP_ID } from "./platform.js";
import { STORE_PRODUCTS, TOP_UP } from "../constants/tiers.js";

export var PLAY_PACKAGE = "com.companionappsstudio.lifecare";
export var WEB_MSG = "Plans and top-ups are bought in the Lifecare Companion app (Google Play on Android, the App Store on iPhone).";

/** Ties a purchase to the signed-in person without sending the uid (= functions/src/play.js accountTag). */
export async function accountTag(uid) {
  var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("lifecare:" + uid));
  return Array.from(new Uint8Array(b)).map(function(x) { return x.toString(16).padStart(2, "0"); }).join("").slice(0, 64);
}

/** v2.29.0: StoreKit needs the account tag as a UUID (= functions/src/apple.js appleTag). */
export async function appleTag(uid) {
  var h = await accountTag(uid);   // sha256("lifecare:" + uid), hex
  var v = h.slice(0, 12) + "5" + h.slice(13, 16) + ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 32);
  return (v.slice(0, 8) + "-" + v.slice(8, 12) + "-" + v.slice(12, 16) + "-" + v.slice(16, 20) + "-" + v.slice(20, 32)).toLowerCase();
}
/** v2.29.0: App Store product IDs are per plan AND period (silver.monthly …); Google Play uses base plans. */
export function storeProductId(tier, period, plat) { return (plat || platform()) === "ios" ? tier + "." + (period === "yearly" ? "yearly" : "monthly") : STORE_PRODUCTS[tier]; }

/** Google Play's own subscription page (manage or cancel). Works on the web and in the app. On iPhone: Apple's page. */
export function manageUrl(tier) { return platform() === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions?package=" + PLAY_PACKAGE + (STORE_PRODUCTS[tier] ? "&sku=" + STORE_PRODUCTS[tier] : ""); }

async function plugin() { return (await import("@capgo/native-purchases")).NativePurchases; }

async function verify(kind, productId, tx, deps) {
  var t = await auth.currentUser.getIdToken();
  var call = (deps && deps.call) || callFunction;
  if (((deps && deps.platform) || platform()) === "ios") return call("appleVerify", { appId: APP_ID, kind: kind, productId: productId, transactionId: String(tx.transactionId) }, t);   // v2.29.0
  return call("playVerify", { appId: APP_ID, kind: kind, productId: productId, purchaseToken: tx.purchaseToken }, t);
}

/** Subscribe / change plan: tier = silver | gold | platinum, period = monthly | yearly. Returns { ok, msg }. */
export async function buyPlan(tier, period, deps) {
  if (!(deps && deps.native) && !isNative()) return { ok: false, msg: WEB_MSG };
  try {
    var NP = (deps && deps.plugin) || await plugin();
    var ios = ((deps && deps.platform) || platform()) === "ios";
    var pid = storeProductId(tier, period, ios ? "ios" : "android");
    var tx = await NP.purchaseProduct({ productIdentifier: pid, planIdentifier: period === "yearly" ? "yearly" : "monthly", productType: "subs",
      appAccountToken: ios ? await appleTag(auth.currentUser.uid) : await accountTag(auth.currentUser.uid), autoAcknowledgePurchases: false });   // the server acknowledges after verifying
    if (!tx || !(tx.purchaseToken || (ios && tx.transactionId))) return { ok: false, msg: "The purchase didn't finish." };
    await verify("subscription", pid, tx, deps);
    return { ok: true, msg: "✓ You're on " + tier.charAt(0).toUpperCase() + tier.slice(1) + "." };
  } catch (e) { return { ok: false, msg: /cancel/i.test(String(e && e.message)) ? "Purchase cancelled." : String((e && e.message) || e) }; }
}

/** £5 Companion Energy top-up (Silver and up; Platinum → the family pool). */
export async function buyTopUp(deps) {
  if (!(deps && deps.native) && !isNative()) return { ok: false, msg: WEB_MSG };
  try {
    var NP = (deps && deps.plugin) || await plugin();
    var ios2 = ((deps && deps.platform) || platform()) === "ios";
    var tx = await NP.purchaseProduct({ productIdentifier: TOP_UP.productId, productType: "inapp", appAccountToken: ios2 ? await appleTag(auth.currentUser.uid) : await accountTag(auth.currentUser.uid), isConsumable: false, autoAcknowledgePurchases: false });   // the server consumes it
    if (!tx || !(tx.purchaseToken || (ios2 && tx.transactionId))) return { ok: false, msg: "The purchase didn't finish." };
    await verify("topup", TOP_UP.productId, tx, deps);
    return { ok: true, msg: "✓ Companion Energy topped up." };
  } catch (e) { return { ok: false, msg: /cancel/i.test(String(e && e.message)) ? "Purchase cancelled." : String((e && e.message) || e) }; }
}
