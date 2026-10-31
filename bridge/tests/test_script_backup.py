# SPDX-License-Identifier: GPL-3.0-or-later
"""
Unit tests for bridge/script_backup.py
Run via: python bridge/tests/test_script_backup.py
"""
import os
import sys
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, ROOT)

from bridge.script_backup import (
    save_script_snapshot,
    process_tool_backup,
    extract_script_sources_from_luau,
    get_project_dirs,
)

TEST_PLACE = "TestPlace_UnitTests"


def cleanup_test_dir():
    dirs = get_project_dirs(TEST_PLACE)
    if os.path.isdir(dirs["base"]):
        shutil.rmtree(dirs["base"], ignore_errors=True)


def test_basic_snapshot_and_dedup():
    cleanup_test_dir()
    code = 'local Players = game:GetService("Players")\nprint("Test code")'

    # First save -> should create backup
    path1 = save_script_snapshot(TEST_PLACE, "Leaderstats", code, trigger="test")
    assert path1 is not None and os.path.isfile(path1), "Backup file should be created"
    assert "Leaderstats" in os.path.basename(path1)

    # Identical save -> should return None (deduplication)
    path2 = save_script_snapshot(TEST_PLACE, "Leaderstats", code, trigger="test")
    assert path2 is None, "Identical content should not create duplicate backup"

    # Changed save -> should create new backup
    code_v2 = code + '\nprint("Version 2")'
    path3 = save_script_snapshot(TEST_PLACE, "Leaderstats", code_v2, trigger="test")
    assert path3 is not None and os.path.isfile(path3), "Modified content must create new backup"

    print("PASS: Basic snapshot & deduplication")


def test_multi_edit_backup():
    cleanup_test_dir()
    args = {
        "target_file": "ServerScriptService.CoinSpawner",
        "edits": [
            {"old_string": "-- placeholder", "new_string": "local coin = Instance.new('Part')\ncoin.Parent = workspace"}
        ]
    }
    backups = process_tool_backup(TEST_PLACE, "multi_edit", args)
    assert len(backups) == 1, f"Expected 1 backup, got {len(backups)}"
    assert os.path.isfile(backups[0])
    print("PASS: multi_edit backup processing")


def test_execute_luau_source_extraction():
    cleanup_test_dir()
    luau_code = """
    local scriptObj = Instance.new("Script")
    scriptObj.Name = "GameManager"
    scriptObj.Source = [==[
        local RunService = game:GetService("RunService")
        print("GameManager loaded!")
    ]==]
    scriptObj.Parent = game.ServerScriptService
    """
    extracted = extract_script_sources_from_luau(luau_code)
    assert len(extracted) >= 1, "Should extract script.Source assignment"
    assert "RunService" in extracted[0][1]

    backups = process_tool_backup(TEST_PLACE, "execute_luau", {"code": luau_code})
    assert len(backups) >= 1, "Should process and save backup from execute_luau"
    assert os.path.isfile(backups[0])
    print("PASS: execute_luau embedded source extraction")


def main():
    print("=== Running Script Backup Tests ===")
    try:
        test_basic_snapshot_and_dedup()
        test_multi_edit_backup()
        test_execute_luau_source_extraction()
        print("ALL 3 SCRIPT BACKUP TESTS PASSED 100%!")
    finally:
        cleanup_test_dir()


if __name__ == "__main__":
    main()
