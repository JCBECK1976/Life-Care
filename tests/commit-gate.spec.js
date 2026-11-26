import { test, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execSync } from "node:child_process";

// The commit gate (Architect, 18 Nov 2026): scripts/ship.sh commits and pushes ONLY when lint, the full suite and the
// functions tests pass. Proven here in a throwaway repository with its own remote: a red check → exit 1, no commit,
// no push; green → one commit, pushed. (LC_CHECKS stands in for the real checks, so this test doesn't run itself.)
const SHIP = path.resolve("scripts/ship.sh");
function sandbox() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "gate-"));
  const sh = (c, cwd = d) => execSync(c, { cwd, stdio: "pipe" }).toString().trim();
  sh("git init -q --bare remote.git");
  sh("git init -q work && cd work && git config user.email t@example.com && git config user.name T && git checkout -q -b build && echo a > f && git add f && git commit -qm init && git remote add origin ../remote.git && git push -q -u origin build");
  const work = path.join(d, "work");
  return { work, sh, head: () => sh("git rev-parse HEAD", work), remote: () => sh("git rev-parse build", path.join(d, "remote.git")), cleanup: () => fs.rmSync(d, { recursive: true, force: true }) };
}
const ship = (cwd, checks, args = ["a change"]) => spawnSync("bash", [SHIP, ...args], { cwd, env: { ...process.env, LC_CHECKS: checks }, encoding: "utf8" });

test("red: a failing check (test or lint) stops everything — exit 1, nothing staged, committed or pushed", () => {
  const s = sandbox();
  try {
    const before = s.head(), remoteBefore = s.remote();
    fs.writeFileSync(path.join(s.work, "f"), "changed\n");
    for (const red of ["exit 1", "true && false", "node -e 'process.exit(3)'"]) {   // e.g. a failed test run, a failed lint after a green one
      const r = ship(s.work, red);
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/RED: a check failed \(checks\) — nothing committed, nothing pushed\. Full log: /);
      expect(s.head()).toBe(before); expect(s.remote()).toBe(remoteBefore);
      expect(s.sh("git diff --cached --name-only", s.work)).toBe("");                 // not even staged
    }
  } finally { s.cleanup(); }
});

test("green: all checks pass → one commit, pushed to build; main and beta are refused", () => {
  const s = sandbox();
  try {
    fs.writeFileSync(path.join(s.work, "f"), "changed\n");
    const r = ship(s.work, "true");
    expect(r.status).toBe(0);
    expect(s.head()).toBe(s.remote());
    expect(s.sh("git log -1 --format=%B", s.work)).toContain("a change");
    for (const b of ["main", "beta"]) { const x = ship(s.work, "true", ["x", b]); expect(x.status).toBe(2); expect(x.stderr).toContain("REFUSED"); }
  } finally { s.cleanup(); }
});

test("the real checks are lint + the full Playwright suite + the functions tests", () => {
  const src = fs.readFileSync(SHIP, "utf8");
  expect(src).toContain("DEFAULT_CHECKS='npm run -s lint && npx playwright test --trace off --reporter=dot && npm --prefix functions test'");
  expect(src).toMatch(/set -uo pipefail/);
  expect(src).toContain('run "lint" "npm run -s lint"; run "playwright" "npx playwright test --trace off --reporter=dot"; run "functions" "npm --prefix functions test"');   // named, in order; each stops on red
});
