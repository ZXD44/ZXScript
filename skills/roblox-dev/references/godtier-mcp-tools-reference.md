# God-Tier StudioMCP 33 Tools Complete Reference & Decision Matrix

> **Verification**: Live Roblox Studio 0.744 / Luau 0.743 / StudioMCP Proxy (33 tools verified).
> **Rule**: Operates under **Caveman Mode** — zero fluff, direct, high density, complete code.

---

## 1. Fast Decision Matrix (ตารางตัดสินใจเลือกใช้คำสั่ง)

| สิ่งที่ต้องการทำ (Goal) | คำสั่งที่ต้องใช้ (Primary Tool) | ลำดับการทำงาน (Action Sequence) | ข้อควรระวัง (Critical Gotcha) |
|---|---|---|---|
| สำรวจหา Instance / ดูว่ามีอะไรในเกม | `search_game_tree` | `search_game_tree(path, max_depth)` | ห้ามเดา Path เอง ต้องค้นหาก่อน |
| ดู Properties / Attributes ละเอียด | `inspect_instance` | `inspect_instance(path)` | Case-insensitive dot path |
| หาชื่อสคริปต์ในโปรเจกต์ | `script_search` | `script_search(keywords)` | ส่งคืนสูงสุด 10 รายการ |
| ค้นหาข้อความ/ฟังก์ชันในโค้ดทุกสคริปต์ | `script_grep` | `script_grep(query)` | ส่งคืนสูงสุด 50 ผลลัพธ์ |
| อ่านโค้ดก่อนแก้ไข | `script_read` | `script_read(target_file)` | รูปแบบผลลัพธ์เป็น `LINE->CONTENT` |
| แก้ไขสคริปต์เดิม | `multi_edit` | `script_read` -> `multi_edit` | `old_string` ต้องตรงเป๊ะ 100% รวม space/tab |
| สร้างสคริปต์ใหม่ | `multi_edit` | `multi_edit(className, old_string="")` | `className`: Script / LocalScript / ModuleScript |
| รันโค้ดสด / เสก Part / จัดแสง | `execute_luau` | บล็อก `###LUA###` ... `###END_LUA###` | บังคับใช้ `return` (print ไม่ถูกจับผลลัพธ์) |
| ตรวจจับ Error อัตโนมัติ | `get_console_output` | `get_console_output()` | รันหลังแก้สคริปต์หรือเทสต์เกม |
| เจนเนอเรต Mesh 3D พร้อม Texture | `generate_mesh` | `generate_mesh(textPrompt, size)` | บล็อกรอผลลัพธ์อัตโนมัติ (Yielding) |
| สร้างโมเดลจาก Part เรขาคณิต | `generate_procedural_model` | `generate_procedural_model(prompt)` | คืน generationId ทันที (Non-yielding) |
| สร้างทั้งฉาก / เกาะ / ดันเจี้ยน | `generate_scene` | `generate_scene(textPrompt, boxSize)` | วาง Part และ Model ลง DataModel |
| ทำ PBR MaterialVariant | `generate_material` | `generate_material(materialDescription)` | คืน BaseMaterial + MaterialVariant |
| เปลี่ยนเท็กซ์เจอร์โมเดลเดิม | `generate_texture` | `generate_texture(instance_path, textPrompt)` | **ทับโมเดลเดิมทันที** (ก๊อปปี้สำรองก่อน) |
| แยกชิ้นส่วน Mesh ออกเป็นข้อต่อ | `segment_mesh` | `segment_mesh(instance_path, parts)` | แทรก Model ใหม่ข้างโมเดลเดิม |
| ใส่กระดูก R15 ให้โมเดล 3D | `auto_setup_avatar` | `auto_setup_avatar(instance_path)` | ติดตั้ง Motor6D และกลายเป็น R15 Avatar |
| ค้นหาเสียง/โมเดล/Decal ใน Store | `search_asset` | `search_asset(query, assetType)` | กรองฟรีและ Creator ที่ได้รับการยืนยัน |
| เสก Asset ลงเกมตาม ID | `insert_asset` | `insert_asset(assetId, parentPath)` | ใช้ numeric asset ID |
| แปลงไฟล์ภาพในเครื่องเป็น URI | `store_image` | `store_image(filePath)` | ขนาดไม่เกิน 5MB คืน `IMAGEID_<id>` |
| อัปโหลดรูปภาพขึ้น Roblox CDN | `upload_image` | `upload_image(imagePaths)` | รับ HTTP URLs คืน `rbxassetid://...` |
| เริ่ม/หยุดโหมดเล่นเกม | `start_stop_play` | `start_stop_play(is_start=true/false)` | รอ 1-2 วินาทีให้เอนจินสลับโหมด |
| เช็กสถานะการเล่นใน Studio | `get_studio_state` | `get_studio_state()` | เช็กว่ากำลัง Play หรือ Edit |
| จำลองการกดคีย์บอร์ด | `user_keyboard_input` | `user_keyboard_input(actions, "Client")` | ต้องอยู่ในโหมด Play และใช้ชื่อ KeyCode |
| จำลองการคลิก/เลื่อนเมาส์ | `user_mouse_input` | `user_mouse_input(actions, "Client")` | ต้องอยู่ในโหมด Play กำหนด x/y หรือ instance_path |
| บังคับตัวละครเดินไปตำแหน่ง/วัตถุ | `character_navigation` | `character_navigation(x, y, z, ...)` | ต้องอยู่ในโหมด Play |
| ถ่ายภาพหน้าจอในเกม | `screen_capture` | `screen_capture(camera_position)` | ดึงภาพผลลัพธ์มาตรวจสอบด้วยสายตา |
| รอคำสั่งเบื้องหลังจนเสร็จ | `wait_job_finished` | `wait_job_finished(jobId, timeout)` | ใช้กับ Job Async |
| โหลดทักษะความรู้พิเศษ | `list_skills` / `skill` | `skill(skill_name)` | ดึงความรู้เชิงลึกของ Roblox |
| สร้างหรือแก้ทักษะส่วนตัว | `create_skill` / `edit_skill`| `create_skill(name, desc, body)` | บันทึกทักษะไว้ใช้ในอนาคต |
| เรียก Subagent ทำงานอิสระ | `subagent` | `subagent(type, task, desc)` | งานขนาดใหญ่ที่ต้องรันหลายขั้นตอน |
| ดึงเว็บ/เอกสารภายนอก | `http_get` | `http_get(url)` | อ่าน LLM docs / Markdown |
| ตรวจสอบ Studio ID | `list_roblox_studios` | `list_roblox_studios()` | เมื่อเปิดหลาย Studio พร้อมกัน |

---

## 2. หมวดหมู่คำสั่งทั้ง 33 คำสั่ง (33 Tools Deep Dive)

### หมวดที่ 1: การสำรวจและอ่านโค้ด (Inspection & Reading)

#### 1.1 `search_game_tree`
- **หน้าที่**: ค้นหาโครงสร้าง Instance ใน DataModel ออกมาเป็น flat JSON
- **พารามิเตอร์**:
  ```json
  {
    "command": "search_game_tree",
    "params": {
      "path": "Workspace",
      "max_depth": 2,
      "keywords": ["Arena", "Spawner"],
      "instance_type": "Model",
      "head_limit": 50,
      "datamodel_type": "Edit"
    }
  }
  ```
- **ข้อควรระวัง**: รันคำสั่งนี้เสมอเพื่อตรวจสอบว่ามี Instance ที่ต้องการอยู่จริงก่อนเขียนโค้ดอ้างอิง

#### 1.2 `inspect_instance`
- **หน้าที่**: อ่านคุณสมบัติ (Properties), Custom Attributes และรายชื่อ Children ของ Instance นั้น
- **พารามิเตอร์**:
  ```json
  {
    "command": "inspect_instance",
    "params": {
      "path": "Workspace.Baseplate"
    }
  }
  ```
- **ข้อควรระวัง**: ส่งผลลัพธ์เฉพาะคุณสมบัติที่อ่านได้ (Readable Properties) หากต้องการดู Properties ของ Children ต้องเรียกแยก

#### 1.3 `script_search`
- **หน้าที่**: ค้นหาชื่อสคริปต์แบบ Fuzzy match
- **พารามิเตอร์**:
  ```json
  {
    "command": "script_search",
    "params": {
      "keywords": "CombatService"
    }
  }
  ```
- **ข้อจำกัด**: คืนค่าสูงสุด 10 สคริปต์

#### 1.4 `script_grep`
- **หน้าที่**: ค้นหาข้อความ/Regex ในเนื้อหาโค้ดของสคริปต์ทั้งหมดในเกม
- **พารามิเตอร์**:
  ```json
  {
    "command": "script_grep",
    "params": {
      "query": "RemoteEvent"
    }
  }
  ```
- **ข้อจำกัด**: คืนค่าสูงสุด 50 แมตช์ เหมาะสำหรับค้นหาจุดเรียกใช้ฟังก์ชันหรือ Event ข้ามสคริปต์

#### 1.5 `script_read`
- **หน้าที่**: อ่านซอร์สโค้ดของสคริปต์พร้อมเลขกำกับบรรทัด
- **พารามิเตอร์**:
  ```json
  {
    "command": "script_read",
    "params": {
      "target_file": "game.ServerScriptService.CombatService",
      "should_read_entire_file": true
    }
  }
  ```
- **ข้อบังคับ**: ต้องอ่านโค้ดด้วยคำสั่งนี้ก่อนสั่ง `multi_edit` ทุกครั้ง เพื่อคัดลอก `old_string` ให้ตรงเป๊ะทุกไบต์

#### 1.6 `get_console_output`
- **หน้าที่**: ดึงข้อความ Log ล่าสุดจาก Roblox Studio Output (Errors, Warnings, Prints)
- **พารามิเตอร์**:
  ```json
  {
    "command": "get_console_output",
    "params": {}
  }
  ```
- **ประโยชน์**: ใช้ตรวจสอบความถูกต้องหลังจากแก้ไขสคริปต์หรือเริ่ม Playtest ทันที

#### 1.7 `get_studio_state`
- **หน้าที่**: ตรวจสอบสถานะการทำงานของ Studio (กำลัง Playtest หรืออยู่ใน Edit mode)
- **พารามิเตอร์**:
  ```json
  {
    "command": "get_studio_state",
    "params": {}
  }
  ```

---

### หมวดที่ 2: การสร้างและแก้ไขสคริปต์ / การรันโค้ด (Scripting & Execution)

#### 2.1 `multi_edit`
- **หน้าที่**: แก้ไขข้อความในสคริปต์แบบหลายจุดใน 1 คำสั่ง หรือสร้างสคริปต์ใหม่
- **พารามิเตอร์แก้ไขสคริปต์เดิม**:
  ```json
  {
    "command": "multi_edit",
    "params": {
      "file_path": "game.ServerScriptService.GameManager",
      "datamodel_type": "Edit",
      "edits": [
        {
          "old_string": "local COOLDOWN = 1.0",
          "new_string": "local COOLDOWN = 0.5"
        }
      ]
    }
  }
  ```
- **พารามิเตอร์สร้างสคริปต์ใหม่**:
  ```json
  {
    "command": "multi_edit",
    "params": {
      "file_path": "game.ServerScriptService.NetworkService",
      "className": "Script",
      "datamodel_type": "Edit",
      "edits": [
        {
          "old_string": "",
          "new_string": "--!strict\nlocal NetworkService = {}\nreturn NetworkService\n"
        }
      ]
    }
  }
  ```
- **กฎเหล็ก**:
  - `datamodel_type` ต้องเป็น `"Edit"` เท่านั้น (ไม่สามารถแก้ไขสคริปต์ขณะเกมกำลัง Play ได้)
  - `old_string` ต้องตรงกับเนื้อหาปัจจุบัน 100% (รวมวรรคและการขึ้นบรรทัดใหม่)

#### 2.2 `execute_luau`
- **หน้าที่**: รันโค้ด Luau สดใน Studio ด้วยระดับสิทธิ์ Plugin/Command Bar
- **รูปแบบการสั่งงาน (บังคับใช้บล็อก ###LUA### เสมอ)**:
  ````markdown
  ```
  ###LUA###
  local part = Instance.new("Part")
  part.Size = Vector3.new(10, 1, 10)
  part.Position = Vector3.new(0, 5, 0)
  part.Anchored = true
  part.Parent = workspace
  return part:GetFullName()
  ###END_LUA###
  ```
  ````
- **กฎเหล็ก**:
  - ใช้ `return` เสมอ (ข้อความจาก `print()` จะไม่ถูกส่งกลับมาในผลลัพธ์คำสั่ง)
  - ห้ามสั่ง `obj:WaitForChild("Name")` โดยไม่มี timeout เด็ดขาด ให้ใช้ `obj:WaitForChild("Name", 5)` เสมอ ป้องกัน Thread ค้าง
  - หากเกมกำลังรัน Play Mode ให้เลือกใช้ `###LUA:Server###` หรือ `###LUA:Client###`

---

### หมวดที่ 3: การสร้างโมเดล 3D และโลกเสมือน (3D AI Generation & World)

#### 3.1 `generate_mesh`
- **หน้าที่**: สร้าง 3D Mesh พร้อมเท็กซ์เจอร์ด้วย AI
- **พารามิเตอร์**:
  ```json
  {
    "command": "generate_mesh",
    "params": {
      "textPrompt": "low poly fantasy glowing sword with blue runes",
      "size": 5,
      "maxTriangles": 4000,
      "segmentation": false
    }
  }
  ```
- **พฤติกรรม**: คำสั่งนี้จะ Yield (รอจนกระทั่งเจนเนอเรตเสร็จแล้ววางลงใน Workspace ให้เอง)

#### 3.2 `generate_procedural_model`
- **หน้าที่**: สร้างโมเดล 3D จากชิ้นส่วนพื้นฐานของ Roblox (Blocks, Spheres, Cylinders, Wedges)
- **พารามิเตอร์**:
  ```json
  {
    "command": "generate_procedural_model",
    "params": {
      "prompt": "medieval stone watchtower with wooden roof and ladder",
      "partNames": ["TowerBase", "Roof", "Ladder"]
    }
  }
  ```
- **พฤติกรรม**: คำสั่งนี้จะไม่ Yield (จะคืน `generationId` ทันทีและสร้างเบื้องหลัง) หากต้องการรอผลลัพธ์ให้เรียก `wait_job_finished`

#### 3.3 `generate_scene`
- **หน้าที่**: สร้างทั้งฉากพร้อมวางตำแหน่งวัตถุต่างๆ ภายใน Bounding Box
- **พารามิเตอร์**:
  ```json
  {
    "command": "generate_scene",
    "params": {
      "textPrompt": "floating sky island with ancient shrine and cherry blossom trees",
      "boundingBoxSize": {"x": 100, "y": 50, "z": 100},
      "boundingBoxPosition": {"x": 0, "y": 25, "z": 0}
    }
  }
  ```

#### 3.4 `generate_material`
- **หน้าที่**: เจนเนอเรต MaterialVariant แบบ PBR
- **พารามิเตอร์**:
  ```json
  {
    "command": "generate_material",
    "params": {
      "materialDescription": "cracked volcanic basalt rock with glowing lava veins",
      "baseMaterial": "Basalt"
    }
  }
  ```

#### 3.5 `generate_texture`
- **หน้าที่**: เปลี่ยนเท็กซ์เจอร์ของโมเดลเดิมที่มีอยู่แล้วด้วย AI
- **พารามิเตอร์**:
  ```json
  {
    "command": "generate_texture",
    "params": {
      "instance_path": "Workspace.SwordMesh",
      "textPrompt": "rusty oxidized iron with blood stains"
    }
  }
  ```
- **คำเตือนสำคัญ**: ทับพื้นผิวของโมเดลเดิมทันที แนะนำให้ Clone สำรองไว้ก่อนเสมอ

#### 3.6 `segment_mesh`
- **หน้าที่**: แยก Mesh ชิ้นเดียวออกเป็นชิ้นส่วนย่อยๆ ตามชื่อ
- **พารามิเตอร์**:
  ```json
  {
    "command": "segment_mesh",
    "params": {
      "instance_path": "Workspace.CharacterMesh",
      "parts": ["Head", "Torso", "LeftArm", "RightArm", "LeftLeg", "RightLeg"]
    }
  }
  ```

#### 3.7 `auto_setup_avatar`
- **หน้าที่**: ติดตั้งโครงกระดูก Motor6D และแปลง Static Model ให้กลายเป็น R15 Avatar พร้อมเคลื่อนไหว
- **พารามิเตอร์**:
  ```json
  {
    "command": "auto_setup_avatar",
    "params": {
      "instance_path": "Workspace.RobotWarrior",
      "setup_type": "R15",
      "r15_plus": true
    }
  }
  ```

---

### หมวดที่ 4: คลังแอสเซทและรูปภาพ (Assets & Store)

#### 4.1 `search_asset`
- **หน้าที่**: ค้นหา Asset ใน Creator Store หรือคลังส่วนตัว
- **พารามิเตอร์**:
  ```json
  {
    "command": "search_asset",
    "params": {
      "query": "sword slash sound effect",
      "assetType": "Audio",
      "maxResults": 10,
      "verifiedCreatorsOnly": true
    }
  }
  ```

#### 4.2 `insert_asset`
- **หน้าที่**: โหลดและแทรก Asset ลงเกมตามรหัสตัวเลข
- **พารามิเตอร์**:
  ```json
  {
    "command": "insert_asset",
    "params": {
      "assetId": 9114223124,
      "parentPath": "Workspace"
    }
  }
  ```

#### 4.3 `store_image` & `upload_image`
- **`store_image`**: อ่านไฟล์จากเครื่องผู้ใช้ (Path บนดิสก์ <= 5MB) แปลงเป็น `IMAGEID_<id>` ใช้เป็นภาพอ้างอิงให้คำสั่งอื่น
- **`upload_image`**: รับ HTTP URL ส่งขึ้นระบบ Roblox CDN เพื่อแปลงเป็น `rbxassetid://...` ใช้ใน Decal/ImageLabel

---

### หมวดที่ 5: การทดสอบและการจำลองอินพุต (Playtest & Simulation)

#### 5.1 `start_stop_play`
- **หน้าที่**: สลับเข้า/ออกจากโหมดจำลองการเล่น (Play Mode)
- **พารามิเตอร์**:
  ```json
  {
    "command": "start_stop_play",
    "params": {
      "is_start": true
    }
  }
  ```

#### 5.2 `user_keyboard_input`
- **หน้าที่**: ส่งสัญญาณคีย์บอร์ดเสมือนจริงให้ตัวละครหรือ GUI
- **พารามิเตอร์**:
  ```json
  {
    "command": "user_keyboard_input",
    "params": {
      "datamodel_type": "Client",
      "actions": [
        {"action": "keyDown", "key_code": "Space"},
        {"action": "wait", "wait_time_ms": 200},
        {"action": "keyUp", "key_code": "Space"}
      ]
    }
  }
  ```
- **ข้อกำหนด**: ชื่อปุ่มต้องใช้ Roblox KeyCode names เช่น `"Space"`, `"Return"`, `"A"`, `"LeftShift"`

#### 5.3 `user_mouse_input`
- **หน้าที่**: ส่งสัญญาณคลิก/เลื่อนเมาส์เสมือนจริง
- **พารามิเตอร์**:
  ```json
  {
    "command": "user_mouse_input",
    "params": {
      "datamodel_type": "Client",
      "actions": [
        {"action": "mouseButtonClick", "mouse_button": "left", "instance_path": "LocalPlayer.PlayerGui.ShopGui.BuyBtn"}
      ]
    }
  }
  ```

#### 5.4 `character_navigation`
- **หน้าที่**: สั่งให้ตัวละครเดินไปยังพิกัดเป้าหมาย
- **พารามิเตอร์**:
  ```json
  {
    "command": "character_navigation",
    "params": {
      "datamodel_type": "Client",
      "x": 25.0,
      "y": 5.0,
      "z": -40.0,
      "speed_multiplier": 1.0
    }
  }
  ```

#### 5.5 `screen_capture`
- **หน้าที่**: จับภาพหน้าจอจากมุมมองที่กำหนด
- **พารามิเตอร์**:
  ```json
  {
    "command": "screen_capture",
    "params": {
      "camera_position": {"x": 0, "y": 30, "z": 50},
      "look_at_position": {"x": 0, "y": 0, "z": 0}
    }
  }
  ```

---

### หมวดที่ 6: ทักษะและตัวช่วยระดับสูง (Skills, Subagents & Utilities)

#### 6.1 `list_skills` & `skill`
- **หน้าที่**: สำรวจและอ่านคู่มือทักษะพิเศษใน Studio
- **พารามิเตอร์**:
  ```json
  {
    "command": "skill",
    "params": {
      "skill_name": "rbx-debug"
    }
  }
  ```

#### 6.2 `subagent`
- **หน้าที่**: สั่งงาน Subagent ให้ทำงานซับซ้อนหลายขั้นตอนอัตโนมัติใน Studio
- **พารามิเตอร์**:
  ```json
  {
    "command": "subagent",
    "params": {
      "subagent_type": "explore",
      "task": "Find all unanchored parts in workspace and anchor them",
      "description": "Anchor audit"
    }
  }
  ```

#### 6.3 `wait_job_finished`
- **หน้าที่**: รอจนกว่าคำสั่งแบบ Asynchronous เบื้องหลังจะเสร็จสิ้น
- **พารามิเตอร์**:
  ```json
  {
    "command": "wait_job_finished",
    "params": {
      "jobId": "gen_88492019",
      "timeout": 300
    }
  }
  ```

---

## 3. สรุปแนวปฏิบัติร่วมกับ 6 ทักษะระดับเทพ (God-Tier Synergy)

1. **Service Architecture**: ใช้ `multi_edit` สร้างสคริปต์แยก Server / Client ชัดเจน วาง Shared Module ไว้ใน `ReplicatedStorage`
2. **Combat & Anti-Exploit**: Server ยิง Raycast ตรวจจับ Hitbox, Client ส่งเพียง Intent ผ่าน RemoteEvent
3. **Parallel Luau**: ใช้ Actor แยกคำนวณ Raycast / AI แล้ว sync กลับ
4. **Data Persistence**: ใช้ ProfileStore ป้องกัน Item Duplication และ Session Locking
5. **Procedural Generation**: ผสมผสาน `generate_procedural_model` กับ Seed-based Perlin Noise
6. **Animations & IK**: โหลดอนิเมชั่นผ่าน `Animator:LoadAnimation()` บน Client และตรวจจับ Hit Frame ด้วย `GetMarkerReachedSignal()`
