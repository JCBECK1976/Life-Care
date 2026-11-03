// Seeds the LOCAL Firebase emulator (never live) from JC's backup, under /data,
// so paths match production. Never prints the data.
// Usage: npm run seed   (backup path can be overridden with SEED_FILE=...)
import fs from "node:fs";

const FILE = process.env.SEED_FILE || "/home/user/firebase-backup/lifecare_firebase_backup_2026-11-03.json";
const URL = "http://127.0.0.1:9000/data.json?ns=life-care-app-64d04-default-rtdb";

if (!fs.existsSync(FILE)) { console.error("Backup not found: " + FILE); process.exit(1); }
const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
// Never put the real Claude API key into dev/test data: dev must not spend AI credit.
if (data.anthropic_api_key) data.anthropic_api_key = "dev-placeholder-not-a-real-key";

const res = await fetch(URL, { method: "PUT", headers: { Authorization: "Bearer owner" }, body: JSON.stringify(data) });
if (!res.ok) { console.error("Seed failed: HTTP " + res.status); process.exit(1); }
console.log("Emulator seeded: " + Object.keys(data).length + " keys under /data");
