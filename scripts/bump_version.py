#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""
scripts/bump_version.py - Single Source of Truth (SSOT) Version Manager for ZXScript.

Synchronizes and updates project versions across all modules, extensions, documentation,
and agent configs in one single command.

Usage:
    python scripts/bump_version.py --check
    python scripts/bump_version.py --get
    python scripts/bump_version.py --patch
    python scripts/bump_version.py --minor
    python scripts/bump_version.py --major
    python scripts/bump_version.py 0.0.4
"""

import os
import sys
import re
import json
import argparse
from datetime import datetime
from typing import Dict, List, Tuple, Optional

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(HERE)
VERSION_JSON = os.path.join(ROOT_DIR, "version.json")
VERSION_FILE = os.path.join(ROOT_DIR, "VERSION")

# ANSI color codes
USE_ANSI = sys.platform != "win32" or bool(os.environ.get("WT_SESSION") or os.environ.get("ANSICON"))
if sys.platform == "win32" and not USE_ANSI:
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        handle = kernel32.GetStdHandle(-11)
        mode = ctypes.c_uint32()
        if kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
            if kernel32.SetConsoleMode(handle, mode.value | 0x0004):
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


def parse_semver(ver_str: str) -> Tuple[int, int, int, str]:
    """Parse semver string into (major, minor, patch, prerelease)."""
    m = re.match(r"^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?$", ver_str.strip())
    if not m:
        raise ValueError(f"Invalid semver version: '{ver_str}' (expected format: X.Y.Z or X.Y.Z-tag)")
    return int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4) or ""


def format_semver(major: int, minor: int, patch: int, prerelease: str = "") -> str:
    base = f"{major}.{minor}.{patch}"
    return f"{base}-{prerelease}" if prerelease else base


def get_current_version() -> Tuple[str, Dict]:
    """Read current version from version.json (SSOT)."""
    if not os.path.isfile(VERSION_JSON):
        raise FileNotFoundError(f"Missing master version file: {VERSION_JSON}")
    with open(VERSION_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    ver = data.get("version", "").strip()
    if not ver:
        raise ValueError(f"version.json does not contain a valid 'version' key.")
    return ver, data


def calculate_bump(ver: str, bump_type: str) -> str:
    major, minor, patch, _ = parse_semver(ver)
    if bump_type == "patch":
        patch += 1
    elif bump_type == "minor":
        minor += 1
        patch = 0
    elif bump_type == "major":
        major += 1
        minor = 0
        patch = 0
    else:
        raise ValueError(f"Unknown bump type: {bump_type}")
    return format_semver(major, minor, patch)


# Targets to synchronize and verify
# Each entry: (relative_path, description, pattern_or_type)
TARGET_CONFIGS = [
    {
        "path": "version.json",
        "desc": "Root Master SSOT Config",
        "type": "json_field",
        "field": "version",
    },
    {
        "path": "VERSION",
        "desc": "Root Plaintext Version",
        "type": "plain_text",
    },
    {
        "path": "zxscript-extension/manifest.json",
        "desc": "Extension Manifest V3",
        "type": "json_field",
        "field": "version",
    },
    {
        "path": "bridge/constants.py",
        "desc": "Bridge Constants Fallback",
        "type": "regex_replace",
        "pattern": r'(return\s+)"\d+\.\d+\.\d+"',
        "replacement": r'\g<1>"{ver}"',
        "inspect": r'return\s+"(\d+\.\d+\.\d+)"',
    },
    {
        "path": "zxscript-extension/core/constants.js",
        "desc": "Extension Core Constants Fallback",
        "type": "regex_replace",
        "pattern": r'(return\s+)"\d+\.\d+\.\d+"',
        "replacement": r'\g<1>"{ver}"',
        "inspect": r'return\s+"(\d+\.\d+\.\d+)"',
    },
    {
        "path": "zxscript-extension/core/config.js",
        "desc": "Extension Error Guard Fallback",
        "type": "regex_replace",
        "pattern": r'(: ")\d+\.\d+\.\d+("\)})',
        "replacement": r'\g<1>{ver}\g<2>',
        "inspect": r': "(\d+\.\d+\.\d+)"\)}',
    },
    {
        "path": "zxscript-extension/core/ui-modals.js",
        "desc": "Extension Modal Fallback",
        "type": "regex_replace",
        "pattern": r'(\|\|\s*")\d+\.\d+\.\d+("\}`)',
        "replacement": r'\g<1>{ver}\g<2>',
        "inspect": r'\|\|\s*"(\d+\.\d+\.\d+)"\}`',
    },
    {
        "path": "zxscript-extension/tests/test-action-flow.js",
        "desc": "Action Flow Test Mock",
        "type": "regex_replace",
        "pattern": r'(version:\s*")\d+\.\d+\.\d+(")',
        "replacement": r'\g<1>{ver}\g<2>',
        "inspect": r'version:\s*"(\d+\.\d+\.\d+)"',
    },
    {
        "path": "README.md",
        "desc": "README Shield Badge",
        "type": "regex_replace",
        "pattern": r'(badge/version-)\d+\.\d+\.\d+(-brightgreen)',
        "replacement": r'\g<1>{ver}\g<2>',
        "inspect": r'badge/version-(\d+\.\d+\.\d+)-brightgreen',
    },
    {
        "path": "docs/ROADMAP.md",
        "desc": "Roadmap Current Version Header",
        "type": "regex_replace",
        "pattern": r'(>\s*\*\*เวอร์ชันปัจจุบัน:\*\*\s*`)\d+\.\d+\.\d+(`)',
        "replacement": r'\g<1>{ver}\g<2>',
        "inspect": r'>\s*\*\*เวอร์ชันปัจจุบัน:\*\*\s*`(\d+\.\d+\.\d+)`',
    },
    {
        "path": "docs/RULES.md",
        "desc": "Rules Version Header",
        "type": "regex_replace",
        "pattern": r'(>\s*\*\*เวอร์ชัน:\*\*\s*`)\d+\.\d+\.\d+(`)',
        "replacement": r'\g<1>{ver}\g<2>',
        "inspect": r'>\s*\*\*เวอร์ชัน:\*\*\s*`(\d+\.\d+\.\d+)`',
    },
    {
        "path": "docs/ZXScript_Guide.md",
        "desc": "Guide Version Header",
        "type": "regex_replace",
        "pattern": r'(>\s*\*\*เวอร์ชัน:\*\*\s*`)\d+\.\d+\.\d+(`)',
        "replacement": r'\g<1>{ver}\g<2>',
        "inspect": r'>\s*\*\*เวอร์ชัน:\*\*\s*`(\d+\.\d+\.\d+)`',
    },
    {
        "path": ".agent/context.md",
        "desc": "Agent Context Spec",
        "type": "regex_replace",
        "pattern": r'(>\s*\*\*Version:\*\*\s*`)\d+\.\d+\.\d+(`)',
        "replacement": r'\g<1>{ver}\g<2>',
        "inspect": r'>\s*\*\*Version:\*\*\s*`(\d+\.\d+\.\d+)`',
    },
    {
        "path": ".agent/instructions.md",
        "desc": "Agent Instructions Spec",
        "type": "regex_replace",
        "pattern": r'(>\s*\*\*Version:\*\*\s*`)\d+\.\d+\.\d+(`)',
        "replacement": r'\g<1>{ver}\g<2>',
        "inspect": r'>\s*\*\*Version:\*\*\s*`(\d+\.\d+\.\d+)`',
    },
    {
        "path": ".agent/rules.md",
        "desc": "Agent Rules Spec",
        "type": "regex_replace",
        "pattern": r'(>\s*\*\*Version:\*\*\s*`)\d+\.\d+\.\d+(`)',
        "replacement": r'\g<1>{ver}\g<2>',
        "inspect": r'>\s*\*\*Version:\*\*\s*`(\d+\.\d+\.\d+)`',
    },
    {
        "path": ".agent/workflows.md",
        "desc": "Agent Workflows Spec",
        "type": "regex_replace",
        "pattern": r'(>\s*\*\*Version:\*\*\s*`)\d+\.\d+\.\d+(`)',
        "replacement": r'\g<1>{ver}\g<2>',
        "inspect": r'>\s*\*\*Version:\*\*\s*`(\d+\.\d+\.\d+)`',
    },
]


def check_file_version(cfg: Dict, expected_ver: str) -> Tuple[bool, Optional[str]]:
    """Check whether a single target matches expected_ver."""
    abs_path = os.path.join(ROOT_DIR, cfg["path"])
    if not os.path.isfile(abs_path):
        return False, "FILE_NOT_FOUND"

    t = cfg["type"]
    try:
        with open(abs_path, "r", encoding="utf-8") as f:
            content = f.read()

        if t == "plain_text":
            found = content.strip()
            return found == expected_ver, found

        if t == "json_field":
            data = json.loads(content)
            found = str(data.get(cfg["field"], "")).strip()
            return found == expected_ver, found

        if t == "regex_replace":
            m = re.search(cfg["inspect"], content)
            if not m:
                return False, "PATTERN_NOT_FOUND"
            found = m.group(1).strip()
            return found == expected_ver, found

    except Exception as e:
        return False, f"ERROR: {e}"

    return False, "UNKNOWN"


def update_file_version(cfg: Dict, new_ver: str, release_date: str) -> bool:
    """Apply new version to a target file."""
    abs_path = os.path.join(ROOT_DIR, cfg["path"])
    if not os.path.isfile(abs_path):
        return False

    t = cfg["type"]
    try:
        with open(abs_path, "r", encoding="utf-8") as f:
            content = f.read()

        if t == "plain_text":
            with open(abs_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(f"{new_ver}\n")
            return True

        if t == "json_field":
            data = json.loads(content)
            data[cfg["field"]] = new_ver
            if "releaseDate" in data:
                data["releaseDate"] = release_date
            with open(abs_path, "w", encoding="utf-8", newline="\n") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write("\n")
            return True

        if t == "regex_replace":
            replacement = cfg["replacement"].format(ver=new_ver)
            new_content = re.sub(cfg["pattern"], replacement, content)
            if new_content != content:
                with open(abs_path, "w", encoding="utf-8", newline="\n") as f:
                    f.write(new_content)
                return True
            return True  # Already up to date

    except Exception as e:
        print(f"{C_R}[ERROR]{C_RST} Failed updating {cfg['path']}: {e}")
        return False

    return False


def ensure_changelog_header(new_ver: str, release_date: str) -> bool:
    """Prepend changelog section for new_ver if not already present."""
    cl_path = os.path.join(ROOT_DIR, "docs", "CHANGELOG.md")
    if not os.path.isfile(cl_path):
        return False
    with open(cl_path, "r", encoding="utf-8") as f:
        content = f.read()

    header_tag = f"## [{new_ver}]"
    if header_tag in content:
        return True

    # Prepend right after the intro
    entry = (
        f"## [{new_ver}] - {release_date}\n\n"
        f"### Added & Enhanced\n"
        f"- Release updates for version {new_ver}.\n\n"
        f"---\n\n"
    )
    # Match after "# Changelog\n\nAll notable changes..."
    m = re.search(r"(# Changelog\s*\n\s*All notable changes to ZXScript are documented here\.\s*\n+)", content)
    if m:
        new_content = content[:m.end()] + entry + content[m.end():]
    else:
        new_content = f"# Changelog\n\n{entry}" + content

    with open(cl_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(new_content)
    return True


def run_check(expected_ver: str) -> bool:
    """Run full diagnostic check across all registered files."""
    print(f"\n{C_B}=== ZXScript Single Source of Truth (SSOT) Version Audit ==={C_RST}")
    print(f"Master Version (version.json): {C_C}{expected_ver}{C_RST}\n")

    all_ok = True
    col_w = 46

    print(f"{'Target File':<{col_w}} {'Status':<12} {'Detected Version'}")
    print("-" * 78)

    for cfg in TARGET_CONFIGS:
        ok, detected = check_file_version(cfg, expected_ver)
        if ok:
            status_str = f"{C_G}✓ PASS{C_RST}"
            ver_str = f"{C_G}{detected}{C_RST}"
        else:
            status_str = f"{C_R}✗ FAIL{C_RST}"
            ver_str = f"{C_Y}{detected}{C_RST} (expected {expected_ver})"
            all_ok = False
        print(f"{cfg['path']:<{col_w}} {status_str:<21} {ver_str}")

    print("-" * 78)
    if all_ok:
        print(f"{C_G}All {len(TARGET_CONFIGS)} targets are 100% in sync with version.json ({expected_ver}).{C_RST}\n")
    else:
        print(f"{C_R}Version mismatches detected! Run 'python scripts/bump_version.py {expected_ver}' to synchronize.{C_RST}\n")

    return all_ok


def run_bump(new_ver: str, release_date: Optional[str] = None):
    """Update all files to new_ver in one shot."""
    parse_semver(new_ver)  # Validation
    date_str = release_date or datetime.now().strftime("%Y-%m-%d")

    current_ver, _ = get_current_version()
    print(f"\n{C_B}=== ZXScript Universal Version Synchronization ==={C_RST}")
    print(f"Current Version: {C_DIM}{current_ver}{C_RST}")
    print(f"Target  Version: {C_C}{new_ver}{C_RST}")
    print(f"Release Date   : {date_str}\n")

    # 1. Update all registered target configs
    updated_count = 0
    for cfg in TARGET_CONFIGS:
        ok = update_file_version(cfg, new_ver, date_str)
        if ok:
            updated_count += 1
            print(f"  {C_G}✓{C_RST} Updated {cfg['path']} {C_DIM}({cfg['desc']}){C_RST}")
        else:
            print(f"  {C_R}✗{C_RST} Failed to update {cfg['path']}")

    # 2. Ensure CHANGELOG.md has the section header
    if ensure_changelog_header(new_ver, date_str):
        print(f"  {C_G}✓{C_RST} Synchronized docs/CHANGELOG.md release header")

    print(f"\n{C_G}Successfully synchronized {updated_count} files to v{new_ver}!{C_RST}\n")

    # 3. Re-run verification to confirm 100% accuracy
    run_check(new_ver)


def main():
    parser = argparse.ArgumentParser(
        description="Single Source of Truth (SSOT) Version Synchronizer for ZXScript"
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("version", nargs="?", default=None, help="Explicit version to set (e.g. 0.0.4)")
    group.add_argument("--patch", action="store_true", help="Auto-bump patch version (e.g. 0.0.3 -> 0.0.4)")
    group.add_argument("--minor", action="store_true", help="Auto-bump minor version (e.g. 0.0.3 -> 0.1.0)")
    group.add_argument("--major", action="store_true", help="Auto-bump major version (e.g. 0.0.3 -> 1.0.0)")
    group.add_argument("--check", action="store_true", help="Audit all files against version.json")
    group.add_argument("--get", action="store_true", help="Print current version from version.json")
    parser.add_argument("--date", default=None, help="Release date in YYYY-MM-DD format")

    args = parser.parse_args()

    cur_ver, _ = get_current_version()

    if args.get:
        print(cur_ver)
        return

    if args.check:
        ok = run_check(cur_ver)
        sys.exit(0 if ok else 1)

    target_ver = None
    if args.patch:
        target_ver = calculate_bump(cur_ver, "patch")
    elif args.minor:
        target_ver = calculate_bump(cur_ver, "minor")
    elif args.major:
        target_ver = calculate_bump(cur_ver, "major")
    elif args.version:
        target_ver = args.version.strip()
    else:
        # Default behavior with no arguments: run check
        ok = run_check(cur_ver)
        sys.exit(0 if ok else 1)

    run_bump(target_ver, args.date)


if __name__ == "__main__":
    main()
