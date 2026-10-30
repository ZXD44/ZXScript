# God-Tier Roblox Character Animations, Markers & Procedural IK
> **Target Engine:** Roblox Studio 0.744+ | Luau 0.743+
> **Focus:** Frame-Perfect Animation Tracks, IKControl, and Procedural Leaning

---

## 1. Golden Rules of Modern Roblox Animations
1. **Never Call `Humanoid:LoadAnimation()`:**
   - ❌ Deprecated since 2020: `Humanoid:LoadAnimation(anim)`
   - ✅ Always use the `Animator` instance: `humanoid:WaitForChild("Animator"):LoadAnimation(anim)`
2. **Always Run Animations on the Client:**
   - When a client loads and plays an AnimationTrack on their own character's `Animator`, Roblox **automatically replicates** the movement to the server and other players at low latency without server overhead.
3. **Use Animation Markers for Frame-Perfect Sync:**
   - Never use arbitrary `task.wait(0.3)` to guess when a punch or slash lands.
   - Add a Named Marker (e.g. `"Hit"`, `"Footstep"`, `"Release"`) in the Animation Editor, and listen via `track:GetMarkerReachedSignal("Hit")`.
4. **Animation Priority Hierarchy:**
   - `Core` $\rightarrow$ `Idle` $\rightarrow$ `Movement` $\rightarrow$ `Action` $\rightarrow$ `Action2` $\rightarrow$ `Action3` $\rightarrow$ `Action4`
   - Combat attacks should use `Action` or `Action2`, while ultimate abilities use `Action4` to override basic swings.

---

## 2. Production Animation Controller (`AnimationController.luau`)

```luau
--!strict
-- StarterPlayer.StarterPlayerScripts.Controllers.AnimationController.luau
local Players = game:GetService("Players")
local localPlayer = Players.LocalPlayer

local AnimationController = {}
local loadedTracks: { [string]: AnimationTrack } = {}
local currentAnimator: Animator? = nil

function AnimationController.Init(character: Model)
    table.clear(loadedTracks)
    local humanoid = character:WaitForChild("Humanoid", 5) :: Humanoid?
    if not humanoid then return end

    currentAnimator = humanoid:WaitForChild("Animator", 5) :: Animator?
end

function AnimationController.Load(animId: string, name: string, priority: Enum.AnimationPriority?): AnimationTrack?
    if not currentAnimator then return nil end
    if loadedTracks[name] then return loadedTracks[name] end

    local anim = Instance.new("Animation")
    anim.Name = name
    anim.AnimationId = if string.find(animId, "rbxassetid://") then animId else `rbxassetid://{animId}`

    local track = currentAnimator:LoadAnimation(anim)
    track.Priority = priority or Enum.AnimationPriority.Action
    loadedTracks[name] = track
    return track
end

function AnimationController.Play(name: string, fadeTime: number?, speed: number?)
    local track = loadedTracks[name]
    if track then
        track:Play(fadeTime or 0.15, 1, speed or 1)
    else
        warn(`[AnimationController] Track not loaded: {name}`)
    end
end

function AnimationController.Stop(name: string, fadeTime: number?)
    local track = loadedTracks[name]
    if track and track.IsPlaying then
        track:Stop(fadeTime or 0.15)
    end
end

-- Connects to an Animation Marker for frame-accurate event triggering (e.g., sound/hitbox)
function AnimationController.OnMarker(name: string, markerName: string, callback: () -> ()): RBXScriptConnection?
    local track = loadedTracks[name]
    if not track then return nil end
    return track:GetMarkerReachedSignal(markerName):Connect(callback)
end

return AnimationController
```

---

## 3. Procedural Look-At with Modern `IKControl`

```luau
--!strict
-- Smooth head/torso tracking using Roblox's native IKControl (Zero lag, GPU-accelerated)
local function SetupHeadLookAt(character: Model, targetPartOrPosition: Instance | Vector3)
    local humanoid = character:WaitForChild("Humanoid", 5) :: Humanoid?
    local head = character:WaitForChild("Head", 5) :: BasePart?
    local root = character:WaitForChild("HumanoidRootPart", 5) :: BasePart?
    if not humanoid or not head or not root then return end

    local ik = Instance.new("IKControl")
    ik.Name = "HeadLookAtIK"
    ik.Type = Enum.IKControlType.LookAt
    ik.Weight = 0.8
    ik.EndEffector = head
    ik.ChainRoot = character:WaitForChild("UpperTorso", 5) or root

    if typeof(targetPartOrPosition) == "Instance" then
        ik.Target = targetPartOrPosition :: BasePart
    else
        local attachment = Instance.new("Attachment")
        attachment.WorldPosition = targetPartOrPosition
        attachment.Parent = workspace.Terrain
        ik.Target = attachment
    end

    ik.Parent = humanoid
end
```

---

## 4. Procedural Movement Leaning (Tilt Walking)

```luau
--!strict
-- Tilts the character's torso in the direction of movement for fluid, modern feel
local RunService = game:GetService("RunService")

local function SetupMovementLean(character: Model)
    local root = character:WaitForChild("HumanoidRootPart", 5) :: BasePart?
    local rootJoint = character:FindFirstChild("LowerTorso") and character.LowerTorso:FindFirstChild("Root") :: Motor6D?
    if not root or not rootJoint then return end

    local originalC0 = rootJoint.C0
    local currentTiltX = 0
    local currentTiltZ = 0

    RunService.RenderStepped:Connect(function(dt: number)
        local vel = root.AssemblyLinearVelocity
        local localVel = root.CFrame:VectorToObjectSpace(vel)

        local targetTiltZ = math.clamp(-localVel.X / 30, -0.25, 0.25) -- Roll
        local targetTiltX = math.clamp(localVel.Z / 40, -0.15, 0.15)  -- Pitch

        currentTiltX += (targetTiltX - currentTiltX) * math.min(1, dt * 10)
        currentTiltZ += (targetTiltZ - currentTiltZ) * math.min(1, dt * 10)

        rootJoint.C0 = originalC0 * CFrame.Angles(currentTiltX, 0, currentTiltZ)
    end)
end
```
