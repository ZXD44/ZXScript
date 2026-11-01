# 📋 บันทึกงานค้างและแผนดำเนินการต่อ (Pending Tasks & Handover Specs)

> **โปรเจกต์:** ZXScript - Autonomous Roblox Studio AI Agent Bridge  
> **ผู้พัฒนา:** [ZXD44](https://github.com/ZXD44) (ZirconX)  
> **วันที่บันทึก:** 1 พฤศจิกายน 2026 (00:03 น.)  
> **เวอร์ชันปัจจุบัน:** `0.0.3` | **เป้าหมายเวอร์ชันถัดไป:** `0.0.4`  
> **สถานะระบบปัจจุบัน:** ผ่านการตรวจสุขภาพ 13/13 รายการ (`PASS 100%`)

---

## 🏁 1. สรุปงานที่ทำเสร็จแล้วในเซสชันนี้ (Completed Today)

| ขั้นตอน | ฟีเจอร์ที่สร้างเสร็จ | ไฟล์ที่เกี่ยวข้อง | สถานะการทดสอบ |
| :---: | :--- | :--- | :---: |
| **Step 1** | **Pre-flight Luau Syntax Sanitizer & Validator**<br>- กรองโทเคนแยก String/Comment ป้องกันข้อความเพี้ยน<br>- Auto-fix: `!=` $\rightarrow$ `~=`, `&&` $\rightarrow$ `and`, `||` $\rightarrow$ `or`, `!x` $\rightarrow$ `not x`, `===` $\rightarrow$ `==`, `null` $\rightarrow$ `nil`<br>- ตัด Markdown code fences (`` ```luau ``)<br>- Auto-repair เติม `end` อัตโนมัติหากขาด 1 ตัวท้ายสคริปต์ | [`bridge/luau_sanitizer.py`](../bridge/luau_sanitizer.py)<br>[`bridge/tool_dispatcher.py`](../bridge/tool_dispatcher.py) | `PASS 100%`<br>([`test_luau_sanitizer.py`](../bridge/tests/test_luau_sanitizer.py)) |
| **Step 2** | **Local Script Snapshot & Auto-Backup Engine**<br>- เซฟ Snapshot สำรองลงดิสก์อัตโนมัติเมื่อ AI เขียนโค้ด<br>- โครงสร้าง: `projects/<PlaceName>/backups/<ScriptName>_<Timestamp>.luau`<br>- มีระบบ SHA-256 Deduplication (ไม่เซฟไฟล์ซ้ำหากโค้ดไม่เปลี่ยน)<br>- Rolling retention จำกัด 30 ไฟล์ล่าสุดต่อสคริปต์กันดิสก์เต็ม | [`bridge/script_backup.py`](../bridge/script_backup.py)<br>[`bridge/tool_dispatcher.py`](../bridge/tool_dispatcher.py) | `PASS 100%`<br>([`test_script_backup.py`](../bridge/tests/test_script_backup.py)) |
| **Step 3** | **Health Check Doctor CLI (`doctor.bat`)**<br>- เครื่องมือตรวจสุขภาพระบบ 13 จุดสำคัญ 1 คลิก<br>- เช็ค Python, Registry, Port 17613, Port 13469, StudioMCP, Manifest<br>- รองรับแฟล็ก `--fix` ลงทะเบียนซ่อมแซม Registry อัตโนมัติ<br>- เชื่อมเข้ากับ `start.bat --doctor` และ `doctor.bat` | [`bridge/doctor.py`](../bridge/doctor.py)<br>[`doctor.bat`](../doctor.bat)<br>[`scripts/start.bat`](../scripts/start.bat) | `13/13 Checks Passed` |
| **Core** | **Single Source of Truth (SSOT) Version Manager**<br>- รวมศูนย์เวอร์ชันไว้ที่ `version.json` และ `VERSION`<br>- สคริปต์ซิงค์ 16 ไฟล์ในคำสั่งเดียว (`bump-version.bat`) | [`version.json`](../version.json)<br>[`bump-version.bat`](../bump-version.bat)<br>[`scripts/bump_version.py`](../scripts/bump_version.py) | `16/16 Files Synced` |
| **UI** | **Bilingual README.md & Red Dragon Wings**<br>- README 2 ภาษา (ไทย & อังกฤษ) แบบ Interactive Jump Links<br>- ปีกมังกร Dynamic Island อัตราส่วน $66\times 37\text{px}$ กระพือ 60fps | [`README.md`](../README.md)<br>[`zxscript-extension/styles/overlay.css`](../zxscript-extension/styles/overlay.css) | `Verified 60fps` |

---

## 🎯 2. รายการงานค้างที่จะทำต่อในวันพรุ่งนี้ (Pending Work for Tomorrow)

### 📌 Step 4: แสดง Place Name บน Dynamic Island HUD และระบบเตือนสลับแมป
* **ความสำคัญ:** ป้องกันความผิดพลาดร้ายแรงกรณีผู้ใช้เปิด Roblox Studio หลายหน้าต่าง แล้ว AI รันคำสั่งผิดแมป
* **เป้าหมายทางสถาปัตยกรรม:**
  1. **Bridge ด้านหลัง (`bridge/bridge_server.py` & `studio_watcher.py`):**
     - ส่ง `active_place_name` ไปยัง Browser Extension ผ่าน WebSocket ทุกครั้งที่มีการเชื่อมต่อ หรือเมื่อตรวจพบว่าชื่อ Place มีการเปลี่ยนแปลง
  2. **Extension ด้านหน้า (`zxscript-extension/core/ui-bar.js`):**
     - เพิ่มแท็ก Badge แสดงชื่อแมปปัจจุบันบน Action Bar เช่น:
       ```html
       <div id="zs-place-badge" title="คลิกเพื่อรีเฟรชสถานะ Place">
         <svg class="zs-rbx-icon" ...></svg>
         <span id="zs-place-name">My_Obby_Game</span>
       </div>
       ```
     - ปรับแต่งสไตล์ใน [`zxscript-extension/styles/overlay.css`](../zxscript-extension/styles/overlay.css) ให้กลมกลืนกับ Impeccable Style และมี Tooltip สวยงาม
  3. **ระบบแจ้งเตือนสลับแมป (Place Switch Detector):**
     - หากตรวจพบว่าผู้ใช้เปลี่ยน Place ระหว่างที่เซสชัน AI กำลังทำงานอยู่ ให้เด้ง Toast แจ้งเตือนสีส้มทันที:
       *"ตรวจพบการสลับ Place เป็น [New_Place_Name] - กรุณาตรวจสอบก่อนสั่งงานต่อ"*

---

### 📌 Step 5: รวมกลุ่ม Transaction สำหรับ Undo (1 Prompt Turn = 1 `Ctrl + Z`)
* **ความสำคัญ:** ยกระดับประสบการณ์ผู้ใช้ (UX) ให้กด `Ctrl + Z` ใน Studio เพียงครั้งเดียวเพื่อย้อนกลับงานที่ AI ทำทั้งหมดในเทิร์นนั้น
* **เป้าหมายทางสถาปัตยกรรม:**
  1. **Extension (`zxscript-extension/core/agent.js`):**
     - ส่ง `turn_id` หรือ `prompt_id` พ่วงไปใน payload ของ tool call
  2. **Bridge Dispatcher (`bridge/tool_dispatcher.py`):**
     - สร้าง `RecordingSessionManager` คอยบริหาร session ของ `ChangeHistoryService`
     - คำสั่งแรกของเทิร์น: เรียก `_chs:TryBeginRecording("ZXScript: " .. actionName)`
     - คำสั่งถัดๆ ไปในเทิร์นเดียวกัน: ทำงานภายใต้ Recording เดิม ไม่ต้องปิด/เปิดใหม่
     - เมื่อ AI จบเทิร์น (ส่งผลสรุปงาน หรือ Extension ส่งสัญญาณ Turn Complete): เรียก `FinishRecording(..., Commit)`
     - หากเกิดข้อผิดพลาดรุนแรง: เรียก `FinishRecording(..., Cancel)` อัตโนมัติ

---

### 📌 Step 6 (ตัวเลือกเสริม): Smart Output Compacting & Token Saver
* **ความสำคัญ:** ประหยัด Token และป้องกันแชต AI อืดเมื่อคุยต่อเนื่องหลายชั่วโมง
* **เป้าหมายทางสถาปัตยกรรม:**
  - สรุปย่อผลลัพธ์ของ `execute_luau` ที่เป็นการเซตค่าหรือสร้าง Part ทั่วไป ไม่ต้องพ่นโค้ดยาวกลับเข้าแชต
  - แทนที่ด้วยข้อความกะทัดรัด: `[OK: 48 lines written to StarterPlayerScripts.Controller]`

---

## 🚀 3. คำสั่งลัดสำหรับเริ่มต้นทำงานต่อในวันพรุ่งนี้ (Quick Start Commands)

เมื่อเปิดคอมพิวเตอร์และพร้อมลุยงานต่อ ให้รันคำสั่งเหล่านี้เพื่อตรวจสอบความพร้อม:

```powershell
# 1. ตรวจสุขภาพระบบภาพรวม (ต้องขึ้น 13/13 Checks Passed)
.\doctor.bat

# 2. ตรวจสอบความสอดคล้องของเวอร์ชันทั้ง 16 ไฟล์
.\bump-version.bat --check

# 3. รัน Unit Tests เพื่อยืนยันว่าทุกระบบทำงานปกติ
python bridge/tests/test_luau_sanitizer.py
python bridge/tests/test_script_backup.py
node zxscript-extension/tests/test-action-flow.js
```

---

## 📌 4. สรุปกิ่ง Git ล่าสุด
- **Branch:** `main`
- **Latest Commit:** `208dc05` (`feat(doctor): implement 13-point health check diagnostic tool and 1-click repair CLI`)
- **Remote:** `https://github.com/ZXD44/ZXScript.git` (Push ครบถ้วนแล้ว สะอาด 100%)

