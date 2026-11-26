import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp } from "./helpers.js";

// v2.28.2: Android App Check — Play Integrity (debug provider in debug builds) through our own native plugin; the web
// Firebase SDK uses it as a custom provider; off until the app is registered (google-services.json); never enforced yet.
test("native wiring: our plugin is registered, Play Integrity for release, the debug provider ONLY in debug builds", () => {
  const act = fs.readFileSync("android/app/src/main/java/com/companionappsstudio/lifecare/MainActivity.java", "utf8");
  expect(act).toContain("registerPlugin(LcAppCheckPlugin.class)");
  const pl = fs.readFileSync("android/app/src/main/java/com/companionappsstudio/lifecare/LcAppCheckPlugin.java", "utf8");
  expect(pl).toContain("PlayIntegrityAppCheckProviderFactory.getInstance()");
  expect(pl).toMatch(/if \(BuildConfig\.DEBUG\)/);
  expect(pl).toContain('call.reject("not-configured")');
  const g = fs.readFileSync("android/app/build.gradle", "utf8");
  expect(g).toContain("implementation 'com.google.firebase:firebase-appcheck-playintegrity'");
  expect(g).toContain("debugImplementation 'com.google.firebase:firebase-appcheck-debug'");
  expect(g).not.toMatch(/^\s*implementation 'com\.google\.firebase:firebase-appcheck-debug'/m);
  expect(fs.readFileSync(".gitignore", "utf8")).toContain("google-services.json");
  expect(fs.readFileSync(".github/workflows/android-internal.yml", "utf8")).toContain("secrets.GOOGLE_SERVICES_JSON");
  expect(fs.readFileSync("functions/index.js", "utf8")).toMatch(/enforceAppCheck: process\.env\.ENFORCE_APP_CHECK === "true"/);   // still off by default
});

test("the web side: App Check starts only when the device says it is configured; the token comes from the native provider", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async () => {
    const m = await import("/Life-Care/src/lib/appCheck.js");
    const web = await m.startNativeAppCheck(window.firebase || {});
    const off = await m.startNativeAppCheck({}, { native: true, plugin: { isConfigured: async () => ({ configured: false }) } });
    let provider = null;
    const fb = { appCheck: Object.assign(() => ({ activate: (p, auto) => { provider = [p, auto]; } }), { CustomProvider: function(o) { this.o = o; } }) };
    const on = await m.startNativeAppCheck(fb, { native: true, plugin: { isConfigured: async () => ({ configured: true, provider: "playIntegrity" }), getToken: async () => ({ token: "tok", expireTimeMillis: 123 }) } });
    const tok = await provider[0].o.getToken();
    return { web, off, on, auto: provider[1], tok };
  });
  expect(r.web).toEqual({ on: false, reason: "web" });
  expect(r.off).toEqual({ on: false, reason: "not configured" });
  expect(r.on).toEqual({ on: true, provider: "playIntegrity" });
  expect(r.auto).toBe(true);
  expect(r.tok).toEqual({ token: "tok", expireTimeMillis: 123 });
});
