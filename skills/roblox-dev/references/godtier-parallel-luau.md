# God-Tier Parallel Luau & Multithreaded Actors
> **Target Engine:** Roblox Studio 0.744+ | Luau 0.743+
> **Capability:** 120+ FPS with 200+ Autonomous NPCs or Complex Physics

---

## 1. Parallel Luau Fundamentals
- **Serial vs Parallel:** Standard Luau runs on a single main thread. By placing code inside an `Actor` instance, you can invoke `task.desynchronize()` to compute across multiple hardware CPU cores.
- **Rules of Desynchronization:**
  - ✅ **Allowed in Parallel:** Math calculations, table operations, string manipulation, `Workspace:Raycast` (read-only raycasting!), spatial hash queries, pathfinding calculations.
  - ❌ **Forbidden in Parallel:** Modifying properties of Instances, parenting, destroying, creating Instances with parent set.
  - 🔄 **Safe Synchronization:** Call `task.synchronize()` when you are ready to write results back to the DataModel.

---

## 2. High-Performance Multithreaded Worker Pattern (`WorkerActor.luau`)

```luau
--!strict
-- Place this script inside an Actor (e.g., ServerScriptService.Workers.Actor1.WorkerScript)
local actor = script:GetActor()
assert(actor, "Script must be a descendant of an Actor to utilize Parallel Luau!")

local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Include

-- Connect to Stepped or Heartbeat for parallel computation
RunService.Heartbeat:ConnectParallel(function(dt: number)
    -- PHASE 1: DESYNCHRONIZED (Multi-core Parallel Execution)
    -- Run heavy math, raycasts, or steering behaviors here
    local origin = Vector3.new(0, 10, 0)
    local dir = Vector3.new(0, -20, 0)
    local rayResult = Workspace:Raycast(origin, dir, rayParams)

    -- PHASE 2: SYNCHRONIZED (Writeback to DataModel)
    task.synchronize()
    if rayResult and rayResult.Instance then
        -- Safe to update CFrame or properties here
    end
end)
```

---

## 3. Actor Pool Manager (`ActorPool.luau`)

```luau
--!strict
local ActorPool = {}
local actors: { Actor } = {}

function ActorPool.Init(size: number, templateScript: Script, parent: Instance)
    for i = 1, size do
        local act = Instance.new("Actor")
        act.Name = `WorkerActor_{i}`
        local s = templateScript:Clone()
        s.Parent = act
        act.Parent = parent
        table.insert(actors, act)
    end
end

function ActorPool.Dispatch(messageName: string, ...)
    for _, act in actors do
        act:SendMessage(messageName, ...)
    end
end

return ActorPool
```
