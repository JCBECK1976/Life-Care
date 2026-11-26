// v2.22.0 (ADR 0017, flag useTiers): the signed-in person's plan, for gating and Settings → My Plan.
// The SERVER is the authority (aiProxy refuses AI the plan doesn't include; purchases are verified there); this module
// only decides what the app shows and stops gated AI requests before they leave the device.
// - Flag off (prod and beta today) → everything on, exactly as before.
// - The joint/admin account (the rules-locked UID or a platform admin) → Platinum (all on) until the per-person
//   migration (ACCOUNTS_TIERS_ENERGY §5a); on /build/ it can PREVIEW another plan to test the gating (display only).
// - Anyone else → apps/lifecare/entitlements/{uid} (server-written), Platinum through their family owner, else Bronze.
import { useEffect, useState } from "react";
import firebase, { auth } from "./firebase.js";
import { flag, APP_ID } from "./platform.js";
import { APP_ENV } from "../constants/version.js";
import { DEFAULT_TIERS, TIER_ORDER, ENERGY_GUIDE, tierAllows, gateMessage } from "../constants/tiers.js";
import { isProtectedAccount } from "./accountGuard.js";
import { loadAccountConsent, consentBlocks, NOTE } from "./accountConsent.js";

export function tiersOn() { return APP_ENV === "build" || flag("useTiers"); }
export var canPreview = function() { return APP_ENV === "build" || !!import.meta.env.DEV; };

var ALL_ON = { tier: "platinum", role: "owner", joint: true, source: "admin", tiers: DEFAULT_TIERS, loaded: false };
var current = ALL_ON;
var listeners = [];
function set(p) { current = p; window._lcPlan = p; listeners.forEach(function(l) { l(p); }); }
export function getPlan() { return current; }

function readPreview() { try { var v = JSON.parse(localStorage.getItem("lc_plan_preview") || "null"); return v && TIER_ORDER.indexOf(v.tier) >= 0 ? v : null; } catch (e) { return null; } }
/** Build only, joint/admin account: preview the app as another plan (display only; nothing is stored on the server). */
export function setPreview(p) { try { if (p) localStorage.setItem("lc_plan_preview", JSON.stringify(p)); else localStorage.removeItem("lc_plan_preview"); } catch (e) {} return loadPlan(); }

async function val(path) { try { return (await firebase.database().ref(path).once("value")).val(); } catch (e) { return null; } }

export async function loadPlan() {
  await loadAccountConsent();   /* v2.24.0: an individual account's consent (flag useOnboarding) */
  var u = auth.currentUser;
  if (!tiersOn() || !u) { set(Object.assign({}, ALL_ON, { loaded: !!u })); return current; }   /* plans off: all on (consent still applies) */
  var tiers = (await val("apps/" + APP_ID + "/config/tiers")) || DEFAULT_TIERS;
  var guide = (await val("apps/" + APP_ID + "/config/energyGuide")) || ENERGY_GUIDE;   /* v2.27.3: admin-configurable */
  if (await isProtectedAccount(u.uid)) {
    var pv = canPreview() ? readPreview() : null;
    if (pv) { set({ tier: pv.tier, role: pv.role || (pv.tier === "platinum" ? "owner" : "solo"), ownerName: pv.ownerName || "JC", preview: true, joint: true, source: "preview", tiers: tiers, guide: guide, loaded: true }); return current; }
    set(Object.assign({}, ALL_ON, { tiers: tiers, guide: guide, loaded: true }));
    return current;
  }
  var now = Date.now();
  var live = function(e) { return e && e.tier && (!e.expires || e.expires > now); };
  var own = await val("apps/" + APP_ID + "/entitlements/" + u.uid);
  var hid = await val("apps/" + APP_ID + "/memberOf/" + u.uid);
  var h = hid ? await val("apps/" + APP_ID + "/households/" + hid) : null;
  var p;
  if (h && h.owner && h.owner !== u.uid) {
    var oe = await val("apps/" + APP_ID + "/entitlements/" + h.owner);
    var oname = ((await val("apps/" + APP_ID + "/users/" + h.owner + "/profile")) || {}).name || "the plan owner";
    if (live(oe) && oe.tier === "platinum") p = { tier: "platinum", role: "member", owner: h.owner, ownerName: oname, hid: hid };
  }
  if (!p) {
    var tier = live(own) ? own.tier : "bronze";
    p = { tier: tier, role: tier === "platinum" ? "owner" : "solo", owner: u.uid, hid: hid || null, source: own && own.source, expires: own && own.expires, autoRenew: own && own.autoRenew, basePlan: own && own.basePlan };
  }
  var allowance = ((tiers[p.tier] || {}).energy) || 0;   /* v2.26.0: Energy units */
  var bal = p.role === "solo" ? await val("apps/" + APP_ID + "/energy/" + u.uid) : await val("apps/" + APP_ID + "/familyEnergy/" + p.owner);
  /* v2.27.3: the % is this month's Energy; top-ups (never expire) are shown separately */
  var b = bal || {}; var monthly = b.monthly != null ? b.monthly : (b.balance || 0);
  p.energyPct = allowance > 0 ? Math.max(0, Math.min(100, Math.round(monthly / allowance * 100))) : null;
  p.topup = Math.round(b.topup || 0);
  if (p.role === "owner" && h) {
    var names = {};
    for (var m of Object.keys(h.members || {})) names[m] = ((await val("apps/" + APP_ID + "/users/" + m + "/profile")) || {}).name || "Member";
    p.family = { hid: hid, members: Object.keys(h.members || {}).map(function(m) { return { uid: m, name: names[m], owner: m === u.uid }; }), invites: Object.keys(h.invites || {}).map(function(c) { return { code: c, email: h.invites[c].email }; }) };
  }
  set(Object.assign(p, { tiers: tiers, guide: guide, loaded: true }));
  return current;
}

/** Does the current plan include this feature? Always true with the flag off. */
/** v2.24.0: a declined/withdrawn consent switches the feature off whatever the plan (calm note, not "buy"). */
export function planAllows(feature) { if (consentBlocks(feature)) return false; return !tiersOn() || (current.loaded === true && tierAllows(current.tier, feature, current.tiers)); }   // nothing until the plan is known

/** The gating line: "[Feature] is part of Silver." — a Platinum member gets "Ask [owner] about your family plan". */
export function gateReason(feature) { return consentBlocks(feature) ? "consent" : current.role === "member" ? "member" : "plan"; }
export function gateText(feature) { var cb = consentBlocks(feature); if (cb) return NOTE[cb]; return current.role === "member" ? "Ask " + (current.ownerName || "the plan owner") + " about your family plan." : gateMessage(feature, current.tiers); }

/** Show the gating prompt (the app renders it; see PlanGate). */
var lastTap = 0;
if (typeof window !== "undefined") ["pointerdown", "keydown"].forEach(function(t) { window.addEventListener(t, function() { lastTap = Date.now(); }, true); });
export function showGate(feature) {
  // only right after the person tapped something: background AI work (e.g. guides refreshing) is stopped silently
  if (Date.now() - lastTap > 4000) return;
  window.dispatchEvent(new CustomEvent("lc-plan-gate", { detail: { feature: feature } }));
}
/** Open Settings → My Plan. */
export function openPlans() { window.dispatchEvent(new CustomEvent("lc-open-plans")); }

export function usePlan() {
  var s = useState(current); var setS = s[1];
  useEffect(function() { listeners.push(setS); setS(current); return function() { listeners = listeners.filter(function(l) { return l !== setS; }); }; }, [setS]);
  return s[0];
}

/** Keeps the plan in step with the signed-in person. Called once from main.jsx / App. */
export function startPlan() {
  auth.onAuthStateChanged(function() { loadPlan(); });
  window.addEventListener("lc-consent-changed", function() { set(Object.assign({}, current)); });   /* re-render gated screens */
  /* v2.22.2 Snap gate: on a plan without photo checks, tapping a photo button shows the prompt BEFORE the camera or file
     picker opens (no photo taken for nothing). A label tap reaches its <input type=file> as a click, so this catches both. */
  document.addEventListener("click", function(e) {
    var t = e.target;
    if (!t || t.tagName !== "INPUT" || t.type !== "file" || !/image/.test(t.accept || "")) return;
    var f = /pdf/.test(t.accept) ? "autoInfo" : "snap";
    if (!planAllows(f)) { e.preventDefault(); e.stopPropagation(); lastTap = Date.now(); showGate(f); }
  }, true);
}
