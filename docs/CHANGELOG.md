# Changelog

All notable changes to ZXScript are documented here.

## [0.0.4] - 2026-11-01

### Discord Cyber Dragon UI & Performance Tuning
- **Discord Cyber Dragon UI Theme & Blurple Accents**:
  - Re-themed the entire user interface to Discord dark aesthetics: `#23272a` (primary background/floating bar), `#2b2d31` (secondary surfaces/cards), `#1e1f22` (dark header/input backdrops), `#2f3136` (subtle borders), and authentic Discord Blurple (`#5865F2`).
  - Active selection states updated from green (`#57f287`) to Discord Blurple (`#5865F2`) across AI model selection pills, menu badges, popup tabs, tab indicator dots, and text selection highlights (`::selection`).
  - Applied Discord typography (`gg sans`, `Noto Sans`, `Helvetica Neue`, sans-serif) across all UI elements.
- **Organic Wing Dynamics & Smooth Flight Cycles**:
  - Re-tuned dragon wing flap animations to natural, majestic flight intervals: 4.8s idle cycle (calm breathing flight), 3.6s hover cycle, and 2.5s active execution boost.
  - Maintained zero-gap symmetrical anchor geometry with GPU hardware acceleration (`transform: translate3d(...)`).
- **Streamlined & Compact `zs-menu` UI (40% Footprint Reduction)**:
  - Shrunk menu drawer width from 480px to 290px for a clean, non-intrusive screen footprint.
  - Reorganized into an approachable, user-friendly layout: quick AI model selection pills, one-click bridge launch, and folded MCP terminal expander.
  - Eliminated emoji clutter in favor of clean typography and minimalist status dots.
- **Action Bar Viewport Centering & Rendering Stability**:
  - Restored pure CSS-driven horizontal centering (`left: 50% !important; transform: translateX(-50%) !important;`), eliminating fragile JavaScript coordinate overrides.
  - Removed layout containment (`contain: layout style`) on `#zs-root` that broke fixed positioning on web chat pages.
- **Headless Studio Connection Verification**:
  - Added user cancellation verification and graceful rollback to the connection prompt flow.
  - Verified active Studio instance connectivity prior to headless bridge execution.
- **Real Emergency Stop & Process Termination Engine (Kill All)**:
  - Overhauled #zs-stop button and stopLoop(): instantaneously cancels in-flight AI stream generation, invalidates bootstrap startup generation (startGen++), immediately settles tool promises in 0ms (	oolSettle), unlocks composer inputs, and clears overlay covers.
  - Resolved turn completion race condition in gentLoop: eliminated ghost 'งานเสร็จสิ้นเรียบร้อยแล้ว!' banners and completion chimes on aborted loops.
  - Added OS-level process termination across bridge server and native host: forcefully executes taskkill against RobloxStudioBeta.exe, RobloxStudio.exe, Bloxstrap.exe, and StudioMCP.exe.
  - Added dedicated emergency 'บังคับปิด Studio ทั้งหมด (Kill All)' actions in the Action Bar, zs-menu drawer, and popup extension.
- **Thai Language UX Polish**:
  - Polished all Thai copy across Action Bar, menu drawer, modals, popup, and notification toasts into natural, fluent, grammatically sound Thai.


---

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
- **Critical Action Bar & Bootstrap Injection Fix**: Fixed failure where clicking "▶ เริ่มทำงาน" did not inject the initial system prompt to the AI composer. Exported `window.ZSProvider` across all 9 providers, corrected `manifest.json` load order, eliminated premature bailout in `landed()`, and removed silent early exit on non-empty chats. Full incident analysis recorded in [`docs/CRITICAL_ISSUES.md`](./CRITICAL_ISSUES.md).
- **Red Dragon Wings & Flapping Dynamics Overhaul**:
  - Enlarged dragon wings (+43%, from $46\times 26\text{px}$ to $66\times 37\text{px}$) with crimson ember glow drop shadows.
  - Symmetrical coordinate calibration: fixed detached gap on the right wing using precision reflection geometry (`left: -42px`, `right: 6px`, `transform-origin: calc(100% - 9px) 50%`) ensuring 0.00px error symmetry across all frames.
  - Fluid multi-phase flapping animation: implemented organic 5-stage flight cycles (`zs-wing-flap-left`, `zs-wing-flap-right`) with 2.0s standby, 1.0s active tool-run boost, and 1.4s hover cycle.
  - Removed `!important` from base `transform` selectors conforming to W3C CSS Animations Level 1 cascade rules, eliminating animation freeze.
  - Enforced `display: none !important;` on all `[hidden]` elements (`#zs-stop[hidden]`, `#zs-state[hidden]`), preventing idle button leakage.
- **Single Source of Truth (SSOT) Version Management Engine**:
  - Centralized project versioning into `version.json` and `VERSION` at the repository root.
  - Python bridge (`bridge/constants.py` and `bridge/__init__.py`) dynamically resolves version at runtime from SSOT with PyInstaller frozen environment support.
  - Browser extension (`zxscript-extension/core/constants.js`) dynamically resolves version via `chrome.runtime.getManifest().version` with shared `window.ZS.VERSION` / `A.version` exports.
  - Developed universal 1-click synchronizer script `scripts/bump_version.py` and root shortcut `bump-version.bat` supporting `--patch`, `--minor`, `--major`, and `--check` across all 16 target files.

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
