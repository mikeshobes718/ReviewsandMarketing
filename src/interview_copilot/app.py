import threading
import queue
import tempfile
import traceback
import tkinter as tk
from tkinter import ttk, messagebox
import webbrowser
import os

from .config import load_config
from .audio import record_to_wav_tempfile, StreamRecorder, RollingMic
from .openai_client import make_client, transcribe_file, chat_complete
from .suggester import build_system_prompt, build_user_prompt
from .menubar import start_menubar


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("InterviewCopilot")
        self.geometry("560x520")
        self.minsize(520, 480)
        try:
            self.iconname("InterviewCopilot")
        except Exception:
            pass
        self.attributes("-topmost", True)

        # State
        try:
            self.cfg = load_config()
            self.client = make_client(self.cfg.openai_api_key)
            self.config_loaded = True
        except Exception as e:
            self.config_loaded = False
            self.cfg = None
            self.client = None
            messagebox.showwarning(
                "Config missing",
                "OPENAI_API_KEY is not set. Create a .env file with your key.\n"
                "See README for setup.",
            )

        self.style_var = tk.StringVar(value="Concise")
        self.seconds_var = tk.IntVar(value=10)
        self.status_var = tk.StringVar(value="Ready")

        self._worker = None
        self._q = queue.Queue()
        self._stream_recorder: StreamRecorder | None = None
        self._is_hold_recording = False
        self._pressed_tokens = set()
        self._ptt_required_tokens = set()
        self._hotkeys_label = None
        self._hold_label = None
        self._question_label = None
        self._rolling_mic: RollingMic | None = None
        self._rolling_thread: threading.Thread | None = None
        self._rolling_stop = threading.Event()
        self._last_suggest_ts = 0.0
        self._last_transcript_snippet = ""
        self._input_devices = []
        self._output_devices = []

        self._build_ui()

        # Keybindings (window-focused)
        self.bind_all("<Command-Shift-s>", lambda e: self.on_capture(10))
        self.bind_all("<Control-Shift-s>", lambda e: self.on_capture(10))

        self.after(100, self._poll_queue)
        # Start global hotkey listener if configured
        if self.config_loaded:
            self._start_global_hotkeys()
            # Global hold listener can be unstable on latest macOS; gate with config
            if getattr(self.cfg, 'ptt_global_enabled', False):
                self._start_ptt_hold_listener()
            # Always provide a focused hold-to-talk binding (no accessibility needed)
            self._start_ptt_hold_bindings()
            if self.cfg.menubar_enabled:
                start_menubar(self)

        # Graceful shutdown
        self.protocol("WM_DELETE_WINDOW", self._on_quit)

    def _build_ui(self):
        pad = {"padx": 8, "pady": 6}

        top = ttk.Frame(self)
        top.pack(fill=tk.X)

        ttk.Label(top, text="Style:").pack(side=tk.LEFT, **pad)
        style = ttk.Combobox(top, textvariable=self.style_var, values=["Concise", "STAR", "Technical"], width=12)
        style.state(["readonly"])
        style.pack(side=tk.LEFT)

        ttk.Label(top, text="Seconds:").pack(side=tk.LEFT, **pad)
        secs = ttk.Spinbox(top, from_=3, to=30, textvariable=self.seconds_var, width=5)
        secs.pack(side=tk.LEFT)

        self.capture_btn = ttk.Button(top, text="Transcribe + Suggest", command=lambda: self.on_capture(self.seconds_var.get()))
        self.capture_btn.pack(side=tk.LEFT, **pad)

        ttk.Button(top, text="Settings", command=self._open_settings).pack(side=tk.RIGHT, **pad)
        ttk.Button(top, text="Help", command=self._open_help).pack(side=tk.RIGHT, **pad)

        # Row 2: hold-to-talk toggle
        top2 = ttk.Frame(self)
        top2.pack(fill=tk.X)
        self.ptt_enabled_var = tk.BooleanVar(value=getattr(self.cfg, "ptt_hold_enabled", True) if self.config_loaded else True)
        chk = ttk.Checkbutton(top2, text="Hold-to-talk", variable=self.ptt_enabled_var, command=self._toggle_hold_checked)
        chk.pack(side=tk.LEFT, **pad)

        # Input device picker + Rolling toggle
        ttk.Label(top2, text="Input:").pack(side=tk.LEFT, padx=(18, 4))
        self.device_var = tk.StringVar(value="")
        self.device_combo = ttk.Combobox(top2, textvariable=self.device_var, width=30)
        self.device_combo.pack(side=tk.LEFT)
        ttk.Button(top2, text="Refresh", command=self._refresh_devices).pack(side=tk.LEFT, padx=(4, 4))
        ttk.Label(top2, text="Output:").pack(side=tk.LEFT, padx=(12, 4))
        self.output_var = tk.StringVar(value="")
        self.output_combo = ttk.Combobox(top2, textvariable=self.output_var, width=30)
        self.output_combo.pack(side=tk.LEFT)
        ttk.Button(top2, text="Test", command=self._open_device_test).pack(side=tk.LEFT, padx=(0, 8))
        self.rolling_var = tk.BooleanVar(value=getattr(self.cfg, "rolling_enabled", False))
        self.rolling_btn = ttk.Checkbutton(top2, text="Rolling Mode", variable=self.rolling_var, command=self._toggle_rolling)
        self.rolling_btn.pack(side=tk.LEFT, **pad)
        self.question_only_var = tk.BooleanVar(value=getattr(self.cfg, "rolling_question_only", True))
        ttk.Checkbutton(top2, text="Questions only", variable=self.question_only_var).pack(side=tk.LEFT, **pad)

        status_f = ttk.Frame(self)
        status_f.pack(fill=tk.X)
        ttk.Label(status_f, textvariable=self.status_var).pack(side=tk.LEFT, **pad)
        # Show configured global hotkeys
        if self.config_loaded and getattr(self.cfg, "global_hotkeys", None):
            ttk.Label(status_f, text="Hotkeys:").pack(side=tk.LEFT, padx=(18, 4))
            self._hotkeys_label = ttk.Label(status_f, text=", ".join(self.cfg.global_hotkeys), foreground="#555")
            self._hotkeys_label.pack(side=tk.LEFT)
        if self.config_loaded and self.cfg.ptt_hold_enabled:
            focused_key = getattr(self.cfg, 'ptt_focused_key', 'F9')
            suffix = ' (focused)'
            self._hold_label = ttk.Label(status_f, text=f"Hold: {focused_key}{suffix}", foreground="#555")
            self._hold_label.pack(side=tk.LEFT, padx=(18, 0))
        self._status_bar = status_f

        # Question detected badge (starts idle)
        ttk.Label(status_f, text="Question:").pack(side=tk.LEFT, padx=(18, 4))
        self._question_label = ttk.Label(status_f, text="idle", foreground="#888")
        self._question_label.pack(side=tk.LEFT)

        # Transcript box
        ttk.Label(self, text="Transcript:").pack(anchor=tk.W, **pad)
        self.transcript_box = tk.Text(self, height=7, wrap=tk.WORD)
        self.transcript_box.pack(fill=tk.BOTH, expand=False, **pad)

        # Suggestions box
        ttk.Label(self, text="Suggestions:").pack(anchor=tk.W, **pad)
        self.suggest_box = tk.Text(self, height=14, wrap=tk.WORD)
        self.suggest_box.pack(fill=tk.BOTH, expand=True, **pad)

        actions = ttk.Frame(self)
        actions.pack(fill=tk.X)
        ttk.Button(actions, text="Copy All", command=self.copy_all).pack(side=tk.LEFT, **pad)
        ttk.Button(actions, text="Clear", command=self.clear_all).pack(side=tk.LEFT, **pad)

        hint = ttk.Label(
            self,
            text="Shortcut: Cmd+Shift+S (mac) / Ctrl+Shift+S (win/linux) for quick 10s capture",
            foreground="#666",
        )
        hint.pack(anchor=tk.W, padx=8, pady=(0, 8))

        # Load devices after UI init
        self.after(200, self._refresh_devices)

    def _open_help(self):
        webbrowser.open_new_tab("https://platform.openai.com/")

    def set_status(self, text: str):
        self.status_var.set(text)
        self.update_idletasks()

    def on_capture(self, seconds: int):
        if not self.config_loaded:
            messagebox.showerror("Missing API key", "Please configure OPENAI_API_KEY in a .env file.")
            return
        if self._worker and self._worker.is_alive():
            return
        if seconds <= 0:
            seconds = max(1, self.cfg.capture_seconds)

        self.capture_btn.state(["disabled"])  # disable during work
        self.set_status(f"Recording {seconds}s... grant mic permission if prompted")
        self._worker = threading.Thread(target=self._do_capture_and_suggest, args=(seconds,), daemon=True)
        self._worker.start()

    def _do_capture_and_suggest(self, seconds: int):
        try:
            wav_path = record_to_wav_tempfile(seconds=seconds, samplerate=self.cfg.sample_rate)
            self._process_wav_for_suggestions(wav_path)
        except Exception as e:
            err = f"Error: {e}"
            self._q.put(("error", err))
        finally:
            try:
                if 'wav_path' in locals() and wav_path and os.path.exists(wav_path):
                    os.unlink(wav_path)
            except Exception:
                pass

    def _process_wav_for_suggestions(self, wav_path: str):
        self._q.put(("status", f"Transcribing ({self.cfg.transcribe_model})..."))
        transcript = transcribe_file(self.client, wav_path, model=self.cfg.transcribe_model)
        self._q.put(("transcript", transcript))

        self._q.put(("status", f"Generating suggestions ({self.cfg.suggest_model})..."))
        system = build_system_prompt(self.style_var.get())
        user = build_user_prompt(transcript)
        suggestions = chat_complete(
            self.client,
            model=self.cfg.suggest_model,
            system_prompt=system,
            user_prompt=user,
            temperature=0.3,
        )
        self._q.put(("suggestions", suggestions or "(No suggestions returned)"))
        self._q.put(("status", "Done"))

    def _poll_queue(self):
        try:
            while True:
                kind, payload = self._q.get_nowait()
                if kind == "status":
                    self.set_status(payload)
                elif kind == "transcript":
                    self.transcript_box.delete("1.0", tk.END)
                    self.transcript_box.insert(tk.END, payload)
                elif kind == "suggestions":
                    self.suggest_box.delete("1.0", tk.END)
                    self.suggest_box.insert(tk.END, payload)
                    self.capture_btn.state(["!disabled"])  # re-enable
                elif kind == "question":
                    # payload is bool
                    self._set_question_badge(bool(payload))
                elif kind == "error":
                    self.capture_btn.state(["!disabled"])  # re-enable
                    self.set_status("Error")
                    messagebox.showerror("InterviewCopilot", str(payload))
        except queue.Empty:
            pass
        self.after(120, self._poll_queue)

    # Devices
    def _refresh_devices(self):
        try:
            import sounddevice as sd
            devs = sd.query_devices()
            in_opts = []
            out_opts = []
            for idx, d in enumerate(devs):
                name = d.get('name', f'Device {idx}')
                if int(d.get('max_input_channels') or 0) > 0:
                    in_opts.append((idx, f"{idx}: {name}"))
                if int(d.get('max_output_channels') or 0) > 0:
                    out_opts.append((idx, f"{idx}: {name}"))
            self._input_devices = in_opts
            self._output_devices = out_opts
            self.device_combo['values'] = [label for _, label in in_opts]
            self.output_combo['values'] = [label for _, label in out_opts]
            # Preselect from cfg
            if self.cfg and self.cfg.input_device_index is not None:
                for idx, label in in_opts:
                    if idx == self.cfg.input_device_index:
                        self.device_var.set(label)
                        break
            if self.cfg and self.cfg.output_device_index is not None:
                for idx, label in out_opts:
                    if idx == self.cfg.output_device_index:
                        self.output_var.set(label)
                        break
        except Exception as e:
            self.set_status(f"Device refresh failed: {e}")

    def copy_all(self):
        text = self.suggest_box.get("1.0", tk.END).strip()
        if text:
            self.clipboard_clear()
            self.clipboard_append(text)
            self.set_status("Copied suggestions to clipboard")

    def clear_all(self):
        self.transcript_box.delete("1.0", tk.END)
        self.suggest_box.delete("1.0", tk.END)
        self.set_status("Cleared")

    # Rolling mode
    def _toggle_rolling(self):
        on = bool(self.rolling_var.get())
        if on:
            self._start_rolling()
        else:
            self._stop_rolling()

    def _resolve_selected_device_index(self) -> int | None:
        label = self.device_var.get().strip()
        if not label:
            return self.cfg.input_device_index
        try:
            prefix = label.split(":", 1)[0]
            return int(prefix)
        except Exception:
            return self.cfg.input_device_index

    def _resolve_selected_output_device_index(self) -> int | None:
        label = getattr(self, 'output_var', None)
        label = label.get().strip() if label else ''
        if not label:
            return getattr(self.cfg, 'output_device_index', None)
        try:
            prefix = label.split(":", 1)[0]
            return int(prefix)
        except Exception:
            return getattr(self.cfg, 'output_device_index', None)

    def _start_rolling(self):
        if not self.config_loaded:
            messagebox.showerror("Missing API key", "Please configure OPENAI_API_KEY in a .env file.")
            self.rolling_var.set(False)
            return
        if self._rolling_thread and self._rolling_thread.is_alive():
            return
        device = self._resolve_selected_device_index()
        self._rolling_mic = RollingMic(
            samplerate=self.cfg.sample_rate,
            channels=1,
            device=device,
            buffer_seconds=max(self.cfg.rolling_window_seconds * 2, 12),
        )
        try:
            self._rolling_mic.start()
        except Exception as e:
            self.set_status(f"Rolling start failed: {e}")
            self.rolling_var.set(False)
            self._rolling_mic = None
            return
        self._rolling_stop.clear()
        self._last_suggest_ts = 0.0
        self._last_transcript_snippet = ""
        self._rolling_thread = threading.Thread(target=self._rolling_loop, daemon=True)
        self._rolling_thread.start()
        self.set_status("Rolling ON")

    def _stop_rolling(self):
        self._rolling_stop.set()
        try:
            if self._rolling_mic:
                self._rolling_mic.stop()
        except Exception:
            pass
        self._rolling_mic = None
        self.set_status("Rolling OFF")

    def _rolling_loop(self):
        import time
        step = max(1, self.cfg.rolling_step_seconds)
        window = max(2, self.cfg.rolling_window_seconds)
        min_gap = max(3, self.cfg.rolling_min_suggest_gap)
        while not self._rolling_stop.is_set():
            try:
                path = self._rolling_mic.last_wav_tempfile(window) if self._rolling_mic else None
                if path:
                    transcript = transcribe_file(self.client, path, model=self.cfg.transcribe_model)
                else:
                    transcript = ""
                if path:
                    try: os.unlink(path)
                    except Exception: pass

                text = transcript.strip()
                # Skip tiny chunks
                if len(text.split()) < 4:
                    self._q.put(("question", False))
                    time.sleep(step)
                    continue

                # Heuristic: only trigger on questions if enabled
                if self.question_only_var.get() and not self._looks_like_question(text):
                    # Update transcript box but skip suggestions
                    self._q.put(("transcript", text))
                    self._q.put(("question", False))
                    time.sleep(step)
                    continue

                now = time.time()
                if now - self._last_suggest_ts < min_gap:
                    # Still indicate question state when suppressed by cooldown
                    self._q.put(("question", True))
                    time.sleep(step)
                    continue

                if text and text != self._last_transcript_snippet:
                    self._q.put(("transcript", text))
                    self._q.put(("question", True))
                    system = build_system_prompt(self.style_var.get())
                    user = build_user_prompt(text)
                    suggestions = chat_complete(
                        self.client,
                        model=self.cfg.suggest_model,
                        system_prompt=system,
                        user_prompt=user,
                        temperature=0.3,
                    )
                    self._q.put(("suggestions", suggestions or "(No suggestions returned)"))
                    self._last_transcript_snippet = text
                    self._last_suggest_ts = now
            except Exception as e:
                self._q.put(("status", f"Rolling error: {e}"))
            finally:
                time.sleep(step)

    def _set_question_badge(self, is_question: bool):
        if not self._question_label:
            return
        if is_question:
            self._question_label.config(text="detected", foreground="#00875a")
        else:
            self._question_label.config(text="idle", foreground="#888")

    def _looks_like_question(self, text: str) -> bool:
        try:
            import re
            t = text.strip()
            if not t:
                return False
            # Direct question mark near end
            if '?' in t[-200:]:
                return True
            # Take last sentence-ish
            parts = re.split(r'[.!?]\s+', t)
            last = parts[-1].strip().lower()
            if not last:
                return False
            # Keywords and auxiliaries
            wh = (
                'what', 'why', 'how', 'when', 'where', 'who', 'whom', 'whose', 'which'
            )
            aux = (
                'can', 'could', 'would', 'will', 'do', 'does', 'did', 'is', 'are', 'am',
                'was', 'were', 'have', 'has', 'should', 'may', 'might'
            )
            phrases = (
                'tell me about', 'walk me through', 'could you explain', 'please explain',
                'what about', 'what is your', 'how would you', 'how do you', 'why did you'
            )
            words = last.split()
            if not words:
                return False
            # Starts with WH or auxiliary → likely a question
            if words[0] in wh or words[0] in aux:
                return True
            # Contains indicative phrases
            for p in phrases:
                if p in last:
                    return True
            # Ends with up‑speak keywords
            if last.endswith((' right', ' correct', ' okay', ' ok')):
                return True
            return False
        except Exception:
            return False

    def _start_global_hotkeys(self):
        try:
            from pynput import keyboard
        except Exception as e:
            self.set_status(f"Global hotkey unavailable: {e}")
            return

        combos = {}
        for combo in (self.cfg.global_hotkeys or []):
            c = combo.strip()
            if not c:
                continue
            combos[c] = lambda c=c: self.on_capture(self.seconds_var.get())

        if not combos:
            return

        try:
            self._hotkey_listener = keyboard.GlobalHotKeys(combos)
            self._hotkey_listener.start()
            self.set_status("Ready (global hotkey active)")
        except Exception as e:
            self.set_status(f"Hotkey init failed: {e}")

    def _restart_global_hotkeys(self):
        try:
            if hasattr(self, "_hotkey_listener") and self._hotkey_listener:
                self._hotkey_listener.stop()
        except Exception:
            pass
        self._start_global_hotkeys()

    # Hold-to-talk implementation
    def _start_ptt_hold_listener(self):
        if not self.cfg.ptt_hold_enabled:
            return
        try:
            from pynput import keyboard
        except Exception as e:
            self.set_status(f"Hold key unavailable: {e}")
            return

        def token_for(key) -> str:
            try:
                # Special key
                name = getattr(key, 'name', None)
                if name:
                    return name.lower()
                # Char key
                ch = getattr(key, 'char', None)
                if ch:
                    return ch.lower()
            except Exception:
                pass
            return str(key).lower()

        def parse_combo(combo: str) -> set[str]:
            parts = [p.strip().lower() for p in combo.replace('>', '').replace('<', '').split('+') if p.strip()]
            keymap = {
                'cmd': 'cmd', 'command': 'cmd', 'win': 'cmd', 'super': 'cmd',
                'ctrl': 'ctrl', 'control': 'ctrl', 'alt': 'alt', 'option': 'alt', 'opt': 'alt',
                'shift': 'shift', 'space': 'space', 'tab': 'tab', 'esc': 'esc', 'escape': 'esc',
                'enter': 'enter', 'return': 'enter', 'backspace': 'backspace', 'delete': 'delete',
                'up': 'up', 'down': 'down', 'left': 'left', 'right': 'right',
            }
            out = set()
            for p in parts:
                p = keymap.get(p, p)
                out.add(p)
            return out

        self._ptt_required_tokens = parse_combo(self.cfg.ptt_hold_combo)

        def on_press(key):
            t = token_for(key)
            self._pressed_tokens.add(t)
            if self._is_hold_recording:
                return
            if self._ptt_required_tokens and self._ptt_required_tokens.issubset(self._pressed_tokens):
                # Start recording stream
                try:
                    self._stream_recorder = StreamRecorder(samplerate=self.cfg.sample_rate, channels=1)
                    self._stream_recorder.start()
                    self._is_hold_recording = True
                    self._q.put(("status", f"Recording (hold)... {self.cfg.ptt_hold_combo}"))
                except Exception as e:
                    self._q.put(("error", f"PTT start failed: {e}"))

        def on_release(key):
            t = token_for(key)
            if t in self._pressed_tokens:
                self._pressed_tokens.remove(t)
            if self._is_hold_recording and (not self._ptt_required_tokens.issubset(self._pressed_tokens)):
                # Stop and process
                self._is_hold_recording = False
                rec = self._stream_recorder
                self._stream_recorder = None
                if rec:
                    try:
                        wav = rec.stop_and_save()
                    except Exception as e:
                        self._q.put(("error", f"PTT stop failed: {e}"))
                        wav = None
                    if wav:
                        # Spawn worker to transcribe/process
                        def worker(path=wav):
                            try:
                                self._process_wav_for_suggestions(path)
                            finally:
                                try:
                                    if os.path.exists(path):
                                        os.unlink(path)
                                except Exception:
                                    pass
                        threading.Thread(target=worker, daemon=True).start()
                    else:
                        self._q.put(("status", "Hold too short; ignored"))

        try:
            self._ptt_listener = keyboard.Listener(on_press=on_press, on_release=on_release)
            self._ptt_listener.start()
        except Exception as e:
            self.set_status(f"Hold listener failed: {e}")

    def _stop_ptt_hold_listener(self):
        try:
            if hasattr(self, "_ptt_listener") and self._ptt_listener:
                self._ptt_listener.stop()
        except Exception:
            pass

    def _restart_ptt_hold_listener(self):
        self._stop_ptt_hold_listener()
        if self.cfg.ptt_hold_enabled and getattr(self.cfg, 'ptt_global_enabled', False):
            self._start_ptt_hold_listener()

    # Focused hold-to-talk using Tk key bindings (safe across macOS)
    def _start_ptt_hold_bindings(self):
        if not self.cfg.ptt_hold_enabled:
            return
        key = getattr(self.cfg, 'ptt_focused_key', 'F9')
        key = key.upper()
        press_event = f"<KeyPress-{key}>"
        release_event = f"<KeyRelease-{key}>"

        def on_press(_evt=None):
            if self._is_hold_recording:
                return
            try:
                self._stream_recorder = StreamRecorder(samplerate=self.cfg.sample_rate, channels=1)
                self._stream_recorder.start()
                self._is_hold_recording = True
                self._q.put(("status", f"Recording (hold) ... {key}"))
            except Exception as e:
                self._q.put(("error", f"PTT start failed: {e}"))

        def on_release(_evt=None):
            if not self._is_hold_recording:
                return
            self._is_hold_recording = False
            rec = self._stream_recorder
            self._stream_recorder = None
            if rec:
                try:
                    wav = rec.stop_and_save()
                except Exception as e:
                    self._q.put(("error", f"PTT stop failed: {e}"))
                    wav = None
                if wav:
                    def worker(path=wav):
                        try:
                            self._process_wav_for_suggestions(path)
                        finally:
                            try:
                                if os.path.exists(path):
                                    os.unlink(path)
                            except Exception:
                                pass
                    threading.Thread(target=worker, daemon=True).start()
                else:
                    self._q.put(("status", "Hold too short; ignored"))

        # Bind to the toplevel so it works when window is focused
        try:
            self.bind(press_event, lambda e: on_press())
            self.bind(release_event, lambda e: on_release())
        except Exception:
            pass

    def _on_quit(self):
        try:
            if hasattr(self, "_hotkey_listener") and self._hotkey_listener:
                self._hotkey_listener.stop()
            if hasattr(self, "_ptt_listener") and self._ptt_listener:
                self._ptt_listener.stop()
        except Exception:
            pass
        self.destroy()

    # UI events
    def _toggle_hold_checked(self):
        enabled = bool(self.ptt_enabled_var.get())
        if not self.config_loaded:
            return
        self.cfg.ptt_hold_enabled = enabled
        self._restart_ptt_hold_listener()
        self._start_ptt_hold_bindings()
        # Update status label
        if enabled:
            if self._hold_label is None and hasattr(self, "_status_bar"):
                focused_key = getattr(self.cfg, 'ptt_focused_key', 'F9')
                self._hold_label = ttk.Label(self._status_bar, text=f"Hold: {focused_key} (focused)", foreground="#555")
                self._hold_label.pack(side=tk.LEFT, padx=(18, 0))
            self.set_status(f"Hold enabled ({focused_key})")
        else:
            if self._hold_label is not None:
                try:
                    self._hold_label.destroy()
                except Exception:
                    pass
                self._hold_label = None
            self.set_status("Hold disabled")

    def _open_settings(self):
        SettingsDialog(self)

    def _open_device_test(self):
        try:
            DeviceTestDialog(self)
        except Exception as e:
            self.set_status(f"Device test failed: {e}")


class SettingsDialog(tk.Toplevel):
    def __init__(self, app: App):
        super().__init__(app)
        self.app = app
        self.title("Settings")
        self.geometry("520x360")
        self.resizable(False, False)
        self.transient(app)
        self.grab_set()

        pad = {"padx": 10, "pady": 6}

        frm = ttk.Frame(self)
        frm.pack(fill=tk.BOTH, expand=True)

        # Global Hotkeys
        ttk.Label(frm, text="Global Hotkeys (comma-separated)").grid(row=0, column=0, sticky=tk.W, **pad)
        self.hotkeys_var = tk.StringVar(value=", ".join(app.cfg.global_hotkeys))
        ttk.Entry(frm, textvariable=self.hotkeys_var, width=50).grid(row=0, column=1, sticky=tk.W, **pad)

        # Hold-to-talk
        self.hold_enabled_var = tk.BooleanVar(value=app.cfg.ptt_hold_enabled)
        ttk.Checkbutton(frm, text="Enable Hold-to-talk", variable=self.hold_enabled_var).grid(row=1, column=0, sticky=tk.W, **pad)
        ttk.Label(frm, text="Hold Combo").grid(row=1, column=1, sticky=tk.W, **pad)
        self.hold_combo_var = tk.StringVar(value=app.cfg.ptt_hold_combo)
        ttk.Entry(frm, textvariable=self.hold_combo_var, width=20).grid(row=1, column=1, sticky=tk.E, **pad)

        # Menubar
        self.menubar_var = tk.BooleanVar(value=app.cfg.menubar_enabled)
        ttk.Checkbutton(frm, text="Enable Menu Bar (macOS)", variable=self.menubar_var).grid(row=2, column=0, sticky=tk.W, **pad)

        # Capture seconds
        ttk.Label(frm, text="Default Capture Seconds").grid(row=3, column=0, sticky=tk.W, **pad)
        self.seconds_var = tk.IntVar(value=app.cfg.capture_seconds)
        ttk.Spinbox(frm, from_=3, to=60, textvariable=self.seconds_var, width=6).grid(row=3, column=1, sticky=tk.W, **pad)

        # Rolling mode options
        ttk.Label(frm, text="Rolling Window (s)").grid(row=4, column=0, sticky=tk.W, **pad)
        self.roll_window_var = tk.IntVar(value=app.cfg.rolling_window_seconds)
        ttk.Spinbox(frm, from_=3, to=20, textvariable=self.roll_window_var, width=6).grid(row=4, column=1, sticky=tk.W, **pad)
        ttk.Label(frm, text="Rolling Step (s)").grid(row=5, column=0, sticky=tk.W, **pad)
        self.roll_step_var = tk.IntVar(value=app.cfg.rolling_step_seconds)
        ttk.Spinbox(frm, from_=1, to=10, textvariable=self.roll_step_var, width=6).grid(row=5, column=1, sticky=tk.W, **pad)
        ttk.Label(frm, text="Suggest Gap (s)").grid(row=6, column=0, sticky=tk.W, **pad)
        self.roll_gap_var = tk.IntVar(value=app.cfg.rolling_min_suggest_gap)
        ttk.Spinbox(frm, from_=3, to=30, textvariable=self.roll_gap_var, width=6).grid(row=6, column=1, sticky=tk.W, **pad)
        ttk.Label(frm, text="Input Device Index").grid(row=7, column=0, sticky=tk.W, **pad)
        self.input_dev_var = tk.StringVar(value="" if app.cfg.input_device_index is None else str(app.cfg.input_device_index))
        ttk.Entry(frm, textvariable=self.input_dev_var, width=10).grid(row=7, column=1, sticky=tk.W, **pad)
        ttk.Label(frm, text="Output Device Index").grid(row=8, column=0, sticky=tk.W, **pad)
        self.output_dev_var = tk.StringVar(value="" if getattr(app.cfg, 'output_device_index', None) is None else str(app.cfg.output_device_index))
        ttk.Entry(frm, textvariable=self.output_dev_var, width=10).grid(row=8, column=1, sticky=tk.W, **pad)

        # Buttons
        btns = ttk.Frame(self)
        btns.pack(fill=tk.X)
        ttk.Button(btns, text="Cancel", command=self.destroy).pack(side=tk.RIGHT, padx=8, pady=8)
        ttk.Button(btns, text="Save", command=self._save).pack(side=tk.RIGHT, padx=8, pady=8)

    def _save(self):
        from .config import save_to_env
        try:
            # Gather
            hotkeys_str = self.hotkeys_var.get().strip()
            hotkeys = [h.strip() for h in hotkeys_str.split(',') if h.strip()]
            hold_enabled = bool(self.hold_enabled_var.get())
            hold_combo = self.hold_combo_var.get().strip() or 'f9'
            menubar_enabled = bool(self.menubar_var.get())
            seconds = int(self.seconds_var.get() or 10)
            roll_window = int(self.roll_window_var.get() or 6)
            roll_step = int(self.roll_step_var.get() or 2)
            roll_gap = int(self.roll_gap_var.get() or 6)
            input_dev = self.input_dev_var.get().strip()
            input_dev_index = int(input_dev) if input_dev else None
            output_dev = self.output_dev_var.get().strip()
            output_dev_index = int(output_dev) if output_dev else None
            question_only = bool(self.app.question_only_var.get())

            # Update in-memory cfg
            app = self.app
            app.cfg.global_hotkeys = hotkeys
            app.cfg.ptt_hold_enabled = hold_enabled
            app.cfg.ptt_hold_combo = hold_combo
            app.cfg.menubar_enabled = menubar_enabled
            app.cfg.capture_seconds = seconds
            app.cfg.rolling_window_seconds = roll_window
            app.cfg.rolling_step_seconds = roll_step
            app.cfg.rolling_min_suggest_gap = roll_gap
            app.cfg.input_device_index = input_dev_index
            app.cfg.output_device_index = output_dev_index
            app.cfg.rolling_question_only = question_only
            app.seconds_var.set(seconds)

            # Restart listeners
            app._restart_global_hotkeys()
            app._restart_ptt_hold_listener()
            # Update labels
            if app._hotkeys_label is not None:
                app._hotkeys_label.config(text=", ".join(hotkeys))
            if hold_enabled:
                if app._hold_label is None:
                    # create anew in status bar
                    app._hold_label = ttk.Label(app, text=f"Hold: {hold_combo}", foreground="#555")
                    app._hold_label.pack()
                else:
                    app._hold_label.config(text=f"Hold: {hold_combo}")
            else:
                if app._hold_label is not None:
                    try:
                        app._hold_label.destroy()
                    except Exception:
                        pass
                    app._hold_label = None

            # Menubar toggle
            if hasattr(app, "_tray_icon") and app._tray_icon and not menubar_enabled:
                try:
                    app._tray_icon.stop()
                except Exception:
                    pass
                app._tray_icon = None
            elif menubar_enabled and getattr(app, "_tray_icon", None) is None:
                try:
                    start_menubar(app)
                except Exception:
                    pass

            # Persist to .env
            updates = {
                'GLOBAL_HOTKEYS': ",".join(hotkeys),
                'PTT_HOLD_ENABLED': hold_enabled,
                'PTT_HOLD_COMBO': hold_combo,
                'MENUBAR_ENABLED': menubar_enabled,
                'CAPTURE_SECONDS': seconds,
                'ROLLING_WINDOW_SECONDS': roll_window,
                'ROLLING_STEP_SECONDS': roll_step,
                'ROLLING_MIN_SUGGEST_GAP': roll_gap,
                'INPUT_DEVICE_INDEX': '' if input_dev_index is None else input_dev_index,
                'OUTPUT_DEVICE_INDEX': '' if output_dev_index is None else output_dev_index,
                'ROLLING_QUESTION_ONLY': question_only,
            }
            env_path = save_to_env(updates)
            app.set_status(f"Settings saved to {env_path}")
            self.destroy()
        except Exception as e:
            messagebox.showerror("Settings", f"Failed to save: {e}")


class DeviceTestDialog(tk.Toplevel):
    def __init__(self, app: App):
        super().__init__(app)
        self.app = app
        self.title("Device Test")
        self.geometry("520x260")
        self.resizable(False, False)
        self.transient(app)
        self.grab_set()

        self._mic: RollingMic | None = None
        self._level = 0.0
        self._ui_running = True

        pad = {"padx": 10, "pady": 6}
        frm = ttk.Frame(self); frm.pack(fill=tk.BOTH, expand=True)

        # Ensure device lists are fresh
        try:
            app._refresh_devices()
        except Exception:
            pass

        in_idx = app._resolve_selected_device_index()
        ttk.Label(frm, text=f"Input device index: {in_idx if in_idx is not None else 'default'}").pack(anchor=tk.W, **pad)

        # Output dropdown
        out_row = ttk.Frame(frm); out_row.pack(fill=tk.X)
        ttk.Label(out_row, text="Output device:").pack(side=tk.LEFT, padx=(10,6), pady=6)
        self._out_var = tk.StringVar()
        out_values = [label for _, label in getattr(app, '_output_devices', [])]
        self._out_combo = ttk.Combobox(out_row, textvariable=self._out_var, values=out_values, width=38)
        # Preselect currently chosen output if present
        sel = getattr(app, 'output_var', None)
        if sel and sel.get():
            self._out_var.set(sel.get())
        else:
            # fall back to cfg index
            cfg_idx = getattr(app.cfg, 'output_device_index', None)
            if cfg_idx is not None:
                for idx, label in getattr(app, '_output_devices', []):
                    if idx == cfg_idx:
                        self._out_var.set(label)
                        break
        self._out_combo.pack(side=tk.LEFT, padx=(0,8))
        self._out_combo.bind('<<ComboboxSelected>>', self._on_output_selected)
        ttk.Button(out_row, text="Use default", command=self._use_default_output).pack(side=tk.LEFT)

        # Level meter
        ttk.Label(frm, text="Input level").pack(anchor=tk.W, **pad)
        self._meter = ttk.Progressbar(frm, orient=tk.HORIZONTAL, mode='determinate', length=380, maximum=100)
        self._meter.pack(anchor=tk.W, padx=12, pady=(0, 10))
        self._status = ttk.Label(frm, text="Idle", foreground="#666"); self._status.pack(anchor=tk.W, padx=12)

        # Buttons
        btns = ttk.Frame(self); btns.pack(fill=tk.X)
        ttk.Button(btns, text="Start", command=self._start).pack(side=tk.LEFT, padx=8, pady=8)
        ttk.Button(btns, text="Stop", command=self._stop).pack(side=tk.LEFT, padx=8, pady=8)
        ttk.Button(btns, text="Play last 3s", command=self._play_last).pack(side=tk.LEFT, padx=8, pady=8)
        ttk.Button(btns, text="Close", command=self._close).pack(side=tk.RIGHT, padx=8, pady=8)

        # Ensure cleanup
        self.protocol("WM_DELETE_WINDOW", self._close)
        # Kick UI updater
        self.after(150, self._tick)

    def _start(self):
        if self._mic:
            return
        idx = self.app._resolve_selected_device_index()
        self._mic = RollingMic(samplerate=self.app.cfg.sample_rate, channels=1, device=idx, buffer_seconds=8)
        try:
            self._mic.start()
            self._status.config(text="Recording… (speak)", foreground="#0a6")
        except Exception as e:
            self._status.config(text=f"Error: {e}", foreground="#a00")
            self._mic = None

    def _stop(self):
        try:
            if self._mic:
                self._mic.stop()
        except Exception:
            pass
        self._mic = None
        self._status.config(text="Stopped", foreground="#666")

    def _play_last(self):
        try:
            import sounddevice as sd
            if not self._mic:
                self._start()
            data = self._mic.last_audio(3) if self._mic else None
            if data is None:
                self._status.config(text="No recent audio yet", foreground="#a60")
                return
            # Resolve from dialog dropdown first, then app toolbar selection
            out_idx = None
            label = self._out_var.get().strip() if hasattr(self, '_out_var') else ''
            if label:
                try:
                    out_idx = int(label.split(':',1)[0])
                except Exception:
                    out_idx = None
            if out_idx is None:
                out_idx = self.app._resolve_selected_output_device_index()
            if out_idx is None:
                sd.play(data, samplerate=self.app.cfg.sample_rate)
            else:
                sd.play(data, samplerate=self.app.cfg.sample_rate, device=out_idx)
            self._status.config(text="Playing last 3s…", foreground="#06a")
        except Exception as e:
            self._status.config(text=f"Play error: {e}", foreground="#a00")

    def _use_default_output(self):
        # Clear selection in dialog and toolbar to use default system output
        try:
            if hasattr(self, '_out_var'):
                self._out_var.set('')
            if hasattr(self.app, 'output_var'):
                self.app.output_var.set('')
        except Exception:
            pass
        self._status.config(text="Using default output", foreground="#666")

    def _on_output_selected(self, event=None):
        # Persist chosen output device index to app state and .env
        try:
            label = self._out_var.get().strip()
            idx = int(label.split(':',1)[0]) if label else None
        except Exception:
            idx = None
        # Update toolbar state
        try:
            if hasattr(self.app, 'output_var'):
                self.app.output_var.set(label)
        except Exception:
            pass
        # Update cfg and persist
        try:
            from .config import save_to_env
            self.app.cfg.output_device_index = idx
            updates = {'OUTPUT_DEVICE_INDEX': '' if idx is None else idx}
            save_to_env(updates)
            self._status.config(text=f"Output set to {label or 'default'} (saved)", foreground="#0a6")
        except Exception:
            self._status.config(text=f"Output set to {label or 'default'}", foreground="#0a6")

    def _tick(self):
        if not self._ui_running:
            return
        try:
            import numpy as np
            if self._mic:
                data = self._mic.last_audio(1)
                if data is not None and len(data) > 0:
                    # Compute RMS in dBFS-ish (since PCM_16 written; here float32 [-1,1])
                    rms = float(np.sqrt(np.mean(np.square(data))))
                    level = max(0.0, min(1.0, rms * 8.0))  # simple scale
                    self._meter['value'] = int(level * 100)
        except Exception:
            pass
        finally:
            self.after(150, self._tick)

    def _close(self):
        self._ui_running = False
        self._stop()
        self.destroy()


def main():
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()
