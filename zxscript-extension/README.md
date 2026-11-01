# ZXScript (by ZXD44) - AI Roblox Studio Agent (ChatGPT, DeepSeek, Claude, Gemini, Kimi, Z.ai / GLM, Qwen, Arena, Meta AI)

Control Roblox Studio with AI, for free. ZXScript turns a normal AI chat (ChatGPT, DeepSeek, Claude, Google Gemini, Kimi, Z.ai / GLM, Qwen, Arena, or Meta AI) into an agent that builds and scripts your Roblox game for you: just describe what you want, and it reads/edits scripts, runs Luau, inspects the game tree, and generates assets directly in Roblox Studio. No API key, no terminal, no coding required.

It's a Chrome/Edge browser extension plus a small local bridge that connects the chat to Roblox Studio through the official MCP server. **DeepSeek is the recommended provider.** ChatGPT, Claude, Gemini, Kimi, Z.ai / GLM, Qwen, Arena, and Meta AI also work seamlessly.

---

## Latest Features & Enhancements (v0.0.4)

- **Discord Cyber Dragon UI & Blurple Highlights:** Sleek Discord dark theme (`#23272a`, `#2b2d31`, `#1e1f22`) paired with Discord Blurple (`#5865F2`) for active selections, model tabs, and highlight states.
- **Organic Wing Dynamics & Fluid Flight:** Re-tuned flapping cycles for lifelike fluidity (4.8s idle breathing, 3.6s hover, 2.5s execution boost) with GPU acceleration and 0.00px symmetrical anchors.
- **40% Compact Menu (290px):** Ultra-slim drawer UI with quick-access model selection pills, one-click bridge initialization, and folded MCP terminal.
- **Pure CSS Viewport Centering:** Bulletproof horizontal centering (`left: 50%; transform: translateX(-50%)`) without JS layout shifts or container clipping bugs.
- **Clean Architecture & Modular Core:** Decomposed all files to strictly under 500-600 lines across backend and frontend for maximum reliability, speed, and maintainability.
- **Headless Native Host:** Automatically runs Bridge in the background (`CREATE_NO_WINDOW`) with live log streaming inside the extension popup and in-page modal dialog.
- **Impeccable Style UI:** Sleek, minimal interface adhering to impeccable.style standards: 60fps hardware acceleration, zero emoji clutter, and slim 5px pill scrollbars.
- **Smart Error Notification System:** Categorizes issues into Studio, Bridge, AI Model, and Context Limit with quick 1-click action triggers and collapsible technical diagnostics.
- **ChatGPT Auto-Recovery Engine:** Automatically detects empty responses or stalled streams and continues generation autonomously.
- **Zero-Latency Web Audio Synthesizer:** Elegant success chimes and error alerts synthesized natively via the Web Audio API without external audio assets.
- **34 Studio MCP Tools:** Full access to Explorer inspection, Luau execution, script chunking, asset insertion, and viewport capture.

---

## Setup

### Load the Extension (Edge or Chrome):
1. Go to `edge://extensions` (Edge) or `chrome://extensions` (Chrome)
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `zxscript-extension` folder
5. The extension is now active

### Set up the Bridge:
1. **Register Native Messaging (one-time):** Run `python bridge/register.py`
2. **Open Roblox Studio** and load your game Place
3. **Enable the MCP server in Roblox Studio:** Click **Assistant AI** in the top bar -> **...** -> **Manage MCP Servers** -> **Enable Studio as MCP Server**
4. **Start the Bridge:** Click the ZXScript extension icon and click **เปิดใช้งานทันที** (Start Bridge) to run headlessly, or run `start.bat`
5. **Open your AI web chat:** Go to `https://chat.deepseek.com`, `https://claude.ai`, or `https://chatgpt.com`
6. Click **เริ่มทำงาน** (Start session) on the floating bar
7. Prompt your assistant to start building!

---

## Modular Architecture (for contributors)

The extension core is organized into single-responsibility modules strictly adhering to the 500-600 line limit:

```text
core/
├── constants.js          System timings, diagnostics, and global state
├── icons.js              Scalable vector SVG icon definitions
├── audio.js              Web Audio API chime engine and synthesized alerts
├── camouflage.js         Codeblock concealment and interactive tool card decorator
├── ui-modals.js          In-page headless bridge modal, toasts, and alert banners
├── ui-menu.js            Settings popover, MCP cards, and custom prompt wizard
├── ui-bar.js             Floating dynamic island action capsule and theme engine
├── tools.js              Tool caller, bridge RPC, and editor text injector
├── response-watcher.js   AI stream detector and response watcher
├── agent.js              Autonomous agent loop and turn-memory manager
├── parser.js             Robust Luau and JSON tool call parser
└── main.js               Extension lifecycle coordinator and hooks

stylesheets/
├── overlay.css           Dynamic island capsule and positioning
├── menu.css              Dropdown menu and custom settings
├── modals.css            Alert banners, setup cards, and in-page modal dialogs
└── chips.css             Tool execution cards and syntax previews
```

### Unit Tests (Plain Node, zero dependencies):
- `node zxscript-extension/tests/test-parser.js` - Tests Luau/JSON command parsing logic.
- `node zxscript-extension/tests/test-chatgpt.js` - Tests CodeMirror line extraction and ProseMirror composer mechanics.
- `node zxscript-extension/tests/test-claude.js` - Tests Claude.ai message recognition and thinking block extraction.
