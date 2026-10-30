# God-Tier Roblox Architecture: Modern Service & Controller Framework
> **Target Engine:** Roblox Studio 0.744+ | Luau 0.743+ | Strict Typed Luau
> **Standard:** Rojo / Studio Native Modular Framework

---

## 1. Core Principles (Zero Spaghetti Policy)
1. **Single Source of Truth:** Game state lives strictly on the Server. Clients only receive replicated state and render visuals.
2. **Predictable Lifecycle:** All Services and Controllers follow two deterministic phases:
   - `:Init()` - Setup signals, register remotes, prepare internal tables (NEVER yield or cross-call in Init).
   - `:Start()` - Connect runtime listeners, begin loops, interact with other services.
3. **Strict Networking Boundary:**
   - RemoteEvents and RemoteFunctions are never created ad-hoc in deep code. They are registered deterministically in `ReplicatedStorage.Network`.
   - All client remote invocations are treated as potentially malicious and must undergo server validation.

---

## 2. Server Service Blueprint (`ServiceFramework.luau`)

```luau
--!strict
-- ServerScriptService/Framework/ServiceManager.luau
local ServiceManager = {}
local services: { [string]: any } = {}
local isStarted = false

export type Service = {
    Name: string,
    Init: (self: any) -> (),
    Start: (self: any) -> (),
    [string]: any,
}

function ServiceManager.RegisterService(service: Service)
    assert(not isStarted, "Cannot register services after startup!")
    assert(service.Name and not services[service.Name], "Duplicate or unnamed service: " .. tostring(service.Name))
    services[service.Name] = service
end

function ServiceManager.GetService(name: string): any
    local s = services[name]
    assert(s, "Service not found: " .. name)
    return s
end

function ServiceManager.Start()
    assert(not isStarted, "ServiceManager already started!")
    isStarted = true

    -- Phase 1: Initialize (No cross-service dependencies allowed to yield)
    for name, s in services do
        if typeof(s.Init) == "function" then
            local ok, err = pcall(function() s:Init() end)
            if not ok then
                warn(`[ServiceManager] Init failed for {name}: {err}`)
            end
        end
    end

    -- Phase 2: Start (Runtime execution begins)
    for name, s in services do
        if typeof(s.Start) == "function" then
            task.spawn(function()
                local ok, err = pcall(function() s:Start() end)
                if not ok then
                    warn(`[ServiceManager] Start failed for {name}: {err}`)
                end
            end)
        end
    end
end

return ServiceManager
```

---

## 3. Example Economy Service (`EconomyService.luau`)

```luau
--!strict
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServiceManager = require(script.Parent.Parent.ServiceManager)

local EconomyService = {
    Name = "EconomyService",
    _balances = {} :: { [number]: number },
}

function EconomyService:Init()
    -- Create network endpoints deterministically
    local netFolder = ReplicatedStorage:FindFirstChild("Network") or Instance.new("Folder")
    netFolder.Name = "Network"
    netFolder.Parent = ReplicatedStorage

    local updateEvent = Instance.new("RemoteEvent")
    updateEvent.Name = "CoinsUpdated"
    updateEvent.Parent = netFolder
end

function EconomyService:Start()
    Players.PlayerAdded:Connect(function(player)
        self._balances[player.UserId] = 100 -- Starting balance
        self:SyncToClient(player)
    end)

    Players.PlayerRemoving:Connect(function(player)
        self._balances[player.UserId] = nil
    end)
end

function EconomyService:AddCoins(player: Player, amount: number): boolean
    if amount <= 0 then return false end
    local uid = player.UserId
    self._balances[uid] = (self._balances[uid] or 0) + amount
    self:SyncToClient(player)
    return true
end

function EconomyService:SyncToClient(player: Player)
    local netFolder = ReplicatedStorage:WaitForChild("Network", 5)
    local updateEvent = netFolder and netFolder:FindFirstChild("CoinsUpdated") :: RemoteEvent?
    if updateEvent then
        updateEvent:FireClient(player, self._balances[player.UserId] or 0)
    end
end

return EconomyService
```
