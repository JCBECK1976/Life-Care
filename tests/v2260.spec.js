import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { openApp } from "./helpers.js";

// v2.26.0 (Part 4): server functions deploy-ready — the manual deploy workflow, config, Energy units, export, deletion.
test("deploy workflow: manual only, waits for JC's approval (production environment), dry run by default, secrets only from GitHub", () => {
  const w = fs.readFileSync(".github/workflows/deploy-functions.yml", "utf8");
  expect(w).toMatch(/^on:\n  workflow_dispatch:/m);
  expect(w).not.toMatch(/^\s+(push|pull_request|schedule):/m);                                  // never automatic
  expect(w).toMatch(/environment: production/);
  expect(w).toMatch(/dry_run:[\s\S]*?default: true/);
  expect(w).toMatch(/if: github\.ref == 'refs\/heads\/main'/);
  expect(w).toMatch(/needs: test/);
  expect(w).toMatch(/--config firebase\.deploy\.json/);
  expect(w).toMatch(/rm -f "\$RUNNER_TEMP\/sa\.json"/);
  expect(w).not.toMatch(/AIza|sk_(live|test)_|BEGIN PRIVATE KEY/);
  const cfg = JSON.parse(fs.readFileSync("firebase.deploy.json", "utf8"));
  expect(cfg.database.rules).toBe("database.rules.json");
  expect(cfg.functions[0]).toMatchObject({ source: "functions", runtime: "nodejs22" });
  // the next rules keep the shared data locked to the joint account
  const next = fs.readFileSync("database.rules.next.json", "utf8");
  const live = /auth\.uid === '([^']+)'/.exec(fs.readFileSync("database.rules.json", "utf8"))[1];
  expect(next).toContain("'" + live + "'");
});

test("functions: the deployable set (no Stripe: it needs secrets and is off), App Check option wired, schedules present", () => {
  const out = execSync("node -e \"import('./index.js').then(m=>console.log(Object.keys(m).sort().join(',')))\"", { cwd: "functions", encoding: "utf8" }).trim();
  expect(out.split(",")).toEqual(["acceptInvite", "acceptPilotInvite", "adminAccounts", "adminTopUp", "aiProxy", "appleNotify", "appleVerify", "createHousehold", "createPilotInvite", "createReviewDemo", "deleteAccount", "exportMyData", "grantMonthly", "inviteMember", "leaveHousehold", "playNotify", "playVerify", "removeMember", "retentionDaily", "setTier"]);
  const idx = fs.readFileSync("functions/index.js", "utf8");
  expect(idx).toMatch(/enforceAppCheck: process\.env\.ENFORCE_APP_CHECK === "true"/);
  expect(idx).not.toMatch(/from "stripe"/);
});

test("server functions + rules: all emulator tests pass (Energy units, monthly grant, export, Vertex fallback, consent, Play, rules)", () => {
  const out = execSync("npm --prefix functions test 2>&1", { encoding: "utf8", timeout: 240000 });
  expect(out).toMatch(/# fail 0/);
  expect(Number(/# pass (\d+)/.exec(out)[1])).toBeGreaterThanOrEqual(33);
});

test("My Plan shows Energy per month in Energy units (300 / 500 / 1,500 shared)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lc_flags", JSON.stringify({ useTiers: true })));
  await openApp(page, "member");
  await page.waitForFunction(() => window._lcPlan && window._lcPlan.loaded);
  await page.locator('button[title="Settings"]').first().click();
  await page.getByTestId("my-plan-toggle").click();
  const row = page.getByTestId("plan-compare").getByRole("row", { name: /Companion Energy each month/ });
  await expect(row).toContainText("300"); await expect(row).toContainText("500"); await expect(row).toContainText("1,500 shared");
});

test("App Check (web): the site key reaches the build from a repository variable (public), and the app activates it only when set", () => {
  expect(fs.readFileSync(".github/workflows/deploy.yml", "utf8")).toMatch(/VITE_APPCHECK_SITE_KEY: \$\{\{ vars\.APPCHECK_SITE_KEY \}\}/);
  expect(fs.readFileSync("src/lib/firebase.js", "utf8")).toMatch(/if \(!import\.meta\.env\.DEV && import\.meta\.env\.VITE_APPCHECK_SITE_KEY\)/);
});
