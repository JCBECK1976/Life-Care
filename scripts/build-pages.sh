#!/usr/bin/env bash
# Builds all three environments into ONE GitHub Pages artifact (Pages serves one per repo):
#   main  → /Life-Care/        prod   data root "data"        version v2.X.Y
#   beta  → /Life-Care/beta/   beta   data root "data"        version v2.X.Y-beta.N
#   build → /Life-Care/build/  build  data root "data_build"  version v2.X.Y-build.<sha>
# Run from a full clone of main with all branches fetched (the workflow does this).
# Usage: scripts/build-pages.sh [output dir, default dist-pages]
set -euo pipefail
OUT="${1:-dist-pages}"; case "$OUT" in /*) ;; *) OUT="$(pwd)/$OUT" ;; esac
REMOTE="${REMOTE:-origin}"
rm -rf "$OUT"; mkdir -p "$OUT"
WT="$(mktemp -d)"
trap 'git worktree prune' EXIT

build_env() {  # name ref base data_root dest
  local name=$1 ref=$2 base=$3 root=$4 dest=$5 dir n=0 sha
  if ! git rev-parse --verify -q "$ref^{commit}" >/dev/null; then echo "== $name: $ref not found, skipped"; return; fi
  dir="$WT/$name"; git worktree add -q --detach "$dir" "$ref"
  sha=$(git -C "$dir" rev-parse --short HEAD)
  if [ "$name" = beta ]; then  # beta.N = promotions (merge commits) on beta since the last release to main
    n=$(git rev-list --count --first-parent --merges "$REMOTE/main..$ref" 2>/dev/null || echo 0)
  fi
  echo "== $name: $ref @ $sha → $base (data root: $root)"
  if [ ! -f "$dir/package.json" ]; then
    # No Vite app on this branch (e.g. the Vite merge was reverted): publish its files as they are (legacy).
    [ "$name" = prod ] || { echo "   no package.json on $ref, skipped"; return; }
    mkdir -p "$OUT/$dest"
    for f in $(ls -A "$dir"); do case "$f" in .git|.github|dist|node_modules) ;; *) cp -r "$dir/$f" "$OUT/$dest/" ;; esac; done
    return
  fi
  ( cd "$dir"
    npm ci --no-audit --no-fund --loglevel=error
    npm run lint
    VITE_APP_ENV=$name VITE_DATA_ROOT=$root VITE_BUILD_SHA=$sha VITE_BETA_N=$n \
      npx vite build --base "$base" --outDir "$OUT/$dest" --emptyOutDir --logLevel warn )
  [ "$name" = prod ] || rm -f "$OUT/$dest/legacy.html"   # the rollback page lives at the root only
}

build_env prod  "$REMOTE/main"  /Life-Care/       data       .
build_env beta  "$REMOTE/beta"  /Life-Care/beta/  data       beta
build_env build "$REMOTE/build" /Life-Care/build/ data_build build

node "$(dirname "$0")/check-pages.mjs" "$OUT"
