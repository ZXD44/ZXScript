# ZXScript System Context & Architecture
> **Project:** ZXScript - Autonomous Roblox Studio AI Agent Bridge  
> **Author & Maintainer:** [zxd44](https://github.com/zxd44) (ZirconX)  
> **Website:** [www.zirconx.xyz](https://www.zirconx.xyz)  
> **Contact:** [gonhackergamer0@gmail.com](mailto:gonhackergamer0@gmail.com)  
> **Version:** `0.0.3` | **License:** GPL-3.0

---

## System Topology

```text
[ Web AI: DeepSeek / ChatGPT / Claude / Gemini / Qwen / Kimi / Z.ai / Meta AI / Arena ]
                         │
                         ▼ DOM Content Scripts & Modular Parser
             [ zxscript-extension (Manifest v3) ]
                         │
                         ▼ WebSocket (ws://127.0.0.1:17613)
                [ ZXScript Bridge ] (Headless CREATE_NO_WINDOW)
                   ├── constants.py (System paths, ANSI, Logger)
                   ├── config_manager.py (Atomic config.json manager)
                   ├── mcp_server.py (JSON-RPC MCP client supervisor)
                   ├── studio_watcher.py (Studio process monitor & zombie cleaner)
                   ├── tool_dispatcher.py (Luau modernizer & ChangeHistoryService)
                   └── bridge_server.py (WebSocket handler & broadcaster)
                         │
                         ▼ stdio / JSON-RPC
             [ bridge/launch_studio_mcp.py ]
                         │
                         ▼ TCP localhost:13469
             [ Roblox Studio (StudioMCP.exe) ]
                         │
                         ▼
             [ Active Roblox Place DataModel ]
```

---

## Modular Architecture & File Roles

All files conform strictly to the Single Responsibility Principle and the **under 500-600 line limit**:

### 1. Backend Modules (`bridge/`)
| Path | Component | Responsibility |
|---|---|---|
| `bridge/bridge.py` | Supervisor Entry Point | Coordinates startup checks, supervisors, and shutdown handlers (< 250 lines). |
| `bridge/constants.py` | Constants & Logging | Central repository for ports, paths, ANSI formatting, and logger (< 150 lines). |
| `bridge/config_manager.py` | Config Manager | Atomic read/write of `config.json` and in-place restart coordinator (< 100 lines). |
| `bridge/mcp_server.py` | MCP Client & Process Manager | Manages JSON-RPC stdio subprocesses and tool forwarding (< 400 lines). |
| `bridge/studio_watcher.py` | Studio Process Monitor | Detects Roblox Studio, eliminates port squatters, and cleans zombies (< 490 lines). |
| `bridge/tool_dispatcher.py` | Tool Execution Dispatcher | Wraps Luau in ChangeHistoryService, prunes trees, and caches scripts (< 300 lines). |
| `bridge/bridge_server.py` | WebSocket Server | Handles incoming client connections and broadcasts status (< 210 lines). |
| `bridge/native_host.py` | Headless Native Host | Runs background headless process (`CREATE_NO_WINDOW`) with log streaming (< 230 lines). |
| `bridge/launch_studio_mcp.py`| Studio Discovery | Auto-locates `StudioMCP.exe` across vanilla and Bloxstrap paths (< 190 lines). |
| `bridge/register.py` | Registry Installer | Registers Native Messaging host manifest in Windows Registry (< 70 lines). |

### 2. Frontend Core Modules (`zxscript-extension/core/`)
| Path | Component | Responsibility |
|---|---|---|
| `core/constants.js` | Constants & Global State | Shared state `A`, diagnostic logger, timing configurations (< 160 lines). |
| `core/icons.js` | Vector Icons | Reusable inline vector SVG icon paths (< 60 lines). |
| `core/audio.js` | Web Audio Synthesizer | Synthesizes pleasant two-tone chimes natively without external audio files (< 230 lines). |
| `core/camouflage.js` | DOM Camouflage & Tool Cards| Replaces raw JSON/Luau codeblocks with interactive, styled chips (< 480 lines). |
| `core/ui-modals.js` | In-Page Modals & Toasts | Headless bridge modal with live log terminal, toasts, and smart banners (< 410 lines). |
| `core/ui-menu.js` | Dropdown Menu & Settings | AI switcher popover, custom MCP server registry, prompt settings (< 400 lines). |
| `core/ui-bar.js` | Dynamic Island Action Bar | Floating dynamic island capsule and theme engine (< 480 lines). |
| `core/tools.js` | Tool Invoker & RPC Bridge | Sends tool requests to bridge, handles chunked responses (< 460 lines). |
| `core/response-watcher.js`| AI Stream Watcher | Detects streaming state, token progress, and completion (< 410 lines). |
| `core/agent.js` | Autonomous Agent Loop | Controls agent cycle, turn-memory deduplication, and auto-resume (< 580 lines). |
| `core/parser.js` | Command Parser | Extracts Luau and JSON tool calls from assistant text (< 390 lines). |
| `core/main.js` | Extension Orchestrator | Hooks lifecycle listeners, status poller, and supervisory watchdog (< 240 lines). |
