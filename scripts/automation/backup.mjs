// Nightly / manual backup of the REAL data (`data`): a full snapshot, written only when its fingerprint changed.
// Writes ./out/backup.json (plaintext, deleted by the workflow right after encryption) and ./out/fingerprint.
// The workflow encrypts it with BACKUP_KEY (gpg AES-256) and pushes it to the private vault repo.
import fs from "node:fs";
import { adminDb, counts, fingerprint, requireSecret } from "./common.mjs";
requireSecret("FIREBASE_SERVICE_ACCOUNT");
const db = await adminDb();
const data = (await db.ref("data").once("value")).val() || {};
const fp = fingerprint(data);
const last = process.env.LAST_FINGERPRINT || "";
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/fingerprint", fp + "\n");
if (fp === last.trim()) { console.log("Data unchanged since the last backup (same fingerprint) — no new backup."); fs.writeFileSync("out/unchanged", "1"); process.exit(0); }
fs.writeFileSync("out/backup.json", JSON.stringify({ data }));       // same layout as Download backup / a Firebase export
const c = counts(data);
console.log(`Snapshot taken: ${c.keys} keys, ${c.bytes} bytes (fingerprint ${fp.slice(0, 12)}…).`);
process.exit(0);
