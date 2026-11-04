import { defineConfig } from "@playwright/test";

// Tests run against the Vite dev server, which talks to the local Firebase
// emulator (never live data). Start the emulator first: npm run emulator
export default defineConfig({
  testDir: "tests",
  timeout: 60000,
  workers: 1, // tests share one emulator database, so run them one at a time
  reporter: [["list"]],
  // Visual check screenshots hold personal data: kept OUTSIDE the repo, never committed.
  snapshotPathTemplate: "../lc-visual-snapshots/{arg}{ext}",
  globalSetup: "./tests/global-setup.js",
  use: { baseURL: "http://127.0.0.1:5173/Life-Care/", viewport: { width: 412, height: 915 } },
  webServer: { command: "npx vite", url: "http://127.0.0.1:5173/Life-Care/", reuseExistingServer: true, timeout: 60000 },
});
