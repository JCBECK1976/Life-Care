import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// v2.35.1 (Architect decision, 19 Nov): no advertising-ID or ad-attribution permissions in the Android app. Facebook is
// left out of the sign-in plugin (it brought AD_ID and the ADSERVICES permissions) and the manifest removes them, so no
// library can add them back. Google, Apple and email sign-in are unchanged.
const AD = ["com.google.android.gms.permission.AD_ID", "android.permission.ACCESS_ADSERVICES_AD_ID", "android.permission.ACCESS_ADSERVICES_ATTRIBUTION",
  "android.permission.ACCESS_ADSERVICES_CUSTOM_AUDIENCE", "android.permission.ACCESS_ADSERVICES_TOPICS", "com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE"];
const find = (dir, name, out = []) => { if (!fs.existsSync(dir)) return out; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) find(p, name, out); else if (e.name === name && /merged_manifest/.test(p)) out.push(p); } return out; };

test("Android: every advertising-ID / ad-attribution permission is removed in the manifest; Facebook is off in the sign-in plugin, Google and Apple on", () => {
  const m = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
  for (const p of AD) expect(m, p).toContain('<uses-permission android:name="' + p + '" tools:node="remove" />');
  const providers = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8")).plugins.SocialLogin.providers;
  expect(providers).toMatchObject({ facebook: false, google: true, apple: true });
  expect(fs.readFileSync("scripts/build-native.sh", "utf8")).toMatch(/npx cap sync android/);   // the sync applies the providers before every build
});

test("a local Android build (when there is one) merges none of them, and has no Facebook code", () => {
  const src = fs.statSync("android/app/src/main/AndroidManifest.xml").mtimeMs;
  const merged = find("android/app/build/intermediates", "AndroidManifest.xml").filter((f) => fs.statSync(f).mtimeMs >= src);   // built since the rules
  test.skip(!merged.length, "no local Android build since the manifest changed");
  for (const f of merged) { const x = fs.readFileSync(f, "utf8"); for (const p of AD) expect(x, f + " " + p).not.toContain('android:name="' + p + '"'); expect(x).not.toMatch(/com\.facebook/); }
});
