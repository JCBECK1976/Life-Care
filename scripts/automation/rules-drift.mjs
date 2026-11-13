// v2.16.1 SAD-A6: compare the database rules DEPLOYED in Firebase with database.rules.json in the repo.
// Prints only "match" or "drift" and how many paths differ — never the rules (Actions logs are public).
// Exit 1 on drift, so the scheduled run fails and GitHub emails the repo owner. No secret → skipped, exit 0.
import fs from "node:fs";
import { canonical, requireSecret } from "./common.mjs";

// Rules text may contain comments; strip them before parsing.
export function parseRules(text) {
  const noComments = String(text).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1");
  return JSON.parse(noComments);
}
// Paths (a/b/c) whose value differs between two rules objects.
export function diffPaths(a, b, base = "") {
  if (canonical(a) === canonical(b)) return [];
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  if (!isObj(a) || !isObj(b)) return [base || "/"];
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  return keys.flatMap((k) => diffPaths(a[k], b[k], base + "/" + k));
}

if (process.argv[1] && process.argv[1].endsWith("rules-drift.mjs")) {
  requireSecret("FIREBASE_SERVICE_ACCOUNT");
  const { adminDb } = await import("./common.mjs");
  const db = await adminDb();
  const deployed = parseRules(await db.getRules());
  const repo = parseRules(fs.readFileSync("database.rules.json", "utf8"));
  const diff = diffPaths(deployed, repo);
  if (!diff.length) { console.log("Database rules: match (deployed = database.rules.json)."); process.exit(0); }
  console.log(`Database rules: DRIFT — ${diff.length} path(s) differ between the deployed rules and database.rules.json. Check them in the Firebase console (not printed here).`);
  process.exit(1);
}
