#!/usr/bin/env bash
set -euo pipefail

APP_NAME="InterviewCopilot"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PY_BIN="${PY_BIN:-python3}"
if [[ -n "${1:-}" ]]; then
  PY_BIN="$1"
fi

echo "Using Python: $PY_BIN ($($PY_BIN -V 2>/dev/null || echo not found))"

if [[ ! -d .venv ]]; then
  "$PY_BIN" -m venv .venv
fi
source .venv/bin/activate
python -m pip install --upgrade pip >/dev/null
pip install -r requirements.txt >/dev/null
pip install pyinstaller >/dev/null

# Check Python and Tk versions to avoid Apple Tk 8.5 crashes
echo "Preflight: checking Python and Tk..."
python - <<'PY'
import sys
print('Python:', sys.version)
try:
    import tkinter as tk
    print('TkVersion:', tk.TkVersion)
    if tk.TkVersion < 8.6:
        print('ERROR: TkVersion < 8.6 (likely Apple Tk 8.5). Install Python 3.11/3.12 from python.org or Homebrew with tcl-tk, then rebuild.', file=sys.stderr)
        sys.exit(3)
except Exception as e:
    print('ERROR: tkinter import failed:', e, file=sys.stderr)
    sys.exit(4)
PY
if [[ $? -ne 0 ]]; then
  echo "Aborting build. Tip: download Python 3.12 from https://www.python.org/downloads/macos/ and run: \n  ./scripts/build_mac_app.sh /Library/Frameworks/Python.framework/Versions/3.12/bin/python3" >&2
  exit 1
fi

# Ensure an icon exists
if [[ ! -f assets/icon.icns ]]; then
  echo "No icon found; generating default icon..."
  ./scripts/make_icon.sh
fi

# Build the app using the spec file
pyinstaller interviewcopilot.spec --noconfirm

echo "Built app at: $ROOT_DIR/dist/${APP_NAME}.app"
