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

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(HERE)
BRIDGE_PY = os.path.join(HERE, "bridge.py")
PORT = 17613


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
        out = subprocess.check_output(f'netstat -aon | findstr :{PORT} | findstr LISTENING', shell=True).decode(errors="ignore")
        for line in out.splitlines():
            parts = line.strip().split()
            if len(parts) >= 5:
                return int(parts[-1])
    except Exception:
        pass
    return None


def get_pythonw():
    """Find pythonw.exe to run background processes invisibly."""
    # Check current executable directory
    base_dir = os.path.dirname(sys.executable)
    cand = os.path.join(base_dir, "pythonw.exe")
    if os.path.isfile(cand):
        return cand
    for env in ("LOCALAPPDATA", "ProgramFiles"):
        val = os.environ.get(env, "")
        if val:
            for root, _, files in os.walk(val):
                if "pythonw.exe" in files:
                    return os.path.join(root, "pythonw.exe")
                if root.count(os.sep) - val.count(os.sep) > 3:
                    break
    return sys.executable


def start_bridge():
    """Launch bridge.py in detached background mode without cmd window."""
    pid = find_bridge_pid()
    if pid:
        return {"ok": True, "message": f"Bridge is already running on PID {pid}", "pid": pid, "running": True}
    
    py = get_pythonw()
    # DETACHED_PROCESS = 0x00000008, CREATE_NEW_PROCESS_GROUP = 0x00000200
    flags = 0x00000008 | 0x00000200
    try:
        proc = subprocess.Popen([py, BRIDGE_PY], cwd=HERE, creationflags=flags, close_fds=True)
        return {"ok": True, "message": "Bridge started successfully", "pid": proc.pid, "running": True}
    except Exception as e:
        return {"ok": False, "error": str(e), "running": False}


def stop_bridge():
    """Stop the running bridge process."""
    pid = find_bridge_pid()
    if not pid:
        return {"ok": True, "message": "Bridge is not running", "running": False}
    try:
        subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, capture_output=True)
        return {"ok": True, "message": f"Bridge process {pid} terminated", "running": False}
    except Exception as e:
        return {"ok": False, "error": str(e)}


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
            py = get_pythonw()
            cmd = f'"{py}" "{BRIDGE_PY}"'
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
            elif action == "restart":
                stop_bridge()
                send_msg(start_bridge())
            elif action == "status":
                send_msg(get_status())
            elif action == "autostart":
                send_msg(set_autostart(msg.get("enable", True)))
            elif action == "logs":
                send_msg(get_logs(msg.get("lines", 40)))
            else:
                send_msg({"ok": False, "error": f"Unknown action: {action}"})
        except Exception as e:
            send_msg({"ok": False, "error": str(e)})


if __name__ == "__main__":
    main()
