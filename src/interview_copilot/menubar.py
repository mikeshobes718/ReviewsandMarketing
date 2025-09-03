import platform


def start_menubar(app):
    """Start a macOS menu bar icon if possible.

    `app` is the Tk App instance; this runs the menu in a background thread.
    """
    if platform.system() != "Darwin":
        return
    try:
        import pystray
        from PIL import Image, ImageDraw, ImageFont
    except Exception:
        # Dependencies not installed; silently skip
        return

    # Create a small icon with 'IC'
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Simple circle + text
    d.ellipse((6, 6, 58, 58), fill=(30, 144, 255, 255))
    try:
        # Not guaranteed to find a font; fall back to default drawing
        font = ImageFont.load_default()
        d.text((20, 22), "IC", font=font, fill=(255, 255, 255, 255))
    except Exception:
        d.text((20, 22), "IC", fill=(255, 255, 255, 255))

    def do_capture():
        # Call Tk-safe
        app.after(0, lambda: app.on_capture(app.seconds_var.get()))

    def show():
        app.after(0, lambda: (app.deiconify(), app.lift()))

    def hide():
        app.after(0, lambda: app.withdraw())

    def quit_():
        try:
            icon.stop()
        except Exception:
            pass
        app.after(0, app._on_quit)

    menu = pystray.Menu(
        pystray.MenuItem("Capture", lambda: do_capture()),
        pystray.MenuItem("Show Window", lambda: show()),
        pystray.MenuItem("Hide Window", lambda: hide()),
        pystray.MenuItem("Quit", lambda: quit_()),
    )

    icon = pystray.Icon("InterviewCopilot", img, "InterviewCopilot", menu)
    icon.run_detached()
    # Keep reference on app to stop later if needed
    app._tray_icon = icon

