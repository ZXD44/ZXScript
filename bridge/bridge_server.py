# SPDX-License-Identifier: GPL-3.0-or-later
"""
bridge/bridge_server.py - WebSocket server communication loop and MCP server supervisor.
"""
import asyncio
import json
import time
import websockets

from bridge.constants import PORT, STUDIO_MCP_PORT, log
from bridge.config_manager import config_add_server, config_remove_server, restart_self
from bridge.studio_watcher import probe_studio, roblox_studio_app_running, port_owner
from bridge.tool_dispatcher import run_tool_task, force_sync_memory_from_studio

clients = set()


async def broadcast_status(mgr) -> None:
    """Push fresh status snapshot to all active extension tabs."""
    if not clients:
        return
    try:
        st = await asyncio.to_thread(probe_studio, mgr)
        proc = await asyncio.to_thread(roblox_studio_app_running)
        payload = json.dumps({
            "type": "connected",
            "mcp_alive": mgr.any_alive(),
            "studio": st["place"],
            "studio_app": st["app"],
            "studio_proc": proc,
            "servers": mgr.health(),
            "tools": mgr.list_tools(),
            "port": PORT,
        })
    except Exception:
        return
    for ws in list(clients):
        try:
            await ws.send(payload)
        except Exception:
            pass


async def handler(ws, mgr):
    """WebSocket connection handler for browser extension."""
    peer = getattr(ws, "remote_address", ("?",))[0]
    clients.add(ws)
    log(f"extension connected ({peer}) [{len(clients)} client(s)]", "gr")
    try:
        try:
            st = await asyncio.to_thread(probe_studio, mgr)
        except Exception as e:
            st = {"place": None, "app": None}
            log(f"probe_studio initial error: {e}", "yl")
        await ws.send(json.dumps({
            "type": "connected",
            "mcp_alive": mgr.any_alive(),
            "studio": st["place"],
            "studio_app": st["app"],
            "studio_proc": await asyncio.to_thread(roblox_studio_app_running),
            "servers": mgr.health(),
            "tools": mgr.list_tools(),
            "port": PORT,
        }))

        async for raw in ws:
            try:
                msg = json.loads(raw)
            except Exception:
                continue
            mtype = msg.get("type")
            rid = msg.get("id")

            if mtype == "ping":
                await ws.send(json.dumps({"type": "pong", "id": rid}))

            elif mtype == "studio_status":
                studio = await asyncio.to_thread(probe_studio, mgr)
                await ws.send(json.dumps({
                    "type": "studio_status",
                    "id": rid,
                    "studio": studio["place"],
                    "studio_app": studio["app"],
                    "studio_proc": await asyncio.to_thread(roblox_studio_app_running),
                    "mcp_alive": mgr.any_alive(),
                }))

            elif mtype == "list_tools":
                try:
                    tools = await asyncio.to_thread(mgr.list_tools, True)
                except Exception as e:
                    tools = mgr.list_tools()
                    log(f"list_tools error: {e}", "yl")
                st = await asyncio.to_thread(probe_studio, mgr)
                await ws.send(json.dumps({
                    "type": "tools",
                    "id": rid,
                    "tools": tools,
                    "mcp_alive": mgr.any_alive(),
                    "studio": st["place"],
                    "studio_app": st["app"],
                    "studio_proc": await asyncio.to_thread(roblox_studio_app_running),
                    "servers": mgr.health(),
                }))

            elif mtype == "sync_memory":
                ok, res_msg = await asyncio.to_thread(force_sync_memory_from_studio, mgr)
                await ws.send(json.dumps({
                    "type": "sync_memory_result",
                    "id": rid,
                    "ok": ok,
                    "message": res_msg,
                }))

            elif mtype == "call_tool":
                name = msg.get("name", "")
                args = msg.get("arguments") or {}
                timeout = float(msg.get("timeout", 120000)) / 1000.0
                log(f"-> tool {name}({', '.join(args.keys())})", "cy", terminal=False)
                asyncio.create_task(run_tool_task(mgr, ws, name, args, timeout, rid))

            elif mtype in ("add_server", "remove_server"):
                if mtype == "add_server":
                    ok, err = await asyncio.to_thread(
                        config_add_server,
                        msg.get("server_id"),
                        msg.get("command"),
                        msg.get("args"),
                        msg.get("env"),
                    )
                else:
                    ok, err = await asyncio.to_thread(config_remove_server, msg.get("server_id"))
                await ws.send(json.dumps({
                    "type": "server_changed",
                    "id": rid,
                    "ok": ok,
                    "error": err,
                    "restarting": ok,
                }))
                if ok:
                    async def _do_restart():
                        await asyncio.sleep(0.4)
                        restart_self(mgr)
                    asyncio.create_task(_do_restart())

            elif mtype == "restart_mcp":
                sid = msg.get("server")
                try:
                    await asyncio.to_thread(mgr.restart, sid)
                    ok, err = True, None
                except Exception as e:
                    ok, err = False, str(e)
                await ws.send(json.dumps({
                    "type": "mcp_status",
                    "id": rid,
                    "alive": mgr.any_alive(),
                    "ok": ok,
                    "error": err,
                    "servers": mgr.health(),
                    "tools": mgr.list_tools(),
                }))

            elif mtype in ("kill_all", "kill_studio"):
                def _do_kill():
                    import subprocess
                    killed = []
                    for img in ("RobloxStudioBeta.exe", "RobloxStudio.exe", "Bloxstrap.exe", "StudioMCP.exe"):
                        res = subprocess.run(f"taskkill /F /T /IM {img}", shell=True, capture_output=True)
                        if res.returncode == 0:
                            killed.append(img)
                    return killed
                killed_list = await asyncio.to_thread(_do_kill)
                log(f"kill_all executed: {killed_list}", "yl")
                await ws.send(json.dumps({
                    "type": "kill_result",
                    "id": rid,
                    "ok": True,
                    "killed": killed_list,
                    "message": f"ปิดโปรแกรมสำเร็จ: {', '.join(killed_list) if killed_list else 'ไม่พบโปรแกรมที่กำลังทำงาน'}",
                }))
                if msg.get("kill_bridge", False):
                    async def _delayed_stop():
                        await asyncio.sleep(0.5)
                        import os
                        os._exit(0)
                    asyncio.create_task(_delayed_stop())
                else:
                    await broadcast_status(mgr)

            else:
                await ws.send(json.dumps({
                    "type": "error",
                    "id": rid,
                    "error": f"unknown message type: {mtype}",
                }))
    except websockets.ConnectionClosed:
        pass
    except Exception as e:
        log(f"handler error: {e}", "rd")
    finally:
        clients.discard(ws)
        log(f"extension disconnected [{len(clients)} client(s)]", "yl")


async def server_watch(mgr, broadcast_status_func):
    """Crash-loop supervisor for MCP subprocesses."""
    LOOP_N = 3
    LOOP_WINDOW = 60
    LOOP_WARN_COOLDOWN = 120
    while True:
        await asyncio.sleep(5)
        for sid, client in list(mgr.clients.items()):
            try:
                if not client.is_alive():
                    now = time.time()
                    client.restart_times = [t for t in client.restart_times if now - t < LOOP_WINDOW]
                    looping = len(client.restart_times) >= LOOP_N
                    if looping and now - client.loop_warned_at > LOOP_WARN_COOLDOWN:
                        client.loop_warned_at = now
                        log(f"[{sid}] CRASH LOOP: died {len(client.restart_times)} times in {LOOP_WINDOW}s", "rd")
                        if client.start_error:
                            log(f"[{sid}] {client.start_error}", "rd")
                        elif client.stderr_tail:
                            log(f"[{sid}] last stderr lines:", "rd")
                            for ln in client.stderr_tail:
                                log(f"[{sid}]   {ln}", "yl")
                        if sid == "roblox":
                            owner = port_owner(STUDIO_MCP_PORT)
                            if owner and "roblox" not in (owner[1] or "").lower():
                                log(f"[{sid}] Port {STUDIO_MCP_PORT} hijacked by {owner[1]} (pid {owner[0]})", "rd")
                    if looping and client.restart_times and now - client.restart_times[-1] < 15:
                        continue
                    client.restart_times.append(now)
                    log(f"[{sid}] restarting dead server...", "yl")
                    await asyncio.to_thread(client.start)
                    mgr.rebuild_index()
                    await broadcast_status_func()
            except Exception as e:
                log(f"[{sid}] auto-restart failed: {e}", "rd")

