# SPDX-License-Identifier: GPL-3.0-or-later
"""
ZXScript Native Messaging Host
Allows Chrome Extension to control and auto-launch the local ZXScript Bridge.
Communicates with Chrome via standard stdio binary protocol (uint32 length + JSON).
"""
import json
import os
import struct
import subprocess
import sys
import winreg

if getattr(sys, "frozen", False):
    HERE = os.path.dirname(os.path.abspath(sys.executable))
else:
    HERE = os.path.dirname(os.path.abspath(__file__))

if sys.platform == "win32":
    import msvcrt
    try:
        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    except Exception:
        pass

ROOT_DIR = os.path.dirname(HERE)
BRIDGE_PY = os.path.join(HERE, "bridge.py")
EXE_PATH = os.path.join(ROOT_DIR, "ZXScript.exe")
PORT = 17613


def log_host(msg):
    """Write debug diagnostics to logs/native_host.log."""
    try:
        log_dir = os.path.join(ROOT_DIR, "logs")
        os.makedirs(log_dir, exist_ok=True)
        with open(os.path.join(log_dir, "native_host.log"), "a", encoding="utf-8") as f:
            f.write(f"[{os.getpid()}] {msg}\n")
    except Exception:
        pass


def read_msg():
    """Read a message from Chrome Native Messaging (stdin)."""
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) < 4:
        return None
    length = struct.unpack("<I", raw_length)[0]
    payload = sys.stdin.buffer.read(length).decode("utf-8")
    return json.loads(payload)


def send_msg(data):
    """Send a message to Chrome Native Messaging (stdout)."""
    payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(payload)))
    sys.stdout.buffer.write(payload)
    sys.stdout.buffer.flush()


def find_bridge_pid():
    """Find PID of process listening on port 17613."""
    try:
        out = subprocess.check_output(f"netstat -aon | findstr :{PORT} | findstr LISTENING", shell=True).decode(errors="ignore")
        for line in out.splitlines():
            parts = line.strip().split()
            if len(parts) >= 5:
                return int(parts[-1])
    except Exception:
        pass
    return None


def find_python():
    """Find a functional python.exe via registry and known paths."""
    # 1. Registry lookup (fast, no subprocess overhead)
    for root in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
        try:
            k = winreg.OpenKey(root, r"Software\Python\PythonCore")
            for i in range(winreg.QueryInfoKey(k)[0]):
                sub = winreg.EnumKey(k, i)
                try:
                    k2 = winreg.OpenKey(k, rf"{sub}\InstallPath")
                    val, _ = winreg.QueryValueEx(k2, "ExecutablePath")
                    winreg.CloseKey(k2)
                    if os.path.isfile(val):
                        winreg.CloseKey(k)
                        return val
                except Exception:
                    pass
            winreg.CloseKey(k)
        except Exception:
            pass

    # 2. LocalAppData scan
    local = os.environ.get("LOCALAPPDATA", "")
    if local:
        for rel in (
            r"Python\pythoncore-3.14-64\python.exe",
            r"Programs\Python\Python314\python.exe",
            r"Programs\Python\Python313\python.exe",
            r"Programs\Python\Python312\python.exe",
            r"Programs\Python\Python311\python.exe",
        ):
            cand = os.path.join(local, rel)
            if os.path.isfile(cand):
                return cand

    return sys.executable if "python" in sys.executable.lower() else "python"


def launch_studio_if_needed():
    """Ensure Roblox Studio is opened if installed and not running."""
    try:
        from bridge.studio_watcher import roblox_studio_app_running
        from bridge.launch_studio_mcp import launch_studio
    except Exception:
        try:
            from studio_watcher import roblox_studio_app_running
            from launch_studio_mcp import launch_studio
        except Exception:
            return False

    if not roblox_studio_app_running():
        ok = launch_studio()
        if ok:
            log_host("Auto-launched Roblox Studio")
        return ok
    return True


def start_bridge():
    """Launch bridge.py as a detached background daemon (headless, no CMD window)."""
    launch_studio_if_needed()
    pid = find_bridge_pid()
    if pid:
        log_host(f"Bridge already running (PID {pid})")
        return {"ok": True, "message": f"Bridge already running (PID {pid})", "pid": pid, "running": True}

    py = find_python()
    log_host(f"find_python returned: {py}")

    try:
        # CREATE_NO_WINDOW (0x08000000) | CREATE_NEW_PROCESS_GROUP (0x00000200)
        flags = 0x08000000 | 0x00000200
        proc = subprocess.Popen(
            [py, BRIDGE_PY],
            cwd=HERE,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=flags,
            close_fds=True,
        )
        log_host(f"Started bridge PID {proc.pid}")
        return {"ok": True, "message": "Bridge started", "pid": proc.pid, "running": True}
    except Exception as e:
        log_host(f"start_bridge error: {e}")
        return {"ok": False, "error": str(e), "running": False}


def stop_bridge():
    """Stop the running bridge process and close its launcher window."""
    # 1. Kill any cmd window with ZXScript title
    try:
        subprocess.run('taskkill /F /FI "WINDOWTITLE eq ZXScript*"', shell=True, capture_output=True)
    except Exception:
        pass

    # 2. Kill the process listening on port 17613 and its children
    pid = find_bridge_pid()
    if pid:
        try:
            subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, capture_output=True)
        except Exception:
            pass

    # 3. Clean up any leftover StudioMCP.exe
    try:
        subprocess.run("taskkill /F /IM StudioMCP.exe", shell=True, capture_output=True)
    except Exception:
        pass

    # Verify termination
    pid_check = find_bridge_pid()
    if pid_check:
        try:
            subprocess.run(f"taskkill /F /T /PID {pid_check}", shell=True, capture_output=True)
        except Exception:
            pass

    return {"ok": True, "message": "Bridge stopped successfully", "running": False}


def kill_all_related(kill_bridge=False):
    """Forcefully terminate Roblox Studio, Bloxstrap, StudioMCP, and all related processes."""
    killed = []
    # 1. taskkill with wildcards covering all variations
    for pat in ("RobloxStudio*", "StudioMCP*", "Bloxstrap*", "RobloxCrashHandler*"):
        try:
            res = subprocess.run(f"taskkill /F /T /IM {pat}", shell=True, capture_output=True, text=True)
            if res.returncode == 0:
                killed.append(pat)
        except Exception:
            pass

    # 2. PowerShell process-tree termination fallback
    ps_cmd = 'powershell -NoProfile -Command "Get-Process | Where-Object { $_.ProcessName -like \'*Roblox*\' -or $_.ProcessName -like \'*Bloxstrap*\' -or $_.ProcessName -like \'*StudioMCP*\' } | Stop-Process -Force -ErrorAction SilentlyContinue"'
    try:
        subprocess.run(ps_cmd, shell=True, capture_output=True)
    except Exception:
        pass
    if kill_bridge:
        stop_bridge()

    msg = f"Terminated Roblox Studio processes: {', '.join(killed) if killed else 'Clean'}"
    log_host(f"kill_all_related: {msg} (kill_bridge={kill_bridge})")
    return {
        "ok": True,
        "message": msg,
        "killed": killed,
        "running": False if kill_bridge else bool(find_bridge_pid()),
    }


def get_status():
    """Check bridge status."""
    pid = find_bridge_pid()
    autostart = is_autostart_enabled()
    return {"ok": True, "running": bool(pid), "pid": pid, "port": PORT, "autostart": autostart}


def is_autostart_enabled():
    """Check if ZXScript is in HKCU Run registry."""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_READ)
        val, _ = winreg.QueryValueEx(key, "ZXScriptBridge")
        winreg.CloseKey(key)
        return bool(val)
    except Exception:
        return False


def set_autostart(enable: bool):
    """Enable or disable autostart on Windows boot."""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_SET_VALUE | winreg.KEY_READ)
        if enable:
            if os.path.isfile(EXE_PATH):
                cmd = f'"{EXE_PATH}" start'
            else:
                cmd = f'"{find_python()}" "{BRIDGE_PY}"'
            winreg.SetValueEx(key, "ZXScriptBridge", 0, winreg.REG_SZ, cmd)
        else:
            try:
                winreg.DeleteValue(key, "ZXScriptBridge")
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
        return {"ok": True, "autostart": enable}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def get_logs(lines=40):
    """Read last N lines of bridge_debug.log."""
    log_file = os.path.join(ROOT_DIR, "logs", "bridge_debug.log")
    if not os.path.isfile(log_file):
        return {"ok": True, "logs": "No log file found yet."}
    try:
        with open(log_file, "r", encoding="utf-8", errors="replace") as f:
            all_lines = f.readlines()
            tail = all_lines[-lines:] if len(all_lines) > lines else all_lines
            return {"ok": True, "logs": "".join(tail)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def main():
    while True:
        try:
            msg = read_msg()
            if msg is None:
                break
            action = msg.get("action", "")
            if action == "start":
                send_msg(start_bridge())
            elif action == "stop":
                send_msg(stop_bridge())
            elif action in ("kill", "kill_all", "kill_studio"):
                send_msg(kill_all_related(kill_bridge=msg.get("kill_bridge", False)))
            elif action == "restart":
                stop_bridge()
                send_msg(start_bridge())
            elif action == "status":
                send_msg(get_status())
            elif action in ("launch_studio", "start_studio"):
                send_msg({"ok": launch_studio_if_needed(), "running": True})
            elif action == "autostart":
                send_msg(set_autostart(msg.get("enable", True)))
            elif action == "logs":
                send_msg(get_logs(msg.get("lines", 40)))
            else:
                send_msg({"ok": False, "error": f"Unknown action: {action}"})
        except Exception as e:
            send_msg({"ok": False, "error": str(e)})


if __name__ == "__main__":
    log_host(f"Invoked with argv: {sys.argv}")
    if len(sys.argv) > 1:
        arg = " ".join(sys.argv[1:]).lower()
        if "start" in arg or "run" in arg or "zxscript" in arg:
            res = start_bridge()
            log_host(f"CLI start result: {res}")
            sys.exit(0)
        elif "kill" in arg:
            res = kill_all_related(kill_bridge="bridge" in arg or "all" in arg)
            log_host(f"CLI kill result: {res}")
            try:
                print(json.dumps(res))
            except Exception:
                pass
            sys.exit(0)
        elif "stop" in arg:
            res = stop_bridge()
            log_host(f"CLI stop result: {res}")
            sys.exit(0)
        elif "status" in arg:
            st = get_status()
            log_host(f"CLI status result: {st}")
            try:
                print(json.dumps(st))
            except Exception:
                pass
            sys.exit(0)
    main()
