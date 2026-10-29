# SPDX-License-Identifier: GPL-3.0-or-later
# scripts/build_exe.py - Build standalone ZXScript-Bridge.exe via PyInstaller
# Usage: python scripts/build_exe.py
# Output: dist/ZXScript-Bridge.exe (single file, no Python required on target)

import subprocess
import sys
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BRIDGE = os.path.join(ROOT, "bridge", "bridge.py")
CONFIG = os.path.join(ROOT, "bridge", "config.json")
LAUNCH = os.path.join(ROOT, "bridge", "launch_studio_mcp.py")
ICON = os.path.join(ROOT, "assets", "icon.png")
DIST = os.path.join(ROOT, "dist")

def main():
    # Ensure PyInstaller is installed
    try:
        import PyInstaller
    except ImportError:
        print("[build] Installing PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller", "--quiet"])

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--name", "ZXScript-Bridge",
        "--distpath", DIST,
        "--workpath", os.path.join(ROOT, "build"),
        "--specpath", os.path.join(ROOT, "build"),
        # Bundle config.json and launch_studio_mcp.py alongside
        "--add-data", f"{CONFIG}{os.pathsep}bridge",
        "--add-data", f"{LAUNCH}{os.pathsep}bridge",
        "--hidden-import", "websockets",
        "--hidden-import", "websockets.legacy",
        "--hidden-import", "websockets.legacy.server",
        "--console",
        "--clean",
        BRIDGE,
    ]

    print(f"[build] Building standalone executable...")
    print(f"[build] Command: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=ROOT)

    if result.returncode == 0:
        exe_path = os.path.join(DIST, "ZXScript-Bridge.exe")
        if os.path.exists(exe_path):
            size_mb = os.path.getsize(exe_path) / (1024 * 1024)
            print(f"\n[build] SUCCESS: {exe_path}")
            print(f"[build] Size: {size_mb:.1f} MB")
            print(f"[build] Users can double-click this .exe without installing Python!")
        else:
            print(f"\n[build] WARNING: Build finished but {exe_path} not found.")
    else:
        print(f"\n[build] FAILED with exit code {result.returncode}")
        sys.exit(1)

if __name__ == "__main__":
    main()
