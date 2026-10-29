# ZXScript Agent Rules & Operational Constraints
> **Owner & Maintainer:** zxd44 (ZirconX) <gonhackergamer0@gmail.com>  
> **Project:** ZXScript - Autonomous Roblox Studio AI Agent Bridge  
> **Version:** `0.0.1` | **License:** GPL-3.0

This document specifies mandatory rules for any AI agent interacting with, developing, or controlling Roblox Studio through ZXScript.

---

## 🚨 Non-Negotiable Core Rules

### Rule 1: Zero Guessing of Game Hierarchy
- **NEVER** guess or assume Instance paths in Roblox Studio.
- Before modifying or adding any Instance or Script, you **MUST** run `search_game_tree` or `inspect_instance` on `game.Workspace`, `game.ServerScriptService`, or `game.ReplicatedStorage`.
- Always verify actual child names before referencing them in code.

### Rule 2: Anti-Loop & Anti-Ban Rate Limit Control
- **Maximum 3-5 tool calls per turn.**
- Never execute open-ended monolithic requests in a single prompt (e.g. "Build the entire RPG game").
- Break work into distinct, testable sub-systems.
- Conclude each sub-system with a clear summary, and **HALT** to wait for user confirmation.
- ZXScript utilizes a humanized jitter delay (`1000 - 2200ms`) to safeguard against Cloudflare and AI bot detection filters.

### Rule 3: Modern Luau Standards (Strict Execution)
- **Asynchronous Task Library:** Use `task.wait()`, `task.spawn()`, `task.delay()`, `task.cancel()`. Deprecated globals like `wait()`, `spawn()`, `delay()` are strictly prohibited.
- **Nil Safety & Timeouts:** Always wrap instance references in `FindFirstChild()` or `WaitForChild(name, timeout)` with a 5-second timeout to avoid infinite yield crashes.
- **Error Handling:** Wrap all external services (e.g., `DataStoreService`, `HttpService`, `MarketplaceService`) in `pcall()` or `xpcall()`.
- **Destructive Commands:** Never run broad `Destroy()` or `ClearAllChildren()` on parent containers without explicit user confirmation.
- **Raycasting:** Always use `workspace:Raycast()` with `RaycastParams`. Deprecated `FindPartsInRegion3` and `FindPartOnRay` are forbidden.

### Rule 4: Protocol & Syntax for `execute_luau`
- `execute_luau` **MUST ALWAYS** be formatted inside a dedicated code fence with `###LUA###` markers:
  ```luau
  ###LUA###
  local part = Instance.new("Part")
  part.Anchored = true
  part.Parent = workspace
  return part.Name
  ###END_LUA###
  ```
- **DO NOT** embed Luau code into JSON string payloads (this causes quote-escaping failures and breaks syntax).
- For Play mode: use `###LUA:Server###` or `###LUA:Client###`.
- Use `return` for output values (`print()` is not captured by StudioMCP).

### Rule 5: Studio Undo (`Ctrl + Z`) & Automatic Rollback
- Every Edit mode `execute_luau` call is wrapped with `ChangeHistoryService:TryBeginRecording("ZXScript Action")`.
- On syntax or execution error, changes automatically roll back (`Cancel`).
- Users can press `Ctrl + Z` in Roblox Studio at any time to undo agent actions.

### Rule 6: Autonomous Console Auto-Debug & Backups
- After creating or modifying scripts, run `get_console_output` to verify runtime execution.
- If runtime errors or missing references are detected, autonomously diagnose and patch the script.
- Before major refactorings, archive previous script contents into `game.ServerStorage.ZXScript.Backups`.

### Rule 7: Project Memory Persistence
- Important game architecture, conventions, and state **MUST** be recorded in:
  `game.ServerStorage.ZXScript.Memory` (ModuleScript).
- Whenever a major milestone is reached, synchronize persistent notes into this ModuleScript using `multi_edit`.
- When starting in a new conversation, read `game.ServerStorage.ZXScript.Memory` first.

### Rule 8: Caveman Mode (Always-On Token Efficiency)
- **Zero Fluff:** Omit all polite greetings, conversational padding, pleasantries, and boilerplate.
- **Direct & Terse:** Provide high-density, concise explanations. Prioritize action and code diffs over explanations.
- **100% Quality & Correctness:** Never compromise code syntax, type safety, or completeness. Deliver complete, production-ready code.
- **Surgical Execution:** Keep edits localized and precise to minimize token consumption and context window churn.

---

## 🛠️ Environment & Compatibility Notes
- **Roblox Versions:** Supports standard Roblox Studio and **Bloxstrap** installations automatically.
- **Bridge Port:** `ws://127.0.0.1:17613`
- **MCP Advertised Tools:** 31 active tools.
- **Full Rules Document:** See [`docs/RULES.md`](../docs/RULES.md)
