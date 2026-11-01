<div align="center">

# 🐉 ZXScript
### Roblox Studio AI Agent Bridge

**เปลี่ยนหน้าเว็บ AI ฟรี ให้กลายเป็นผู้ช่วยเขียนโค้ดและสร้างเกมบน Roblox Studio**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey?style=flat-square)]()
[![Roblox Studio](https://img.shields.io/badge/Roblox_Studio-MCP_Supported-00A2FF?style=flat-square)]()
[![Version](https://img.shields.io/badge/Version-0.0.3-success?style=flat-square)](version.json)

[🇹🇭 ภาษาไทย](#-ภาษาไทย) • [🇬🇧 English](#-english-overview)

---
</div>

<a id="-ภาษาไทย"></a>
## 🇹🇭 ภาษาไทย

**ZXScript** คือเครื่องมือเชื่อมต่อระหว่าง **หน้าเว็บแชต AI ฟรี** (เช่น DeepSeek, ChatGPT, Claude) กับ **Roblox Studio** ช่วยให้คุณสั่งให้ AI ช่วยเขียนสคริปต์ เสกโมเดล ตรวจสอบโครงสร้างในแมพ หรือแคปภาพหน้าจอในเกมได้โดยตรงจากหน้าเบราว์เซอร์

---

### ✨ จุดเด่น

* **ฟรี 100% ไม่ต้องซื้อ API Key:** ใช้โควตาคุยบนหน้าเว็บแชตตามปกติได้เลย
* **กด `Ctrl + Z` ย้อนกลับได้ตลอด:** ทุกคำสั่งที่ AI สั่งทำใน Studio จะผูกกับ `ChangeHistoryService` เลิกทำหรือย้อนกลับได้ทันที
* **แถบควบคุมเรียบง่ายบนหน้าเว็บ:** มี Action Bar ลอยตัวบนหน้าแชต บอกสถานะการเชื่อมต่อ และกดเริ่ม-หยุดได้ในคลิกเดียว
* **ระบบเช็คอัตโนมัติ:** ค้นหาโฟลเดอร์ Roblox Studio และ Bloxstrap ให้เอง มีตัวตรวจความพร้อมก่อนเปิดใช้งาน
* **เครื่องมือครบครัน:** AI มีสิทธิ์เรียกใช้คำสั่ง Studio ได้ถึง 34 คำสั่ง ทั้งรันโค้ด Luau, แก้ไขสคริปต์, เสกโมเดลจาก Marketplace, ดู Output Log และแคปภาพหน้าจอ

---

### 🤖 เว็บ AI ที่รองรับ

| แพลตฟอร์ม | สถานะ | คำแนะนำ |
| :--- | :---: | :--- |
| **DeepSeek** (`chat.deepseek.com`) | 🌟 แนะนำ | เขียนโค้ด Luau ได้แม่นยำ ลอจิกดี และแทบไม่ติด Rate Limit |
| **Claude** (`claude.ai`) | 🌟 ยอดเยี่ยม | เข้าใจโครงสร้างโปรเจกต์ขนาดใหญ่ได้ดีมาก |
| **ChatGPT** (`chatgpt.com`) | เสถียร | มีระบบช่วยกู้คืนข้อความเวลาสตรีมค้าง |
| **Google Gemini** | ใช้งานได้ | ตอบกลับไว เหมาะกับการช่วยคิดไอเดียและสร้างโค้ดเริ่มต้น |
| **Qwen / Kimi / Z.ai** | ใช้งานได้ | รองรับการทำงานได้ครบถ้วน |

---

### 🚀 วิธีติดตั้งและเริ่มใช้งาน

#### 1. สตาร์ตระบบ Bridge
ดับเบิลคลิกไฟล์ **`start.bat`** ในโฟลเดอร์โปรเจกต์
* *ระบบจะตรวจสอบ Python, ติดตั้งแพ็กเกจที่จำเป็น และเคลียร์พอร์ตเก่าให้อัตโนมัติ*
* *เปิดหน้าต่างนี้ทิ้งไว้ขณะใช้งาน*

#### 2. เปิดระบบ MCP ใน Roblox Studio
1. เปิดโปรแกรม **Roblox Studio** และเข้าสู่ Place เกมของคุณ
2. ที่แท็บเมนูด้านบน คลิก **Assistant AI**
3. คลิกไอคอนจุดสามจุด `...` ที่มุมขวาบนของหน้าต่าง Assistant -> เลือก **Manage MCP Servers**
4. ติ๊กถูกที่ช่อง **Enable Studio as MCP Server**

#### 3. ติดตั้ง Extension บนเบราว์เซอร์
1. เปิด Chrome หรือ Edge แล้วเข้าไปที่:
   * Chrome: `chrome://extensions`
   * Edge: `edge://extensions`
2. เปิดสวิตช์ **Developer mode (โหมดนักพัฒนา)** ที่มุมขวาบน
3. คลิก **Load unpacked (โหลดส่วนขยายที่คลายแพ็กเกจ)**
4. เลือกโฟลเดอร์ **`zxscript-extension`** ในโปรเจกต์นี้

#### 4. เริ่มสั่งงาน AI
1. เปิดหน้าเว็บ AI ที่ต้องการ (แนะนำ [DeepSeek](https://chat.deepseek.com))
2. สังเกตแถบสถานะของ ZXScript เมื่อเชื่อมต่อเรียบร้อย จุดจะเปลี่ยนเป็น **สีเขียว**
3. กดปุ่ม **▶ เริ่มทำงาน** แล้วเริ่มพิมพ์สั่งงาน AI ได้ทันที เช่น:
   > *"ช่วยสร้างระบบ Leaderstats เก็บเหรียญและเลเวลให้หน่อย"*  
   > *"สแกนดูใน Workspace ว่ามีโมเดลอะไรอยู่บ้าง แล้วแก้สคริปต์ DoorController"*

---

### 🛠️ สิ่งที่ AI สั่งการใน Roblox Studio ได้

* **จัดการสคริปต์:** อ่านไฟล์, แก้ไขโค้ด (รองรับสคริปต์ขนาดยาว), ค้นหาข้อความ และรันโค้ด Luau สดๆ
* **จัดการ Workspace & Explorer:** ค้นหาวัตถุ ตรวจสอบ Properties ของ Instance ต่างๆ ในแมพ
* **เสกสิ่งของและโมเดล:** ค้นหาและดึง 3D Model, Texture, Material จาก Marketplace มาวางในเกม
* **ทดสอบและวิเคราะห์:** แคปภาพหน้าจอ Viewport ใน Studio, ดู Console Log และกด Play/Stop ทดสอบเกม

---

### 🩺 การแก้ปัญหาเบื้องต้น (Troubleshooting)

หากแถบสถานะไม่เชื่อมต่อ หรือรันไม่ผ่าน:
* ดับเบิลคลิก **`doctor.bat`** เพื่อให้ระบบตรวจเช็คปัญหาการตั้งค่าทั้งหมด
* ตรวจสอบว่าได้ติ๊ก **Enable Studio as MCP Server** ใน Roblox Studio แล้วหรือยัง
* ตรวจสอบว่าหน้าต่าง `start.bat` ยังเปิดทำงานอยู่หรือไม่

---

### 📁 โครงสร้างโฟลเดอร์

```text
ZXScript/
├── bridge/               # ตัวเชื่อมต่อฝั่งระบบ (Python Native Host & WebSocket)
├── zxscript-extension/   # ส่วนขยายเบราว์เซอร์ (Chrome / Edge)
├── scripts/              # สคริปต์เปิดระบบและคำสั่งช่วยเหลือ
├── start.bat             # ดับเบิลคลิกเพื่อเปิดระบบใช้งานได้ทันที
├── doctor.bat            # ตัวตรวจสอบและวินิจฉัยปัญหาการเชื่อมต่อ
├── bump-version.bat      # เครื่องมืออัปเดตเวอร์ชัน
└── version.json          # กำหนดเวอร์ชันหลักของโปรเจกต์
```

---

<br/>

<a id="-english-overview"></a>
## 🇬🇧 English Overview

**ZXScript** connects free web AI chats (such as DeepSeek, ChatGPT, and Claude) directly to **Roblox Studio**, turning your browser chat into an autonomous game development assistant without requiring any paid API keys.

### Key Highlights
- **100% Free & No API Keys:** Runs directly on top of your existing browser sessions.
- **Engine-Level Undo Safety:** Modifications are wrapped in `ChangeHistoryService` — press `Ctrl + Z` in Studio anytime to roll back changes.
- **Minimalist Floating HUD:** Non-intrusive action bar integrated into the AI chat window.
- **Roblox & Bloxstrap Support:** Automatically locates studio paths and configuration.

### Quick Start
1. **Launch Bridge:** Double-click `start.bat` (automatically installs requirements and registers host). Keep this window open.
2. **Enable MCP in Studio:** In Roblox Studio, open **Assistant AI** -> Click `...` -> **Manage MCP Servers** -> check **Enable Studio as MCP Server**.
3. **Load Extension:** Go to `chrome://extensions` or `edge://extensions`, enable **Developer mode**, click **Load unpacked**, and select `zxscript-extension/`.
4. **Build:** Open [DeepSeek](https://chat.deepseek.com) or your preferred web AI, wait for the capsule indicator to turn green, click **Start**, and prompt your AI!

### Diagnostics
If you run into any issues, run `doctor.bat` to automatically diagnose environment and connection issues.

---

### 📄 สัญญาอนุญาต (License)

โปรเจกต์นี้อยู่ภายใต้สัญญาอนุญาต **GNU General Public License v3.0 (GPL-3.0)**  
พัฒนาและดูแลโดย **[ZXD44 (ZirconX)](https://github.com/ZXD44)** — [www.zirconx.xyz](https://www.zirconx.xyz)
