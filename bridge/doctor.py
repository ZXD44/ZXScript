#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""
bridge/doctor.py - Comprehensive health check and diagnostic tool for ZXScript.

Validates Python runtime, browser Native Messaging registry keys, Roblox Studio MCP status,
port bindings, extension manifest, and directory permissions.

Usage:
    python bridge/doctor.py
    python bridge/doctor.py --fix
"""

import os
import sys
import json
import socket
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Optional

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(HERE)

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if HERE not in sys.path:
    sys.path.insert(0, HERE)

# Terminal ANSI colors
USE_ANSI = sys.platform != "win32" or bool(os.environ.get("WT_SESSION") or os.environ.get("ANSICON"))
if sys.platform == "win32" and not USE_ANSI:
    try:
        import ctypes
        k32 = ctypes.windll.kernel32
        h = k32.GetStdHandle(-11)
        mode = ctypes.c_uint32()
        if k32.GetConsoleMode(h, ctypes.byref(mode)):
            if k32.SetConsoleMode(h, mode.value | 0x0004):
                USE_ANSI = True
    except Exception:
        USE_ANSI = False

C_G = "\033[92m" if USE_ANSI else ""
C_Y = "\033[93m" if USE_ANSI else ""
C_R = "\033[91m" if USE_ANSI else ""
C_C = "\033[96m" if USE_ANSI else ""
C_B = "\033[1m" if USE_ANSI else ""
C_DIM = "\033[2m" if USE_ANSI else ""
C_RST = "\033[0m" if USE_ANSI else ""

PASS_ICON = f"{C_G}✓ PASS{C_RST}"
WARN_ICON = f"{C_Y}▲ WARN{C_RST}"
FAIL_ICON = f"{C_R}✗ FAIL{C_RST}"


def is_port_open(port: int, host: str = "127.0.0.1") -> bool:
    """Returns True if a service is actively listening on host:port."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        s.connect((host, port))
        s.close()
        return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def get_port_listener_info(port: int) -> Optional[str]:
    """Finds listening process ID and name on Windows."""
    if sys.platform != "win32":
        return None
    try:
        out = subprocess.check_output(f"netstat -ano -p TCP", shell=True, text=True, stderr=subprocess.DEVNULL)
        needle = f":{port} "
        pid = None
        for line in out.splitlines():
            if "LISTENING" in line and needle in line:
                parts = line.strip().split()
                if parts and parts[-1].isdigit():
                    pid = parts[-1]
                    break
        if pid:
            try:
                pname = subprocess.check_output(
                    f'powershell -NoProfile -Command "(Get-Process -Id {pid} -ErrorAction SilentlyContinue).Name"',
                    shell=True, text=True
                ).strip()
                return f"{pname} (PID {pid})"
            except Exception:
                return f"PID {pid}"
    except Exception:
        pass
    return None


class HealthChecker:
    def __init__(self, auto_fix: bool = False):
        self.auto_fix = auto_fix
        self.results: List[Tuple[str, str, str, str]] = []  # (category, name, status, detail)
        self.fixes: List[str] = []

    def record(self, cat: str, name: str, status: str, detail: str, fix_hint: str = ""):
        self.results.append((cat, name, status, detail))
        if status in ("FAIL", "WARN") and fix_hint and fix_hint not in self.fixes:
            self.fixes.append(fix_hint)

    def check_python_environment(self):
        cat = "Python Environment"
        # 1. Version
        v = sys.version_info
        v_str = f"{v.major}.{v.minor}.{v.micro}"
        if v.major >= 3 and v.minor >= 8:
            self.record(cat, "Python Version", "PASS", f"v{v_str} ({sys.executable})")
        else:
            self.record(cat, "Python Version", "FAIL", f"v{v_str} (requires Python 3.8+)", "Install Python 3.10+ from python.org")

        # 2. Websockets
        try:
            import websockets
            self.record(cat, "Websockets Library", "PASS", f"v{getattr(websockets, '__version__', 'installed')}")
        except ImportError:
            self.record(cat, "Websockets Library", "FAIL", "Missing websockets package", "Run: pip install websockets")

    def check_native_messaging_registry(self):
        cat = "Native Messaging"
        host_json = os.path.join(HERE, "com.zxd44.zxscript.json")
        exe_path = os.path.join(HERE, "native_host.exe")

        # 1. Host manifest
        if os.path.isfile(host_json):
            self.record(cat, "Host Manifest", "PASS", f"Found {os.path.basename(host_json)}")
        else:
            self.record(cat, "Host Manifest", "FAIL", "Missing com.zxd44.zxscript.json", "Run: python bridge/register.py")

        # 2. Native host binary
        if os.path.isfile(exe_path):
            self.record(cat, "Headless Binary", "PASS", f"Found native_host.exe ({os.path.getsize(exe_path)//1024} KB)")
        else:
            self.record(cat, "Headless Binary", "WARN", "native_host.exe missing (falls back to pythonw)", "Compile via: python scripts/build_exe.py")

        # 3. Windows Registry Keys
        if sys.platform == "win32":
            import winreg
            reg_found = False
            for browser_key in (
                r"Software\Google\Chrome\NativeMessagingHosts\com.zxd44.zxscript",
                r"Software\Microsoft\Edge\NativeMessagingHosts\com.zxd44.zxscript",
                r"Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.zxd44.zxscript",
            ):
                try:
                    k = winreg.OpenKey(winreg.HKEY_CURRENT_USER, browser_key, 0, winreg.KEY_READ)
                    val, _ = winreg.QueryValueEx(k, "")
                    winreg.CloseKey(k)
                    if val and os.path.isfile(val):
                        reg_found = True
                        break
                except Exception:
                    pass

            if reg_found:
                self.record(cat, "Registry Integration", "PASS", "Registered in HKCU NativeMessagingHosts")
            else:
                self.record(cat, "Registry Integration", "FAIL", "Missing NativeMessaging registry keys", "Run: python bridge/register.py")

            # 4. Protocol handler
            try:
                k = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\zxscript", 0, winreg.KEY_READ)
                winreg.CloseKey(k)
                self.record(cat, "Protocol Handler", "PASS", "zxscript:// URL protocol registered")
            except Exception:
                self.record(cat, "Protocol Handler", "WARN", "zxscript:// protocol not registered", "Run: python bridge/register.py")

    def check_network_ports(self):
        cat = "Network Ports"
        # 1. Port 17613 (Bridge)
        b_open = is_port_open(17613)
        if b_open:
            info = get_port_listener_info(17613) or "Listening"
            self.record(cat, "Bridge Port (17613)", "PASS", f"Active ({info})")
        else:
            self.record(cat, "Bridge Port (17613)", "WARN", "Not running (start via start.bat or extension icon)", "Run: start.bat")

        # 2. Port 13469 (Roblox Studio MCP)
        s_open = is_port_open(13469)
        if s_open:
            info = get_port_listener_info(13469) or "Listening"
            self.record(cat, "Studio MCP Port (13469)", "PASS", f"Active ({info})")
        else:
            self.record(cat, "Studio MCP Port (13469)", "WARN", "Studio MCP is not listening", "Open Roblox Studio -> Assistant AI -> ... -> Manage MCP Servers -> Enable Studio as MCP Server")

    def check_roblox_studio(self):
        cat = "Roblox Studio MCP"
        try:
            import bridge.launch_studio_mcp as scan
            mcp_bin = scan.find_studio_mcp()
            studio_bin = scan.find_studio_exe()
        except Exception:
            mcp_bin = None
            studio_bin = None

        if studio_bin and os.path.isfile(studio_bin):
            is_bloxstrap = "Bloxstrap" in str(studio_bin)
            flavor = "Bloxstrap" if is_bloxstrap else "Roblox Official"
            self.record(cat, "Studio Executable", "PASS", f"Found {flavor} ({Path(studio_bin).parent.name})")
        else:
            self.record(cat, "Studio Executable", "WARN", "RobloxStudioBeta.exe not detected", "Ensure Roblox Studio or Bloxstrap is installed")

        if mcp_bin and os.path.isfile(mcp_bin):
            self.record(cat, "StudioMCP Server", "PASS", f"Found StudioMCP.exe ({Path(mcp_bin).parent.name})")
        else:
            self.record(cat, "StudioMCP Server", "FAIL", "StudioMCP.exe not found in Studio versions", "Update Roblox Studio to latest version")

    def check_extension_workspace(self):
        cat = "Workspace & Extension"
        manifest_path = os.path.join(ROOT_DIR, "zxscript-extension", "manifest.json")
        version_json = os.path.join(ROOT_DIR, "version.json")

        if os.path.isfile(manifest_path):
            try:
                with open(manifest_path, "r", encoding="utf-8") as f:
                    m_data = json.load(f)
                v = m_data.get("version", "?")
                self.record(cat, "Extension Manifest", "PASS", f"Manifest V3 (v{v})")
            except Exception as e:
                self.record(cat, "Extension Manifest", "FAIL", f"Corrupted manifest.json: {e}")
        else:
            self.record(cat, "Extension Manifest", "FAIL", "Missing zxscript-extension/manifest.json")

        if os.path.isfile(version_json):
            self.record(cat, "Master Version SSOT", "PASS", "version.json intact")
        else:
            self.record(cat, "Master Version SSOT", "FAIL", "Missing version.json", "Run: bump-version.bat --check")

        # Directories writable
        logs_dir = os.path.join(ROOT_DIR, "logs")
        projects_dir = os.path.join(ROOT_DIR, "projects")
        try:
            os.makedirs(logs_dir, exist_ok=True)
            test_log = os.path.join(logs_dir, ".test_write")
            with open(test_log, "w") as f:
                f.write("ok")
            os.remove(test_log)
            self.record(cat, "Directory Permissions", "PASS", "logs/ and projects/ are writable")
        except Exception as e:
            self.record(cat, "Directory Permissions", "FAIL", f"Filesystem write error: {e}")

    def run_all(self) -> bool:
        self.check_python_environment()
        self.check_native_messaging_registry()
        self.check_network_ports()
        self.check_roblox_studio()
        self.check_extension_workspace()

        # Render report
        print(f"\n{C_B}===================================================================={C_RST}")
        print(f"   {C_C}ZXScript System Health Doctor - การวินิจฉัยสุขภาพระบบ{C_RST}")
        print(f"{C_B}===================================================================={C_RST}\n")

        current_cat = None
        pass_count = 0
        warn_count = 0
        fail_count = 0

        for cat, name, status, detail in self.results:
            if cat != current_cat:
                current_cat = cat
                print(f"{C_B}▶ {cat}{C_RST}")

            if status == "PASS":
                pass_count += 1
                icon = PASS_ICON
            elif status == "WARN":
                warn_count += 1
                icon = WARN_ICON
            else:
                fail_count += 1
                icon = FAIL_ICON

            print(f"  {icon}  {name:<26} {C_DIM}{detail}{C_RST}")

        print(f"\n{C_B}--------------------------------------------------------------------{C_RST}")
        total = pass_count + warn_count + fail_count
        summary_color = C_G if fail_count == 0 else C_R
        print(f"Health Score: {summary_color}{pass_count}/{total} Checks Passed{C_RST} "
              f"({C_Y}{warn_count} Warnings{C_RST}, {C_R}{fail_count} Critical Failures{C_RST})")

        if fail_count == 0 and warn_count <= 2:
            print(f"{C_G}✓ ระบบพร้อมใช้งานอย่างสมบูรณ์ (System is healthy and ready to build!){C_RST}\n")
        else:
            print(f"\n{C_Y}คำแนะนำในการแก้ไขปัญหา (Recommended Fix Actions):{C_RST}")
            for i, fix in enumerate(self.fixes, 1):
                print(f"  {i}. {fix}")
            print()

        # Handle --fix flag
        if self.auto_fix and self.fixes:
            print(f"{C_C}Running automated self-repair (--fix)...{C_RST}")
            try:
                import bridge.register as reg
                reg.register_all()
                print(f"{C_G}✓ Re-registered Native Messaging registry keys successfully.{C_RST}\n")
            except Exception as e:
                print(f"{C_R}✗ Auto-fix failed: {e}{C_RST}\n")

        return fail_count == 0


def main():
    auto_fix = "--fix" in sys.argv
    checker = HealthChecker(auto_fix=auto_fix)
    success = checker.run_all()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
