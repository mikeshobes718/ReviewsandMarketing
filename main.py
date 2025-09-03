import os
import sys

# Ensure local src/ is on import path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(BASE_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

import os
import sys
import subprocess


def _running_from_dmg() -> bool:
    try:
        if sys.platform != "darwin":
            return False
        exe = os.path.abspath(sys.executable if getattr(sys, "frozen", False) else __file__)
        return "/Volumes/" in exe
    except Exception:
        return False


def _mac_alert(title: str, message: str):
    if sys.platform != "darwin":
        return
    try:
        script = f'display dialog {message!r} with title {title!r} buttons {"{\"OK\"}"} default button 1'
        subprocess.run(["osascript", "-e", script], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass


def _bootstrap():
    if _running_from_dmg():
        # Try to self-install to /Applications (or ~/Applications) and relaunch
        try:
            exe = os.path.abspath(sys.executable if getattr(sys, "frozen", False) else __file__)
            app_bundle = os.path.abspath(os.path.join(os.path.dirname(exe), "..", ".."))
            app_name = os.path.basename(app_bundle)

            candidates = ["/Applications", os.path.expanduser("~/Applications")]
            installed_path = None
            for dest_root in candidates:
                try:
                    os.makedirs(dest_root, exist_ok=True)
                    dest_path = os.path.join(dest_root, app_name)
                    # Use 'ditto' to preserve bundle attributes
                    subprocess.run(["/usr/bin/ditto", app_bundle, dest_path], check=True)
                    installed_path = dest_path
                    break
                except Exception:
                    installed_path = None

            if installed_path:
                _mac_alert("InterviewCopilot", f"Installed to {installed_path}. Opening now…")
                subprocess.Popen(["open", installed_path])
            else:
                _mac_alert(
                    "Install InterviewCopilot",
                    "Could not auto-install. Please drag InterviewCopilot.app to Applications and run it from there."
                )
        except Exception:
            _mac_alert(
                "Install InterviewCopilot",
                "Please drag InterviewCopilot.app to Applications and run it from there."
            )
        return

    # Defer heavy imports until after the check
    from interview_copilot.app import main as _main
    _main()


if __name__ == "__main__":
    _bootstrap()
