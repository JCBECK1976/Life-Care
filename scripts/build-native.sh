#!/usr/bin/env bash
# v2.21.0 (N1): builds the web app for the Android shell and copies it into android/.
#   release → prod web build, data root "data"        (what Google Play gets: internal testing, pilot, production)
#   debug   → build web build, data root "data_build" (developers' emulators only; never uploaded to Play)
# Then checks the bundled files (scripts/check-native.mjs): the same guard idea as the Pages deploy — a release that
# points at data_build, or a debug that points at real data, stops here.
# v2.29.0: the iPhone app too — the same web build and the same guard (Xcode also runs it before every build).
# Usage: scripts/build-native.sh release|debug [android|ios]   (default android)
set -euo pipefail
VARIANT="${1:?release or debug}"
PLATFORM="${2:-android}"
case "$VARIANT" in
  release) ENV=prod;  ROOT=data ;;
  debug)   ENV=build; ROOT=data_build ;;
  *) echo "usage: $0 release|debug" >&2; exit 2 ;;
esac
cd "$(dirname "$0")/.."
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo local)
echo "== native $VARIANT: web env $ENV, data root $ROOT, $SHA"
VITE_APP_ENV=$ENV VITE_DATA_ROOT=$ROOT VITE_BUILD_SHA=$SHA VITE_NATIVE=1 \
  npx vite build --base ./ --outDir dist-native --emptyOutDir --logLevel warn
case "$PLATFORM" in
  android) npx cap sync android; node scripts/check-native.mjs "$VARIANT" android/app/src/main/assets/public ;;
  ios)     npx cap sync ios;     node scripts/check-native.mjs "$VARIANT" ios/App/App/public ;;
  *) echo "platform: android or ios" >&2; exit 2 ;;
esac
