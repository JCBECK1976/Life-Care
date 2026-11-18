import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp } from "./helpers.js";

// v2.29.0: the iPhone app — project, guard, entitlements, privacy manifest, sign-in, HealthKit, StoreKit 2 (client side;
// the server side is in functions/test/apple.test.mjs), App Check (App Attest). The compile proof is the iOS workflow.
const read = (f) => fs.readFileSync(f, "utf8");

test("project: bundle ID, the release/debug data guard runs before resources, entitlements + privacy manifest bundled", () => {
  const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
  expect((pbx.match(/PRODUCT_BUNDLE_IDENTIFIER = com\.companionappsstudio\.lifecare;/g) || []).length).toBe(2);
  expect(pbx).toMatch(/Guard: release → data, debug → data_build/);
  // the project file must parse (old-style plist): every quoted string is properly closed (escaped inner quotes)
  for (let i = 0, n = pbx.length; i < n; i++) {
    if (pbx[i] === "/" && pbx[i + 1] === "*") { i = pbx.indexOf("*/", i + 2) + 1; continue; }
    if (pbx[i] !== '"') continue;
    let j = i + 1; while (pbx[j] !== '"') j += pbx[j] === "\\" ? 2 : 1;
    const next = pbx.slice(j + 1).match(/^\s*(\S)/)[1];
    expect([";", ",", "=", ")"], "unescaped quote near: " + pbx.slice(i, i + 60)).toContain(next);
    i = j;
  }
  expect(pbx).toContain("scripts/check-native.mjs");
  expect(pbx.indexOf("Guard: release → data, debug → data_build */,\n\t\t\t\t504EC3021FED79650016851F /* Resources */")).toBeGreaterThan(0);   // before the web files are copied
  expect((pbx.match(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/g) || []).length).toBe(2);
  expect(pbx).toMatch(/PrivacyInfo\.xcprivacy in Resources/);
  const ent = read("ios/App/App/App.entitlements");
  for (const k of ["com.apple.developer.healthkit", "com.apple.developer.applesignin", "com.apple.developer.devicecheck.appattest-environment"]) expect(ent).toContain(k);
  expect(read("ios/App/CapApp-SPM/Package.swift")).toContain('path: "../../../native/lc-app-check"');
  expect(read("native/lc-app-check/Package.swift")).toContain('"https://github.com/firebase/firebase-ios-sdk.git", exact: "13.1.1"');
  const swift = read("native/lc-app-check/ios/Sources/LcAppCheckPlugin/LcAppCheckPlugin.swift");
  expect(swift).toContain("AppAttestProvider"); expect(swift).toMatch(/#if DEBUG[\s\S]*AppCheckDebugProviderFactory/);
  expect(read(".gitignore")).toContain("GoogleService-Info.plist");
});

test("privacy: Info.plist explains Health (read only), camera and photos; the privacy manifest says no tracking and lists what is collected", () => {
  const plist = read("ios/App/App/Info.plist");
  expect(plist).toMatch(/NSHealthShareUsageDescription<\/key>\s*<string>[^<]*daily step total/);
  expect(plist).toMatch(/NSHealthUpdateUsageDescription<\/key>\s*<string>[^<]*never writes/);
  for (const k of ["NSCameraUsageDescription", "NSPhotoLibraryUsageDescription", "$(GOOGLE_IOS_REVERSED_CLIENT_ID)"]) expect(plist).toContain(k);
  const pm = read("ios/App/App/PrivacyInfo.xcprivacy");
  expect(pm).toMatch(/NSPrivacyTracking<\/key>\s*<false\/>/);
  for (const t of ["Health", "Fitness", "EmailAddress", "UserID", "PurchaseHistory"]) expect(pm).toContain("NSPrivacyCollectedDataType" + t);
  expect(pm).not.toMatch(/NSPrivacyCollectedDataTypeTracking<\/key><true\/>/);
  expect(pm).toContain("CA92.1");
});

test("workflows: the unsigned compile on a macOS runner checks the Apple root pin; TestFlight is manual and names its secrets", () => {
  const b = read(".github/workflows/ios-build.yml");
  expect(b).toMatch(/runs-on: macos-26/); expect(b).toContain("CODE_SIGNING_ALLOWED=NO");
  expect(b).toContain('security find-certificate -c "Apple Root CA - G3"');
  const t = read(".github/workflows/ios-testflight.yml");
  expect(t).toMatch(/^on:\n  workflow_dispatch:/m); expect(t).not.toMatch(/^\s+push:/m);
  for (const s of ["APPLE_TEAM_ID", "ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_PRIVATE_KEY", "GOOGLE_SERVICE_INFO_PLIST"]) expect(t).toContain("secrets." + s);
  expect(t).toContain("build-native.sh release ios");
  expect(t).not.toMatch(/BEGIN PRIVATE KEY|-----/);
});

test("StoreKit 2 (iPhone): plan + period product IDs, a UUID account tag equal to the server's, the TRANSACTION ID to appleVerify", async ({ page }) => {
  await openApp(page, "member");
  const r = await page.evaluate(async () => {
    const b = await import("/Life-Care/src/lib/billing.js");
    const calls = [];
    const plugin = { purchaseProduct: async (o) => { calls.push(["buy", o]); return { transactionId: "2000001043762129", jwsRepresentation: "ignored.by.server" }; } };
    const call = async (name, data) => { calls.push(["server", name, data]); return { ok: true }; };
    const ok = await b.buyPlan("gold", "yearly", { native: true, platform: "ios", plugin, call });
    const top = await b.buyTopUp({ native: true, platform: "ios", plugin, call });
    return { ok, top, calls, tag: await b.appleTag("test-uid-member"), android: b.storeProductId("gold", "yearly", "android") };
  });
  expect(r.ok.ok).toBe(true); expect(r.top.ok).toBe(true);
  expect(r.calls[0][1]).toMatchObject({ productIdentifier: "gold.yearly", appAccountToken: r.tag });
  expect(r.calls[1]).toEqual(["server", "appleVerify", { appId: "lifecare", kind: "subscription", productId: "gold.yearly", transactionId: "2000001043762129" }]);
  expect(r.calls[3][2]).toMatchObject({ kind: "topup", productId: "energy_5" });
  expect(r.android).toBe("gold");                                                      // Android: base plans, same IDs as before
  const { appleTag } = await import("../functions/src/apple.js");
  expect(appleTag("test-uid-member")).toBe(r.tag);                                      // the same UUID the server checks
});

test("Apple Health (iPhone): the steps card's fix-it guide speaks iPhone (Health app → Apps), never Health Connect", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lc_flags", JSON.stringify({ useSteps: true }));
    localStorage.setItem("lc_steps_device", JSON.stringify({ person: "jc" }));
    window.__lcHealth = { platform: "ios", isAvailable: async () => ({ available: true }), requestAuthorization: async (r) => ({ readAuthorized: [], readDenied: r.read }), queryAggregated: async () => ({ samples: [] }) };
  });
  await openApp(page);
  await page.locator('button[title="Settings"]').first().click();
  const c = page.getByTestId("steps-card");
  await c.getByTestId("steps-connect").click();
  const g = c.getByTestId("steps-guide");
  await expect(g.getByTestId("steps-guide-ios")).toContainText("Health app → tap your picture → Apps → Lifecare Companion → turn on Steps");
  await expect(g).not.toContainText("Health Connect");
  await expect(g).not.toContainText("Samsung");
});
