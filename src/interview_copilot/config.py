import os
import platform
from pathlib import Path
from dataclasses import dataclass, field
from dotenv import load_dotenv, find_dotenv, set_key


@dataclass
class AppConfig:
    openai_api_key: str
    transcribe_model: str = "whisper-1"
    suggest_model: str = "gpt-4o-mini"
    capture_seconds: int = 10
    sample_rate: int = 16000
    global_hotkeys: list[str] = field(default_factory=list)
    ptt_hold_enabled: bool = True
    ptt_hold_combo: str = "f9"
    ptt_global_enabled: bool = False
    ptt_focused_key: str = "F9"
    menubar_enabled: bool = True
    # Rolling mode
    rolling_enabled: bool = False
    rolling_window_seconds: int = 6
    rolling_step_seconds: int = 2
    rolling_min_suggest_gap: int = 6
    input_device_index: int | None = None
    rolling_question_only: bool = True
    output_device_index: int | None = None


def _env_bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    val = val.strip().lower()
    return val in {"1", "true", "yes", "on"}


def _default_env_dir() -> Path:
    system = platform.system()
    home = Path.home()
    if system == "Darwin":
        return home / "Library" / "Application Support" / "InterviewCopilot"
    # Linux/other
    return home / ".config" / "interviewcopilot"


def load_config() -> AppConfig:
    # Try common places so the packaged app finds config
    candidates = [
        Path.cwd() / ".env",
        _default_env_dir() / ".env",
        Path.home() / "Projects" / "InterviewCopilot" / ".env",
    ]
    loaded = False
    for p in candidates:
        try:
            if p.exists():
                load_dotenv(dotenv_path=str(p))
                loaded = True
                break
        except Exception:
            pass
    if not loaded:
        # Fallback to default lookup
        load_dotenv()

    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Create a .env with OPENAI_API_KEY=..."
        )

    cfg = AppConfig(
        openai_api_key=key,
        transcribe_model=os.getenv("TRANSCRIBE_MODEL", "whisper-1"),
        suggest_model=os.getenv("SUGGEST_MODEL", "gpt-4o-mini"),
        capture_seconds=int(os.getenv("CAPTURE_SECONDS", "10")),
        sample_rate=int(os.getenv("SAMPLE_RATE", "16000")),
    )
    # Global hotkeys (comma-separated), e.g.: <cmd>+<shift>+s,<ctrl>+<shift>+s
    hotkeys_env = os.getenv("GLOBAL_HOTKEYS", "<cmd>+<shift>+s,<ctrl>+<shift>+s")
    cfg.global_hotkeys = [h.strip() for h in hotkeys_env.split(",") if h.strip()]
    # Hold-to-talk
    cfg.ptt_hold_enabled = _env_bool("PTT_HOLD_ENABLED", True)
    cfg.ptt_hold_combo = os.getenv("PTT_HOLD_COMBO", "f9").strip()
    cfg.ptt_global_enabled = _env_bool("PTT_GLOBAL_ENABLED", False)
    cfg.ptt_focused_key = os.getenv("PTT_FOCUSED_KEY", "F9").strip()
    # Menubar
    cfg.menubar_enabled = _env_bool("MENUBAR_ENABLED", True)
    # Rolling
    cfg.rolling_enabled = _env_bool("ROLLING_ENABLED", False)
    cfg.rolling_window_seconds = int(os.getenv("ROLLING_WINDOW_SECONDS", "6"))
    cfg.rolling_step_seconds = int(os.getenv("ROLLING_STEP_SECONDS", "2"))
    cfg.rolling_min_suggest_gap = int(os.getenv("ROLLING_MIN_SUGGEST_GAP", "6"))
    cfg.rolling_question_only = _env_bool("ROLLING_QUESTION_ONLY", True)
    try:
        idev = os.getenv("INPUT_DEVICE_INDEX", "").strip()
        cfg.input_device_index = int(idev) if idev else None
    except Exception:
        cfg.input_device_index = None
    try:
        odev = os.getenv("OUTPUT_DEVICE_INDEX", "").strip()
        cfg.output_device_index = int(odev) if odev else None
    except Exception:
        cfg.output_device_index = None
    return cfg


def save_to_env(updates: dict) -> str:
    """Persist provided key/values to the nearest .env file.

    Returns the path of the .env file written. Creates it if missing.
    """
    # Prefer a stable location (Application Support on macOS; ~/.config elsewhere)
    env_dir = _default_env_dir()
    try:
        env_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    env_path = str(env_dir / ".env")
    def to_str(v):
        if isinstance(v, bool):
            return "true" if v else "false"
        return str(v)
    for k, v in updates.items():
        set_key(env_path, k, to_str(v))
    return env_path
