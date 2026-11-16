// Seeds the LOCAL Firebase emulator (never live) under /data, so paths match production. Never prints the data.
// v2.16.1 SAD-A9: by default it seeds SYNTHETIC data (scripts/make-fixture.mjs) — no real person's data.
// Real-backup seeding only by explicit opt-in:  SEED_REAL=1 npm run seed   (path override: SEED_FILE=...)
import fs from "node:fs";
import { makeFixture } from "./make-fixture.mjs";

const URL = "http://127.0.0.1:9000/data.json?ns=life-care-app-64d04-default-rtdb";
let data, what;
if (process.env.SEED_REAL === "1") {
  const FILE = process.env.SEED_FILE || "/home/user/firebase-backup/lifecare_firebase_backup_2026-11-03.json";
  if (!fs.existsSync(FILE)) { console.error("Backup not found: " + FILE); process.exit(1); }
  data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  // Never put the real Claude API key into dev/test data: dev must not spend AI credit.
  if (data.anthropic_api_key) data.anthropic_api_key = "dev-placeholder-not-a-real-key";
  what = "REAL backup (opt-in)";
} else {
  data = makeFixture();
  what = "synthetic data";
}
const res = await fetch(URL, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(data) });
if (!res.ok) { console.error("Seed failed: HTTP " + res.status); process.exit(1); }
console.log("Emulator seeded with " + what + ": " + Object.keys(data).length + " keys under /data");
