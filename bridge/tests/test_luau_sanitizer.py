# SPDX-License-Identifier: GPL-3.0-or-later
"""
Unit tests for bridge/luau_sanitizer.py
Run via: python -m bridge.tests.test_luau_sanitizer or python bridge/tests/test_luau_sanitizer.py
"""
import sys
import os

# Add parent directory to path
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, ROOT)

from bridge.luau_sanitizer import sanitize_and_validate_luau


def test_string_preservation():
    raw = 'local msg = "Score != 0 && bonus == true" -- check if != 0'
    clean, changes, err = sanitize_and_validate_luau(raw)
    assert 'Score != 0 && bonus == true' in clean, "String contents must NOT be altered!"
    assert '-- check if != 0' in clean, "Comment contents must NOT be altered!"
    assert err is None
    print("PASS: String & comment preservation")


def test_operator_normalization():
    raw = """
    local x = 5
    if x != 10 && !isDone || x === 20 then
        print(null)
    end
    """
    clean, changes, err = sanitize_and_validate_luau(raw)
    assert "~=" in clean, "Expected '!=' to be replaced by '~='"
    assert " and " in clean, "Expected '&&' to be replaced by 'and'"
    assert " or " in clean, "Expected '||' to be replaced by 'or'"
    assert "not isDone" in clean, "Expected '!isDone' to be replaced by 'not isDone'"
    assert "x == 20" in clean, "Expected '===' to be replaced by '=='"
    assert "print(nil)" in clean, "Expected 'null' to be replaced by 'nil'"
    assert err is None
    print("PASS: Operator normalization")


def test_markdown_fence_stripping():
    raw = """
    ```luau
    local part = Instance.new("Part")
    part.Parent = workspace
    ```
    """
    clean, changes, err = sanitize_and_validate_luau(raw)
    assert "```" not in clean, "Expected markdown fences to be stripped!"
    assert "local part = Instance.new" in clean
    assert err is None
    print("PASS: Markdown fence stripping")


def test_deprecated_globals():
    raw = """
    wait(1)
    spawn(function()
        delay(0.5, function() end)
    end)
    """
    clean, changes, err = sanitize_and_validate_luau(raw)
    assert "task.wait(1)" in clean
    assert "task.spawn(" in clean
    assert "task.delay(0.5" in clean
    assert err is None
    print("PASS: Deprecated globals modernization")


def test_auto_repair_single_missing_end():
    raw = """
    local function test()
        print("Hello")
    """
    clean, changes, err = sanitize_and_validate_luau(raw)
    assert clean.strip().endswith("end"), "Expected single missing 'end' to be auto-repaired!"
    assert err is None
    assert any("Auto-repaired" in c for c in changes)
    print("PASS: Auto-repair single missing end")


def test_fatal_unbalanced_blocks():
    raw = """
    local function foo()
        local function bar()
            print("deep")
    """
    clean, changes, err = sanitize_and_validate_luau(raw)
    assert err is not None, "Expected fatal error on 2 missing 'end's"
    assert "missing 2 'end'" in err
    print("PASS: Fatal error on severe block unbalance")


def main():
    print("=== Running Luau Sanitizer Tests ===")
    test_string_preservation()
    test_operator_normalization()
    test_markdown_fence_stripping()
    test_deprecated_globals()
    test_auto_repair_single_missing_end()
    test_fatal_unbalanced_blocks()
    print("ALL 6 TESTS PASSED 100%!")


if __name__ == "__main__":
    main()

