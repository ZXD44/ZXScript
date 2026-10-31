# SPDX-License-Identifier: GPL-3.0-or-later
"""
bridge/constants.py - Configuration constants, ANSI styling, paths, and logger for ZXScript Bridge.
"""
import os
import sys
import time
import threading

HOST = "127.0.0.1"
BRIDGE_VERSION = "0.0.2"
PORT = int(os.environ.get("ZS_BRIDGE_PORT", "17613"))
STUDIO_MCP_PORT = 13469

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(HERE)
CONFIG_PATH = os.path.join(HERE, "config.json")
LOGS_DIR = os.path.join(ROOT_DIR, "logs") if os.path.isdir(os.path.join(ROOT_DIR, "logs")) else os.path.join(HERE, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)
LOG_PATH = os.path.join(LOGS_DIR, "bridge_debug.log")

PRIMARY_SERVER_ID = "roblox"
DEFAULT_TOOL_TIMEOUT = 120  # seconds
EXECUTE_LUAU_TIMEOUT = 30   # seconds
MAX_TOOL_RESULT_LENGTH = 150000

try:
    _log_file = open(LOG_PATH, "a", encoding="utf-8", errors="replace")
except Exception:
    _log_file = None


def _enable_ansi_colors() -> bool:
    """Enable Windows ANSI escape sequences."""
    if sys.platform != "win32":
        return True
    try:
        import ctypes
        k = ctypes.windll.kernel32
        h = k.GetStdHandle(-11)  # STD_OUTPUT_HANDLE
        mode = ctypes.c_uint32()
        if not k.GetConsoleMode(h, ctypes.byref(mode)):
            return False
        return bool(k.SetConsoleMode(h, mode.value | 0x0004))
    except Exception:
        return False


if _enable_ansi_colors():
    C = {
        "reset": "\033[0m",
        "dim": "\033[2m",
        "gr": "\033[92m",
        "yl": "\033[93m",
        "rd": "\033[91m",
        "cy": "\033[96m",
        "act": "\033[1m\033[97m\033[41m",
        "bold": "\033[1m",
    }
else:
    C = {k: "" for k in ("reset", "dim", "gr", "yl", "rd", "cy", "act", "bold")}


def safe_print(*args, **kwargs):
    """Print to stdout safely without encoding or flush crashes."""
    if sys.stdout is not None:
        try:
            print(*args, **kwargs)
        except Exception:
            pass


class _Spinner:
    """Terminal progress indicator without flooding logs."""
    FRAMES = "|/-\\"
    _active = threading.Lock()

    def __init__(self, label: str):
        self.label = label
        self._stop = threading.Event()
        self._thread = None
        self._owns_lock = False

    def __enter__(self):
        if sys.stdout and getattr(sys.stdout, "isatty", None) and sys.stdout.isatty() and _Spinner._active.acquire(blocking=False):
            self._owns_lock = True
            self._thread = threading.Thread(target=self._run, daemon=True)
            self._thread.start()
        return self

    def __exit__(self, *exc):
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=1.0)
            safe_print("\r" + " " * (len(self.label) + 4) + "\r", end="", flush=True)
        if self._owns_lock:
            _Spinner._active.release()

    def _run(self):
        i = 0
        while not self._stop.is_set():
            frame = self.FRAMES[i % len(self.FRAMES)]
            safe_print(f"\r{C['dim']}{self.label} {frame}{C['reset']}", end="", flush=True)
            i += 1
            self._stop.wait(0.15)


def _clear_spinner_line():
    """Wipe live spinner residue on current console line."""
    if sys.stdout is not None and getattr(sys.stdout, "isatty", None) and sys.stdout.isatty():
        safe_print("\r\033[K", end="", flush=True)


def log(msg: str, color: str = "dim", terminal: bool = True):
    """Log message to console and bridge_debug.log."""
    if terminal:
        _clear_spinner_line()
        ts = time.strftime("%H:%M:%S")
        safe_print(f"{C['dim']}{ts}{C['reset']} {C.get(color, '')}{msg}{C['reset']}", flush=True)
    if _log_file:
        try:
            _log_file.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {msg}\n")
            _log_file.flush()
        except Exception:
            pass


def action_banner(lines: list):
    """Display high-visibility rectangular warning box in terminal and log."""
    header = "ACTION NEEDED"
    width = max([len(header) + 8] + [len(ln) for ln in lines]) + 2
    top = f">>> {header} " + ">" * max(0, width - len(header) - 5)
    _clear_spinner_line()
    safe_print()
    safe_print(f"{C['act']}  {top.ljust(width)}{C['reset']}")
    for ln in lines:
        safe_print(f"{C['act']}  {ln.ljust(width)}{C['reset']}")
    safe_print(f"{C['act']}  {'>' * width}{C['reset']}")
    safe_print()
    if _log_file:
        try:
            _log_file.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} ACTION NEEDED: {' | '.join(lines)}\n")
            _log_file.flush()
        except Exception:
            pass
