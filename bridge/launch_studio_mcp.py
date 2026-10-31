# SPDX-License-Identifier: GPL-3.0-or-later
# launch_studio_mcp.py
# ──────────────────────────────────────────────────────────────────────────
#  Robust launcher for Roblox's StudioMCP.exe (the Studio MCP studio server).
#
#  Roblox ships a %LOCALAPPDATA%\Roblox\mcp.bat, but it hard-codes ONE Studio
#  version path. When Studio auto-updates, that folder is eventually removed and
#  the .bat's fallback branch is broken batch syntax (`else` on its own line),
#  so StudioMCP.exe never launches -> the bridge sees 0 tools -> the extension
#  reports "Bridge or Studio offline".
#
#  This launcher sidesteps that entirely: it finds the NEWEST StudioMCP.exe
#  across all installed Studio versions and launches it, transparently forwarding
#  stdio and any CLI args. It also supports an explicit override path via
#  `ZS_STUDIO_MCP_PATH` when discovery is not enough.
# ──────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable, Optional

ENV_OVERRIDE = "ZS_STUDIO_MCP_PATH"
WINDOWS_STUDIO_EXECUTABLES = ("RobloxStudioBeta.exe", "RobloxStudio.exe")
MAC_STUDIO_EXECUTABLES = ("RobloxStudio", "RobloxStudioBeta", "Roblox")


def _candidate_roots() -> list[Path]:
    """Directories that may contain Roblox Studio version folders (Windows)."""
    roots: list[Path] = []
    local_appdata = os.environ.get("LOCALAPPDATA")
    if local_appdata:
        roots.append(Path(local_appdata) / "Roblox" / "Versions")
        roots.append(Path(local_appdata) / "Bloxstrap" / "Versions")
    for env in ("ProgramFiles", "ProgramFiles(x86)"):
        value = os.environ.get(env)
        if value:
            roots.append(Path(value) / "Roblox" / "Versions")
            roots.append(Path(value) / "Bloxstrap" / "Versions")
    return roots


def _resolve_override_path(path_value: str) -> Optional[Path]:
    path = Path(path_value).expanduser()
    if path.is_file():
        return path
    if path.is_dir():
        if sys.platform == "darwin":
            candidate = path / "Contents" / "MacOS" / "StudioMCP"
        else:
            candidate = path / "StudioMCP.exe"
        if candidate.is_file():
            return candidate
    return None


def _newest_path(paths: Iterable[Path]) -> Optional[Path]:
    try:
        return max(paths, key=lambda p: p.stat().st_mtime)
    except (ValueError, OSError):
        return None


def _find_studio_mcp_from_bat() -> Optional[Path]:
    """Inspect %LOCALAPPDATA%\\Roblox\\mcp.bat if Roblox created one."""
    local_appdata = os.environ.get("LOCALAPPDATA")
    if not local_appdata:
        return None
    bat_file = Path(local_appdata) / "Roblox" / "mcp.bat"
    if not bat_file.is_file():
        return None
    try:
        content = bat_file.read_text(encoding="utf-8", errors="replace")
        matches = re.findall(r'["\']?([^"\']+\\StudioMCP\.exe)["\']?', content, re.IGNORECASE)
        for m in matches:
            p = Path(m)
            if p.is_file():
                return p
    except Exception:
        pass
    return None


def _find_studio_mcp_windows() -> Optional[Path]:
    """Return the path to the StudioMCP.exe of the live Studio install, or None.

    Roblox leaves "zombie" version folders behind after an update: they still
    contain a StudioMCP.exe but no RobloxStudioBeta.exe / RobloxStudio.exe
    (the actual Studio is gone). Picking the newest StudioMCP.exe by mtime can
    land on such a zombie, which launches fine but has no Studio to attach to ->
    the bridge sees 0 tools.

    We only consider version folders that ALSO contain a current Studio
    executable, and prefer the newest of those. We keep zombie StudioMCP.exe
    paths only as a last-resort fallback if no paired install exists.
    """
    paired: list[Path] = []
    orphans: list[Path] = []
    for root in _candidate_roots():
        if not root.is_dir():
            continue
        try:
            for version_dir in root.iterdir():
                if not version_dir.is_dir():
                    continue
                studio_mcp = version_dir / "StudioMCP.exe"
                if not studio_mcp.is_file():
                    continue
                if any((version_dir / exe_name).is_file() for exe_name in WINDOWS_STUDIO_EXECUTABLES):
                    paired.append(studio_mcp)
                else:
                    orphans.append(studio_mcp)
        except OSError:
            continue
    found = _newest_path(paired) or _newest_path(orphans)
    if found:
        return found
    return _find_studio_mcp_from_bat()


def _mac_app_candidates() -> list[Path]:
    """Locations where Roblox Studio may be installed on macOS."""
    home = Path.home()
    return [
        Path("/Applications/RobloxStudio.app"),
        home / "Applications" / "RobloxStudio.app",
        Path("/Applications/Roblox.app"),
        home / "Applications" / "Roblox.app",
        Path("/Applications/RobloxStudioBeta.app"),
        home / "Applications" / "RobloxStudioBeta.app",
    ]


def _find_studio_mcp_mac() -> Optional[Path]:
    """Return the path to StudioMCP inside a Roblox Studio app bundle, or None."""
    for app in _mac_app_candidates():
        macos_dir = app / "Contents" / "MacOS"
        studio_mcp = macos_dir / "StudioMCP"
        if not studio_mcp.is_file():
            continue
        if any((macos_dir / exe_name).is_file() for exe_name in MAC_STUDIO_EXECUTABLES):
            return studio_mcp
    return None


def find_studio_mcp() -> Optional[Path]:
    override_value = os.environ.get(ENV_OVERRIDE)
    if override_value:
        override_path = _resolve_override_path(override_value)
        if override_path:
            return override_path
        sys.stderr.write(
            f"launch_studio_mcp: {ENV_OVERRIDE} is set but does not point to a valid StudioMCP binary: {override_value}\n"
        )
    if sys.platform == "darwin":
        return _find_studio_mcp_mac()
    return _find_studio_mcp_windows()


def find_studio_exe() -> Optional[Path]:
    """Return path to RobloxStudioBeta.exe / RobloxStudio.exe / macOS app binary."""
    # 1. Look adjacent to detected StudioMCP
    mcp = find_studio_mcp()
    if mcp:
        candidates = WINDOWS_STUDIO_EXECUTABLES if sys.platform != "darwin" else MAC_STUDIO_EXECUTABLES
        target_dir = mcp.parent
        for name in candidates:
            cand = target_dir / name
            if cand.is_file():
                return cand

    # 2. Look in candidate version roots
    if sys.platform != "darwin":
        for root in _candidate_roots():
            if not root.is_dir():
                continue
            try:
                for version_dir in root.iterdir():
                    if not version_dir.is_dir():
                        continue
                    for name in WINDOWS_STUDIO_EXECUTABLES:
                        cand = version_dir / name
                        if cand.is_file():
                            return cand
            except OSError:
                continue
    else:
        for app in _mac_app_candidates():
            macos_dir = app / "Contents" / "MacOS"
            for name in MAC_STUDIO_EXECUTABLES:
                cand = macos_dir / name
                if cand.is_file():
                    return cand

    return None


def launch_studio(place_path: Optional[str] = None) -> bool:
    """Launch Roblox Studio in the background without blocking."""
    exe = find_studio_exe()
    if not exe:
        return False
    cmd = [str(exe)]
    if place_path:
        cmd.append(place_path)
    try:
        if sys.platform == "win32":
            # DETACHED_PROCESS (0x00000008) | CREATE_NEW_PROCESS_GROUP (0x00000200)
            subprocess.Popen(
                cmd,
                creationflags=0x00000008 | 0x00000200,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                close_fds=True,
            )
        else:
            subprocess.Popen(
                cmd,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
        return True
    except Exception:
        return False


def main() -> int:
    args = sys.argv[1:]
    if "--studio-exe" in args:
        s = find_studio_exe()
        if s:
            print(str(s))
            return 0
        return 1

    if "--mcp-exe" in args:
        m = find_studio_mcp()
        if m:
            print(str(m))
            return 0
        return 1

    if "--launch-studio" in args:
        ok = launch_studio()
        if ok:
            s = find_studio_exe()
            print(f"Launched Roblox Studio: {s}")
            return 0
        sys.stderr.write("Failed to launch Roblox Studio (executable not found)\n")
        return 1

    exe = find_studio_mcp()
    binary_name = "StudioMCP" if sys.platform == "darwin" else "StudioMCP.exe"
    if not exe:
        sys.stderr.write(
            f"launch_studio_mcp: no {binary_name} found. Open Roblox Studio and "
            "enable 'Studio as MCP server' (Assistant Settings > MCP Servers).\n"
        )
        return 1
    sys.stderr.write(f"launch_studio_mcp: using {exe}\n")
    sys.stderr.flush()
    proc = subprocess.Popen([str(exe)] + args)
    try:
        return proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
        return proc.wait()


if __name__ == "__main__":
    sys.exit(main())
