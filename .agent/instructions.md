# ZXScript Agent Instructions & Coding Standards
> **Author & Maintainer:** [zxd44](https://github.com/zxd44) (ZirconX) <gonhackergamer0@gmail.com>  
> **Repository:** ZXScript - Roblox Studio AI Agent Bridge  
> **Version:** `0.0.1` | **License:** GPL-3.0

This file guides AI coding agents working directly on the ZXScript codebase itself.

---

## 🎯 Developer Guidelines for Working on ZXScript

### 1. Root Directory Cleanliness (Strict Requirement)
- The root directory **MUST STRICTLY** contain only:
  - `.gitattributes`
  - `.gitignore`
  - `LICENSE`
  - `README.md`
  - Subdirectories: `.agent/`, `assets/`, `bridge/`, `dist/`, `docs/`, `logs/`, `scripts/`, `zxscript-extension/`.
- **NEVER** write or leave `.py`, `.bat`, `.html`, or scratch test files directly in the root directory.

### 2. Preserve Bridge & MCP Compatibility
- Keep `bridge/launch_studio_mcp.py` compatible with both standard Roblox Studio installations and **Bloxstrap** directories.
- Preserve the `###LUA###` ... `###END_LUA###` protocol in `zxscript-extension/core/parser.js`.
- Preserve the Luau modernization interceptor (`wait` -> `task.wait`, etc.) and `ChangeHistoryService` recording wrapper in `bridge/bridge.py`.
- Preserve `_prune_game_tree` to keep token consumption efficient.

### 3. Anti-Ban Pacing & Zero Dependencies
- Keep `HUMANIZE_SEND = true` and preserve jitter `[1000, 2200]` ms in `zxscript-extension/core/main.js`.
- The Bridge must maintain a zero-heavy-dependency design (only standard Python libraries + `websockets`). Do not introduce bloated external frameworks.

### 4. Extension UI & Native Web Audio
- Adhere strictly to **Impeccable Style** principles:
  - Zinc dark palette (`#09090b` background, `#111114` surfaces, subtle borders `rgba(255,255,255,0.08)`).
  - Minimalist, high-density typography with zero emoji spam.
- Preserve the Web Audio API synthesis (`playChime`) without adding external sound files or asset dependencies.
- Maintain template consistency across `zxscript-extension/popup.html` and `zxscript-extension/popup.js`.

### 5. Git & Author Identity
- Always create commits using author: `zxd44 <gonhackergamer0@gmail.com>`.
- Keep commit messages concise, structured, and descriptive (e.g. `feat: ...`, `fix: ...`, `docs: ...`).

---

## 📚 Reference Documents
- Master Operational Rules: [../docs/RULES.md](../docs/RULES.md)
- Agent Constraints: [rules.md](./rules.md)
- System Architecture & Context: [context.md](./context.md)
- User Documentation & Prompt Library: [../docs/ZXScript_Guide.md](../docs/ZXScript_Guide.md)
- Version Changelog: [../docs/CHANGELOG.md](../docs/CHANGELOG.md)
