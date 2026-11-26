// v2.21.0 (N1): uploads a signed AAB to a Google Play track with the Play Developer Publishing API (v3).
// No third-party action sees the Play credentials: Node built-ins only (crypto for the service-account JWT, fetch).
// Env: PLAY_SERVICE_ACCOUNT_JSON (the key JSON, from a GitHub Actions secret). Never printed.
// Usage: node scripts/play-upload.mjs <package> <aab> <track: internal|alpha|beta|production> <status: completed|draft> [release name]
import fs from "node:fs";
import crypto from "node:crypto";

const [pkg, aab, track = "internal", status = "completed", name] = process.argv.slice(2);
if (!pkg || !aab) { console.error("usage: play-upload.mjs <package> <aab> [track] [status] [name]"); process.exit(2); }
if (!["internal", "alpha", "beta", "production"].includes(track)) { console.error("unknown track " + track); process.exit(2); }
if (track === "production") { console.error("refusing to upload to production from CI — promote in Play Console after review"); process.exit(2); }
const sa = JSON.parse(process.env.PLAY_SERVICE_ACCOUNT_JSON || "{}");
if (!sa.client_email || !sa.private_key) { console.error("PLAY_SERVICE_ACCOUNT_JSON is missing or not a service-account key"); process.exit(2); }

// Test hooks only (a local stand-in server): PLAY_TOKEN_URL, PLAY_API_ROOT. Unset in CI.
const TOKEN_URL = process.env.PLAY_TOKEN_URL || "https://oauth2.googleapis.com/token";
const ROOT = process.env.PLAY_API_ROOT || "https://androidpublisher.googleapis.com";
const b64 = (x) => Buffer.from(x).toString("base64url");
async function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = crypto.createSign("RSA-SHA256").update(head + "." + claim).sign(sa.private_key, "base64url");
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: head + "." + claim + "." + sig }) });
  const j = await r.json(); if (!j.access_token) throw new Error("token: " + (j.error_description || j.error || r.status));
  return j.access_token;
}
const API = ROOT + "/androidpublisher/v3/applications/" + encodeURIComponent(pkg);
async function call(t, method, url, body, type) {
  const r = await fetch(url, { method, headers: { Authorization: "Bearer " + t, ...(type ? { "Content-Type": type } : body ? { "Content-Type": "application/json" } : {}) }, body: type ? body : body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let j = {}; try { j = text ? JSON.parse(text) : {}; } catch { j = { raw: text.slice(0, 300) }; }
  if (!r.ok) throw new Error(method + " " + url.replace(API, "") + " → " + r.status + ": " + ((j.error && j.error.message) || j.raw || ""));
  return j;
}
const t = await token();
const edit = await call(t, "POST", API + "/edits", {});
console.log("edit " + edit.id);
const up = await call(t, "POST", ROOT + "/upload/androidpublisher/v3/applications/" + encodeURIComponent(pkg) + "/edits/" + edit.id + "/bundles?uploadType=media", fs.readFileSync(aab), "application/octet-stream");
console.log("uploaded versionCode " + up.versionCode + " (sha256 " + up.sha256 + ")");
await call(t, "PUT", API + "/edits/" + edit.id + "/tracks/" + track, { track, releases: [{ name: name || String(up.versionCode), versionCodes: [String(up.versionCode)], status }] });
await call(t, "POST", API + "/edits/" + edit.id + ":commit");
console.log("✓ " + pkg + " versionCode " + up.versionCode + " → " + track + " (" + status + ")");
