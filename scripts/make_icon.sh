#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/make_icon.sh                 # generate a default IC logo
#   scripts/make_icon.sh path/to/icon.png # use your PNG as source

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS_DIR="$ROOT_DIR/assets"
ICONSET="$ASSETS_DIR/icon.iconset"
ICNS="$ASSETS_DIR/icon.icns"

mkdir -p "$ASSETS_DIR"
rm -rf "$ICONSET"
mkdir -p "$ICONSET"

BASE=base_icon_1024.png

if [[ $# -ge 1 && -f "$1" ]]; then
  SRC="$1"
  echo "Using custom source: $SRC"
  sips -s format png "$SRC" --out "$BASE" >/dev/null
  sips -z 1024 1024 "$BASE" >/dev/null
else
  echo "Generating default icon..."
  python3 - << 'PY'
from PIL import Image, ImageDraw, ImageFont
img = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.ellipse((64, 64, 960, 960), fill=(30, 144, 255, 255))
try:
    font = ImageFont.truetype("Arial.ttf", 360)
except Exception:
    font = ImageFont.load_default()
tw = d.textlength("IC", font=font)
th = 360
d.text(((1024-tw)/2, (1024-th)/2), "IC", font=font, fill=(255,255,255,255))
img.save('base_icon_1024.png')
PY
fi

# Create all required sizes
make_png() {
  local size=$1; local name=$2
  sips -z "$size" "$size" "$BASE" --out "$ICONSET/$name" >/dev/null
}

make_png 16  icon_16x16.png
make_png 32  icon_16x16@2x.png
make_png 32  icon_32x32.png
make_png 64  icon_32x32@2x.png
make_png 128 icon_128x128.png
make_png 256 icon_128x128@2x.png
make_png 256 icon_256x256.png
make_png 512 icon_256x256@2x.png
make_png 512 icon_512x512.png
make_png 1024 icon_512x512@2x.png

iconutil -c icns "$ICONSET" -o "$ICNS"
rm -f "$BASE"
echo "Icon generated at: $ICNS"
