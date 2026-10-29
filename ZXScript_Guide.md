# คู่มือการใช้งาน ZXScript ฉบับสมบูรณ์ (โดย zxd44 / ZirconX)
*Roblox Studio AI Agent Bridge with Native Bloxstrap & Studio MCP Support*

---

## 1. ข้อมูลระบบและการปรับแต่ง (zxd44 Custom Edition)

- **ชื่อโปรเจกต์:** **ZXScript**
- **ผู้พัฒนา/เจ้าของ:** **zxd44** (ชื่อเล่น: **ZirconX**)
- **GitHub:** [https://github.com/zxd44](https://github.com/zxd44)
- **อีเมล:** `gonhackergamer0@gmail.com`
- **โฟลเดอร์โปรเจกต์:** `C:\Users\ZirconX\Documents\New folder`
- **โฟลเดอร์ Browser Extension:** `C:\Users\ZirconX\Documents\New folder\zxscript-extension`
- **ฟีเจอร์สำคัญที่ปรับแต่งเพิ่ม:**
  - รองรับ **Bloxstrap** (`AppData\Local\Bloxstrap\Versions`) อัตโนมัติ ไม่ติดปัญหา `no StudioMCP.exe found`
  - ทำการแพตช์ไฟล์ [`launch_studio_mcp.py`](file:///C:/Users/ZirconX/Documents/New%20folder/launch_studio_mcp.py) ให้ค้นหาผ่าน `mcp.bat` และเวอร์ชันของ Bloxstrap ครบถ้วน (28 Tools Advertised)
  - ปรับระบบ UI Extension และ Bridge แสดงแบรนด์ **ZXScript - by ZXD44**

---

## 2. ขั้นตอนการเริ่มใช้งาน (4 ขั้นตอน)

### ขั้นตอนที่ 1: ติดตั้ง Extension ลงใน Chrome / Edge
1. เปิดเบราว์เซอร์ **Google Chrome** หรือ **Microsoft Edge**
2. ไปที่ URL:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. เปิดสวิตช์ **Developer mode (โหมดนักพัฒนา)** ที่มุมขวาบน
4. กดปุ่ม **Load unpacked (โหลดส่วนขยายที่คลายการบีบอัดแล้ว)**
5. เลือกโฟลเดอร์:
   ```text
   C:\Users\ZirconX\Documents\New folder\zxscript-extension
   ```

### ขั้นตอนที่ 2: เปิดแมพใน Roblox Studio & เปิดใช้งาน MCP
1. เปิดโปรแกรม **Roblox Studio** และเปิด Place ที่ต้องการสร้างเกม
2. เมนูด้านบน กดปุ่ม **Assistant AI**
3. ที่มุมขวาบนของหน้าต่าง Assistant กดปุ่ม **`...` (จุดสามจุด)**
4. เลือกเมนู **Manage MCP Servers**
5. ติ๊กเปิด **Enable Studio as MCP Server** (เปิดแมพค้างไว้ ห้ามปิด)

### ขั้นตอนที่ 3: รัน Bridge Server
1. ดับเบิลคลิกไฟล์ [`start.bat`](file:///C:/Users/ZirconX/Documents/New%20folder/start.bat)
2. สังเกตหน้าต่างสีดำจะแสดงสถานะ:
   - `=== ZXScript Bridge - by ZXD44 ===`
   - `[roblox] MCP server up (28 tools advertised)`
   - `listening on ws://127.0.0.1:17613`
3. **เปิดหน้าต่างสีดำนี้ย่อทิ้งไว้ตลอดการสั่งงาน AI**

### ขั้นตอนที่ 4: เชื่อมต่อหน้าเว็บ AI และเริ่มทำงาน
1. เข้าเว็บ AI ที่ต้องการ เช่น `chat.deepseek.com` (แนะนำที่สุด), `chat.qwen.ai`, `chatgpt.com`
2. ดูแถบ **ZXScript Bar** เหนือกล่องพิมพ์ข้อความ:
   - 🟢 **สีเขียว:** ระบบพร้อมทำงาน 100%
   - 🟡 **สีเหลือง:** Bridge รันแล้ว แต่ยังไม่เปิดแมพใน Studio หรือยังไม่เปิด MCP
   - ⚪ **สีเทา:** ยังไม่ได้รัน `start.bat`
3. เมื่อจุดเป็น **สีเขียว** ให้กด **Start session** บนแถบ ZXScript

---

## 3. วิธีแก้ไขปัญหาที่พบบ่อย (Troubleshooting & Workarounds)

| ปัญหาที่พบ | สาเหตุ | วิธีแก้ไขแบบได้ผลจริง |
|---|---|---|
| **1. บัญชี DeepSeek / AI โดนระงับ (Ban / Rate Limit)** | สคริปต์ส่งผลลัพธ์กลับถี่เกินไปจนระบบคิดว่าเป็นบอทสแปม | 1. **ใช้บัญชีสำรอง (Burner Account)**<br>2. **ห้ามสั่งงานใหญ่ในพรอมต์เดียว** ให้แบ่งงานเป็นระบบย่อย (Sub-system)<br>3. สลับไปใช้ **Qwen (`chat.qwen.ai`)** หรือ **GLM (`chat.z.ai`)** |
| **2. AI เลิกใช้คำสั่ง ตอบเป็นโค้ดธรรมดาในแชท** | คอนเท็กซ์แชทยาวเกินไปจนโมเดลลืม System Prompt | 1. กด **New Chat** แล้วกด **Start session** ใหม่ (โค้ดใน Studio ยังอยู่ครบ)<br>2. วาง **"Prompt ดึงสติ AI"** (ชุดที่ 4 ด้านล่าง) |
| **3. แถบปุ่ม ZXScript ไม่ขึ้น** | เว็บเปลี่ยนโครงสร้าง หรือติดปลั๊กอิน AdBlock / ตัวแปลภาษา | 1. ปิดฟังก์ชันแปลภาษาอัตโนมัติในหน้าเว็บ AI<br>2. หากใช้ Gemini ติด Error `manifest.json blocked` ให้เปิดสิทธิ์ *Allow in Incognito* แล้วใช้งานในโหมดไม่ระบุตัวตน<br>3. กด `Ctrl + F5` รีเฟรชหน้าเว็บ |
| **4. ไฟสถานะค้างสีเหลือง ไม่เขียว** | มีโปรเซส `StudioMCP.exe` เก่าค้างอยู่ หรือยังไม่โหลดแมพ | 1. ปิดหน้าต่าง `start.bat` และปิด Roblox Studio<br>2. เปิด Roblox Studio เข้าแมพให้เรียบร้อยก่อน แล้วค่อยรัน `start.bat` |

---

## 4. เทมเพลต Prompt สั่งงาน AI แบบ Step-by-Step (พร้อมใช้)

### ชุดที่ 1: Prompt เริ่มต้นโปรเจกต์ใหม่ (วางหลังกด Start Session)
```text
คุณคือ Senior Roblox Luau Developer ที่ควบคุม Roblox Studio ผ่านเครื่องมือ MCP ของ ZXScript
ในการทำงานทุกครั้ง ให้ทำตามกฎเหล็ก 4 ข้อนี้:
1. ห้ามเดาโครงสร้างเกมเด็ดขาด: ก่อนสร้างหรือแก้ไขอะไร ให้ใช้เครื่องมือตรวจสอบโครงสร้าง (Game Tree / Explorer) ใน Workspace, ServerScriptService, และ ReplicatedStorage ก่อนเสมอ
2. ทำงานทีละ Step ย่อย (ไม่เกิน 3-5 tool calls ต่อรอบ): เมื่อทำเสร็จ 1 ระบบย่อย ให้สรุปผลแล้วหยุดรอคำสั่งถัดไปจากฉัน เพื่อป้องกันระบบค้าง
3. เขียนโค้ด Luau สมัยใหม่: ใช้ task.wait(), task.spawn(), และเช็ก nil (FindFirstChild / WaitForChild) ทุกครั้งเพื่อป้องกันสคริปต์พัง
4. บันทึกความจำโปรเจกต์: เมื่อสร้างระบบหลักเสร็จ ให้บันทึกโครงสร้างสำคัญไว้ใน Project Memory เสมอ

งานแรกของคุณ (Step 1):
ช่วยตรวจสอบโครงสร้างแมพปัจจุบันของฉันว่ามีโฟลเดอร์หรือสคริปต์อะไรอยู่บ้าง แล้วเตรียมสร้างโครงสร้างโฟลเดอร์มาตรฐานใน ServerScriptService, ReplicatedStorage และ StarterGui สำหรับเกมแนว [ใส่แนวเกมของคุณ เช่น Simulator / Obby / Tycoon] จากนั้นหยุดรอคำสั่งต่อไป
```

---

### ชุดที่ 2: Prompt สั่งสร้างระบบเกมทีละส่วน (Step-by-Step Feature Prompt)
```text
ตอนนี้เราจะทำระบบ [ระบุชื่อระบบ เช่น ระบบเก็บเหรียญเพิ่มแต้มใน Leaderstats / ระบบดาบฟันมอนสเตอร์]
ให้ทำตามลำดับ Step-by-Step ดังนี้:
Step 1: ตรวจสอบใน ServerScriptService และ ReplicatedStorage ก่อนว่ามีสคริปต์หรือ RemoteEvent ที่เกี่ยวข้องอยู่แล้วหรือไม่
Step 2: สร้าง Object หรือ Part ที่จำเป็นใน Workspace / ReplicatedStorage พร้อมตั้งค่า Properties ให้เรียบร้อย
Step 3: เขียนหรือแก้ไข Script เพื่อควบคุมการทำงาน โดยใส่ print() สำหรับ Debug ไว้ในจุดสำคัญ
Step 4: ทดสอบรันหรือเช็กว่าไม่มี Syntax Error แล้วแจ้งฉันว่าสร้างไฟล์อะไรไว้ที่ไหนบ้าง จากนั้นหยุดรอฉันทดสอบ
```

---

### ชุดที่ 3: Prompt สั่งให้ AI ตรวจสอบและแก้บั๊กเอง (Auto-Debug Prompt)
```text
ระบบ [ระบุชื่อระบบที่มีปัญหา] ยังทำงานไม่ถูกต้อง (อาการคือ: [อธิบายอาการสั้นๆ เช่น กดปุ่มแล้วไม่มีอะไรเกิดขึ้น / เหรียญไม่บวก])
ช่วยทำการ Debug ตามขั้นตอนนี้:
1. ใช้เครื่องมืออ่านโค้ดในสคริปต์ที่เกี่ยวข้องทั้งหมดเพื่อหาจุดที่อ้างอิง Path ผิด หรือสะกดชื่อตัวแปรไม่ตรงกัน
2. ตรวจสอบโครงสร้าง Instance จริงใน Explorer ว่าชื่อตรงกับในโค้ดหรือไม่
3. แก้ไขโค้ดให้ถูกต้องและเพิ่มการดักจับ Error (pcall หรือ warn) จากนั้นสรุปสาเหตุของบั๊กและสิ่งที่เพิ่งแก้ไขให้ฉันทราบ
```

---

### ชุดที่ 4: Prompt ดึงสติ AI (เมื่อ AI ตอบแต่ข้อความธรรมดา)
```text
หยุดก่อน! คุณกำลังตอบเป็นข้อความธรรมดาโดยไม่ใช้เครื่องมือของ ZXScript
คุณมีสิทธิ์เข้าถึง Roblox Studio ของฉันโดยตรงผ่านคำสั่ง MCP Tools กรุณาอย่าพิมพ์โค้ดให้ฉันก๊อปปี้ไปวางเอง ให้เรียกใช้คำสั่งเครื่องมือ (Tool Call) เพื่อสร้างและแก้ไข Script ลงใน Roblox Studio โดยตรงเดี๋ยวนี้
```
