# ZXScript Agent Instructions
> **Author:** zxd44 (ZirconX)  
> **Repository:** ZXScript  
> **License:** GPL-3.0

This file guides AI coding agents working on the ZXScript codebase itself.

---

## 🎯 Developer Guidelines for Working on ZXScript

1. **Preserve Compatibility:**
   - Keep `launch_studio_mcp.py` compatible with Bloxstrap and vanilla Roblox Studio across future Studio version directories.
   - Do not break the `###LUA###` protocol in `zxscript-extension/core/parser.js`.
2. **Anti-Ban Pacing:**
   - Keep `HUMANIZE_SEND = true` and preserve jitter `[1000, 2200]` ms in `zxscript-extension/core/main.js`.
3. **No Unneeded Dependencies:**
   - The Bridge intentionally relies only on standard Python libraries + `websockets`. Do not add heavy dependencies unless strictly justified.
4. **Clean Git Commits:**
   - Always commit using author: `zxd44 <gonhackergamer0@gmail.com>`.
   - Keep working tree clean.

---

## 📚 References
- Operational Rules: [rules.md](./rules.md)
- System Architecture & Context: [context.md](./context.md)
- User Documentation & Prompts: [../docs/ZXScript_Guide.md](../docs/ZXScript_Guide.md)
