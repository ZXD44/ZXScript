# SPDX-License-Identifier: GPL-3.0-or-later
"""
bridge/tool_dispatcher.py - Tool argument normalization, Luau safety wrapping, memory syncing, and execution.
"""
import asyncio
import json
import os
import re
import time
import websockets

from bridge.constants import HERE, log
from bridge.studio_watcher import probe_studio, probe_tool_text, STUDIO_PROBE_TOOL
from bridge.luau_sanitizer import sanitize_and_validate_luau


def modernize_and_wrap_luau(args: dict) -> dict:
    """Sanitizes Luau syntax, modernizes deprecated calls, and wraps in ChangeHistoryService for Ctrl+Z undo."""
    if not isinstance(args, dict):
        return args
    code = args.get("code")
    if not isinstance(code, str) or not code.strip():
        return args

    # Pre-flight Luau syntax sanitization & validation
    code, changes, fatal_err = sanitize_and_validate_luau(code)
    if fatal_err:
        log(f"[luau pre-check] Block syntax error detected: {fatal_err}", "yl")
        raise ValueError(f"[ZXScript Luau Syntax Pre-Check] {fatal_err}")
    if changes:
        log(f"[luau pre-check] Auto-fixed: {', '.join(changes)}", "cy")

    # ChangeHistoryService transaction wrapping
    dm = str(args.get("datamodel_type", "Edit")).lower()
    if (dm == "edit" or not dm) and "_chs:TryBeginRecording" not in code:
        wrapped_code = (
            'local _chs = game:GetService("ChangeHistoryService")\n'
            'local _rec = nil\n'
            'pcall(function() _rec = _chs:TryBeginRecording("ZXScript Action") end)\n'
            'local function _zx_action()\n'
            f'{code}\n'
            'end\n'
            'local _ok, _res = pcall(_zx_action)\n'
            'if _rec then\n'
            '    pcall(function()\n'
            '        if _ok then\n'
            '            _chs:FinishRecording(_rec, Enum.FinishRecordingOperation.Commit)\n'
            '        else\n'
            '            _chs:FinishRecording(_rec, Enum.FinishRecordingOperation.Cancel)\n'
            '        end\n'
            '    end)\n'
            'end\n'
            'if not _ok then error(_res) end\n'
            'return _res'
        )
        new_args = dict(args)
        new_args["code"] = wrapped_code
        return new_args

    new_args = dict(args)
    new_args["code"] = code
    return new_args


def prune_game_tree(text: str) -> str:
    """Filters noisy internal Roblox engine services to conserve context tokens."""
    if not text or len(text) < 400:
        return text
    noisy_services = (
        "CorePackages",
        "CoreGui",
        "RobloxPluginGuiService",
        "PackageService",
        "RobloxReplicatedStorage",
        "VoiceChatService",
        "VRService",
        "InternalSyncService",
        "MemStorageService",
        "AssetService",
    )
    lines = text.splitlines()
    filtered = []
    skip_indent = None
    for line in lines:
        stripped = line.strip()
        indent = len(line) - len(line.lstrip())
        if skip_indent is not None:
            if indent > skip_indent:
                continue
            skip_indent = None
        if any(stripped.startswith(svc) or f" {svc} " in line for svc in noisy_services):
            skip_indent = indent
            continue
        filtered.append(line)
    return "\n".join(filtered)


def slice_script_output(text: str, args: dict) -> str:
    """Slices script text to requested line window."""
    start = args.get("start_line")
    end = args.get("end_line")
    if start is None and end is None:
        return text
    if not text:
        return text
    lines = text.splitlines()
    total = len(lines)
    s = max(1, int(start or 1)) - 1
    e = min(total, int(end or total))
    sliced = lines[s:e]
    header = f"[ZXScript: showing lines {s+1}-{e} of {total} total]"
    return header + "\n" + "\n".join(sliced)


def get_active_place_name(mgr) -> str:
    """Sanitized name of current place loaded in Roblox Studio."""
    try:
        text = probe_tool_text(mgr, STUDIO_PROBE_TOOL)
        if text:
            studios = json.loads(text).get("studios") or []
            if studios and studios[0].get("name"):
                raw_name = str(studios[0]["name"]).strip()
                clean = re.sub(r'[\\/*?:"<>|]', "_", raw_name)
                return clean or "Current_Place"
    except Exception:
        pass
    return "Default_Place"


def force_sync_memory_from_studio(mgr) -> tuple:
    """Read game.ServerStorage.ZXScript.Memory directly from Studio into local projects dir."""
    try:
        res = mgr.call("execute_luau", {
            "code": "local s = game:GetService('ServerStorage'):FindFirstChild('ZXScript'); local m = s and s:FindFirstChild('Memory'); return m and m.Source or ''"
        }, timeout=8)
        content = ""
        if res.get("text"):
            content = res["text"].strip()
        if not content:
            return False, "No memory found in game.ServerStorage.ZXScript.Memory"

        place_name = get_active_place_name(mgr)
        proj_dir = os.path.join(HERE, "..", "projects", place_name)
        os.makedirs(proj_dir, exist_ok=True)

        lua_path = os.path.join(proj_dir, "Memory.luau")
        with open(lua_path, "w", encoding="utf-8") as f:
            if not content.startswith("return"):
                f.write(f"return [==[\n{content}\n]==]\n")
            else:
                f.write(content)

        md_body = content
        m = re.search(r"\[=*\[(.*?)\]=*\]", content, re.DOTALL)
        if m:
            md_body = m.group(1).strip()

        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        readme_path = os.path.join(proj_dir, "README.md")
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(f"# Project Memory: {place_name}\n")
            f.write(f"> **Owner:** ZXD44 | **Last Synced:** {now_str}\n\n")
            f.write(md_body + "\n")

        log_path = os.path.join(proj_dir, "sessions.log")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"[{now_str}] Project memory synchronized ({len(content)} bytes)\n")

        log(f"[project] Direct-synced {place_name} memory -> projects/{place_name}/", "gr")
        return True, f"Synced {place_name} successfully"
    except Exception as e:
        return False, str(e)


def sync_project_memory_to_disk(mgr, name: str, arguments: dict) -> None:
    """Mirrors script memory to local disk projects directory."""
    try:
        if not isinstance(arguments, dict):
            return

        is_mem_edit = False
        content = ""
        if name == "multi_edit":
            target = str(arguments.get("target_file", "")).lower()
            if "zxscript.memory" in target or target.endswith(".memory") or "memory" in target:
                is_mem_edit = True
                edits = arguments.get("edits") or []
                for edit in edits:
                    ns = edit.get("new_string", "")
                    if len(ns) > len(content):
                        content = ns

        elif name == "execute_luau":
            code = str(arguments.get("code", ""))
            if "zxscript.memory" in code.lower() or ("zxscript" in code.lower() and "memory" in code.lower()):
                is_mem_edit = True
                m = re.search(r"\[=*\[(.*?)\]=*\]", code, re.DOTALL)
                if m:
                    content = m.group(1).strip()

        if not is_mem_edit:
            return

        ok, _ = force_sync_memory_from_studio(mgr)
        if ok or not content or len(content) < 20:
            return

        place_name = get_active_place_name(mgr)
        proj_dir = os.path.join(HERE, "..", "projects", place_name)
        os.makedirs(proj_dir, exist_ok=True)

        lua_path = os.path.join(proj_dir, "Memory.luau")
        with open(lua_path, "w", encoding="utf-8") as f:
            if not content.startswith("return"):
                f.write(f"return [==[\n{content}\n]==]\n")
            else:
                f.write(content)

        md_body = content
        m = re.search(r"\[=*\[(.*?)\]=*\]", content, re.DOTALL)
        if m:
            md_body = m.group(1).strip()

        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        readme_path = os.path.join(proj_dir, "README.md")
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(f"# Project Memory: {place_name}\n")
            f.write(f"> **Owner:** ZXD44 | **Last Synced:** {now_str}\n\n")
            f.write(md_body + "\n")

        log_path = os.path.join(proj_dir, "sessions.log")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"[{now_str}] Project memory synchronized ({len(content)} bytes)\n")

        log(f"[project] Auto-synced {place_name} memory -> projects/{place_name}/", "gr")
    except Exception as e:
        log(f"[project] Sync warning: {e}", "yl")


def safe_call(mgr, name: str, arguments: dict, timeout: float) -> dict:
    """Safely invoke tool via MCPManager. Never raises; returns standard result dictionary."""
    try:
        if name == "execute_luau":
            arguments = modernize_and_wrap_luau(arguments)

        result = mgr.call(name, arguments, timeout)

        if (
            name == "execute_luau"
            and result.get("text", "")
            and "Edit datamodel is not available" in result.get("text", "")
            and isinstance(arguments, dict)
            and not arguments.get("datamodel_type", "").strip()
        ):
            retry_args = dict(arguments)
            retry_args["datamodel_type"] = "Server"
            result = mgr.call(name, retry_args, timeout)

        text = result["text"]

        if name == "search_game_tree" and text:
            text = prune_game_tree(text)

        if name == "script_read" and text and isinstance(arguments, dict):
            text = slice_script_output(text, arguments)

        sync_project_memory_to_disk(mgr, name, arguments)

        return {"ok": True, "text": text, "images": result["images"]}
    except ValueError as e:
        return {"ok": False, "error": str(e), "kind": "syntax_error"}
    except TimeoutError as e:
        return {"ok": False, "error": str(e), "kind": "timeout"}
    except Exception as e:
        err_msg = str(e)
        err_msg = re.sub(r'\bAssistantCommand:(\d+):', r'Line \1:', err_msg)
        return {"ok": False, "error": err_msg, "kind": type(e).__name__}


async def run_tool_task(mgr, ws, name: str, args: dict, timeout: float, rid: str):
    """Execute tool asynchronously to keep websocket read loop responsive."""
    t0 = time.monotonic()
    res = await asyncio.to_thread(safe_call, mgr, name, args, timeout)
    elapsed = time.monotonic() - t0
    tag = "gr" if res.get("ok") else "rd"
    summary = (res.get("text") or res.get("error") or "")[:80].replace("\n", " ")
    slow = "  [SLOW]" if elapsed > 5 else ""
    log(f"<- {name} ({elapsed:.1f}s){slow}: {summary}", tag, terminal=not res.get("ok") or elapsed > 5)
    try:
        await ws.send(json.dumps({"type": "tool_result", "id": rid, **res}))
    except websockets.ConnectionClosed:
        pass

