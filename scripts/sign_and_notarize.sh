#!/usr/bin/env bash
set -euo pipefail

# Signs the built app and optionally notarizes + staples it.
# Requirements:
# - macOS, Xcode CLT
# - Developer ID Application certificate installed in login keychain
# - Env vars:
#   CODESIGN_ID="Developer ID Application: Your Name (TEAMID)"
#   TEAM_ID="TEAMID"
#   (One of the notary auth methods below if you want notarization)
#   NOTARY_KEYCHAIN_PROFILE=NotaryProfile   # preferred, created via `xcrun notarytool store-credentials`
#       OR
#   APPLE_ID=you@example.com APP_SPECIFIC_PASSWORD=abcd-efgh-ijkl TEAM_ID=TEAMID
#       OR
#   NOTARY_API_KEY_ID=... NOTARY_API_ISSUER=... NOTARY_API_KEY_FILE=/path/to/AuthKey_XXXX.p8

APP_NAME="InterviewCopilot"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
APP_PATH="$DIST_DIR/$APP_NAME.app"
ZIP_PATH="$DIST_DIR/$APP_NAME.zip"
ENTITLEMENTS="$ROOT_DIR/scripts/entitlements.plist"

if [[ ! -e "$APP_PATH" ]]; then
  echo "App not found at $APP_PATH. Build it first (scripts/build_mac_app.sh)." >&2
  exit 1
fi

if [[ -z "${CODESIGN_ID:-}" ]]; then
  echo "CODESIGN_ID is required (e.g., 'Developer ID Application: Your Name (TEAMID)')." >&2
  exit 1
fi

echo "Signing $APP_PATH ..."
codesign --force --deep \
  --options runtime \
  --entitlements "$ENTITLEMENTS" \
  --sign "$CODESIGN_ID" \
  "$APP_PATH"

echo "Verifying signature ..."
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

echo "Zipping app ..."
rm -f "$ZIP_PATH"
ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

if [[ -n "${NOTARY_KEYCHAIN_PROFILE:-}" ]]; then
  echo "Submitting to notary service using keychain profile $NOTARY_KEYCHAIN_PROFILE ..."
  xcrun notarytool submit "$ZIP_PATH" --keychain-profile "$NOTARY_KEYCHAIN_PROFILE" --wait
elif [[ -n "${APPLE_ID:-}" && -n "${APP_SPECIFIC_PASSWORD:-}" && -n "${TEAM_ID:-}" ]]; then
  echo "Submitting to notary service using Apple ID ..."
  xcrun notarytool submit "$ZIP_PATH" --apple-id "$APPLE_ID" --password "$APP_SPECIFIC_PASSWORD" --team-id "$TEAM_ID" --wait
elif [[ -n "${NOTARY_API_KEY_ID:-}" && -n "${NOTARY_API_ISSUER:-}" && -n "${NOTARY_API_KEY_FILE:-}" ]]; then
  echo "Submitting to notary service using API key ..."
  xcrun notarytool submit "$ZIP_PATH" --key "$NOTARY_API_KEY_FILE" --key-id "$NOTARY_API_KEY_ID" --issuer "$NOTARY_API_ISSUER" --wait
else
  echo "Skipping notarization (no credentials provided). Set NOTARY_KEYCHAIN_PROFILE or APPLE_ID+APP_SPECIFIC_PASSWORD+TEAM_ID or API key vars." >&2
  exit 0
fi

echo "Stapling ticket ..."
xcrun stapler staple "$APP_PATH"
echo "Done: $APP_PATH"

