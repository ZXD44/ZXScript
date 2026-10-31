# SPDX-License-Identifier: GPL-3.0-or-later
"""
bridge/bridge.py - ZXScript Bridge Entry Point.
Modular architecture: constants, config_manager, mcp_server, studio_watcher, tool_dispatcher, bridge_server.
"""
import asyncio
import os
import sys

# Ensure local bridge directory is in sys.path
_HERE = os.path.dirname(os.path.abspath(__file__))
_PARENT = os.path.dirname(_HERE)
for p in (_HERE, _PARENT):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    import websockets
except ImportError:
    print("[bridge] Missing dependency. Run: pip install websockets")
    sys.exit(1)

from bridge.constants import (
    HOST,
    PORT,
    C,
    BRIDGE_VERSION,
    LOG_PATH,
    PRIMARY_SERVER_ID,
    _Spinner,
    log,
    action_banner,
    safe_print,
)
from bridge.mcp_server import MCPManager
from bridge.studio_watcher import (
    kill_orphan_studio_mcp,
    check_studio_port,
    kill_port_squatter,
    reclaim_studio_port,
    reclaim_bridge_port,
    probe_studio,
    studio_watch,
    roblox_studio_app_running,
    print_squatter_hint,
    print_reregister_hint,
    port_owner,
)
from bridge.bridge_server import handler, server_watch, broadcast_status

mgr = MCPManager()


async def _supervised(name: str, coro_factory):
    """Resilient supervisor restarting failing background tasks."""
    while True:
        try:
            await coro_factory()
            return
        except Exception as e:
            log(f"{name} crashed: {type(e).__name__}: {e} - restarting in 5s", "rd")
            await asyncio.sleep(5)


async def main():
    safe_print(
        f"\n{C['cy']}  ZXScript Bridge - by ZXD44 v{BRIDGE_VERSION}{C['reset']}"
        f"  {C['dim']}- Roblox Studio - ws://{HOST}:{PORT}{C['reset']}\n"
    )
    log(f"===== BRIDGE START v{BRIDGE_VERSION} pid={os.getpid()} log={LOG_PATH} =====", "cy")

    await asyncio.to_thread(kill_orphan_studio_mcp)
    killed_squatter = await asyncio.to_thread(check_studio_port)
    mgr.load_config()

    guidance_shown = {"v": False}

    async def _early_studio_guidance():
        if PRIMARY_SERVER_ID not in mgr.clients:
            return
        await asyncio.sleep(12)
        if guidance_shown["v"]:
            return
        rc = mgr.clients.get(PRIMARY_SERVER_ID)
        if rc is None or getattr(rc, "saw_foreign_ws_host", False):
            return
        if rc.tools_cache:
            st = await asyncio.to_thread(probe_studio, mgr)
            if st["app"] is not False:
                return
        guidance_shown["v"] = True
        action_banner([
            "Open your place in Roblox Studio.",
            "Go to: Assistant Settings > MCP Servers",
            "       > 'Enable Studio as MCP server'",
            "It can take up to ~10s; this window will turn green.",
        ])

    async def _boot_and_diagnose():
        try:
            await asyncio.to_thread(mgr.start_all)
        except Exception as e:
            log(f"server startup error: {e}", "rd")

        total = len(mgr.list_tools())
        roblox_client = mgr.clients.get(PRIMARY_SERVER_ID)
        roblox_total = len(roblox_client.tools_cache) if roblox_client else 0

        if roblox_client is not None and roblox_total == 0 and roblox_client.saw_foreign_ws_host:
            killed, sname = await asyncio.to_thread(kill_port_squatter)
            if killed:
                try:
                    await asyncio.to_thread(mgr.restart, PRIMARY_SERVER_ID)
                    roblox_total = len(roblox_client.tools_cache)
                    total = len(mgr.list_tools())
                except Exception as e:
                    log(f"restart after squatter kill failed: {e}", "rd")
                print_squatter_hint(sname)

        reclaimed_zombie = False
        if (
            roblox_client is not None
            and roblox_total == 0
            and await asyncio.to_thread(roblox_studio_app_running) is True
            and await asyncio.to_thread(reclaim_studio_port, roblox_client)
        ):
            try:
                await asyncio.to_thread(mgr.restart, PRIMARY_SERVER_ID)
                roblox_total = len(roblox_client.tools_cache)
                total = len(mgr.list_tools())
            except Exception as e:
                log(f"restart after zombie kill failed: {e}", "rd")
            reclaimed_zombie = True
            print_reregister_hint()

        st = await asyncio.to_thread(probe_studio, mgr)
        if st["app"] is False:
            with _Spinner("    waiting for Roblox Studio to attach..."):
                for _ in range(8):
                    await asyncio.sleep(1)
                    st = await asyncio.to_thread(probe_studio, mgr)
                    if st["app"] is not False:
                        break

        if st["app"] is True:
            await asyncio.sleep(1.5)
            confirm = await asyncio.to_thread(probe_studio, mgr)
            if confirm["app"] is not True:
                st = confirm

        if roblox_client is not None and (roblox_total == 0 or st["app"] is False):
            if killed_squatter or reclaimed_zombie or guidance_shown["v"]:
                log("    still waiting for Studio MCP toggle...", "yl")
            else:
                guidance_shown["v"] = True
                if roblox_total > 0:
                    log(f"    {roblox_total} tools loaded, awaiting active Studio connection.", "yl")
                action_banner([
                    "Open your place in Roblox Studio.",
                    "Go to: Assistant Settings > MCP Servers",
                    "       > 'Enable Studio as MCP server'",
                    "It can take up to ~10s; this window will turn green.",
                ])
        elif st["app"] is True:
            log(f"ready {total} tools available - Roblox Studio connected", "gr")
        else:
            log(f"ready {total} tools available ({len(mgr.clients)} MCP server(s))", "gr")

        asyncio.create_task(
            _supervised("studio_watch", lambda: studio_watch(mgr, lambda: broadcast_status(mgr), st["app"], st["place"]))
        )

    async def _early_status_pushes():
        for interval in (2, 2, 4, 6, 6):
            await asyncio.sleep(interval)
            await broadcast_status(mgr)

    if await asyncio.to_thread(reclaim_bridge_port):
        await asyncio.sleep(0.6)

    try:
        server_ctx = await websockets.serve(
            lambda ws: handler(ws, mgr),
            HOST,
            PORT,
            ping_interval=20,
            ping_timeout=20,
            max_size=16 * 1024 * 1024,
        )
    except OSError as e:
        if getattr(e, "errno", None) in (98, 10048) or "10048" in str(e):
            owner = await asyncio.to_thread(port_owner, PORT)
            who = f" by '{owner[1]}' (pid {owner[0]})" if owner else ""
            log(f"could not start: port {PORT} is already in use{who}.", "rd")
            return
        raise

    async with server_ctx:
        log(f"listening on ws://{HOST}:{PORT} - extension ready", "cy")
        asyncio.create_task(_supervised("server_watch", lambda: server_watch(mgr, lambda: broadcast_status(mgr))))
        asyncio.create_task(_boot_and_diagnose())
        asyncio.create_task(_early_studio_guidance())
        asyncio.create_task(_early_status_pushes())
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log("bridge stopped by user", "yl")
    except Exception as e:
        import traceback
        err = traceback.format_exc()
        try:
            with open(LOG_PATH, "a", encoding="utf-8") as f:
                f.write(f"\nFATAL CRASH: {err}\n")
        except Exception:
            pass
        log(f"fatal crash: {e}", "rd")
