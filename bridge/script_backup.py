# SPDX-License-Identifier: GPL-3.0-or-later
"""
bridge/script_backup.py - Local disk snapshot and auto-backup engine for Roblox Studio scripts.

Prevents code loss from Roblox Studio crashes, place reloads, or corrupted state by
saving timestamped immutable backups and maintaining local mirrors under projects/<PlaceName>/.
"""

import os
import re
import time
import hashlib
from typing import Optional, List, Dict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(HERE)
PROJECTS_DIR = os.path.join(ROOT_DIR, "projects")

MAX_BACKUPS_PER_SCRIPT = 30


def sanitize_filename(name: str) -> str:
    """Sanitizes script name to be safe across Windows, macOS, and Linux filesystems."""
    clean = re.sub(r'[\\/*?:"<>|]', "_", str(name or "").strip())
    clean = re.sub(r'\s+', '_', clean)
    return clean or "UnnamedScript"


def compute_hash(content: str) -> str:
    """Computes SHA-256 hash of code content."""
    return hashlib.sha256(content.strip().encode("utf-8")).hexdigest()


def get_project_dirs(place_name: str) -> Dict[str, str]:
    """Ensures and returns project, scripts, and backup directories for place_name."""
    safe_place = sanitize_filename(place_name) or "Default_Place"
    base_dir = os.path.join(PROJECTS_DIR, safe_place)
    scripts_dir = os.path.join(base_dir, "scripts")
    backups_dir = os.path.join(base_dir, "backups")

    os.makedirs(scripts_dir, exist_ok=True)
    os.makedirs(backups_dir, exist_ok=True)

    return {
        "base": base_dir,
        "scripts": scripts_dir,
        "backups": backups_dir,
    }


def prune_old_backups(backups_dir: str, script_name: str, max_keep: int = MAX_BACKUPS_PER_SCRIPT) -> int:
    """Retains the most recent max_keep backups for script_name, deleting older ones."""
    try:
        prefix = f"{script_name}_"
        candidates = []
        for f in os.listdir(backups_dir):
            if f.startswith(prefix) and f.endswith(".luau"):
                full_path = os.path.join(backups_dir, f)
                if os.path.isfile(full_path):
                    candidates.append((os.path.getmtime(full_path), full_path))

        # Sort newest to oldest
        candidates.sort(key=lambda x: x[0], reverse=True)
        deleted = 0
        if len(candidates) > max_keep:
            for _, path_to_remove in candidates[max_keep:]:
                try:
                    os.remove(path_to_remove)
                    deleted += 1
                except Exception:
                    pass
        return deleted
    except Exception:
        return 0


def save_script_snapshot(
    place_name: str,
    script_name: str,
    content: str,
    trigger: str = "execute_luau",
    custom_note: str = ""
) -> Optional[str]:
    """
    Saves a timestamped backup of the script and updates the latest mirror.
    Skips if content is empty or identical to the latest backup.

    Returns:
        Absolute path to the backup file if created, None if skipped.
    """
    if not content or len(content.strip()) < 10:
        return None

    safe_name = sanitize_filename(script_name)
    dirs = get_project_dirs(place_name)

    # 1. Check if identical to the latest mirror
    latest_mirror = os.path.join(dirs["scripts"], f"{safe_name}.luau")
    if os.path.isfile(latest_mirror):
        try:
            with open(latest_mirror, "r", encoding="utf-8") as f:
                if f.read().strip() == content.strip():
                    return None  # Identical, skip duplicate backup
        except Exception:
            pass

    # 2. Write latest mirror
    try:
        with open(latest_mirror, "w", encoding="utf-8", newline="\n") as f:
            f.write(content.strip() + "\n")
    except Exception:
        pass

    # 3. Create timestamped immutable backup
    now = time.strftime("%Y%m%d_%H%M%S")
    now_human = time.strftime("%Y-%m-%d %H:%M:%S")
    backup_file = f"{safe_name}_{now}.luau"
    backup_path = os.path.join(dirs["backups"], backup_file)

    header = (
        f"--[==[\n"
        f"  [ZXScript Auto-Backup Snapshot]\n"
        f"  Place: {place_name}\n"
        f"  Script: {script_name}\n"
        f"  Timestamp: {now_human}\n"
        f"  Trigger: {trigger}\n"
        f"  Content Hash: {compute_hash(content)[:12]}\n"
        f"  Note: {custom_note or 'Automated pre-execution / post-execution snapshot'}\n"
        f"]==]\n\n"
    )

    try:
        with open(backup_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(header + content.strip() + "\n")

        # Prune old backups exceeding limit
        prune_old_backups(dirs["backups"], safe_name)

        # Append to project session history
        history_path = os.path.join(dirs["base"], "backups.log")
        with open(history_path, "a", encoding="utf-8", newline="\n") as f:
            f.write(f"[{now_human}] Saved {backup_file} ({len(content)} bytes) via {trigger}\n")

        return backup_path
    except Exception:
        return None


def extract_script_sources_from_luau(code: str) -> List[Tuple[str, str]]:
    """
    Extracts embedded script sources assigned via .Source in Luau code.
    E.g. script.Source = [==[ ... ]==] or local source = "..."
    Returns list of (script_name, source_content).
    """
    extracted = []
    if not code:
        return extracted

    # Pattern 1: target.Source = [==[ ... ]==]
    p1 = re.compile(
        r'(?:([a-zA-Z0-9_.:]+)\.Source\s*=\s*)\[(?P<eq>=*)\[(?P<src>.*?)\](?P=eq)\]',
        re.DOTALL
    )
    for m in p1.finditer(code):
        target = m.group(1) or "GeneratedScript"
        src = m.group("src").strip()
        if len(src) >= 10:
            extracted.append((target, src))

    # Pattern 2: Instance.new("Script", ...) with parent or name
    # e.g.: local leaderstats = Instance.new("Script") ... leaderstats.Name = "Leaderstats"
    name_matches = re.findall(r'([a-zA-Z0-9_]+)\.Name\s*=\s*["\']([^"\']+)["\']', code)
    name_map = dict(name_matches)

    # If extracted is empty but code itself is an executable script
    if not extracted and ("game:GetService" in code or "local " in code) and len(code.strip()) > 40:
        default_name = name_map.get("script") or name_map.get("s") or "GeneratedScript"
        # If code contains functions or logic, snapshot the executed block itself
        extracted.append((default_name, code.strip()))

    return extracted


def process_tool_backup(place_name: str, tool_name: str, arguments: dict, result_text: str = "") -> List[str]:
    """
    Analyzes tool call and results, automatically extracting and saving script snapshots.
    Returns list of created backup paths.
    """
    created_backups = []
    if not isinstance(arguments, dict):
        return created_backups

    if tool_name == "multi_edit":
        target = arguments.get("target_file") or arguments.get("file") or "MultiEditScript"
        edits = arguments.get("edits") or []
        for i, edit in enumerate(edits):
            new_str = edit.get("new_string", "")
            if len(new_str.strip()) >= 15:
                path = save_script_snapshot(
                    place_name,
                    f"{target}_edit{i+1}" if len(edits) > 1 else target,
                    new_str,
                    trigger="multi_edit"
                )
                if path:
                    created_backups.append(path)

    elif tool_name == "execute_luau":
        code = arguments.get("code", "")
        # Don't backup internal probes or ChangeHistory wrapping queries
        if "_chs:TryBeginRecording" in code:
            # Extract inner user code from wrapping
            m = re.search(r'local function _zx_action\(\)\n(.*?)\nend\nlocal _ok', code, re.DOTALL)
            if m:
                code = m.group(1)

        if "ServerStorage:FindFirstChild('ZXScript')" in code:
            return created_backups

        extracted = extract_script_sources_from_luau(code)
        for name, src in extracted:
            path = save_script_snapshot(place_name, name, src, trigger="execute_luau")
            if path:
                created_backups.append(path)

    return created_backups
