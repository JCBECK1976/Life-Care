import { sGet, sSet } from "./storage.js";

// v2.14.1: the address Send Feedback emails (and the Privacy Policy shows) is an ADMIN SETTING in the database, not in
// the source code (this repository is public). Empty = no email: feedback goes to the Tracker only.
export var CONTACT_KEY = "feedback_email";
export function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim()); }
export async function loadContactEmail() { var v = await sGet(CONTACT_KEY); v = typeof v === "string" ? v.trim() : ""; return validEmail(v) ? v : ""; }
export async function saveContactEmail(v) { v = String(v || "").trim(); await sSet(CONTACT_KEY, v ? v : null); return v; }
