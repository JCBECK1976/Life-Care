import { test, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { openApp } from "./helpers.js";
import { mdToHtml } from "../scripts/md-page.mjs";

// v2.21.0 (N1, Android through Google Play internal testing): account deletion (Play requirement), the public
// deletion and privacy pages, and the native build guard (release → data, debug → data_build).
const KEY = (k) => "http://127.0.0.1:9000/data/" + encodeURIComponent(k) + ".json?ns=life-care-app-64d04-default-rtdb";
const H = { Authorization: "Bearer owner" };
const get = async (k) => { const v = await (await fetch(KEY(k), { headers: H })).json(); return v == null ? null : JSON.parse(v); };

/* v2.21.1 SAFETY: the joint/admin account (the UID the rules are locked to) can never be deleted from the app. */
const openSettings = async (page) => { await page.getByRole("button", { name: /Settings/ }).first().click().catch(async () => { await page.locator("button").nth(1).click(); }); };
// Does this test account still exist in the Auth emulator? (a deleted account can't sign in: EMAIL_NOT_FOUND)
const canSignIn = async (email) => { const r = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "test-password", returnSecureToken: true }) }); return r.ok; };

test("admin account: Delete my account is not offered ('contact the developer'), and the deletion code refuses it too", async ({ page }) => {
  const { errors } = await openApp(page);                                                  // test-uid-jc = the emulator rules' locked UID
  await openSettings(page);
  const box = page.getByTestId("delete-account");
  await expect(box.getByTestId("delete-account-locked")).toHaveText("This account can't be deleted here: contact the developer.");
  await expect(box.getByTestId("delete-my-account")).toHaveCount(0);
  // the code path itself (not only the UI) refuses, before anything is erased
  const r = await page.evaluate(async () => { const m = await import("/Life-Care/src/lib/myData.js"); try { await m.deleteMyAccount("jc"); return "deleted"; } catch (e) { return e.message; } });
  expect(r).toBe("This account can't be deleted here: contact the developer.");
  const dash = await get("dashboard:data");
  expect((dash.jc.body && dash.jc.body.weight || []).length).toBeGreaterThan(0);           // nothing erased
  expect(await canSignIn("jc-test@example.com")).toBe(true);                               // the sign-in still exists
  await expect(page.getByTestId("sign-in")).toHaveCount(0);                                 // still signed in
  expect(errors).toEqual([]);
});

test("a normal account: Download my data first is offered; after typing DELETE (+ confirm) its records and sign-in are deleted", async ({ page }) => {
  const { errors } = await openApp(page, "member");
  page.on("dialog", (d) => d.accept());
  await openSettings(page);
  const box = page.getByTestId("delete-account");
  await expect(box.getByTestId("delete-download-first")).toBeVisible();
  const del = box.getByTestId("delete-my-account");
  await expect(del).toBeDisabled();
  await box.getByLabel("Type DELETE to delete the account").fill("DELET");
  await expect(del).toBeDisabled();
  await box.getByLabel("Type DELETE to delete the account").fill("DELETE");
  await del.click();
  await expect(page.getByTestId("sign-in")).toBeVisible({ timeout: 15000 });               // signed out
  const dash = await get("dashboard:data");
  expect(dash.jc.profile.name).toBeTruthy();                                              // the name kept, the records emptied
  expect((dash.jc.body && dash.jc.body.weight) || []).toEqual([]);
  expect(JSON.stringify(dash.becks.profile || {})).not.toBe("{}");                         // the other person untouched
  expect(await canSignIn("member-test@example.com")).toBe(false);                          // the sign-in was deleted
  expect(errors.filter((e) => !/permission|PERMISSION_DENIED/i.test(e))).toEqual([]);
});

test("guard: the locked UID matches the live rules file; a sign-in older than 5 minutes must be confirmed first", async ({ page }) => {
  const rules = fs.readFileSync("database.rules.json", "utf8");
  const locked = /auth\.uid === '([^']+)'/.exec(rules)[1];
  const guard = fs.readFileSync("src/lib/accountGuard.js", "utf8");
  expect(guard).toContain('"' + locked + '"');
  expect(fs.readFileSync("functions/src/config.js", "utf8")).toContain('"' + locked + '"');
  const { errors } = await openApp(page);
  const r = await page.evaluate(async () => { const g = await import("/Life-Care/src/lib/accountGuard.js"); const now = Date.parse("2026-11-17T12:00:00Z");
    return [g.needsRecentSignIn("Tue, 17 Nov 2026 11:57:00 GMT", now), g.needsRecentSignIn("Tue, 17 Nov 2026 11:54:00 GMT", now), g.needsRecentSignIn("", now), await g.isProtectedAccount(""), await g.isProtectedAccount("3iEIfsbZlaUMwUiGY6Lro4jAQef1"), await g.isProtectedAccount("test-uid-member")]; });
  expect(r).toEqual([false, true, true, true, true, false]);
  expect(errors).toEqual([]);
});

test("public pages: delete-account.html (in-app steps + a way to ask without the app) and the privacy policy page", async () => {
  const del = fs.readFileSync("public/delete-account.html", "utf8");
  expect(del).toContain("Delete my account"); expect(del).toContain("Developer contact"); expect(del).toContain("30 days"); expect(del).toContain("12 months");
  expect(del).not.toMatch(/<script/i); expect(del).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i);   // no scripts, no email address in the repo
  const notice = fs.readFileSync("public/legal/privacy-notice.md", "utf8");
  expect(notice).toContain("delete-account.html");
  const html = mdToHtml(notice);
  expect(html).toMatch(/<h1>Lifecare Companion™ — Privacy Notice<\/h1>/);
  expect(html).toContain("<table>"); expect(html).toContain("<li>");
  expect(mdToHtml("Text with **bold** and [a link](https://example.org).")).toBe('<p>Text with <b>bold</b> and <a href="https://example.org">a link</a>.</p>');
});

test("native guard: a release must use data (prod, client ID set); a debug build must use data_build", () => {
  const dir = (js, title) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "native-")); fs.mkdirSync(path.join(d, "assets")); fs.writeFileSync(path.join(d, "index.html"), "<title>" + title + "</title><script src=\"./assets/i.js\"></script>"); fs.writeFileSync(path.join(d, "assets", "i.js"), js); fs.writeFileSync(path.join(d, "APP_GUIDE.md"), "#"); return d; };
  const run = (v, d) => { try { execFileSync("node", ["scripts/check-native.mjs", v, d], { stdio: "pipe" }); return 0; } catch (e) { return e.status; } };
  const CID = '"123456789012-abc.apps.googleusercontent.com"';
  expect(run("release", dir('const r="data";' + CID, "Lifecare Companion"))).toBe(0);
  expect(run("release", dir('const r="data_build";' + CID, "Lifecare Companion"))).toBe(1);          // debug data in a release
  expect(run("release", dir('const r="data";', "Lifecare Companion"))).toBe(1);                       // no sign-in client ID
  expect(run("release", dir('const r="data";' + CID, "BUILD · Lifecare"))).toBe(1);                   // a build-labelled web copy
  expect(run("debug", dir('const r="data_build";', "BUILD · Lifecare"))).toBe(0);
  expect(run("debug", dir('const r="data";', "Lifecare Companion"))).toBe(1);                         // real data in a debug build
  const cfg = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
  expect(cfg.appId).toBe("com.companionappsstudio.lifecare");
  const gradle = fs.readFileSync("android/app/build.gradle", "utf8");
  expect(gradle).toContain('System.getenv("LC_UPLOAD_KEYSTORE")');                                   // the key comes from CI, never the repo
  expect(gradle).toMatch(/checkNativeWeb/);
  const ignored = fs.readFileSync(".gitignore", "utf8");
  for (const p of ["*.jks", "*.keystore", "google-services.json", "play-service-account*.json"]) expect(ignored).toContain(p);
});

test("Play uploader: signs the service-account JWT, then edit → upload bundle → internal track → commit; never production", async () => {
  const http = await import("node:http");
  const { generateKeyPairSync, createVerify } = await import("node:crypto");
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
  const calls = [];
  const srv = http.createServer((req, res) => { let b = []; req.on("data", (c) => b.push(c)); req.on("end", () => {
    const body = Buffer.concat(b); calls.push(req.method + " " + req.url.split("?")[0]);
    if (req.url === "/token") { const a = new URLSearchParams(body.toString()).get("assertion").split("."); const ok = createVerify("RSA-SHA256").update(a[0] + "." + a[1]).verify(publicKey, a[2], "base64url"); res.end(JSON.stringify(ok ? { access_token: "t" } : { error: "bad sig" })); return; }
    if (req.method === "POST" && /\/edits$/.test(req.url)) { res.end('{"id":"e1"}'); return; }
    if (/\/bundles/.test(req.url)) { res.end(JSON.stringify({ versionCode: 1042, sha256: "x", bytes: body.length })); return; }
    if (req.method === "PUT") { calls.push("track:" + body.toString()); res.end("{}"); return; }
    res.end("{}"); }); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const port = srv.address().port, aab = path.join(os.tmpdir(), "t.aab"); fs.writeFileSync(aab, "AAB");
  const env = { ...process.env, PLAY_TOKEN_URL: "http://127.0.0.1:" + port + "/token", PLAY_API_ROOT: "http://127.0.0.1:" + port, PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "ci@x.iam.gserviceaccount.com", private_key: privateKey }) };
  const { execFile } = await import("node:child_process");
  const run = (args) => new Promise((r) => execFile("node", ["scripts/play-upload.mjs", ...args], { env }, (e, out, err) => r({ code: e ? e.code : 0, out: out + err })));
  const ok = await run(["com.companionappsstudio.lifecare", aab, "internal", "completed", "v2.21.0"]);
  expect(ok.code).toBe(0); expect(ok.out).toContain("✓ com.companionappsstudio.lifecare versionCode 1042 → internal (completed)");
  expect(calls.filter((c) => !c.startsWith("track:"))).toEqual(["POST /token", "POST /androidpublisher/v3/applications/com.companionappsstudio.lifecare/edits", "POST /upload/androidpublisher/v3/applications/com.companionappsstudio.lifecare/edits/e1/bundles", "PUT /androidpublisher/v3/applications/com.companionappsstudio.lifecare/edits/e1/tracks/internal", "POST /androidpublisher/v3/applications/com.companionappsstudio.lifecare/edits/e1:commit"]);
  expect(JSON.parse(calls.find((c) => c.startsWith("track:")).slice(6))).toEqual({ track: "internal", releases: [{ name: "v2.21.0", versionCodes: ["1042"], status: "completed" }] });
  expect((await run(["com.companionappsstudio.lifecare", aab, "production"])).code).toBe(2);           // never production from CI
  expect(ok.out).not.toContain("PRIVATE KEY");                                                         // the key is never printed
  srv.close();
});
