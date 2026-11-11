// Shared by the automation jobs (.github/workflows/backup.yml, refresh-build.yml, smoke.yml).
// Needs the FIREBASE_SERVICE_ACCOUNT secret (a Firebase service-account JSON). Without it every job says so and exits 0.
// Never prints data: counts and fingerprints only.
import crypto from "node:crypto";
export const DB_URL = "https://life-care-app-64d04-default-rtdb.europe-west1.firebasedatabase.app";

export function requireSecret(name) {
  if (!process.env[name] || !process.env[name].trim()) { console.log(`${name} secret not set — skipped (nothing was read or written).`); process.exit(0); }
}
export async function adminDb() {
  const admin = (await import("firebase-admin")).default;
  const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(cred), databaseURL: DB_URL });
  return admin.database();
}
// Stable JSON (sorted keys) so the same data always gives the same fingerprint.
export function canonical(v) {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
  return JSON.stringify(v);
}
export const fingerprint = (v) => crypto.createHash("sha256").update(canonical(v)).digest("hex");
export const counts = (v) => ({ keys: Object.keys(v || {}).length, bytes: Buffer.byteLength(JSON.stringify(v || {})) });
