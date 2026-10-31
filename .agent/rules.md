# ZXScript Agent Rules & Operational Constraints
> **Owner & Maintainer:** ZXD44 (ZirconX) <gonhackergamer0@gmail.com>  
> **Project:** ZXScript - Autonomous Roblox Studio AI Agent Bridge  
> **Version:** `0.0.3` | **License:** GPL-3.0

This document specifies mandatory rules for any AI agent interacting with or developing ZXScript.

---

## 1. Clean Architecture & Code Modularity Rules

1. **Strict File Line Limit:** Each file must remain under **500 - 600 lines**. Any file expanding beyond this limit must be split immediately into focused sub-modules.
2. **Decoupled Configuration & Constants:** Constants, environment variables, and configurations must be maintained in standalone files (`constants.py`, `constants.js`, `config_manager.py`).
3. **Headless Execution Only:** Never open external CMD terminal windows. Use `CREATE_NO_WINDOW` flags and stream output to the in-page/popup terminal.
4. **Single Responsibility Principle:** Each module must perform exactly one function (e.g. audio synthesis, camouflage, tool execution, session management).

---

## 2. Roblox Studio & Luau Coding Standards (Roblox 0.744+)

1. **Modern Task Library Only:** Never generate `wait()`, `spawn()`, or `delay()`. Always use `task.wait()`, `task.spawn()`, `task.delay()`, and `task.cancel()`.
2. **Server-Authoritative Game Architecture:** Keep data, combat logic, and persistence on the Server (`ServerScriptService`). Client scripts must only handle user input and local rendering.
3. **ProfileStore Persistence:** Save player data through ProfileStore or DataStoreService with session locking and `game:BindToClose()` auto-saving.
4. **Zero Guessing:** Always inspect or search the game tree before editing scripts to guarantee correct instance paths.

---

## 3. Communication & UI Guidelines

1. **Caveman Mode Communication:** Keep Thai messages concise, direct, high-density, and free of conversational fluff.
2. **Impeccable Style UI:** No emojis on buttons or status indicators. Maintain clean typography, subtle borders, and smooth 60fps transitions.
3. **No 'Bridge' Terminology in UI:** Never use the word "Bridge" in user-facing UI and alerts (user strongly dislikes this term). Use "Studio", "ระบบเชื่อมต่อ", or "การเชื่อมต่อ" instead. Replace globe icon with developer credit "ZXD44". Ensure action bar is responsive and concise.
