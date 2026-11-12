// Post-deploy smoke test of each environment: the page loads, the deployed version is the expected one, no console
// errors on the sign-in screen, and (with the service account) the real data is present — counts only.
import { chromium } from "playwright";
import fs from "node:fs";
import { adminDb, counts, requireSecret } from "./common.mjs";
requireSecret("FIREBASE_SERVICE_ACCOUNT");
const SITE = process.env.SITE_URL || "https://jcbeck1976.github.io/Life-Care/";
const ENVS = [{ name: "prod", path: "", root: "data" }, { name: "beta", path: "beta/", root: "data" }, { name: "build", path: "build/", root: "data_build" }];
const expected = JSON.parse(process.env.EXPECTED_VERSIONS || "{}");      // { prod: "v2.14.0", beta: "v2.14.0", build: "v2.14.0" }
const IGNORE = [/accounts\.google\.com/i, /gsi/i, /favicon/i];          // Google sign-in script noise is not ours
const browser = await chromium.launch(); let failed = 0; const lines = [];
for (const env of ENVS) {
  const page = await browser.newPage(); const errors = [];
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.some((r) => r.test(m.text()))) errors.push(m.text().slice(0, 120)); });
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
  const url = SITE + env.path; let ok = true; let version = "?";
  try {
    const res = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    if (!res || !res.ok()) { ok = false; errors.push("HTTP " + (res && res.status())); }
    await page.getByText("Sign in with Google").first().waitFor({ timeout: 20000 });
    const html = await (await fetch(url)).text(); const js = (html.match(/assets\/index-[\w-]+\.js/) || [])[0];
    if (js) { const src = await (await fetch(url + js)).text(); version = (src.match(/"(v\d+\.\d+\.\d+)"/) || [])[1] || "?"; }
    if (expected[env.name] && version !== expected[env.name]) { ok = false; errors.push(`version ${version}, expected ${expected[env.name]}`); }
  } catch (e) { ok = false; errors.push(String(e.message).slice(0, 120)); }
  if (errors.length) ok = false;
  if (!ok) failed++;
  lines.push(`${ok ? "ok  " : "FAIL"} ${env.name}: ${url} · version ${version}${errors.length ? " · " + errors.join(" | ") : ""}`);
  await page.close();
}
await browser.close();
const db = await adminDb();
for (const root of ["data", "data_build"]) { const v = (await db.ref(root).once("value")).val(); const c = counts(v); const okData = c.keys > 0 && v && v["dashboard:data"]; if (!okData) failed++; lines.push(`${okData ? "ok  " : "FAIL"} ${root}: ${c.keys} keys, ${c.bytes} bytes${okData ? "" : " (no dashboard data)"}`); }
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "### Smoke test\n```\n" + lines.join("\n") + "\n```\n");
process.exit(failed ? 1 : 0);
