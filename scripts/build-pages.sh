#!/usr/bin/env bash
# Builds all three environments into ONE GitHub Pages artifact (Pages serves one per repo):
#   main  → /Life-Care/        prod   data root "data"        version v2.X.Y
#   beta  → /Life-Care/beta/   beta   data root "data"        version v2.X.Y-beta.N
#   build → /Life-Care/build/  build  data root "data_build"  version v2.X.Y-build.<sha>
# Prod is strict: any prod failure stops the script, so nothing is deployed.
# Beta/build are not: if one fails it is left out of the artifact, reported loudly (log,
# GitHub annotation and job summary), and prod still deploys.
# Run from a full clone of main with all branches fetched (the workflow does this).
# Usage: scripts/build-pages.sh [output dir, default dist-pages]
set -euo pipefail
OUT="${1:-dist-pages}"; case "$OUT" in /*) ;; *) OUT="$(pwd)/$OUT" ;; esac
REMOTE="${REMOTE:-origin}"
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/null}"
rm -rf "$OUT"; mkdir -p "$OUT"
WT="$(mktemp -d)"
trap 'git worktree prune' EXIT
echo "## Pages build" >> "$SUMMARY"

env_failed() {  # name reason — report loudly, leave the environment out, carry on
  local name=$1 reason=$2
  rm -rf "$OUT/$name"
  echo ""
  echo "##################################################################"
  echo "### $name NOT DEPLOYED: $reason"
  echo "### Prod is unaffected and still deploys. Fix $name and push again."
  echo "##################################################################"
  echo "::error title=$name environment skipped::$name was not deployed: $reason. Prod still deploys."
  echo "- ❌ **$name skipped**: $reason. Prod still deployed; \`/Life-Care/$name/\` is missing until it is fixed." >> "$SUMMARY"
}

build_env() {  # name ref base data_root dest
  local name=$1 ref=$2 base=$3 root=$4 dest=$5 dir n=0 sha
  if ! git rev-parse --verify -q "$ref^{commit}" >/dev/null; then
    echo "== $name: $ref not found, skipped"; echo "- ➖ $name: no \`${ref#*/}\` branch, not built" >> "$SUMMARY"; return 0
  fi
  dir="$WT/$name"
  if ! git worktree add -q --detach "$dir" "$ref"; then
    [ "$name" = prod ] && { echo "::error title=prod build failed::could not check out main"; exit 1; }
    env_failed "$name" "could not check out ${ref#*/}"; return 0
  fi
  sha=$(git -C "$dir" rev-parse --short HEAD)
  if [ "$name" = beta ]; then  # beta.N = promotions (merge commits) on beta since the last release to main
    n=$(git rev-list --count --first-parent --merges "$REMOTE/main..$ref" 2>/dev/null || echo 0)
  fi
  echo "== $name: $ref @ $sha → $base (data root: $root)"
  if [ ! -f "$dir/package.json" ]; then
    # No Vite app on this branch (e.g. the Vite merge was reverted): publish its files as they are (legacy).
    if [ "$name" != prod ]; then env_failed "$name" "no package.json on ${ref#*/}"; return 0; fi
    mkdir -p "$OUT/$dest"
    for f in $(ls -A "$dir"); do case "$f" in .git|.github|dist|node_modules) ;; *) cp -r "$dir/$f" "$OUT/$dest/" ;; esac; done
    echo "- ✅ prod: legacy files from \`main\` @ $sha" >> "$SUMMARY"
    return 0
  fi
  # Commands are chained with && so a failure is caught for every environment.
  if ( cd "$dir" \
       && npm ci --no-audit --no-fund --loglevel=error \
       && npm run lint \
       && VITE_APP_ENV=$name VITE_DATA_ROOT=$root VITE_BUILD_SHA=$sha VITE_BETA_N=$n \
            npx vite build --base "$base" --outDir "$OUT/$dest" --emptyOutDir --logLevel warn ); then
    [ "$name" = prod ] || rm -f "$OUT/$dest/legacy.html"   # the rollback page lives at the root only
    echo "- ✅ $name: \`${ref#*/}\` @ $sha → \`$base\`" >> "$SUMMARY"
  elif [ "$name" = prod ]; then
    echo "::error title=prod build failed::main @ $sha failed to install, lint or build. Nothing was deployed."
    echo "- ❌ **prod build failed** (main @ $sha). Nothing was deployed." >> "$SUMMARY"
    exit 1
  else
    env_failed "$name" "install, lint or build failed (${ref#*/} @ $sha)"
  fi
}

build_env prod  "$REMOTE/main"  /Life-Care/       data       .
build_env beta  "$REMOTE/beta"  /Life-Care/beta/  data       beta
build_env build "$REMOTE/build" /Life-Care/build/ data_build build

node "$(dirname "$0")/check-pages.mjs" "$OUT"
