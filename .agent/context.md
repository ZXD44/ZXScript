# ZXScript System Context & Architecture
> **Project:** ZXScript - Autonomous Roblox Studio AI Agent Bridge  
> **Author & Maintainer:** [zxd44](https://github.com/zxd44) (ZirconX)  
> **Contact:** [gonhackergamer0@gmail.com](mailto:gonhackergamer0@gmail.com)  
> **Version:** `0.0.1` | **License:** GPL-3.0

---

## 🏛️ System Topology

```text
[ Web AI: DeepSeek / ChatGPT / Qwen / Gemini / Kimi / GLM / Arena ]
                         │
                         ▼ DOM Content Scripts & Parser (###LUA### detection)
             [ zxscript-extension (Manifest v3) ]
                         │
                         ▼ WebSocket (ws://127.0.0.1:17613)
                [ ZXScript Bridge ] (bridge/bridge.py)
                   ├── Luau Modernizer (wait -> task.wait)
                   ├── Studio Ctrl+Z Recorder (ChangeHistoryService)
                   └── Tree Pruner (CorePackages filter)
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

## 📂 Modular Architecture & File Roles

| Path | Component | Responsibility |
|---|---|---|
| `bridge/bridge.py` | Local WebSocket Server | Listens on `ws://127.0.0.1:17613`. Routes JSON-RPC calls, modernizes Luau calls, wraps execution in `ChangeHistoryService` (Ctrl+Z), prunes game tree, handles zombie process cleanup. |
| `bridge/launch_studio_mcp.py` | Roblox MCP Discovery | Auto-discovers `StudioMCP.exe` across vanilla `%LOCALAPPDATA%\Roblox\Versions` and `%LOCALAPPDATA%\Bloxstrap\Versions`. Launches server on port 13469. |
| `bridge/native_host.py` | Native Messaging Host | Chrome/Edge Native Messaging protocol bridge allowing in-browser direct process control. |
| `bridge/register.py` | System Registry Setup | Registers Native Messaging host manifest and `zxscript://` custom URI scheme in Windows Registry. |
| `bridge/config.json` | Server Registry | Configures MCP child servers (primary: `roblox`, 31 active tools). |
| `scripts/start.bat` | Windows Launcher | 1-Click launcher verifying Python 3.9+, auto-installing dependencies, clearing port conflicts, and launching the bridge. |
| `scripts/setup_service.bat` | Windows Host Setup | 1-Click registration of Native Messaging and system startup tasks. |
| `scripts/MacOS_Start.command` | macOS Launcher | Shell launcher equivalent for macOS environments. |
| `scripts/generate_assets.py` | Design Asset Generator | Vector and raster branding asset synthesizer. |
| `zxscript-extension/` | Browser Extension | Manifest v3 extension with content scripts for all major AI chat providers. |
| `zxscript-extension/core/main.js` | Agentic Control Loop | Turn-taking engine, chip decoration, anti-amnesia tool reminder (every 8 calls), humanized jitter (`1000–2200ms`), and native Web Audio chime. |
| `zxscript-extension/core/config.js` | System Prompt & Rules | Master prompt builder, provider rules, modern Luau constraints, autonomous console debug rules, and tool descriptions. |
| `zxscript-extension/core/parser.js` | Command Parser | High-resilience streaming parser for JSON commands and raw `###LUA###` blocks with auto-salvage. |
| `zxscript-extension/popup.html` | Extension Mini-Dashboard | Minimalist zinc-950 status monitor, direct bridge runner, autostart toggle, and 1-Click Game System / Rules Prompt Templates. |
| `docs/RULES.md` | Master Operational Rules | Complete 7-category rulebook covering Anti-Ban, Modern Luau, Zero Guessing, Undo, Auto-Debug, Memory, and Caveman Mode. |
| `docs/ZXScript_Guide.md` | User Manual (TH) | Complete installation, troubleshooting, and copy-paste prompt library in Thai. |
| `docs/CHANGELOG.md` | Version History | Semantic version release logs. |
| `assets/` | Brand Assets | Concept 4 Terminal Chevron iconography (16, 32, 48, 128, 512, SVG) and GitHub banner. |

---

## 🔌 Port Mapping & Protocols

- **WebSocket Bridge:** `ws://127.0.0.1:17613` (Extension communicates with `bridge.py`)
- **Studio MCP Server:** `http://127.0.0.1:13469` / stdio (Roblox Studio internal MCP listener)
- **Primary MCP Server ID:** `roblox` (31 active tools)
- **Native Protocol:** `zxscript://`

---

## 🧠 Memory Protocol

- **Location:** `game.ServerStorage.ZXScript.Memory`
- **Class:** `ModuleScript`
- **Format:**
  ```lua
  return [==[
  # Project memory
  ## Overview
  ## Where things live
  ## Conventions
  ## Key systems
  ## Decisions & gotchas
  ## User preferences
  ## Open questions / TODO
  ]==]
  ```
- **Sync Rule:** Persists long-term project knowledge across separate AI sessions and new chats.

---

## 🛡️ Backup & Auto-Debug Protocols

- **Auto-Backups:** Archived script code before major refactorings resides in `game.ServerStorage.ZXScript.Backups`.
- **Auto-Debug Loop:** `get_console_output` is invoked autonomously after script deployment to inspect runtime errors and self-heal without user intervention.
- **Studio Undo:** Every edit action is recorded in `ChangeHistoryService` as `"ZXScript Action"` with automatic rollback on error.
