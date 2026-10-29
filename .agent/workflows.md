# ZXScript Agent Workflows & Maintenance Procedures
> **Project:** ZXScript - Autonomous Roblox Studio AI Agent Bridge  
> **Author & Maintainer:** [zxd44](https://github.com/zxd44) (ZirconX) <gonhackergamer0@gmail.com>  
> **Version:** `0.0.1` | **License:** GPL-3.0

This document defines standard, executable workflows for AI coding agents maintaining or enhancing ZXScript.

---

## 🛠️ Workflow 1: Verifying Python & JavaScript Syntax

Always run syntax and compilation checks after modifying bridge or extension files:

```powershell
# 1. Compile all Python files
python -m py_compile bridge/bridge.py bridge/launch_studio_mcp.py bridge/register.py

# 2. Check JavaScript syntax across all extension files
node --check zxscript-extension/background.js
node --check zxscript-extension/popup.js
node --check zxscript-extension/core/config.js
node --check zxscript-extension/core/main.js
node --check zxscript-extension/core/parser.js

# 3. Run extension test suites
node zxscript-extension/test-parser.js
node zxscript-extension/test-chatgpt.js
```

---

## 🔌 Workflow 2: Testing Live Bridge WebSocket

Verify that the local Bridge is active, accepting WebSocket connections, and advertising the Roblox MCP tools:

```python
import asyncio, websockets, json

async def check():
    async with websockets.connect("ws://127.0.0.1:17613") as ws:
        await ws.send(json.dumps({"type": "status"}))
        res = json.loads(await ws.recv())
        tools = [t["name"] for t in res.get("tools", [])]
        print(f"Status: {res.get('servers')}, Total Tools: {len(tools)}")
        assert "execute_luau" in tools
        assert "search_game_tree" in tools
        print("[OK] Live bridge verified successfully.")

asyncio.run(check())
```

---

## 🔄 Workflow 3: Clean Bridge Process Restart

When updating `bridge/bridge.py` or port configuration, restart the listening process cleanly without leaving port conflicts:

```powershell
# Find and terminate existing listener on port 17613
$portLine = netstat -ano | findstr :17613 | Select-Object -First 1
if ($portLine -match '\s+(\d+)$') {
    Stop-Process -Id $matches[1] -Force -ErrorAction SilentlyContinue
}

# Launch bridge cleanly
cmd.exe /c "scripts\start.bat"
```

---

## 📝 Workflow 4: Standard Git Commit

Ensure all modifications are committed with the verified author identity:

```powershell
git add -A
git commit -m "<type>(<scope>): <concise description>" --author="zxd44 <gonhackergamer0@gmail.com>"
```
