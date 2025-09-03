#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
APP_PATH="${1:-$DIST_DIR/InterviewCopilot.app}"

if [[ ! -d "$APP_PATH" ]]; then
  echo "App not found: $APP_PATH" >&2
  exit 1
fi

echo "== codesign -dv --verbose=4 =="
set +e
codesign -dv --verbose=4 "$APP_PATH" 2>&1 | sed 's/.*/  &/'
ec=$?
set -e
echo "(exit=$ec)"

echo "\n== spctl -a -vv --type exec =="
set +e
spctl -a -vv --type exec "$APP_PATH" 2>&1 | sed 's/.*/  &/'
ec=$?
set -e
echo "(exit=$ec)"

echo "\n== codesign --verify --deep --strict --verbose=2 =="
set +e
codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>&1 | sed 's/.*/  &/'
ec=$?
set -e
echo "(exit=$ec)"

echo "\nDone. If unsigned, run scripts/sign_and_notarize.sh with your CODESIGN_ID."

