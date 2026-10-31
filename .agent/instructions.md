# ZXScript Agent Instructions & Coding Standards
> **Author & Maintainer:** [ZXD44](https://github.com/ZXD44) (ZirconX) <gonhackergamer0@gmail.com>  
> **Website:** [www.zirconx.xyz](https://www.zirconx.xyz)  
> **Repository:** ZXScript - Roblox Studio AI Agent Bridge  
> **Version:** `0.0.3` | **License:** GPL-3.0

This file guides AI coding agents working directly on the ZXScript codebase itself.

---

## Developer Guidelines for Working on ZXScript

### 1. File Length & Modularity Limit (< 500-600 Lines)
- **Strict Rule:** Every code file (Python, JavaScript, CSS, HTML) **MUST NOT** exceed 500-600 lines.
- When adding functionality, decompose into separate modules based on the Single Responsibility Principle (SRP).
- Decouple constants, styling, UI components, and transport layers.

### 2. Root Directory Cleanliness
- The root directory must contain only project configuration files and documentation:
  - `.gitattributes`, `.gitignore`, `LICENSE`, `README.md`, `start.bat`
  - Subdirectories: `.agent/`, `assets/`, `bridge/`, `dist/`, `docs/`, `logs/`, `scripts/`, `zxscript-extension/`.
- **Never** leave scratch or temporary test scripts in the root directory.

### 3. Headless Native Host Execution
- All backend execution invoked from browser native messaging must use `creationflags=0x08000000` (`CREATE_NO_WINDOW`) on Windows.
- Never pop up external CMD windows when launching the bridge.
- Stream stdout/stderr logs through IPC to the extension popup and in-page modal terminal.

### 4. Impeccable Style Design System
- Strictly adhere to [impeccable.style](https://impeccable.style/) principles.
- Maintain a sleek, minimalist aesthetic with neutral dark palette (Zinc-950).
- Eliminate emoji clutter across buttons, headers, and status badges.
- Keep animations fast and hardware-accelerated (60fps), avoiding heavy breathing or glowing effects.
- Use 5px custom pill scrollbars across all scrollable containers.

### 5. Preserve Bridge & MCP Compatibility
- Keep `bridge/launch_studio_mcp.py` compatible with standard Roblox Studio and Bloxstrap.
- Maintain Luau modernizer (`task.wait`, `task.spawn`) and `ChangeHistoryService` wrapping in `bridge/tool_dispatcher.py`.
- Preserve tree pruning in `_prune_game_tree` to optimize token usage.

### 6. Verification & Test Suite
Always verify changes using the built-in test suite:
- Python syntax: `python -c "import glob, py_compile; [py_compile.compile(f, doraise=True) for f in glob.glob('bridge/*.py')]"`
- Command parser: `node zxscript-extension/test-parser.js`
- ChatGPT adapter: `node zxscript-extension/test-chatgpt.js`
- Claude adapter: `node zxscript-extension/test-claude.js`
