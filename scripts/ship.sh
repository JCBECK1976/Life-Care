#!/usr/bin/env bash
# The commit gate (Architect, 18 Nov 2026): the ONLY way the Coder commits and pushes source.
#   scripts/ship.sh "<commit message>" [branch]        (branch defaults to build; main and beta are refused)
# 1) runs lint, the full Playwright suite and the functions tests;
# 2) if ANY of them fails (non-zero exit), it stops: nothing is staged, committed or pushed, and it exits non-zero;
# 3) only when everything is green: git add -A, commit, push (with retries).
# LC_CHECKS replaces the checks (used by tests/commit-gate.spec.js to prove the gate); LC_SHIP_DRY=1 stops before pushing.
set -uo pipefail
msg="${1:-}"; branch="${2:-build}"
if [ -z "$msg" ]; then echo "usage: scripts/ship.sh \"<commit message>\" [branch]" >&2; exit 2; fi
case "$branch" in main|beta) echo "REFUSED: source never goes straight to $branch (build → beta → main by PR)." >&2; exit 2;; esac
cd "$(git rev-parse --show-toplevel)" || exit 2

DEFAULT_CHECKS='npm run -s lint && npx playwright test --trace off --reporter=dot && npm --prefix functions test'
log="${TMPDIR:-/tmp}/lc-ship-$(date +%s).log"
run() {   # run one named check; on failure say which, keep the full log, stop (exit 1)
  echo "== check: $1"
  if ! bash -c "$2" >>"$log" 2>&1; then
    tail -40 "$log"
    echo "RED: a check failed ($1) — nothing committed, nothing pushed. Full log: $log" >&2
    exit 1
  fi
}
if [ -n "${LC_CHECKS:-}" ]; then run "checks" "$LC_CHECKS"
else run "lint" "npm run -s lint"; run "playwright" "npx playwright test --trace off --reporter=dot"; run "functions" "npm --prefix functions test"; fi
tail -5 "$log"; rm -f "$log"
echo "== green: committing"

git add -A . && git reset -q -- "*.jks" "*.keystore" 2>/dev/null || true
if git diff --cached --quiet; then echo "Nothing to commit."; exit 0; fi
git commit -q -F - <<MSG || { echo "commit failed" >&2; exit 1; }
$msg

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>${LC_TRAILER:+
$LC_TRAILER}
MSG
[ "${LC_SHIP_DRY:-}" = "1" ] && { echo "dry run: committed $(git rev-parse --short HEAD), not pushed"; exit 0; }
for i in 1 2 3 4; do git push -q -u origin "$branch" && { echo "pushed $(git rev-parse --short HEAD) to $branch"; exit 0; }; sleep $((i * 2)); done
echo "push failed after 4 tries" >&2; exit 1
