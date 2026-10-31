# SPDX-License-Identifier: GPL-3.0-or-later
"""
bridge/studio_watcher.py - Roblox Studio process detection, port management, and connection monitor.
"""
import asyncio
import json
import os
import subprocess
import sys
import time

from bridge.constants import PORT, STUDIO_MCP_PORT, PRIMARY_SERVER_ID, log, action_banner

try:
    import bridge.launch_studio_mcp as _studio_scan
except Exception:
    try:
        import launch_studio_mcp as _studio_scan
    except Exception:
        _studio_scan = None

STUDIO_PROBE_TOOL = "list_roblox_studios"
STUDIO_STATE_TOOL = "get_studio_state"
NO_PLACE_MARKERS = (
    "doesn't have a place",
    "no place opened",
    "place opened",
    "has disconnected",
    "no active studio",
)


def port_owner(port: int):
    """(pid, name, path) of process listening on port, or None (Win32 only)."""
    if sys.platform != "win32":
        return None
    out = ""
    for proto in ("TCP", "TCPv6"):
        try:
            out += subprocess.run(
                ["netstat", "-ano", "-p", proto],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=8,
            ).stdout
        except Exception:
            pass
    if not out:
        return None
    pid = None
    needle = f":{port} "
    for line in out.splitlines():
        if "LISTENING" in line and needle in line:
            parts = line.split()
            if parts and parts[-1].isdigit():
                pid = parts[-1]
                break
    if not pid:
        return None
    name, path = "?", ""
    try:
        ps = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-Command",
                f"$p=Get-Process -Id {pid} -ErrorAction SilentlyContinue; if($p){{$p.Name; $p.Path}}",
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=8,
        ).stdout.splitlines()
        ps = [l.strip() for l in ps if l.strip()]
        if ps:
            name = ps[0]
            path = ps[1] if len(ps) > 1 else ""
    except Exception:
        pass
    return (pid, name, path)


def roblox_studio_app_running() -> bool:
    """True if RobloxStudioBeta.exe or RobloxStudio.exe exists in tasklist."""
    if sys.platform != "win32":
        return None
    for exe in ("RobloxStudioBeta.exe", "RobloxStudio.exe"):
        try:
            out = subprocess.run(
                ["tasklist", "/FI", f"IMAGENAME eq {exe}"],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=8,
            ).stdout
            if exe in out:
                return True
        except Exception:
            return None
    return False


def kill_orphan_studio_mcp() -> None:
    """Kill lingering StudioMCP.exe when no actual Roblox Studio instance is open."""
    if sys.platform != "win32" or roblox_studio_app_running() is not False:
        return
    try:
        out = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq StudioMCP.exe"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=8,
        ).stdout
    except Exception:
        return
    if "StudioMCP.exe" not in out:
        return
    log("Cleaning up orphaned StudioMCP.exe without active Studio running...", "yl")
    try:
        subprocess.run(["taskkill", "/F", "/IM", "StudioMCP.exe"], capture_output=True, text=True, timeout=8)
    except Exception as e:
        log(f"could not clean up orphaned StudioMCP.exe: {e}", "rd")


def descendant_pids(root_pid: int) -> set:
    """Set of descendant PIDs of root_pid."""
    if sys.platform != "win32":
        return None
    try:
        out = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-Command",
                'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.ParentProcessId)" }',
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=10,
        ).stdout
    except Exception:
        return None
    children = {}
    for line in out.splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
            children.setdefault(int(parts[1]), []).append(int(parts[0]))
    if not children:
        return None
    pids = {int(root_pid)}
    stack = [int(root_pid)]
    while stack:
        for c in children.get(stack.pop(), []):
            if c not in pids:
                pids.add(c)
                stack.append(c)
    return pids


def reclaim_studio_port(client) -> bool:
    """Kill external StudioMCP.exe listening on port 13469."""
    owner = port_owner(STUDIO_MCP_PORT)
    if not owner:
        return False
    pid, name, _ = owner
    if "studiomcp" not in (name or "").lower():
        return False
    try:
        pid_i = int(pid)
    except (TypeError, ValueError):
        return False
    if client is not None and client.proc is not None and client.is_alive():
        tree = descendant_pids(client.proc.pid)
        if tree is None or pid_i in tree:
            return False
    log(f"port {STUDIO_MCP_PORT} held by zombie StudioMCP.exe (pid {pid_i}) - killing it", "yl")
    try:
        subprocess.run(["taskkill", "/F", "/PID", str(pid_i)], capture_output=True, text=True, timeout=8)
        log(f"killed leftover StudioMCP.exe (pid {pid_i})", "cy")
        return True
    except Exception as e:
        log(f"could not kill StudioMCP.exe: {e}", "rd")
        return False


def _process_cmdline(pid: int) -> str:
    if sys.platform != "win32":
        return ""
    try:
        out = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-Command",
                f'(Get-CimInstance Win32_Process -Filter "ProcessId={pid}" -ErrorAction SilentlyContinue).CommandLine',
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=8,
        ).stdout
        return (out or "").strip()
    except Exception:
        return ""


def reclaim_bridge_port() -> bool:
    """Free port 17613 from a previous zombie bridge instance."""
    owner = port_owner(PORT)
    if not owner:
        return False
    pid, name, _ = owner
    try:
        pid_i = int(pid)
    except (TypeError, ValueError):
        return False
    if pid_i == os.getpid():
        return False
    if "python" not in (name or "").lower() and "py" != (name or "").lower():
        return False
    cmdline = _process_cmdline(pid_i)
    if "bridge.py" not in cmdline.lower() and "bridge" not in cmdline.lower():
        return False
    log(f"port {PORT} held by old ZXScript bridge (pid {pid_i}) - terminating it", "yl")
    try:
        subprocess.run(["taskkill", "/F", "/PID", str(pid_i)], capture_output=True, text=True, timeout=8)
        log(f"freed port {PORT}", "cy")
        return True
    except Exception as e:
        log(f"could not kill previous bridge: {e}", "rd")
        return False


def kill_port_squatter() -> tuple:
    """Kill non-Roblox process hijacking Studio MCP port."""
    owner = port_owner(STUDIO_MCP_PORT)
    if owner:
        pid, name, path = owner
        p = (path or "").lower()
        n = (name or "").lower()
        if "roblox" in p or "bloxstrap" in p or "studiomcp" in n or "robloxstudio" in n:
            return False, None
        log(f"port {STUDIO_MCP_PORT} hijacked by '{name}' (pid {pid})", "yl")
        try:
            subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True, text=True, timeout=8)
            log(f"killed squatter '{name}'", "cy")
            return True, name
        except Exception as e:
            log(f"could not kill '{name}': {e}", "rd")
            return False, name

    for img in ("ropilot-infra-helper.exe", "ropilot-infra.exe", "ropilot.exe"):
        try:
            res = subprocess.run(["taskkill", "/F", "/IM", img], capture_output=True, text=True, timeout=8)
            if res.returncode == 0:
                log(f"killed '{img}' (known squatter)", "cy")
                return True, img
        except Exception:
            continue
    return False, None


def print_squatter_hint(name: str) -> None:
    app = name or "the other app"
    action_banner([
        f"'{app}' conflicts with Roblox Studio MCP port.",
        f"1. Uninstall '{app}' or remove from startup.",
        "2. In Roblox Studio: Assistant Settings > MCP Servers,",
        "   toggle OFF then back ON 'Enable Studio as MCP server'.",
    ])


def print_reregister_hint() -> None:
    action_banner([
        "Roblox Studio MCP re-registration needed:",
        "In Studio: Assistant Settings > MCP Servers,",
        "Turn OFF then ON 'Enable Studio as MCP server'.",
        "Wait ~10s for green status.",
    ])


def check_studio_port() -> bool:
    """Probe whether an unauthorized process is squatting Studio port."""
    owner = port_owner(STUDIO_MCP_PORT)
    if not owner:
        return False
    pid, name, path = owner
    p = (path or "").lower()
    n = (name or "").lower()
    if "roblox" in p or "bloxstrap" in p or "studiomcp" in n or "robloxstudio" in n:
        return False
    log(f"Port {STUDIO_MCP_PORT} is held by non-Roblox process: {name} (pid {pid})", "yl")
    try:
        subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True, text=True, timeout=8)
        print_reregister_hint()
        return True
    except Exception as e:
        log(f"could not terminate {name}: {e}", "rd")
    return False


def current_studio_exe() -> str:
    if _studio_scan is None:
        return None
    try:
        return _studio_scan.find_studio_mcp()
    except Exception:
        return None


def probe_tool_text(mgr, tool: str):
    with mgr.index_lock:
        entry = mgr.index.get(tool)
    if entry is None:
        return None
    holder, real_name = entry
    if not holder.call_lock.acquire(blocking=False):
        return None
    try:
        if not holder.is_alive():
            return None
        msg = holder._request("tools/call", {"name": real_name, "arguments": {}}, timeout=8)
        if not msg or msg.get("error"):
            return None
        content = msg.get("result", {}).get("content", [])
        return "\n".join(it.get("text", "") for it in content if it.get("type") == "text")
    except Exception:
        return None
    finally:
        holder.call_lock.release()


def probe_studio(mgr) -> dict:
    roblox = mgr.clients.get(PRIMARY_SERVER_ID)
    if roblox is not None and roblox.is_alive() and not roblox.tools_cache:
        return {"app": False, "place": False}
    text = probe_tool_text(mgr, STUDIO_PROBE_TOOL)
    if text is None:
        return {"app": None, "place": None}
    try:
        studios = json.loads(text).get("studios") or []
    except Exception:
        return {"app": None, "place": None}
    if not studios:
        return {"app": False, "place": False}

    state = probe_tool_text(mgr, STUDIO_STATE_TOOL)
    if state is None:
        return {"app": True, "place": None}
    low = state.lower()
    place = not any(m in low for m in NO_PLACE_MARKERS)
    return {"app": True, "place": place}


async def studio_watch(mgr, broadcast_status_func, initial_app: bool, initial_place: bool = None):
    """Continuous supervisor for Roblox Studio attachment and place status."""
    prev_app = initial_app
    prev_place = initial_place
    disconnected_since = None
    last_auto_restart = 0.0
    empty_since = None
    last_reclaim = 0.0
    place_transitions = []
    known_studio_exe = await asyncio.to_thread(current_studio_exe)
    update_suspected = False
    ever_connected = initial_app is True

    while True:
        await asyncio.sleep(4)
        rc0 = mgr.clients.get(PRIMARY_SERVER_ID)
        if rc0 is not None and rc0.is_alive() and not rc0.tools_cache:
            got = False
            try:
                got = bool(await asyncio.to_thread(rc0.refresh_tools, 3))
            except Exception:
                got = False
            if got:
                mgr.rebuild_index()
                log(f"Roblox Studio tools appeared ({len(rc0.tools_cache)}) - attached.", "gr")
                empty_since = None
            else:
                now0 = time.time()
                if empty_since is None:
                    empty_since = now0
                if rc0.saw_foreign_ws_host and now0 - last_reclaim > 180:
                    last_reclaim = now0
                    killed, sname = await asyncio.to_thread(kill_port_squatter)
                    if killed:
                        try:
                            await asyncio.to_thread(mgr.restart, PRIMARY_SERVER_ID)
                        except Exception as e:
                            log(f"restart after squatter kill failed: {e}", "rd")
                        print_squatter_hint(sname)
                        await broadcast_status_func()
                elif now0 - empty_since > 20 and now0 - last_reclaim > 180 and await asyncio.to_thread(roblox_studio_app_running) is True:
                    last_reclaim = now0
                    if await asyncio.to_thread(reclaim_studio_port, rc0):
                        try:
                            await asyncio.to_thread(mgr.restart, PRIMARY_SERVER_ID)
                        except Exception as e:
                            log(f"restart after zombie kill failed: {e}", "rd")
                        print_reregister_hint()
                        await broadcast_status_func()
        else:
            empty_since = None

        try:
            st = await asyncio.to_thread(probe_studio, mgr)
        except Exception:
            continue

        app, place = st["app"], st["place"]
        if app is not None and app != prev_app:
            if app is True:
                rc = mgr.clients.get(PRIMARY_SERVER_ID)
                roblox_now = len(rc.tools_cache) if rc else 0
                log(f"Roblox Studio connected - {roblox_now} tools ready.", "gr")
                ever_connected = True
                disconnected_since = None
                update_suspected = False
            else:
                cur_exe = await asyncio.to_thread(current_studio_exe)
                if cur_exe and known_studio_exe and cur_exe != known_studio_exe:
                    ver = os.path.basename(os.path.dirname(cur_exe))
                    log(f"Roblox Studio updated ({ver}). Re-enable MCP server toggle in Studio settings.", "yl")
                    update_suspected = True
                else:
                    log("Roblox Studio disconnected - re-enable its MCP server (toggle off/on).", "yl")
                    update_suspected = False
                known_studio_exe = cur_exe or known_studio_exe
                if ever_connected and disconnected_since is None:
                    disconnected_since = time.time()
            prev_app = app
            await broadcast_status_func()

        now = time.time()
        if app is False and ever_connected and disconnected_since is not None and not update_suspected:
            if now - disconnected_since > 20 and now - last_auto_restart > 90:
                last_auto_restart = now
                if await asyncio.to_thread(roblox_studio_app_running) is True:
                    log("Studio is running but MCP plugin not yet registered. Open Assistant Settings > MCP Servers.", "yl")
                else:
                    log("Studio proxy reconnecting...", "yl")
                    try:
                        await asyncio.to_thread(mgr.restart, PRIMARY_SERVER_ID)
                        await broadcast_status_func()
                    except Exception as e:
                        log(f"auto-restart failed: {e}", "rd")

        place_transitions[:] = [t for t in place_transitions if now - t < 90]
        if len(place_transitions) >= 4 and now - last_auto_restart > 90:
            if await asyncio.to_thread(roblox_studio_app_running) is not True:
                last_auto_restart = now
                log("Place status churn detected - restarting proxy...", "yl")
                try:
                    await asyncio.to_thread(mgr.restart, PRIMARY_SERVER_ID)
                    await broadcast_status_func()
                except Exception as e:
                    log(f"proxy restart failed: {e}", "rd")
                place_transitions.clear()

        if place is not None and place != prev_place:
            await asyncio.sleep(1.2)
            try:
                confirm = (await asyncio.to_thread(probe_studio, mgr))["place"]
            except Exception:
                confirm = None
            if confirm is None or confirm != place:
                continue
            if place is True:
                log("Place loaded in Studio.", "gr")
            else:
                log("Place closed (Studio still connected).", "yl")
            prev_place = place
            place_transitions.append(time.time())
            await broadcast_status_func()

