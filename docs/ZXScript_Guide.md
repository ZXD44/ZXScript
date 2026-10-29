# คู่มือการใช้งาน ZXScript ฉบับสมบูรณ์ (โดย zxd44 / ZirconX)
> **ผู้พัฒนาและเจ้าของโครงการ:** [zxd44](https://github.com/zxd44) (ZirconX)  
> **เว็บไซต์:** [www.zirconx.xyz](https://www.zirconx.xyz)  
> **คลังโค้ดทางการ:** [https://github.com/zxd44/ZXScript](https://github.com/zxd44/ZXScript)  
> **อีเมล:** [gonhackergamer0@gmail.com](mailto:gonhackergamer0@gmail.com)  
> **เวอร์ชัน:** `0.0.1` | **สิทธิ์การใช้งาน:** GPL-3.0

---

## 1. จุดเด่นและระบบความปลอดภัยใน ZXScript
1. **Studio Ctrl + Z Undo:** ทุกคำสั่งที่ AI สั่งรันใน Studio จะถูกครอบด้วย `ChangeHistoryService` คุณสามารถกด `Ctrl + Z` ใน Studio เพื่อเลิกทำได้ตลอดเวลา หากสคริปต์พัง ระบบจะยกเลิกการเปลี่ยนแปลงให้อัตโนมัติ
2. **ระบบป้องกันแบน (Anti-Ban Jitter):** หน่วงเวลาสุ่ม `1000 - 2200ms` เลียนแบบการพิมพ์ของมนุษย์ ปลอดภัยจากการตรวจจับของ Cloudflare และเว็บ AI
3. **Smart Game Tree Pruning:** ตัด Service ภายในที่ไม่จำเป็น (`CorePackages`, `CoreGui` ฯลฯ) ช่วยประหยัด Token สูงถึง 60–80%
4. **Auto-Luau Modernizer:** เปลี่ยนคำสั่งเก่า (`wait`, `spawn`, `delay`) เป็น `task.wait`, `task.spawn`, `task.delay` ให้อัตโนมัติที่ตัว Bridge
5. **Auto-Debug Console Loop:** AI สามารถตรวจจับ Error ผ่าน `get_console_output` และซ่อมแซมตัวเองได้โดยที่คุณไม่ต้องก๊อปปี้ Error มาวาง
6. **Bloxstrap & Vanilla Auto-Discovery:** ตรวจจับโฟลเดอร์ Roblox และ Bloxstrap อัตโนมัติ โหลดเครื่องมือครบ 31 รายการ

---

## 2. ขั้นตอนการเริ่มใช้งาน (3 ขั้นตอนง่ายๆ)

### ขั้นตอนที่ 1: ติดตั้ง Extension ลงบนเบราว์เซอร์
1. เปิด **Google Chrome** หรือ **Microsoft Edge**
2. ไปที่หน้าจัดการส่วนขยาย:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. เปิดสวิตช์ **Developer mode (โหมดนักพัฒนา)** ที่มุมขวาบน
4. กดปุ่ม **Load unpacked (โหลดส่วนขยายที่แยกไฟล์แล้ว)**
5. เลือกโฟลเดอร์ `zxscript-extension` ภายในโปรเจกต์นี้

### ขั้นตอนที่ 2: เปิด Roblox Studio และเปิดใช้งาน MCP Server
1. เปิด **Roblox Studio** และโหลดเข้าแมพของคุณ (ต้องเปิด Place ค้างไว้)
2. แถบเมนูด้านบน กดปุ่ม **Assistant AI**
3. มุมขวาบนของหน้าต่าง Assistant กดปุ่ม **`...` (จุดสามจุด)** $\rightarrow$ **Manage MCP Servers**
4. ติ๊กเปิด **Enable Studio as MCP Server**

### ขั้นตอนที่ 3: เปิด Bridge Server (เลือกได้ 2 วิธี)
- **วิธีที่ A (เปิดจาก Extension Popup ได้เลย):**
  - คลิกไอคอน **ZXScript** ที่แถบส่วนขยายของเบราว์เซอร์
  - กดปุ่ม **"เริ่มการทำงาน Bridge"** (หรือติ๊ก "เริ่มทำงานอัตโนมัติเมื่อเปิดเครื่อง")
- **วิธีที่ B (เปิดผ่านไฟล์ Batch):**
  - ดับเบิลคลิกไฟล์ [`scripts/start.bat`](file:///C:/Users/ZirconX/Documents/New%20folder/scripts/start.bat)
  - หน้าต่างจะแสดงข้อความสีฟ้า: `[roblox] MCP server up (31 tools advertised)` ให้ย่อหน้าต่างทิ้งไว้

---

## 3. วิธีการสั่งงาน AI บนหน้าเว็บ (Workflow แนะนำ)

1. เข้าเว็บ AI: แนะนำ **[chat.deepseek.com](https://chat.deepseek.com/)** (หรือ ChatGPT, Gemini, Qwen)
2. สังเกตแถบ **ZXScript Bar** สีดำเหนือกล่องพิมพ์ข้อความ:
   - 🟢 **จุดสีเขียว:** ระบบเชื่อมต่อสมบูรณ์ (Bridge ออนไลน์ + Studio เปิดแมพพร้อม)
   - 🟡 **จุดสีเหลือง:** Bridge เปิดอยู่ แต่ยังไม่ได้เปิดแมพใน Studio หรือยังไม่เปิด MCP
   - ⚪ **จุดสีเทา:** Bridge ยังไม่ทำงาน
3. เมื่อขึ้นจุด **สีเขียว** ให้กดปุ่ม **Start session** บนแถบ ZXScript
4. ระบบจะส่ง Prompt ทักทายและเตรียมความพร้อมของ 31 เครื่องมือ จากนั้นคุณเริ่มสั่งงานได้ทันที!

---

## 4. เทคนิคและกฎเหล็กการสั่งงาน (เพื่อให้ได้ผลลัพธ์ 100%)

### กฎข้อที่ 1: สั่งทีละ 1 ระบบย่อย (ห้ามสั่งงานเหมารวมทั้งเกม)
- ❌ **อย่าสั่ง:** *"สร้างเกม Blox Fruits ให้เสร็จทั้งแมพ"* (AI จะ Loop รันเครื่องมือจนหลุดหรือเอ๋อ)
- ✅ **ให้สั่ง:** *"สร้างระบบ Leaderstats เก็บเงินและเลเวลก่อน เมื่อเสร็จแล้วให้หยุดรอฉัน"*

### กฎข้อที่ 2: ให้ AI สำรวจแมพก่อนสร้างเสมอ
- บอก AI เสมอว่า: *"ใช้ search_game_tree ตรวจสอบโครงสร้างใน Workspace และ ServerScriptService ก่อนสร้าง"* (AI จะไม่เดา Path มั่ว)

### กฎข้อที่ 3: การใช้ปุ่มลัดใน Popup
- คลิกไอคอน ZXScript $\rightarrow$ เลือกแท็บ **"คำสั่งระบบ"**:
  - กดปุ่ม **`[กฎเหล็ก 5 ข้อ]`** เพื่อสั่งให้ AI ทำตามมาตรฐานความปลอดภัย
  - กดปุ่ม **`[โหมด Caveman]`** เพื่อประหยัด Token และให้ AI ตอบกระชับที่สุด
  - เลือก **Dropdown 1-Click Templates** (เช่น ProfileStore, Inventory, Raycast Combat, NPC AI) แล้วกดบันทึก

---

## 5. ตัวอย่าง Prompt สำเร็จรูป (ก๊อปปี้ไปวางได้ทันที)

### เทมเพลตที่ 1: เริ่มต้นโปรเจกต์ใหม่และสำรวจแมพ
```text
คุณคือ Senior Roblox Luau Developer ที่ควบคุม Roblox Studio ผ่านเครื่องมือ MCP ของ ZXScript
ให้ปฏิบัติตามกฎเหล็ก:
1. สำรวจโครงสร้าง Workspace และ ServerScriptService ด้วย search_game_tree ก่อนลงมือ ห้ามเดา Path
2. จำกัดรอบการทำงานไม่เกิน 3-5 เครื่องมือต่อ 1 ข้อความ เมื่อเสร็จระบบย่อยให้สรุปและหยุดรอคำสั่งถัดไป
3. ใช้ Modern Luau (task.wait, task.spawn) และ WaitForChild ที่มี timeout 5 วินาทีเสมอ

ภารกิจแรก: ตรวจสอบแมพปัจจุบัน แล้วจัดโครงสร้างโฟลเดอร์มาตรฐานใน ServerScriptService และ ReplicatedStorage
```

### เทมเพลตที่ 2: สร้างระบบ Leaderstats และเหรียญบนแมพ
```text
สร้างระบบ Leaderstats และระบบเก็บเหรียญบนแมพ:
1. สร้าง Script ใน ServerScriptService จัดการ PlayerAdded เพื่อเพิ่มโฟลเดอร์ leaderstats พร้อมค่า Coins (IntConst) และ Level
2. สร้าง Part เหรียญสีทองทรงกระบอก (Cylinder) ใน Workspace ลอยเหนือพื้นเล็กน้อย มีเอฟเฟกต์หมุนเบาๆ
3. เขียนระบบ Touched พร้อม debounce เพื่อเพิ่มเหรียญให้ผู้เล่น +10 แล้วทำลายเหรียญหรือซ่อนไว้ 5 วินาทีก่อนเกิดใหม่
4. เมื่อสร้างเสร็จให้สรุปผลและหยุดรอคำสั่ง
```

### เทมเพลตที่ 3: บันทึกความจำลงโปรเจกต์ (Project Memory)
```text
โปรดสรุปโครงสร้างของเกมทั้งหมดที่เราสร้างในวันนี้ แล้วบันทึกลงใน ModuleScript ที่ game.ServerStorage.ZXScript.Memory เพื่อให้ AI ในแชทถัดไปสามารถอ่านและพัฒนาเกมต่อได้อย่างถูกต้อง
```

---

## 6. การแก้ปัญหาที่พบบ่อย (Troubleshooting)

| ปัญหา | สาเหตุ | วิธีแก้ไข |
|---|---|---|
| **แถบสถานะขึ้นสีเหลือง** | ยังไม่ได้เปิดแมพใน Roblox Studio | เปิด Place ใน Studio และตรวจสอบว่าได้ติ๊ก `Enable Studio as MCP Server` ใน Assistant แล้ว |
| **แถบ ZXScript ไม่แสดงบนเว็บ AI** | ส่วนขยายยังไม่ถูกเปิด หรือติด AdBlock | ตรวจสอบว่าใน `chrome://extensions` ได้เปิด Extension ไว้ และกดรีเฟรชหน้าเว็บ AI (`F5`) |
| **อยากย้อนกลับสิ่งที่ AI ทำ** | AI วางของหรือแก้โค้ดผิด | สลับไปที่ Roblox Studio แล้วกดแป้นพิมพ์ `Ctrl + Z` เพื่อ Undo ได้ทันที |
| **โค้ดมี Error ใน Studio** | AI อาจเขียนตัวแปรผิด | สั่ง AI ในแชทว่า: *"รัน get_console_output ตรวจดู Error ใน Console แล้วแก้ไขโค้ดให้ถูกต้อง"* |
