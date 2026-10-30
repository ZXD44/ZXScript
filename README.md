# ZXScript - AI Agent for Roblox Studio
> **Created & Maintained by [zxd44](https://github.com/zxd44) (ZirconX)**  
> 🌐 Website: [www.zirconx.xyz](https://www.zirconx.xyz)  
> 📧 Contact: [gonhackergamer0@gmail.com](mailto:gonhackergamer0@gmail.com)

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)
![Roblox Studio](https://img.shields.io/badge/Roblox%20Studio-MCP%20Enabled-green)
![Bloxstrap Support](https://img.shields.io/badge/Bloxstrap-Supported-orange)

**ZXScript** is an AI agent bridge and browser extension developed by **zxd44 (ZirconX)** that turns web-based AI models (DeepSeek, ChatGPT, Gemini, Qwen, Kimi, GLM) into autonomous Roblox Studio assistants.

Directly control Roblox Studio from your browser: inspect explorer trees, read/write Luau scripts, insert assets, run play-mode diagnostics, and build games step-by-step.

---

## 📂 Project Structure

```text
ZXScript/
├── assets/                 # Icons, banners, and media branding
│   ├── banner.png
│   ├── banner.svg
│   └── icon.png
├── bridge/                 # Python Bridge Server & MCP Discovery
│   ├── bridge.py           # Core Bridge Server (WebSocket <-> MCP)
│   ├── launch_studio_mcp.py# Roblox Studio & Bloxstrap MCP discovery
│   └── config.json         # Bridge server configuration
├── dist/                   # Packed extension artifacts (.crx, .pem)
├── docs/                   # Documentation & guides
│   ├── CHANGELOG.md        # Version history
│   ├── ROADMAP.md          # Future development roadmap (zxd44)
│   ├── RULES.md            # Operational rules & Luau coding standards (TH/EN)
│   └── ZXScript_Guide.md   # Complete installation & prompt guide (TH)
├── logs/                   # Bridge and runtime logs
├── projects/               # Auto-synced local project memories & logs per place
├── scripts/                # Automated launchers
│   ├── start.bat           # 1-Click launcher for Windows
│   └── MacOS_Start.command # 1-Click launcher for macOS
├── zxscript-extension/     # Chrome / Edge Browser Extension
│   ├── manifest.json
│   ├── popup.html
│   ├── core/               # Agent loop, parser, and anti-ban engine
│   └── providers/          # DeepSeek, ChatGPT, Qwen, Gemini, etc.
├── .gitattributes          # Git attributes
├── .gitignore              # Git ignore rules
├── LICENSE                 # GPL-3.0 License with zxd44 ownership notice
└── README.md               # Project overview
```

---

## 🚀 Key Features

- **Native Bloxstrap & Vanilla Studio Support:** Automatically discovers `StudioMCP.exe` across standard Roblox installations and Bloxstrap directories without manual path configuration.
- **Built-in Anti-Ban Shield:** Smart humanized delay (`1000 - 2200ms`) prevents rate-limiting and account blocks from Cloudflare and AI providers.
- **Context Resend & Tool Persistence:** Auto-refreshes tools every 8 calls and resends system prompts to prevent AI from dropping MCP tool calling.
- **28+ Built-in Studio Tools:** Full support for `execute_luau`, `multi_edit`, `script_search`, `search_game_tree`, `screen_capture`, and more. Script chunking for large files (start_line/end_line).
- **Play Mode Auto-Routing:** Automatically retries `execute_luau` on Server datamodel when Studio is in Play mode.
- **Provider Agnostic & All-Platform Verified:** Fortified start button (`▶︎ เริ่มทำงาน`) across all 8 major AI platforms: DeepSeek, ChatGPT, Gemini, Qwen, Kimi, GLM / Z.ai, Meta AI, and Arena.
- **Impeccable Style UI & 5px Custom Scrollbars:** Conforms strictly to impeccable.style guidelines with deep Zinc-950 aesthetics, custom 5px slim pill scrollbars on all containers, and tactile micro-interactions.
- **Top Dynamic Island HUD (Impeccable Design):** Center-anchored floating status pill (`top: 16px; left: 50%`) with live state feedback (`⚡ รัน: execute_luau…`, `⚡ รอ AI ตอบกลับ…`) and an integrated mini emergency stop button (`■`).
- **Zero-Latency Web Audio Synthesizer:** Elegant Mac/Linear-style two-tone success chimes and alert pings synthesized natively via the Web Audio API without heavy MP3 dependencies (toggleable via bell icon `🔔` in popup).
- **Zero-F5 Auto-Recovery:** Automatic real-time status sync between extension, Bridge, and Studio; reconnects seamlessly and dismisses error banners without page refreshes.
- **1-Click Prompt Insertion:** Instant insertion of customized prompt presets into the active chat composer directly from the extension popup.
- **Localized Luau Error Reporting:** Transforms internal Roblox stack chunks (`AssistantCommand:XX:`) into Thai (`สคริปต์บรรทัดที่ XX:`) with structured bulleted diagnostics and remediation hints.
- **High-Performance 144Hz Engine:** Zero DOM layout thrashing in requestAnimationFrame positioning loops, ensuring buttery-smooth rendering with no dropped frames.
- **Persistent Project Memory & Auto-Sync:** Automatically detects intent to rest or finish (e.g. 'พักผ่อน', 'เสร็จแล้ว'), syncs `game.ServerStorage.ZXScript.Memory` in Studio, and mirrors local documentation to `projects/<PlaceName>/`.
- **Standalone Build:** Optional PyInstaller build (`scripts/build_exe.py`) produces a single `ZXScript-Bridge.exe` with no Python dependency.
- **GitHub Actions CI:** Automated syntax checks and test suite on every push.

---

## 📦 Quick Setup

### 1. Load the Browser Extension
1. Open Chrome or Edge and navigate to `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode** toggle.
3. Click **Load unpacked** and select the `zxscript-extension` folder.

### 2. Enable Roblox Studio MCP Server
1. Launch **Roblox Studio** and open your game Place.
2. In the top ribbon, click **Assistant AI**.
3. Click the `...` (three dots) icon at the top right of the Assistant panel -> **Manage MCP Servers**.
4. Check **Enable Studio as MCP Server**.

### 3. Run the Bridge Server
- On Windows: Double-click `scripts/start.bat` (or run `.\scripts\start.bat`).
- On macOS: Run `./scripts/MacOS_Start.command`.
- Keep the terminal window minimized while using ZXScript.

### 4. Connect Web AI
1. Go to `chat.deepseek.com` (recommended) or `chat.qwen.ai`.
2. Wait for the green status indicator 🟢 on the ZXScript bar.
3. Click **Start session** and use the prompts from [docs/ZXScript_Guide.md](./docs/ZXScript_Guide.md).

---

## 📄 Documentation & Prompts
For full Thai documentation and step-by-step prompt templates, see [docs/ZXScript_Guide.md](./docs/ZXScript_Guide.md).

---

## ⚖️ License
GNU General Public License v3.0 (GPL-3.0). Customized, modified, and maintained by [zxd44](https://github.com/zxd44) (ZirconX). See [LICENSE](./LICENSE) for details.
