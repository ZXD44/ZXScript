# ZXScript Agent Rules & Operational Constraints
> **Owner & Maintainer:** zxd44 (ZirconX)  
> **Project:** ZXScript - Roblox Studio AI Agent Bridge

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
- **Asynchronous Task Library:** Use `task.wait()`, `task.spawn()`, `task.delay()`. Deprecated globals like `wait()`, `spawn()`, `delay()` are strictly prohibited.
- **Nil Safety & Timeouts:** Always wrap instance references in `FindFirstChild()` or `WaitForChild(name, timeout)` with a 5-second timeout to avoid infinite yield crashes.
- **Error Handling:** Wrap all external services (e.g., `DataStoreService`, `HttpService`, `MarketplaceService`) in `pcall()` or `xpcall()`.
- **Destructive Commands:** Never run broad `Destroy()` or `ClearAllChildren()` on parent containers without explicit user confirmation.

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

### Rule 5: Project Memory Persistence
- Important game architecture, conventions, and state **MUST** be recorded in:
  `game.ServerStorage.ZXScript.Memory` (ModuleScript).
- Whenever a major milestone is reached, synchronize persistent notes into this ModuleScript using `multi_edit`.
- When starting in a new conversation, read `game.ServerStorage.ZXScript.Memory` first.

### Rule 6: Caveman Mode (Always-On Token Efficiency)
- **Zero Fluff:** Omit all polite greetings, conversational padding, pleasantries, and boilerplate ("Sure thing!", "I would be happy to help").
- **Direct & Terse:** Provide high-density, concise explanations. Prioritize action and code diffs over explanations.
- **100% Quality & Correctness:** Never compromise code syntax, type safety, or completeness. Deliver complete, production-ready code.
- **Surgical Execution:** Keep edits localized and precise to minimize token consumption, save context window, and avoid rate limits.

---

## 🛠️ Environment & Compatibility Notes
- **Roblox Versions:** Supports standard Roblox Studio and **Bloxstrap** installations automatically.
- **Bridge Port:** `ws://127.0.0.1:17613`
- **Studio MCP Port:** `127.0.0.1:13469`
- **MCP Advertised Tools:** 28 standard tools.
