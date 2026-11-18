// v2.24.0 (Step 4, DPIA §3/§7; flag useOnboarding — build only): consent for NEW individual accounts.
// Stored at apps/lifecare/users/{uid}/consent (own read/write only, database.rules.next.json), with every change kept
// in consent/history (time + what changed, no health data). Never asked of the shared joint/admin account.
// Each opt-in switches its features off when declined or withdrawn — here (the app) and in the server (aiProxy).
import firebase, { auth } from "./firebase.js";
import { buildFlag, APP_ID } from "./platform.js";
import { LEGAL_VERSION, LEGAL_LABEL } from "./consent.js";
import { isProtectedAccount } from "./accountGuard.js";
import { CONSENT_NEEDS } from "../constants/tiers.js";

export var TERMS_VERSION = LEGAL_VERSION, PRIVACY_VERSION = LEGAL_VERSION;
export { LEGAL_LABEL };
export var OPTINS = [
  { k: "ai", label: "AI processing (the Companion)", hint: "What you enter and ask is sent to the AI service to give you feedback, ratings and answers. Without it the app works as manual tracking (like Bronze)." },
  { k: "photos", label: "Photo analysis", hint: "Photos (food, labels, scales, body balance) are shrunk, analysed and then discarded, never stored. Needs AI processing." },
  { k: "health", label: "Health sync (steps)", hint: "Read your daily step total (and, if you choose, active calories) from Health Connect / Apple Health." },
  { k: "bodyBalance", label: "Body balance checks", hint: "Front, side and back photos about every 4 weeks, scored and then discarded. Needs AI processing and photo analysis." },
  // v2.30.0 (pilot features, flag usePilotFeatures): its own consent — symptoms and HRT are special category health data
  { k: "symptoms", pilot: true, label: "Symptom and HRT tracking", hint: "Record daily symptoms (0–3) and your HRT in My Health. It stays in your account (your family only sees it if you share Health). It is a record only: the Companion never gives advice about HRT or medication." },
];
/** The opt-ins shown now (the symptom/HRT one only while the pilot features are on). */
export function optins() { return OPTINS.filter(function(o) { return !o.pilot || buildFlag("usePilotFeatures"); }); }
export var NEEDS = CONSENT_NEEDS;   // shared with the server (constants/tiers.js)
export var NOTE = {
  ai: "AI features are off because you chose not to use AI processing. You can turn it on in Settings → Privacy & your data.",
  photos: "Photo checks are off in your privacy choices. You can turn photo analysis on in Settings → Privacy & your data.",
  health: "Health sync is off in your privacy choices. You can turn it on in Settings → Privacy & your data.",
  bodyBalance: "Body balance checks are off in your privacy choices. You can turn them on in Settings → Privacy & your data.",
  symptoms: "Symptom and HRT tracking is off in your privacy choices. You can turn it on in Settings → Privacy & your data.",
};

var current = null;          // this account's consent record (null = not a new-account session, or not loaded)
var active = false;          // true when consent applies: flag on + an individual (non-joint) account
export function onboardingOn() { return buildFlag("useOnboarding"); }
export function accountConsent() { return current; }
export function consentApplies() { return active; }
var path = function(uid) { return "apps/" + APP_ID + "/users/" + uid + "/consent"; };

/** Load for the signed-in person. Returns { applies, consent }. The joint/admin account never gets onboarding. */
export async function loadAccountConsent() {
  var u = auth.currentUser;
  active = false; current = null;
  if (!onboardingOn() || !u || await isProtectedAccount(u.uid)) return { applies: false, consent: null };
  active = true;
  try { current = (await firebase.database().ref(path(u.uid)).once("value")).val(); } catch (e) { current = null; }
  return { applies: true, consent: current };
}
/** Onboarding is needed: an individual account with no consent for the current Terms/Privacy versions. */
export function needsOnboarding() { return active && !(current && current.accepted === true && current.adult === true && current.termsVersion === TERMS_VERSION && current.privacyVersion === PRIVACY_VERSION); }

/** Save (first time or a change in Settings). Keeps a history entry of what changed. */
export async function saveAccountConsent(choices) {
  var u = auth.currentUser; if (!u) throw new Error("Sign in first.");
  var now = new Date().toISOString();
  var rec = { accepted: true, adult: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, at: now,
    ai: !!choices.ai, photos: !!choices.photos && !!choices.ai, health: !!choices.health, bodyBalance: !!choices.bodyBalance && !!choices.ai && !!choices.photos, symptoms: !!choices.symptoms };
  var changed = {}; OPTINS.forEach(function(o) { if (!current || current[o.k] !== rec[o.k]) changed[o.k] = rec[o.k]; });
  var ref = firebase.database().ref(path(u.uid));
  await ref.update(rec);   // the choices only; the history below is append-only and never rewritten
  await ref.child("history").push({ at: now, change: current ? changed : Object.assign({ first: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION }, changed) });
  current = Object.assign({}, current || {}, rec);
  window.dispatchEvent(new CustomEvent("lc-consent-changed"));
  return current;
}

/** The consent (if any) that blocks a feature: "ai" | "photos" | "health" | "bodyBalance" | null. */
export function consentBlocks(feature) {
  if (!active) return null;
  var need = NEEDS[feature] || []; var c = current || {};
  for (var i = 0; i < need.length; i++) if (c[need[i]] !== true) return need[i];
  return null;
}
