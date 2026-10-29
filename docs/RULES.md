# กฎเหล็กและข้อกำหนดการทำงาน ZXScript (Operational Rules)
> **ผู้พัฒนาและเจ้าของโครงการ:** [zxd44](https://github.com/zxd44) (ZirconX)  
> **เว็บไซต์:** [www.zirconx.xyz](https://www.zirconx.xyz)  
> **อีเมล:** [gonhackergamer0@gmail.com](mailto:gonhackergamer0@gmail.com)  
> **เวอร์ชัน:** `0.0.1` | **สิทธิ์การใช้งาน:** GPL-3.0

เอกสารนี้ระบุกฎเหล็กและข้อกำหนดที่ **AI Agent และนักพัฒนาทุกคนต้องปฏิบัติตามอย่างเคร่งครัด** เมื่อใช้งาน ZXScript ควบคุม Roblox Studio เพื่อความปลอดภัยสูงสุด ประหยัด Token ป้องกันการถูกระงับบัญชี และสร้างโค้ดเกมที่มีคุณภาพระดับ Production

---

## 🛡️ หมวดที่ 1: กฎความปลอดภัยและการป้องกันโดนแบน (Anti-Ban & Safety)

### 1.1 ห้ามส่งคำสั่งแบบเหมารวม (Sub-System Modularity)
- **ข้อห้าม:** ห้ามสั่งให้ AI สร้างเกมทั้งเกมในคำสั่งเดียว (เช่น *"สร้างเกม RPG เต็มระบบให้เสร็จทันที"*) เพราะจะทำให้เกิด Tool-Calling Loop ต่อเนื่อง 20–50 ครั้ง ซึ่งทำให้ติด Rate Limit หรือถูกระบบ AI ป้องกันบ็อตตรวจจับ
- **ข้อปฏิบัติ:** แบ่งงานออกเป็นระบบย่อย (Sub-systems) ทีละ 1 โมดูล เช่น:
  `ระบบข้อมูล DataStore` $\rightarrow$ `ระบบสถิติ Leaderstats` $\rightarrow$ `ระบบ GUI หน้าร้านค้า` $\rightarrow$ `ระบบต่อสู้ Raycast`
- **จำกัด Tool Calls:** อนุญาตให้เรียก Tool ได้ไม่เกิน **3–5 ครั้งต่อ 1 ข้อความ** เมื่อเสร็จแต่ละระบบย่อย AI ต้องหยุดและรายงานผลเพื่อรอคำยืนยันจากผู้ใช้

### 1.2 หน่วงเวลาแบบพฤติกรรมมนุษย์ (Humanized Jitter Delay)
- ตัวขยาย ZXScript มีระบบหน่วงเวลาสุ่ม (`1000ms – 2200ms`) ก่อนส่งข้อมูลกลับเข้าโมเดล เพื่อจำลองการพิมพ์ของมนุษย์ ป้องกันการตรวจจับบ็อตจาก Cloudflare และเว็บ AI ห้ามปิดระบบนี้เด็ดขาด

### 1.3 ป้องกันคำสั่งทำลายล้าง (Destructive Safety Gate)
- **ห้ามเด็ดขาด:** ห้ามรันคำสั่ง `:Destroy()` หรือ `:ClearAllChildren()` กับโฟลเดอร์หลัก, Model ขนาดใหญ่, หรือ Service (`Workspace`, `ServerStorage`) โดยไม่ระบุเป้าหมายอย่างเจาะจง
- หากจำเป็นต้องลบ Instance ใดๆ AI ต้องตรวจสอบเนื้อหาภายในด้วย `inspect_instance` ก่อนเสมอ และต้องแจ้งยืนยันกับผู้ใช้ก่อนดำเนินการ

---

## ⚡ หมวดที่ 2: มาตรฐานวิศวกรรมโค้ด Luau (Modern Luau Engineering)

### 2.1 บังคับใช้ Task Library สมัยใหม่
- **ห้ามใช้ฟังก์ชันเก่าที่ถูกยกเลิก (Deprecated Globals):**
  - ❌ `wait()` $\rightarrow$ บังคับใช้ ✅ `task.wait()`
  - ❌ `spawn()` $\rightarrow$ บังคับใช้ ✅ `task.spawn()`
  - ❌ `delay()` $\rightarrow$ บังคับใช้ ✅ `task.delay()`
  - ❌ `coroutine.resume()` $\rightarrow$ ใช้ ✅ `task.cancel()` / `task.spawn()`
- **ระบบ Raycast:** ❌ ห้ามใช้ `FindPartOnRay` หรือ `FindPartsInRegion3` $\rightarrow$ บังคับใช้ ✅ `workspace:Raycast(origin, direction, raycastParams)`

### 2.2 ป้องกัน Infinite Yield และ Nil Crash
- ทุกครั้งที่อ้างอิง Instance ที่อาจยังโหลดไม่เสร็จ ให้ใช้ `WaitForChild(name, timeout)` โดยกำหนด **Timeout 5 วินาทีเสมอ** (เช่น `parent:WaitForChild("Target", 5)`) เพื่อป้องกันไม่ให้คำสั่งค้างจนหมด Budget เวลา (~20s)
- ใช้ `FindFirstChild` เมื่อต้องการตรวจสอบว่า Instance นั้นมีอยู่จริงหรือไม่ก่อนใช้งาน

### 2.3 การห่อหุ้มข้อผิดพลาด (Pcall Protection)
- งานที่ติดต่อกับ External Services เช่น `DataStoreService`, `HttpService`, `MarketplaceService` ต้องครอบด้วย `pcall()` หรือ `xpcall()` เสมอ

---

## 🏗️ หมวดที่ 3: สถาปัตยกรรมและ Explorer Tree (Zero Guessing Policy)

### 3.1 ห้ามเดา Path ของ Explorer เด็ดขาด
- ก่อนแก้ไขหรือเขียนสคริปต์ AI **ต้องใช้ `search_game_tree` หรือ `inspect_instance`** สำรวจโครงสร้างจริงใน `Workspace`, `ServerScriptService`, `ReplicatedStorage` เสมอ ห้ามคาดเดาชื่อโฟลเดอร์หรือตำแหน่ง Instance จากความทรงจำ

### 3.2 กฎสร้างวัตถุก่อนเขียนสคริปต์ (Hierarchy First)
1. **สร้าง Instance ก่อน:** ใช้ `execute_luau` หรือ `generate_procedural_model` สร้าง Part, Model หรือ ScreenGui ในตำแหน่งที่ถูกต้อง
2. **สร้างสคริปต์เชื่อมต่อ:** ใช้ `multi_edit` สร้าง Script หรือ LocalScript ที่เชื่อมต่อไปยัง Instance เหล่านั้นผ่าน `WaitForChild`

### 3.3 สถาปัตยกรรมแยกส่วน Client / Server (Rojo & Sync Standard)
- **ServerScriptService:** เก็บเฉพาะ Server Script (จัดการ Data, Validate Damage, Purchase Verification)
- **ReplicatedStorage:** เก็บ RemoteEvents, RemoteFunctions, และ Shared Modules ที่ทั้งสองฝั่งต้องอ่าน
- **StarterPlayerScripts / StarterGui:** เก็บเฉพาะ LocalScript สำหรับควบคุม UI, แอนิเมชัน และส่ง Request ไปยัง Server

---

## ⚙️ หมวดที่ 4: การรันคำสั่ง execute_luau และ multi_edit

### 4.1 รูปแบบโค้ด execute_luau (ห้ามใช้ JSON String)
- โค้ด Luau ต้องเขียนอยู่ภายใน Fenced Block พร้อม Tag `###LUA###` เท่านั้น เพื่อหลีกเลี่ยงการ Escape เครื่องหมายคำพูด:
  ````luau
  ###LUA###
  local part = Instance.new("Part")
  part.Size = Vector3.new(4, 1, 4)
  part.Anchored = true
  part.Parent = workspace
  return part.Name
  ###END_LUA###
  ````
- โหมด Play Test: ใช้ `###LUA:Server###` หรือ `###LUA:Client###`
- ข้อมูลส่งออก: ต้องใช้คำสั่ง `return` เท่านั้น (`print()` จะไม่ถูกบันทึกใน Output ของ Tool)

### 4.2 ระบบย้อนกลับ Studio Undo (Ctrl + Z)
- ทุกคำสั่ง `execute_luau` ในโหมด Edit จะถูกบันทึกลง `ChangeHistoryService` ภายใต้ชื่อ `"ZXScript Action"` หากสคริปต์เกิดข้อผิดพลาด ระบบจะถอยกลับ (Cancel Recording) ทันที ผู้ใช้สามารถกด `Ctrl + Z` ใน Studio เพื่อเลิกทำได้ตลอดเวลา

### 4.3 กฎการแก้ไขไฟล์ด้วย multi_edit
- `old_string` ต้องตรงกับเนื้อหาปัจจุบันแบบ Byte-for-byte (รวมการเว้นวรรคและการเคาะแท็บ)
- ก่อนสั่ง `multi_edit` ให้ใช้ `script_read` อ่านโค้ดเวอร์ชันล่าสุดเสมอ ห้ามพิมพ์เดาเอง

---

## 🔄 หมวดที่ 5: Autonomous Console Auto-Debug & Backups

### 5.1 ตรวจสอบ Console ทันทีหลังเพิ่มโค้ด
- เมื่อสร้างหรือแก้ไขสคริปต์เสร็จแล้ว หากเป็นไปได้ให้ AI เรียก `get_console_output` เพื่อตรวจสอบว่ามี Runtime Error หรือ Warning หรือไม่
- หากพบ Error ให้ AI วิเคราะห์ Stack Trace และแก้ไขโค้ดให้ถูกต้องด้วยตนเองทันที โดยไม่ต้องรอให้ผู้ใช้ต้องก๊อปปี้ Error มาแจ้ง

### 5.2 ระบบสำรองโค้ดสำคัญ (Auto-Backups)
- เมื่อทำการปรับปรุงโครงสร้างโค้ดขนาดใหญ่ (Refactoring) หรือเปลี่ยนแปลงระบบหลัก ให้บันทึกโค้ดเดิมไว้ที่:
  `game.ServerStorage.ZXScript.Backups` เพื่อความปลอดภัยสูงสุด

---

## 🧠 หมวดที่ 6: Project Memory (ความทรงจำถาวรข้าม Session)

- สถาปัตยกรรมเกม, ข้อตกลงการตั้งชื่อ (Conventions), ข้อมูลสำคัญเกี่ยวกับระบบ ให้บันทึกไว้ใน:
  `game.ServerStorage.ZXScript.Memory` (ModuleScript)
- เมื่อเริ่มการสนทนาใหม่ หรือแชทถูกรีเซ็ต ให้ AI อ่านไฟล์ Memory นี้ก่อนเริ่มงานเสมอ เพื่อให้การพัฒนาดำเนินต่อไปได้อย่างไร้รอยต่อ

---

## ⚡ หมวดที่ 7: กฎโหมดถ้ำ Caveman Mode (Token Efficiency)

- **Zero Fluff:** ห้ามใช้คำทักทาย, คำเกริ่นนำ, หรือข้อความปิดท้ายที่เยิ่นเย้อ (งด *"ยินดีที่ได้ช่วยเหลือครับ"*, *"รอสักครู่ผมจะตรวจสอบให้"*)
- **Direct & Action-First:** รายงานผลลัพธ์สั้น กระชับ แม่นยำ ดำเนินการผ่าน Tool ทันที
- **100% Code Quality:** ไม่ตัดทอนความสมบูรณ์ของโค้ด โค้ดที่สร้างต้องพร้อมทำงานบน Studio ทันที
