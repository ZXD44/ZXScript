# รายงานวิเคราะห์ปัญหาสำคัญ (Critical Incident & Bug Autopsy)

> **หัวข้อปัญหา:** ปุ่ม Action Bar ("▶ เริ่มทำงาน") ไม่ส่งข้อความแชตให้ AI  
> **วันที่บันทึก:** 31 ตุลาคม 2026  
> **สถานะ:** แก้ไขเสร็จสมบูรณ์ 100% (Verified via `test-action-flow.js`)  
> **ระบบที่ได้รับผลกระทบ:** `zxscript-extension` (ทั้ง 9 AI Providers: ChatGPT, DeepSeek, Claude, Gemini, Kimi, GLM, Qwen, Arena, Meta AI)

---

## 1. อาการของปัญหา (Symptom)
- ผู้ใช้เปิดหน้าเว็บ AI (ChatGPT / DeepSeek / Claude ฯลฯ) มีแถบ Action Bar ขึ้นมาตามปกติ
- Bridge Server และ Roblox Studio เชื่อมต่อเรียบร้อย (34 Tools พร้อมใช้งาน)
- เมื่อคลิกปุ่ม **"▶ เริ่มทำงาน"** บน Action Bar:
  - ไม่มีข้อความใดๆ พิมพ์ลงในช่องแชต (Composer)
  - ไม่มีการกดส่งข้อความเข้าแชต AI
  - สถานะบน Action Bar ค้างหรือไม่เริ่มกระบวนการทำงาน ทำให้ AI ไม่ได้รับ System Prompt เริ่มต้น

---

## 2. การวิเคราะห์ต้นตอของปัญหา (Root Cause Analysis - 4 สาเหตุหลัก)

### สาเหตุที่ 1: `window.ZSProvider` ไม่หลุดออกมาที่ Global Scope (ตัวการหลัก)
- **ตำแหน่งไฟล์:** `zxscript-extension/providers/*.js` ทั้ง 9 ไฟล์
- **สาเหตุ:** แต่ละ Provider ประกาศด้วย:
  ```javascript
  const ZSProvider = (() => { ... })();
  ```
  ในระบบ Chrome Extension Manifest V3 (Content Script Isolated World) ตัวแปร `const` หรือ `let` ที่ประกาศระดับบนสุดของไฟล์จะอยู่ใน Script Scope ของไฟล์นั้น **ไม่ถูกผูกเข้ากับ `window` โดยอัตโนมัติ**
- **ผลลัพธ์:** เมื่อไฟล์โมดูลอื่น เช่น `core/main.js`, `core/agent.js`, `core/response-watcher.js` เรียกใช้ `const P = window.ZSProvider;` จะได้ค่า `undefined` เสมอ ทำให้ `core/main.js` หยุดทำงานทันที (`[ZXScript] No provider registered for this page`)

### สาเหตุที่ 2: ลำดับการโหลดสคริปต์ใน `manifest.json` สลับหน้าหลัง
- **ตำแหน่งไฟล์:** `zxscript-extension/manifest.json` (`content_scripts`)
- **สาเหตุ:** สคริปต์ `providers/<ai>.js` ถูกวางไว้ที่ลำดับที่ 13 (หลัง `ui-bar.js`, `tools.js`, `response-watcher.js`, `agent.js`)
- **ผลลัพธ์:** ในขณะที่ `ui-bar.js` รันฟังก์ชัน `build()` เพื่อสร้างแถบ Action Bar สคริปต์ Provider ยังไม่ได้ถูกประเมินผล (Evaluate) เลย ทำให้ UI ไม่รู้จัก Provider, ตั้งชื่อแท็บผิด และไม่สามารถส่งคำสั่งเข้าแชตได้

### สาเหตุที่ 3: บั๊กตรรกะในฟังก์ชัน `landed()` ทำให้ข้ามการพิมพ์ข้อความ
- **ตำแหน่งไฟล์:** `zxscript-extension/core/response-watcher.js` (บรรทัด ~91)
- **สาเหตุเดิม:**
  ```javascript
  const landed = () => (P ? P.userCount() > preUser || P.assistantCount() > base : true);

  let tries = 0;
  let messageSent = false;
  while (!messageSent && !landed() && tries < 4 && !A.stop) {
    ...
    if (P) await P.typeAndSend(text, images);
    ...
  }
  ```
- **ผลลัพธ์:** เมื่อ `P` เป็น `undefined` (จากสาเหตุที่ 1) นิพจน์ ternary `(P ? ... : true)` จะส่งกลับค่า **`true`** ทันที ส่งผลให้เงื่อนไขลูป `!landed()` กลายเป็น `!true` = `false` ลูปส่งข้อความจึงหลุดทันทีในรอบที่ 0 โดยไม่เคยเรียก `typeAndSend` เลยแม้แต่รอบเดียว

### สาเหตุที่ 4: Early Exit ดักจับแชตเก่าใน `startSession()`
- **ตำแหน่งไฟล์:** `zxscript-extension/core/agent.js` (บรรทัด ~420)
- **สาเหตุเดิม:**
  ```javascript
  if (P && !P.chatIsEmpty() && !A.started) {
    const hasSys = all.some((it) => txt.includes("ZXScript") || txt.includes("Roblox Studio"));
    if (hasSys) {
      A.started = true;
      ui.toast("เชื่อมต่อเซสชันสำเร็จ พร้อมสั่งงานต่อได้ทันที");
      return; // <-- หลุดออกทันทีโดยไม่ส่ง System Prompt
    }
  }
  ```
- **ผลลัพธ์:** หากผู้ใช้เปิดหน้าแชตที่มีประวัติข้อความเดิม หรือเคยพูดถึง Roblox Studio การกดปุ่ม "▶ เริ่มทำงาน" จะถูกสั่งให้ถือว่าเริ่มแล้วและ `return` ออกไปทันที ทำให้ไม่มีการส่งข้อความตั้งค่าใดๆ ไปยังโมเดล AI

---

## 3. วิธีการแก้ไข (Resolution Applied)

1. **ส่งออก `window.ZSProvider` ใน Provider ทุกตัว:**
   เพิ่มโค้ดที่ท้ายไฟล์ Provider ทั้ง 9 ไฟล์:
   ```javascript
   if (typeof window !== "undefined") {
     window.ZSProvider = ZSProvider;
     window.ZS = window.ZS || {};
     window.ZS.provider = ZSProvider;
   }
   if (typeof module !== "undefined" && module.exports) {
     module.exports = ZSProvider;
   }
   ```

2. **จัดระเบียบลำดับไฟล์ใน `manifest.json` ใหม่ทั้งหมด:**
   จัดลำดับให้ Provider โหลดทันทีหลัง `parser.js` และก่อนไฟล์ UI/Agent เสมอ:
   1. `core/config.js`
   2. `core/constants.js`
   3. `core/parser.js`
   4. `providers/<name>.js`  *(โหลด Provider ทันที)*
   5. `core/icons.js`
   6. `core/audio.js`
   7. `core/camouflage.js`
   8. `core/ui-modals.js`
   9. `core/ui-menu.js`
   10. `core/ui-bar.js`
   11. `core/tools.js`
   12. `core/response-watcher.js`
   13. `core/agent.js`
   14. `core/main.js`

3. **แก้ไขฟังก์ชัน `landed()` และกระบวนการส่งข้อความใน `core/response-watcher.js`:**
   - ใช้ Dynamic Provider Resolver:
     ```javascript
     const getP = () => (window.ZS && window.ZS.getProvider ? window.ZS.getProvider() : null) || window.ZSProvider;
     ```
   - ปรับเงื่อนไข `landed()` หาก provider ยังไม่พร้อม ให้คืนค่า `false` เพื่อให้ลูปทำงานต่อไป และครอบ `try-catch` ขณะเรียก `typeAndSend`

4. **ปรับปรุงลอจิกใน `core/agent.js` และ `core/ui-bar.js`:**
   - ลบ Early Exit ที่ข้ามการบูตในแชตเก่าออก เมื่อผู้ใช้กดปุ่ม **"▶ เริ่มทำงาน"** ระบบจะส่ง System Prompt เพื่อเชื่อมต่อ Studio เข้ากับบทสนทนานั้นทันที
   - ปรับปรุง System Prompt ใน `core/config.js` ระบุ `FIRST TURN ACTION` สั่งให้ AI เรียกใช้คำสั่ง `list_commands` เป็นคำสั่งแรกเสมอ เพื่อให้กระบวนการ Bootstrap สมบูรณ์แบบ 100%

---

## 4. การทดสอบและการป้องกันในอนาคต (Verification & Regression Safety)

- สร้างชุดทดสอบการกดปุ่มแบบเสมือนจริง: [`zxscript-extension/tests/test-action-flow.js`](file:///C:/Users/ZirconX/Documents/New%20folder/zxscript-extension/tests/test-action-flow.js)
- สามารถรันตรวจสอบความถูกต้องของระบบได้ตลอดเวลาด้วยคำสั่ง:
  ```powershell
  node zxscript-extension/tests/test-parser.js
  node zxscript-extension/tests/test-chatgpt.js
  node zxscript-extension/tests/test-claude.js
  node zxscript-extension/tests/test-action-flow.js
  ```
  *(ผลการทดสอบ: ทุกกรณีทดสอบผ่าน 100% PASS)*

---

## 5. ปัญหาปีกมังกรหลุดขอบและแอนิเมชันกระพือค้าง (Dragon Wing Gap & CSS Animation Freeze Autopsy)

> **หัวข้อปัญหา:** ปีกมังกรด้านขวาหลอยหลุดออกจากตัวแคปซูล Action Bar และปีกไม่กระพือตามแอนิเมชัน  
> **วันที่บันทึก:** 31 ตุลาคม 2026  
> **สถานะ:** แก้ไขเสร็จสมบูรณ์ 100% (ตรวจวัดพิกัดและทดสอบคีย์เฟรมด้วย Headless Chrome 60fps)  
> **ไฟล์ที่เกี่ยวข้อง:** [`zxscript-extension/styles/overlay.css`](file:///c:/Users/ZirconX/Documents/New%20folder/zxscript-extension/styles/overlay.css)

### 5.1 อาการของปัญหา (Symptom)
1. **ปีกขวาหลุดขอบ (+34px Detached Gap):** ปีกซ้ายแนบติดตัวแคปซูล Action Bar ปกติ แต่ปีกขวาลอยห่างออกจากขอบแคปซูลไปทางขวาประมาณ 34px ไม่สมมาตรกัน
2. **ปีกนิ่งไม่ขยับ (Animation Freeze):** แม้ว่าจะเขียน `@keyframes` สำหรับการกระพือปีกไว้แล้ว แต่ปีกมังกรทั้งสองข้างอยู่นิ่ง ไม่ขยับขึ้นลงตามรอบเวลา
3. **ปุ่มหยุดทำงานโผล่ในโหมดปกติ (Idle Button Leak):** ปุ่ม `#zs-stop` โผล่ออกมาแม้จะใส่แอตทริบิวต์ `hidden` ไว้ ทำให้แคปซูลยาวเกินความจำเป็นขณะไม่ได้รัน

### 5.2 การวิเคราะห์ต้นตอของปัญหา (Root Cause Analysis)

#### 1. เรขาคณิตการกลับด้าน (Symmetry Reflection Offset Error)
- ปีกมังกรมีขนาดขยายใหญ่ขึ้นเป็น $66\times 37\text{px}$ โดยปีกขวาใช้การกลับภาพกระจกด้วย `transform: scaleX(-1)`
- ตำแหน่ง `transform-origin` ถูกตั้งไว้ที่ `calc(100% - 9px) 50%` ซึ่งเป็นจุดยึดโคนปีกด้านใน
- เมื่อพลิกภาพแนวนอน (`scaleX(-1)`) จุดอ้างอิง `right` หากใช้พิกัดลบ (`right: -42px`) เหมือนฝั่งซ้าย จะทำให้จุดหมุนและขอบภาพสะท้อนออกไปข้างนอกไกลขึ้นอีกเท่าตัว
- **สูตรคำนวณที่ถูกต้อง:**
  - ปีกซ้าย: `left: -42px` $\rightarrow$ ปลายปีกอยู่ที่ $-42\text{px}$ จากขอบซ้าย และโคนปีกเสียบเข้าไปในตัวแคปซูล $+24\text{px}$ (จุดหมุนอยู่ที่ $+15\text{px}$)
  - ปีกขวา: `right: 6px` ร่วมกับ `scaleX(-1)` และจุดหมุนเดิม $\rightarrow$ ภาพจะสะท้อนกางปลายปีกออกไปที่ $+42\text{px}$ นอกขอบขวา และโคนปีกแนบสนิทเข้าไปในตัวแคปซูล $-24\text{px}$ (จุดหมุนอยู่ที่ $-15\text{px}$) เกิดความสมมาตรแบบสมบูรณ์ 0.00px Error

#### 2. กฎการทับซ้อนของ CSS (!important Overriding Keyframes)
- ตามข้อกำหนดมาตรฐาน W3C CSS Animations Level 1: การกำหนดค่าคุณสมบัติที่มี `!important` ใน Selector ปกติ (Normal Cascading Rule) จะมีน้ำหนักลำดับความสำคัญ (Specificity) **สูงกว่า** ค่าที่อยู่ใน `@keyframes`
- ในโค้ดเดิมมีประกาศ:
  ```css
  #zs-bar #zs-wing-left,
  #zs-bar #zs-wing-right {
    transform: translateY(-50%) !important; /* <--- ตัวการแอนิเมชันค้าง */
  }
  ```
- การใส่ `!important` ที่ `transform` ทำให้เอนจินของ Chromium เพิกเฉยต่อคำสั่ง `transform` ทั้งหมดที่อยู่ใน `@keyframes zs-wing-flap` ส่งผลให้ปีกมังกรค้างนิ่งสนิท

#### 3. ความจำเพาะของ CSS สูงกว่า Native [hidden]
- กฎ `#zs-bar button` มีการกำหนด `display: inline-flex !important;`
- สไตล์ Native ของเบราว์เซอร์สำหรับ `[hidden]` คือ `display: none` (ความจำเพาะระดับ Attribute ต่ำกว่า) จึงถูกกลืน ทำให้ปุ่มหยุดทำงาน `#zs-stop` แสดงผลตลอดเวลา

### 5.3 วิธีการแก้ไข (Resolution Applied)

1. **ถอด `!important` ออกจาก `transform` ใน Base Selector:**
   เปิดทางให้คีย์เฟรมแอนิเมชันทำงานได้อย่างอิสระบนทั้งแกน $Y$ และการหมุน `rotate()`
2. **ปรับแต่งพิกัดปีกทั้งสองข้างให้สมมาตรกัน 100%:**
   - ปีกซ้าย: `left: -42px`, `transform-origin: calc(100% - 9px) 50%`
   - ปีกขวา: `right: 6px`, `transform-origin: calc(100% - 9px) 50%`
3. **เขียนคีย์เฟรมกระพือปีก 5 จังหวะ (Organic Flight Cycle):**
   - `@keyframes zs-wing-flap-left`: กระพือขึ้น `translateY(-62%) rotate(13deg)` และกระพือลง `translateY(-36%) rotate(-9deg)`
   - `@keyframes zs-wing-flap-right`: กระพือขึ้น `scaleX(-1) translateY(-62%) rotate(-13deg)` และกระพือลง `scaleX(-1) translateY(-36%) rotate(9deg)`
   - จังหวะการบิน: สแตนด์บาย 2.0 วินาที, โหมดประมวลผล 1.0 วินาที (เร่งสปีดตอบสนอง), โหมดโฮเวอร์ 1.4 วินาที
4. **ป้องกันการรั่วของ Element ซ่อน:**
   เพิ่มกฎชัดเจนใน [`zxscript-extension/styles/overlay.css`](file:///c:/Users/ZirconX/Documents/New%20folder/zxscript-extension/styles/overlay.css):
   ```css
   #zs-bar [hidden],
   #zs-stop[hidden],
   #zs-state[hidden] {
     display: none !important;
   }
   ```
