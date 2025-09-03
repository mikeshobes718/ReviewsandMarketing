#!/usr/bin/env bash
set -euo pipefail

APP_NAME="InterviewCopilot"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
ASSETS_DIR="$ROOT_DIR/assets"
APP_PATH="$DIST_DIR/$APP_NAME.app"
DMG_PATH="$DIST_DIR/$APP_NAME.dmg"
FANCY_DMG_PATH="$DIST_DIR/${APP_NAME}_fancy.dmg"
RW_DMG="$DIST_DIR/${APP_NAME}_temp.dmg"
STAGING="$DIST_DIR/dmg_staging"
MOUNT_POINT="$DIST_DIR/mnt_${APP_NAME}"
BG_IMG="$ASSETS_DIR/dmg_bg.png"

if [[ ! -d "$APP_PATH" ]]; then
  echo "App not found at $APP_PATH. Build it first (scripts/build_mac_app.sh)." >&2
  exit 1
fi

mkdir -p "$DIST_DIR" "$ASSETS_DIR"

if [[ ! -f "$BG_IMG" ]]; then
  echo "Generating default DMG background at $BG_IMG ..."
  python3 - << 'PY'
from PIL import Image, ImageDraw, ImageFont
W, H = 700, 460
img = Image.new('RGBA', (W, H), (18, 22, 28, 255))
d = ImageDraw.Draw(img)
# Accent circle
d.ellipse((W-200, 40, W-40, 200), fill=(30, 144, 255, 255))
title = "InterviewCopilot"
sub = "Drag to Applications"
try:
    font_title = ImageFont.truetype("Arial.ttf", 36)
    font_sub = ImageFont.truetype("Arial.ttf", 18)
except Exception:
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()
tw = d.textlength(title, font=font_title)
d.text((40, 40), title, font=font_title, fill=(230, 240, 255, 255))
d.text((40, 84), sub, font=font_sub, fill=(180, 190, 210, 255))
img.save('dmg_bg.png')
PY
  mv dmg_bg.png "$BG_IMG"
fi

echo "Preparing staging..."
rm -rf "$STAGING" "$RW_DMG" "$FANCY_DMG_PATH" "$MOUNT_POINT"
mkdir -p "$STAGING" "$MOUNT_POINT"
cp -R "$APP_PATH" "$STAGING/"
ln -sf /Applications "$STAGING/Applications"
mkdir -p "$STAGING/.background"
cp -f "$BG_IMG" "$STAGING/.background/dmg_bg.png"

echo "Creating temporary RW DMG ..."
hdiutil create -volname "$APP_NAME" -srcfolder "$STAGING" -ov -format UDRW "$RW_DMG" >/dev/null

echo "Mounting DMG ..."
hdiutil attach "$RW_DMG" -mountpoint "$MOUNT_POINT" -nobrowse -noverify -quiet

echo "Configuring Finder layout ..."
/usr/bin/osascript <<APPLESCRIPT
set mountPath to POSIX file "$MOUNT_POINT" as alias
tell application "Finder"
  tell folder mountPath
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set the bounds of container window to {100, 100, 800, 560}
    set viewOptions to the icon view options of container window
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to 96
    try
      set background picture of viewOptions to POSIX file "$MOUNT_POINT/.background/dmg_bg.png"
    end try
    set position of item "${APP_NAME}.app" of container window to {180, 260}
    set position of item "Applications" of container window to {480, 260}
    close
    open
    delay 1
    update without registering applications
    delay 1
  end tell
end tell
APPLESCRIPT

echo "Detaching ..."
hdiutil detach "$MOUNT_POINT" -quiet || { echo "Retrying detach..."; sleep 2; hdiutil detach "$MOUNT_POINT" -force -quiet; }

echo "Converting to compressed DMG ..."
rm -f "$FANCY_DMG_PATH"
hdiutil convert "$RW_DMG" -format UDZO -imagekey zlib-level=9 -o "$FANCY_DMG_PATH" >/dev/null

echo "Cleaning up ..."
rm -rf "$STAGING" "$RW_DMG" "$MOUNT_POINT"
echo "Fancy DMG created: $FANCY_DMG_PATH"
