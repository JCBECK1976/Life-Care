// v2.16.7 P9 + P8: first-use explicit consent and the pilot legal documents. Behind the flag "pilotConsent"
// (OFF by default, so JC and Becks see no change until the pilot). Stored per person: consent:<person>.
import { sGet, sSet } from "./storage.js";
import { flag } from "./platform.js";

export var LEGAL_VERSION = "pilot-2026-11-14";
export var LEGAL_LABEL = "Pilot version — 14 November 2026";
export var LEGAL_DOCS = { privacy: { title: "Privacy Notice", file: "legal/privacy-notice.md" }, terms: { title: "Terms of Use", file: "legal/terms-of-use.md" } };
export var CHOICES = [
  { k: "ai", label: "AI feedback and answers", hint: "Your entries and questions are sent to the AI provider to give you feedback. Without this, AI features are off." },
  { k: "photos", label: "Photo checks", hint: "Photos are shrunk, analysed and then discarded, never stored." },
  { k: "health", label: "Google Health / Apple Health", hint: "Read your daily calories burned, if you connect it." },
];

export function consentActive() { return flag("pilotConsent"); }
/** Needs asking: the flag is on and there is no consent for the current legal version. */
export function needsConsent(c) { return consentActive() && !(c && c.version === LEGAL_VERSION && c.accepted === true); }
export async function loadConsent(person) { try { var v = await sGet("consent:" + person); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
export async function saveConsent(person, choices) {
  var c = { version: LEGAL_VERSION, accepted: true, at: new Date().toISOString(), ai: !!choices.ai, photos: !!choices.photos, health: !!choices.health };
  await sSet("consent:" + person, JSON.stringify(c));
  return c;
}
/** What the request wrapper allows (only while the flag is on; otherwise everything as today). */
export function allowedBy(c, kind) { if (!consentActive()) return true; return !!(c && c[kind]); }
