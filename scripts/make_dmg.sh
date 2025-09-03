#!/usr/bin/env bash
set -euo pipefail

APP_NAME="InterviewCopilot"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
APP_PATH="$DIST_DIR/$APP_NAME.app"
DMG_PATH="$DIST_DIR/$APP_NAME.dmg"
STAGING="$DIST_DIR/dmg_staging"

if [[ ! -d "$APP_PATH" ]]; then
  echo "App not found at $APP_PATH. Build it first (scripts/build_mac_app.sh)." >&2
  exit 1
fi

rm -rf "$STAGING"
mkdir -p "$STAGING"
cp -R "$APP_PATH" "$STAGING/"
ln -sf /Applications "$STAGING/Applications"

echo "Creating DMG at $DMG_PATH ..."
rm -f "$DMG_PATH"
hdiutil create -volname "$APP_NAME" -srcfolder "$STAGING" -ov -format UDZO -imagekey zlib-level=9 "$DMG_PATH" >/dev/null
rm -rf "$STAGING"
echo "DMG created: $DMG_PATH"

