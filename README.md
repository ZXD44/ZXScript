# ZXScript - AI Agent for Roblox Studio
> **Created & Maintained by [zxd44](https://github.com/zxd44) (ZirconX)**  
> 📧 Contact: [gonhackergamer0@gmail.com](mailto:gonhackergamer0@gmail.com)

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)
![Roblox Studio](https://img.shields.io/badge/Roblox%20Studio-MCP%20Enabled-green)
![Bloxstrap Support](https://img.shields.io/badge/Bloxstrap-Supported-orange)

**ZXScript** is an AI agent bridge and browser extension developed by **zxd44 (ZirconX)** that turns web-based AI models (DeepSeek, ChatGPT, Gemini, Qwen, Kimi, GLM) into autonomous Roblox Studio assistants.

Directly control Roblox Studio from your browser: inspect explorer trees, read/write Luau scripts, insert assets, run play-mode diagnostics, and build games step-by-step.

---

## 🚀 Key Features

- **Native Bloxstrap & Vanilla Studio Support:** Automatically discovers `StudioMCP.exe` across standard Roblox installations and Bloxstrap directories without manual path configuration.
- **28+ Built-in Studio Tools:** Full support for `execute_luau`, `multi_edit`, `script_search`, `search_game_tree`, `screen_capture`, and more.
- **Provider Agnostic:** Supports DeepSeek (`chat.deepseek.com`), ChatGPT, Gemini, Qwen, GLM, Kimi, and Arena.
- **Persistent Project Memory:** Tracks project architecture and conventions in `game.ServerStorage.ZXScript.Memory`.

---

## 🏗️ Architecture

```
Web AI (DeepSeek / ChatGPT / Qwen / Gemini) 
               │
               ▼
    [ zxscript-extension ]  (Chrome / Edge Extension)
               │  ws://127.0.0.1:17613
               ▼
      [ ZXScript Bridge ]   (bridge.py / start.bat)
               │  stdio / JSON-RPC
               ▼
    [ Roblox Studio MCP ]   (RobloxStudioBeta / Bloxstrap)
```

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
- On Windows: Double-click `start.bat`.
- On macOS: Run `./MacOS_Start.command`.
- Keep the terminal window minimized while using ZXScript.

### 4. Connect Web AI
1. Go to `chat.deepseek.com` (recommended) or `chat.qwen.ai`.
2. Wait for the green status indicator 🟢 on the ZXScript bar.
3. Click **Start session** and use the prompts from `ZXScript_Guide.md`.

---

## 📄 Documentation & Prompts
For full Thai documentation and step-by-step prompt templates, see [ZXScript_Guide.md](./ZXScript_Guide.md).

---

## ⚖️ License
GNU General Public License v3.0 (GPL-3.0). See [LICENSE](./LICENSE) for details.
