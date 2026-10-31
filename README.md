# ZXScript - AI Agent for Roblox Studio
> **Created & Maintained by [zxd44](https://github.com/zxd44) (ZirconX)**  
> 🌐 Website: [www.zirconx.xyz](https://www.zirconx.xyz)  
> 📧 Contact: [gonhackergamer0@gmail.com](mailto:gonhackergamer0@gmail.com)

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)
![Roblox Studio](https://img.shields.io/badge/Roblox%20Studio-MCP%20Enabled-green)
![Bloxstrap Support](https://img.shields.io/badge/Bloxstrap-Supported-orange)
![Version](https://img.shields.io/badge/version-0.0.3-brightgreen)

**ZXScript** is an AI agent bridge and browser extension developed by **zxd44 (ZirconX)** that turns web-based AI models (DeepSeek, ChatGPT, Claude, Gemini, Qwen, Kimi, Z.ai / GLM, Meta AI, Arena) into autonomous Roblox Studio assistants.

Directly control Roblox Studio from your browser: inspect explorer trees, read/write Luau scripts, insert assets, run play-mode diagnostics, and build games step-by-step.

---

## 📂 Project Structure (Clean Architecture & Modular Design)

Every file in the codebase strictly conforms to the **Single Responsibility Principle (SRP)** with a hard limit of **under 500-600 lines per file**:

```text
ZXScript/
├── assets/                       # Icons, branding assets, and vector SVGs
├── bridge/                       # Python Bridge Server & Native Messaging
│   ├── __init__.py               # Package descriptor
│   ├── constants.py              # System paths, constants, ANSI colors, logger
│   ├── config_manager.py         # Atomic config.json manager & in-place restarter
│   ├── mcp_server.py             # JSON-RPC 2.0 MCP Client & process manager
│   ├── studio_watcher.py         # Port squatter cleaner, Studio monitor & zombie killer
│   ├── tool_dispatcher.py        # Luau modernization, ChangeHistoryService & dispatch
│   ├── bridge_server.py          # WebSocket server & client status broadcaster
│   ├── bridge.py                 # Clean supervisor entry point
│   ├── native_host.py            # Headless Native Host (CREATE_NO_WINDOW)
│   ├── native_host.exe           # Standalone headless binary for Chrome/Edge
│   ├── launch_studio_mcp.py      # Roblox Studio & Bloxstrap MCP discovery
│   └── register.py               # Registry installer for Native Messaging
├── docs/                         # Documentation & guides
│   ├── CHANGELOG.md              # Version release history
│   ├── ROADMAP.md                # Development roadmap
│   ├── RULES.md                  # Operational rules & coding standards
│   └── ZXScript_Guide.md         # Comprehensive installation & prompt guide
├── logs/                         # Bridge runtime and debug logs
├── scripts/                      # Launchers & automation scripts
│   ├── start.bat                 # 1-Click launcher for Windows
│   └── MacOS_Start.command       # 1-Click launcher for macOS
├── zxscript-extension/           # Chrome / Edge Browser Extension (MV3)
│   ├── manifest.json             # Manifest V3 script injection map
│   ├── background.js             # Service worker & native host bridge RPC
│   ├── README.md                 # Extension documentation
│   ├── icons/                    # Extension icon assets (16, 48, 128px)
│   ├── popup/                    # Minimalist extension popup UI (HTML, CSS, JS)
│   │   ├── popup.html
│   │   ├── popup.js
│   │   ├── popup.css
│   │   └── popup-modal.css
│   ├── styles/                   # In-page overlay stylesheets (< 500 lines each)
│   │   ├── overlay.css           # Dynamic Island action capsule & theme
│   │   ├── menu.css              # Dropdown settings menu & MCP server list
│   │   ├── modals.css            # Alerts, setup wizard & security modal
│   │   └── chips.css             # Tool execution cards & syntax previews
│   ├── core/                     # Modular extension core (< 500-600 lines each)
│   │   ├── constants.js          # Global state A, diagnostics, brand constants
│   │   ├── icons.js              # Vector SVG icon definitions
│   │   ├── audio.js              # Web Audio API chime synthesizer
│   │   ├── camouflage.js         # DOM codeblock camouflage & tool chip decorator
│   │   ├── ui-modals.js          # In-page headless bridge modal, toasts & banners
│   │   ├── ui-menu.js            # Settings popover, MCP cards, prompt wizard
│   │   ├── ui-bar.js             # Floating dynamic island action bar & theme engine
│   │   ├── tools.js              # Tool caller, bridge RPC & editor text injector
│   │   ├── response-watcher.js   # AI stream detector & response watcher
│   │   ├── agent.js              # Autonomous agent loop & turn-memory manager
│   │   ├── parser.js             # Robust Luau and JSON tool call parser
│   │   └── main.js               # Extension lifecycle coordinator & hooks
│   ├── providers/                # Site-specific adapters (ChatGPT, Claude, DeepSeek, etc.)
│   └── tests/                    # Plain node unit test suite (Zero dependencies)
├── start.bat                     # Root launcher redirect
└── README.md                     # Project overview
```

---

## 🚀 Key Features

- **Headless Native Bridge:** Runs completely in the background via `CREATE_NO_WINDOW`. Eliminates intrusive separate CMD popups; streams real-time logs directly inside the extension popup and in-page modal dialog.
- **Impeccable Style Design System:** Inspired by [impeccable.style](https://impeccable.style/) principles. Features deep Zinc-950 surfaces, 60fps hardware-accelerated animations, zero emoji clutter on action buttons, and slim 5px custom scrollbars.
- **Modular Clean Architecture:** All files adhere to strict separation of concerns and remain under 500-600 lines. Configs, constants, parsers, watchers, and UI engines are completely decoupled.
- **Native Bloxstrap & Vanilla Studio Support:** Automatically discovers `StudioMCP.exe` across standard Roblox installations and Bloxstrap directories without manual path configuration.
- **Built-in Anti-Ban Shield:** Smart humanized delay (`1000 - 2200ms`) prevents rate-limiting and account blocks from Cloudflare and AI providers.
- **34 Built-in Studio Tools:** Full support for `execute_luau`, `multi_edit`, `script_search`, `search_game_tree`, `screen_capture`, `insert_asset`, `generate_mesh`, `character_navigation`, and more.
- **ChangeHistoryService Protection:** Every Luau code change executed by AI in Roblox Studio is automatically wrapped in ChangeHistoryService, allowing instant `Ctrl + Z` undo in Studio.
- **Provider Agnostic (9 AI Platforms):** Fully compatible with DeepSeek, ChatGPT, Claude, Gemini, Qwen, Kimi, Z.ai / GLM, Meta AI, and Arena.
- **Zero-Latency Web Audio Synthesizer:** Two-tone success chimes and alert pings synthesized natively via the Web Audio API without heavy external audio files.

---

## 📦 Quick Setup

### 1. Register Native Messaging Host (One-Time)
Run the registration script to allow the browser extension to communicate with the headless bridge:
```powershell
python bridge/register.py
```

### 2. Load the Browser Extension
1. Open Chrome or Edge and navigate to `chrome://extensions` or `edge://extensions`.
2. Enable the **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked** and select the `zxscript-extension` folder.

### 3. Enable Roblox Studio MCP Server
1. Launch **Roblox Studio** and open your game Place.
2. In the top ribbon, click **Assistant AI**.
3. Click the `...` (three dots) icon at the top right of the Assistant panel -> **Manage MCP Servers**.
4. Check **Enable Studio as MCP Server**.

### 4. Start the Bridge
- **Option A (Extension UI - Recommended):** Click the ZXScript extension icon in your browser and click **เปิดใช้งานทันที** (Start Bridge). The bridge will run headlessly with live logs streamed in the popup.
- **Option B (Launcher Script):** Double-click `start.bat` in the project root.

### 5. Connect Web AI
1. Go to `chat.deepseek.com` (recommended), `claude.ai`, or `chatgpt.com`.
2. Look at the top center: the status indicator will turn green when connected.
3. Click **เริ่มทำงาน** (Start session) and prompt your assistant to build!

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.  
Created & Maintained by **zxd44 (ZirconX)**.
