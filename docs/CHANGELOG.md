# Changelog

All notable changes to ZXScript are documented here.

## [0.0.3] - 2026-10-31

### Clean Architecture & Refactoring (Senior Architect Overhaul)
- **Hard Line Limit Conformance (< 500-600 Lines)**: Every monolithic file across the backend and frontend was refactored into cohesive, single-responsibility modules:
  - `bridge/bridge.py` decomposed into `constants.py`, `config_manager.py`, `mcp_server.py`, `studio_watcher.py`, `tool_dispatcher.py`, and `bridge_server.py`.
  - `zxscript-extension/core/main.js` (previously 4,951 lines) decomposed into `constants.js`, `icons.js`, `audio.js`, `camouflage.js`, `ui-bar.js`, `ui-menu.js`, `ui-modals.js`, `tools.js`, `response-watcher.js`, `agent.js`, and `main.js`.
  - Stylesheet modularization: `overlay.css` decomposed into `overlay.css`, `menu.css`, `modals.css`, and `chips.css`.
  - Popup modularization: extracted `popup.css` and `popup-modal.css` from `popup.html`.
  - Directory structure reorganization: organized `zxscript-extension` into clean subfolders (`icons/`, `popup/`, `styles/`, `core/`, `providers/`, `tests/`).
- **Headless Native Messaging Bridge (`CREATE_NO_WINDOW`)**:
  - Implemented background headless execution in `bridge/native_host.py` and compiled standalone `bridge/native_host.exe`.
  - Replaced the browser native prompt dialog with a custom in-page security modal and live streaming log terminal.
  - Bridge launches without popping up an external CMD window.
- **Impeccable Style UI Overhaul**:
  - Full alignment with [impeccable.style](https://impeccable.style/) principles: minimalist aesthetics, 60fps rendering, neutral dark palette, and slim 5px pill scrollbars.
  - Complete elimination of emoji clutter across all buttons, status indicators, and notification banners.
  - Restructured Thai text to be terse, high-density, and structured into clean, readable paragraphs.
- **34 Ready-to-Run Roblox Studio Tools**: Expanded tool discovery and Luau executor for modern Roblox engine 0.744 / Luau 0.743.

---

## [0.0.2] - 2026-10-30

### Added & Enhanced
- **9 AI Platforms Supported**: Added full native support for **Claude AI** (`claude.ai`) and **Z.ai** (`z.ai`, `www.z.ai`, `chat.z.ai`) alongside DeepSeek, ChatGPT, Gemini, Qwen, Kimi, Meta AI, and Arena.
- **33 Roblox Studio Tools**: Expanded toolset to 33 ready-to-run tools with enhanced parameters and script-chunking support.
- **Dynamic Island Morph Action Bar**:
  - Compact mini-capsule in idle/standby mode (`max-width: 440px`) to keep the chat viewport completely unobstructed.
  - Smooth morphing expansion into active HUD (`max-width: 560px`) with cubic-bezier transition when AI is executing tools.
- **Smart Error Notification System**: Categorized banners for Roblox Studio, Bridge Server, AI Model, and Context Limits with 1-click action triggers.
- **ChatGPT Auto-Recovery Engine**: Auto-detection of empty streams and autonomous continuation.
- **Web Audio Chimes**: Synthesized notification chimes via Web Audio API.

---

## [0.0.1] - 2026-10-25

### Initial Release
- Core WebSocket bridge connecting web browser extensions with Roblox Studio MCP server.
- Undo support via `ChangeHistoryService`.
- Vanilla Roblox Studio & Bloxstrap auto-detection.
- Modern Luau conversion (`task.wait`, `task.spawn`).
