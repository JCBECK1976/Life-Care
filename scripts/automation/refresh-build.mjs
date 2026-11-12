// Nightly / manual: overwrite the Build test copy (`data_build`) with today's real data (`data`).
// Test junk on Build is wiped at each refresh and never reaches Beta/Prod. Counts only in the log.
// PRIVACY: while only JC and Becks use the app this copies their data; once pilot users exist this must copy only
// consenting users or anonymise (HANDOVER §4) — the job refuses if the data has more people than ALLOWED_PEOPLE.
import { adminDb, counts, requireSecret } from "./common.mjs";
requireSecret("FIREBASE_SERVICE_ACCOUNT");
const db = await adminDb();
const data = (await db.ref("data").once("value")).val() || {};
let people = [];
try { const d = JSON.parse(data["dashboard:data"] || "{}"); people = Object.keys(d).filter((k) => k !== "config"); } catch (e) {}
const allowed = (process.env.ALLOWED_PEOPLE || "jc,becks").split(",").map((s) => s.trim());
const extra = people.filter((p) => !allowed.includes(p));
if (extra.length) { console.log(`Refusing to copy: ${extra.length} person(s) beyond the allowed list are in the data (privacy rule). Nothing written.`); process.exit(1); }
await db.ref("data_build").set(data);
const c = counts(data);
console.log(`data_build refreshed from data: ${c.keys} keys, ${c.bytes} bytes, ${people.length} people.`);
process.exit(0);
