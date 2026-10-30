# God-Tier Procedural World & Dungeon Generation
> **Target Engine:** Roblox Studio 0.744+ | Luau 0.743+
> **Focus:** Voxel Terrain, Wave Function Collapse, ChangeHistoryService Chunking

---

## 1. Studio ChangeHistoryService Chunking (Anti-Freeze Pattern)
Generating thousands of voxels or models at once locks the Roblox Studio main thread and causes Studio MCP timeouts (`Execution timed out after 20s`).
Always split world generation into asynchronous chunks with `task.wait()` yields or batch into a single Undo recording:

```luau
--!strict
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local recording = ChangeHistoryService:TryBeginRecording("GenerateProceduralMap")

local function GenerateMap(width: number, height: number)
    local partFolder = Instance.new("Folder")
    partFolder.Name = "GeneratedTerrain"

    local count = 0
    for x = 1, width do
        for z = 1, height do
            local heightY = math.noise(x * 0.05, z * 0.05, 123) * 15
            local part = Instance.new("Part")
            part.Size = Vector3.new(4, 4, 4)
            part.Position = Vector3.new(x * 4, heightY, z * 4)
            part.Anchored = true
            part.Material = if heightY > 5 then Enum.Material.Rock else Enum.Material.Grass
            part.Color = if heightY > 5 then Color3.fromRGB(120, 120, 120) else Color3.fromRGB(80, 160, 60)
            part.Parent = partFolder

            count += 1
            if count % 200 == 0 then
                task.wait() -- Prevent Studio freeze
            end
        end
    end
    partFolder.Parent = workspace
end

GenerateMap(40, 40)

if recording then
    ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Commit)
end
return "Generated 1,600 terrain voxels successfully"
```
