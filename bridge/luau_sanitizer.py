# SPDX-License-Identifier: GPL-3.0-or-later
"""
bridge/luau_sanitizer.py - Pre-flight Luau syntax sanitizer, operator normalizer, and block validator.

Prevents common LLM syntax blunders (JS operators, stray markdown fences, deprecated APIs,
unclosed blocks) from reaching Roblox Studio and causing round-trip error loops.
"""

import re
from typing import List, Tuple, Optional


# Pattern to tokenize Luau into: comments, strings, and executable code
# Order matters: multi-line comments/strings must precede single-line
TOKEN_PATTERN = re.compile(
    r"(?P<ml_comment>--\[(?P<c_eq>=*)\[.*?\](?P=c_eq)\])|"  # --[==[ multi-line comment ]==]
    r"(?P<sl_comment>--[^\r\n]*)|"                          # -- single-line comment
    r"(?P<ml_string>\[(?P<s_eq>=*)\[.*?\](?P=s_eq)\])|"     # [==[ multi-line string ]==]
    r"(?P<dq_string>\"(?:[^\"\\]|\\.)*\")|"                 # "double quoted string"
    r"(?P<sq_string>\'(?:[^\'\\]|\\.)*\')|"                 # 'single quoted string'
    r"(?P<code_chunk>[^-\[\"\']+|.)",                        # code chunk
    re.DOTALL
)


def split_luau_tokens(code: str) -> List[Tuple[str, str]]:
    """Tokenize Luau into a list of (token_type, text)."""
    tokens = []
    for m in TOKEN_PATTERN.finditer(code):
        kind = m.lastgroup
        text = m.group(0)
        if kind in ("ml_comment", "sl_comment"):
            tokens.append(("comment", text))
        elif kind in ("ml_string", "dq_string", "sq_string"):
            tokens.append(("string", text))
        else:
            tokens.append(("code", text))
    return tokens


def sanitize_code_segment(text: str) -> Tuple[str, List[str]]:
    """Sanitizes executable code tokens only (ignores strings and comments)."""
    changes = []
    original = text

    # 1. Strip stray markdown fences accidentally injected by AI inside the code
    if "```" in text:
        cleaned_lines = []
        for line in text.splitlines(keepends=True):
            stripped = line.strip()
            if stripped.startswith("```") or stripped == "```":
                changes.append("Stripped stray markdown code fence")
                continue
            cleaned_lines.append(line)
        text = "".join(cleaned_lines)

    # 2. Modernize deprecated Luau globals
    if re.search(r'(?<![.\w])wait\s*\(', text):
        text = re.sub(r'(?<![.\w])wait\s*\(', 'task.wait(', text)
        changes.append("Modernized wait() -> task.wait()")
    if re.search(r'(?<![.\w])spawn\s*\(', text):
        text = re.sub(r'(?<![.\w])spawn\s*\(', 'task.spawn(', text)
        changes.append("Modernized spawn() -> task.spawn()")
    if re.search(r'(?<![.\w])delay\s*\(', text):
        text = re.sub(r'(?<![.\w])delay\s*\(', 'task.delay(', text)
        changes.append("Modernized delay() -> task.delay()")
    if re.search(r'(?<![.\w])ypcall\s*\(', text):
        text = re.sub(r'(?<![.\w])ypcall\s*\(', 'pcall(', text)
        changes.append("Modernized ypcall() -> pcall()")

    # 3. Fix C/JS equality and logical operators in Luau
    # !== or != -> ~=
    if re.search(r'!==?', text):
        text = re.sub(r'!==?', '~=', text)
        changes.append("Converted '!=' / '!==' to '~='")

    # === -> ==
    if re.search(r'===', text):
        text = re.sub(r'===', '==', text)
        changes.append("Converted '===' to '=='")

    # && -> and
    if re.search(r'(?<=\s)&&(?=\s)', text) or re.search(r'(?<=\))&&|&&(?=\()', text):
        text = re.sub(r'(?<=\s)&&(?=\s)|(?<=\))&&|&&(?=\()', ' and ', text)
        changes.append("Converted '&&' to 'and'")

    # || -> or
    if re.search(r'(?<=\s)\|\|(?=\s)', text) or re.search(r'(?<=\))\|\||\|\|(?=\()', text):
        text = re.sub(r'(?<=\s)\|\|(?=\s)|(?<=\))\|\||\|\|(?=\()', ' or ', text)
        changes.append("Converted '||' to 'or'")

    # !identifier or !(expr) -> not identifier / not (expr)
    if re.search(r'(?<![.\w])!(?=[a-zA-Z_(\[])', text):
        text = re.sub(r'(?<![.\w])!(?=[a-zA-Z_(\[])', 'not ', text)
        changes.append("Converted '!' prefix to 'not '")

    # Standalone 'null' keyword -> 'nil'
    if re.search(r'(?<![.\w])null(?![.\w])', text):
        text = re.sub(r'(?<![.\w])null(?![.\w])', 'nil', text)
        changes.append("Converted 'null' to 'nil'")

    return text, changes


def check_and_repair_blocks(tokens: List[Tuple[str, str]]) -> Tuple[str, List[str], Optional[str]]:
    """
    Checks block balance across executable code tokens and auto-repairs single trailing end.
    Returns (reconstructed_code, changes, fatal_error).
    """
    changes = []
    code_text = "".join(text for kind, text in tokens if kind == "code")

    # Regex token count for block openers/closers
    # Openers: function, do, then, repeat
    # Closers: end, until
    open_funcs = len(re.findall(r'(?<![.\w])function(?![.\w])', code_text))
    open_dos = len(re.findall(r'(?<![.\w])do(?![.\w])', code_text))
    open_thens = len(re.findall(r'(?<![.\w])then(?![.\w])', code_text))
    open_repeats = len(re.findall(r'(?<![.\w])repeat(?![.\w])', code_text))

    closers_end = len(re.findall(r'(?<![.\w])end(?![.\w])', code_text))
    closers_until = len(re.findall(r'(?<![.\w])until(?![.\w])', code_text))

    total_standard_openers = open_funcs + open_dos + open_thens
    deficit = total_standard_openers - closers_end

    full_reconstructed = "".join(text for _, text in tokens)

    # Check repeat/until balance
    if open_repeats > closers_until:
        return full_reconstructed, changes, f"Missing 'until' for 'repeat' block (found {open_repeats} repeat vs {closers_until} until)"

    if deficit == 1:
        # Exactly 1 missing 'end' at the end of the script - auto repair
        full_reconstructed = full_reconstructed.rstrip() + "\nend\n"
        changes.append("Auto-repaired: Appended missing 'end' at script termination")
    elif deficit > 1:
        return full_reconstructed, changes, f"Unbalanced Luau blocks: {total_standard_openers} block openers vs {closers_end} 'end' closers (missing {deficit} 'end')"
    elif deficit < 0:
        return full_reconstructed, changes, f"Unbalanced Luau blocks: {closers_end} 'end' closers vs {total_standard_openers} block openers (excess {-deficit} 'end')"

    return full_reconstructed, changes, None


def sanitize_and_validate_luau(raw_code: str) -> Tuple[str, List[str], Optional[str]]:
    """
    Main entry point: tokenizes, sanitizes operators without corrupting strings,
    and checks block structure.

    Returns:
        (sanitized_code, changes_applied, fatal_error_or_none)
    """
    if not raw_code or not raw_code.strip():
        return raw_code, [], None

    tokens = split_luau_tokens(raw_code)
    all_changes = []
    new_tokens = []

    for kind, text in tokens:
        if kind == "code":
            clean_text, changes = sanitize_code_segment(text)
            new_tokens.append((kind, clean_text))
            all_changes.extend(changes)
        else:
            # Preserve strings and comments verbatim
            new_tokens.append((kind, text))

    final_code, block_changes, fatal_err = check_and_repair_blocks(new_tokens)
    all_changes.extend(block_changes)

    # Deduplicate changes for clean logging
    unique_changes = list(dict.fromkeys(all_changes))

    return final_code, unique_changes, fatal_err
