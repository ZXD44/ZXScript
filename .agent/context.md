# ZXScript System Context & Architecture
> **Project:** ZXScript  
> **Author:** zxd44 (ZirconX)  
> **Contact:** gonhackergamer0@gmail.com | [https://github.com/zxd44](https://github.com/zxd44)

---

## 🏛️ System Topology

```text
[ Browser AI Chat: DeepSeek / ChatGPT / Qwen / Gemini ]
                         │
                         ▼ (DOM Content Scripts / Parser)
             [ zxscript-extension ]
                         │
                         ▼ WebSocket (ws://127.0.0.1:17613)
                [ ZXScript Bridge ] (bridge.py)
                         │
                         ▼ stdio / JSON-RPC
               [ launch_studio_mcp.py ]
                         │
                         ▼ TCP localhost:13469
             [ Roblox Studio (StudioMCP.exe) ]
                         │
                         ▼
             [ Active Roblox Place DataModel ]
```

---

## 📂 Key Components & File Roles

| File / Directory | Role | Key Details |
|---|---|---|
| `bridge.py` | Local WebSocket Server | Listens on `ws://127.0.0.1:17613`, coordinates child MCP servers, handles zombie process cleanup. |
| `launch_studio_mcp.py` | Roblox MCP Discovery | Scans `%LOCALAPPDATA%\Roblox\Versions` and `%LOCALAPPDATA%\Bloxstrap\Versions` for `StudioMCP.exe`. Launches server on port 13469. |
| `config.json` | Server Registry | Configures MCP server definitions (default: `roblox`). |
| `start.bat` | Windows Launcher | 1-Click launcher verifying Python 3.9+, installing `websockets`, clearing port conflicts, and running the bridge. |
| `MacOS_Start.command` | macOS Launcher | Bash script equivalent for macOS / Linux. |
| `zxscript-extension/` | Browser Extension | Manifest v3 extension with content scripts for DeepSeek, ChatGPT, Gemini, Qwen, GLM, Kimi, Arena. |
| `zxscript-extension/core/main.js` | Extension Agent Loop | Implements turn-taking, tool parsing, UI badges, anti-amnesia reminders (every 8 calls), and humanized send jitter (`1000-2200ms`). |
| `docs/ZXScript_Guide.md` | Master User Manual | Full Thai documentation, troubleshooting tables, and 5 copy-paste prompt templates. |

---

## 🔌 Port Mapping & Protocols

- **WebSocket Bridge:** `ws://127.0.0.1:17613` (Extension communicates with `bridge.py`)
- **Studio MCP Server:** `http://127.0.0.1:13469` / stdio (Roblox Studio internal MCP listener)
- **Primary MCP Server ID:** `roblox` (28 advertised tools)

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
