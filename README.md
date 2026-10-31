<div align="center">

# 🐉 ZXScript
### Autonomous Roblox Studio AI Agent Bridge
**เปลี่ยนหน้าต่างแชต AI ฟรีบนเว็บ ให้เป็นผู้ช่วยพัฒนาเกมบน Roblox Studio โดยอัตโนมัติ**  
**Turn Free Web AI Chats into an Autonomous Game Developer inside Roblox Studio**

[![Language: Thai & English](https://img.shields.io/badge/Language-%F0%9F%87%B9%F0%9F%87%AD_%E0%B9%84%E0%B8%97%E0%B8%A2_%7C_%F0%9F%87%AC%F0%9F%87%A7_English-blue?style=flat-square)](#-เลือกภาษา--select-language)
![Platform](https://img.shields.io/badge/Platform-Windows_%7C_macOS-lightgrey?style=flat-square)
![License](https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square)
![Roblox Studio](https://img.shields.io/badge/Roblox_Studio-MCP_Enabled-green?style=flat-square)
![Bloxstrap Support](https://img.shields.io/badge/Bloxstrap-Supported-orange?style=flat-square)
![Version](https://img.shields.io/badge/version-0.0.3-brightgreen)

<br/>

> **พัฒนาและดูแลโดย [ZXD44](https://github.com/ZXD44) (ZirconX)**  
> 🌐 เว็บไซต์: [www.zirconx.xyz](https://www.zirconx.xyz) &nbsp;|&nbsp; 📧 ติดต่อ: [gonhackergamer0@gmail.com](mailto:gonhackergamer0@gmail.com)

<br/>

### 📍 เลือกภาษา / Select Language
**[ 🇹🇭 ภาษาไทย (คลิกเพื่ออ่าน) ](#-ภาษาไทย)** &nbsp;&nbsp;•&nbsp;&nbsp; **[ 🇬🇧 English (Click to read) ](#-english)**

---
</div>

<br/>

<a id="-ภาษาไทย"></a>
# 🇹🇭 ภาษาไทย

[ 🇬🇧 Switch to English ](#-english) &nbsp;|&nbsp; [ ⬆ กลับสู่ด้านบน ](#-zxscript)

---

### 📑 สารบัญ (Table of Contents)
1. [ภาพรวมของโปรเจกต์](#1-ภาพรวมของโปรเจกต์)
2. [จุดเด่นและฟีเจอร์สำคัญ](#2-จุดเด่นและฟีเจอร์สำคัญ)
3. [ความเข้ากันได้กับ 9 โมเดล AI](#3-ความเข้ากันได้กับ-9-โมเดล-ai)
4. [คู่มือการติดตั้งและเริ่มใช้งานใน 3 นาที](#4-คู่มือการติดตั้งและเริ่มใช้งานใน-3-นาที)
5. [รายการ 34 เครื่องมือ Roblox Studio (MCP Tools)](#5-รายการ-34-เครื่องมือ-roblox-studio-mcp-tools)
6. [สถาปัตยกรรมระบบ Clean Architecture](#6-สถาปัตยกรรมระบบ-clean-architecture)
7. [การจัดการเวอร์ชันในจุดเดียว (SSOT Version Manager)](#7-การจัดการเวอร์ชันในจุดเดียว-ssot-version-manager)
8. [สัญญาอนุญาต (License)](#8-สัญญาอนุญาต-license)

---

### 1. ภาพรวมของโปรเจกต์
**ZXScript** คือสะพานเชื่อมต่อ (Bridge) และส่วนขยายเบราว์เซอร์ (Browser Extension) ที่สร้างขึ้นเพื่อให้คุณสามารถใช้หน้าเว็บ AI ฟรี เช่น **DeepSeek, ChatGPT, Claude, Gemini, Kimi, Qwen** ควบคุมและสร้างเกมบน **Roblox Studio** ได้โดยตรงจากเบราว์เซอร์:
- **ไม่ต้องซื้อ API Key:** ใช้โควตาหน้าเว็บฟรีของแต่ละเจ้าได้ทันที
- **ไม่ต้องเปิด Terminal พิมพ์คำสั่ง:** ควบคุมผ่าน Action Bar แคปซูลบนหน้าจอแบบ 1 คลิก
- **ปลอดภัยระดับ Game Engine:** โค้ด Luau ทุกคำสั่งถูกครอบด้วย `ChangeHistoryService` เลิกทำ (`Ctrl + Z`) ได้ทันทีใน Studio

---

### 2. จุดเด่นและฟีเจอร์สำคัญ

| หมวดหมู่ | รายละเอียดความสามารถ |
| :--- | :--- |
| 🐉 **Red Dragon Dynamic Island HUD** | แถบ Action Bar แคปซูลแก้วลอยตัวพร้อม **ปีกมังกรขยับได้ (Flapping Animation)** ปรับขยายขนาดอัตโนมัติตามสถานะการรันโค้ด (Standby 2.0s / Executing 1.0s) |
| 🛡️ **Headless Native Host** | ตัว Bridge รันแบบเบื้องหลังสมบูรณ์แบบด้วย `CREATE_NO_WINDOW` ไร้หน้าต่าง CMD สีดำกวนสายตา พร้อม Terminal แสดง Log สดในหน้าต่างเว็บ |
| ⚡ **34 Built-in Studio Tools** | รัน Luau, แก้ไขสคริปต์ขนาดใหญ่ (Chunking), ค้นหาโครงสร้างต้นไม้ (Game Tree), เสกโมเดล (Asset Insert) และแคปภาพหน้าจอ Studio |
| 🛡️ **ChangeHistoryService Protection** | AI เขียนโค้ดหรือแก้ไขวัตถุใดๆ สามารถกด `Ctrl + Z` ใน Roblox Studio เพื่อย้อนกลับได้ทันที |
| ⏱️ **Anti-Ban Humanized Shield** | ระบบหน่วงเวลาอัจฉริยะ (1000ms - 2200ms) พร้อม Jitter แบบสุ่ม ป้องกันการโดนแบนหรือติด Rate Limit จาก Cloudflare |
| 🔊 **Native Web Audio Synthesizer** | เสียงแจ้งเตือนสำเร็จและข้อผิดพลาดถูกสังเคราะห์สดผ่าน Web Audio API โหลดไว ไม่ต้องใช้ไฟล์เสียงภายนอก |
| 🧩 **Vanilla Studio & Bloxstrap Support** | ตรวจจับพาธของ `StudioMCP.exe` อัตโนมัติ ทั้งเวอร์ชันทางการและ Bloxstrap โดยไม่ต้องตั้งค่าด้วยตนเอง |

---

### 3. ความเข้ากันได้กับ 9 โมเดล AI

| ผู้ให้บริการ AI (Provider) | ความเข้ากันได้ | ฟังก์ชันที่แนะนำ |
| :--- | :---: | :--- |
| **DeepSeek** (`chat.deepseek.com`) | ⭐ **ดีที่สุด (แนะนำ)** | คิดลึกซึ้ง เขียน Luau แม่นยำ ไม่ติด Rate Limit ง่าย |
| **Claude AI** (`claude.ai`) | ⭐ **ยอดเยี่ยม** | ถอดความสคริปต์ยาวได้ดี รองรับ Thinking Block |
| **ChatGPT** (`chatgpt.com`) | ⭐ **เสถียรสูง** | มีระบบ Auto-Recovery กู้คืนสตรีมข้อความค้างอัตโนมัติ |
| **Google Gemini** (`gemini.google.com`) | ✔️ รองรับสมบูรณ์ | ประมวลผลรวดเร็ว วิเคราะห์โครงสร้างโปรเจกต์ใหญ่ได้ดี |
| **Kimi AI** (`kimi.ai`) | ✔️ รองรับสมบูรณ์ | บริบทความจำยาว วิเคราะห์โค้ดต่อเนื่องได้หลายพันบรรทัด |
| **Z.ai / GLM** (`chat.z.ai`) | ✔️ รองรับสมบูรณ์ | ตอบสนองไว เหมาะกับงานเขียนฟังก์ชันย่อย |
| **Qwen AI** (`chat.qwen.ai`) | ✔️ รองรับสมบูรณ์ | เอนจินรหัสผ่านฉลุย แปลงโค้ด Luau ยุคใหม่แม่นยำ |
| **Meta AI** (`meta.ai`) | ✔️ รองรับสมบูรณ์ | ตอบโจทย์งานไอเดียและสร้างตรรกะเกมเบื้องต้น |
| **LMSYS Arena** (`arena.ai`) | ✔️ รองรับสมบูรณ์ | เหมาะสำหรับทดสอบเปรียบเทียบโมเดลแข่งขันกัน |

---

### 4. คู่มือการติดตั้งและเริ่มใช้งานใน 3 นาที

#### ขั้นตอนที่ 1: ลงทะเบียน Native Messaging Host (ทำครั้งเดียว)
เปิด PowerShell หรือ Command Prompt ที่โฟลเดอร์โปรเจกต์แล้วรัน:
```powershell
python bridge/register.py
```

#### ขั้นตอนที่ 2: โหลดส่วนขยายบน Chrome หรือ Edge
1. เปิดเบราว์เซอร์ไปที่ `chrome://extensions` หรือ `edge://extensions`
2. เปิดสวิตช์ **Developer mode (โหมดนักพัฒนา)** ที่มุมขวาบน
3. คลิก **Load unpacked (โหลดส่วนขยายที่คลายแพ็กเกจ)**
4. เลือกโฟลเดอร์ `zxscript-extension` ในโปรเจกต์

#### ขั้นตอนที่ 3: เปิดเซิร์ฟเวอร์ MCP ใน Roblox Studio
1. เปิดโปรแกรม **Roblox Studio** และเข้าสู่ Place เกมของคุณ
2. ที่แถบเมนูด้านบน คลิก **Assistant AI**
3. คลิกไอคอนจุดสามจุด `...` ที่มุมขวาบนของหน้าต่าง Assistant -> เลือก **Manage MCP Servers**
4. ทำเครื่องหมายถูกที่ **Enable Studio as MCP Server**

#### ขั้นตอนที่ 4: สตาร์ตตัวเชื่อมต่อ (Bridge)
- **วิธีที่ 1 (ผ่าน Extension - แนะนำ):** คลิกไอคอน ZXScript ที่แถบส่วนขยายเบราว์เซอร์ แล้วกด **เปิดใช้งานทันที**
- **วิธีที่ 2 (ผ่านตัวเปิด):** ดับเบิลคลิกไฟล์ `start.bat` ที่โฟลเดอร์โปรเจกต์

#### ขั้นตอนที่ 5: เริ่มสั่ง AI สร้างเกม!
1. เปิดหน้าเว็บ AI เช่น `chat.deepseek.com`
2. สังเกตแคปซูลมังกรด้านบน เมื่อเชื่อมต่อแล้วสถานะจะขึ้นจุดสีเขียว
3. กดปุ่ม **"▶ เริ่มทำงาน"** บนแคปซูล แล้วสั่งงาน AI ได้ทันที เช่น *"สร้างระบบ Leaderstats บันทึกเงินด้วย DataStore2 ให้หน่อย"*

---

### 5. รายการ 34 เครื่องมือ Roblox Studio (MCP Tools)

ZXScript ให้สิทธิ์ AI เข้าถึงชุดเครื่องมือมาตรฐานของ Roblox Studio Engine ครบถ้วน:

| กลุ่มเครื่องมือ | รายการคำสั่ง | คำอธิบายการทำงาน |
| :--- | :--- | :--- |
| **Script & Code** | `execute_luau`, `multi_edit`, `script_search`, `script_grep`, `script_read` | อ่าน, เขียน, ค้นหาโค้ด Luau และรันสคริปต์สดในสภาพแวดล้อมจำลอง |
| **Hierarchy & Tree** | `search_game_tree`, `inspect_instance` | สแกนหาวัตถุใน Workspace, ServerScriptService, ReplicatedStorage |
| **Assets & Visuals** | `insert_asset`, `search_asset`, `generate_mesh`, `generate_material`, `generate_texture` | ค้นหาและนำเข้าโมเดล, พื้นผิว และ Asset จาก Roblox Marketplace |
| **Diagnostics & UI** | `screen_capture`, `get_console_output`, `get_studio_state`, `start_stop_play` | ถ่ายภาพหน้าจอ Viewport ใน Studio, ดึง Output Log และเปิด/ปิด Play Mode |
| **Player & World** | `auto_setup_avatar`, `character_navigation`, `generate_scene` | เซ็ตอัปตัวละครผู้เล่น, สร้างทางเดิน และจัดฉากจำลองสภาพแวดล้อม |

---

### 6. สถาปัตยกรรมระบบ Clean Architecture

โค้ดทั้งหมดถูกจัดระเบียบตามหลัก **Single Responsibility Principle (SRP)** โดยจำกัดขนาดไม่เกิน **500-600 บรรทัดต่อไฟล์**:

```text
ZXScript/
├── version.json                  # ศูนย์กลางกำหนดเวอร์ชันหลัก (Single Source of Truth)
├── VERSION                       # เวอร์ชัน Plaintext มาตรฐาน
├── bump-version.bat              # ตัวรันคำสั่งอัปเดตเวอร์ชัน 1-คลิกสำหรับ Windows
├── bridge/                       # เซิร์ฟเวอร์ Python Bridge & Native Messaging
│   ├── constants.py              # กำหนดค่าคงที่, โหลดเวอร์ชันไดนามิก, ANSI Logger
│   ├── config_manager.py         # จัดการ config.json แบบ Atomic ปลอดภัย
│   ├── mcp_server.py             # ไคลเอนต์ JSON-RPC 2.0 เชื่อมต่อ Studio MCP
│   ├── studio_watcher.py         # เคลียร์พอร์ตชน และตรวจจับกระบวนการ Studio
│   ├── tool_dispatcher.py        # จัดการ ChangeHistoryService และแปลง Luau
│   ├── bridge_server.py          # WebSocket Server สื่อสารกับเบราว์เซอร์
│   ├── native_host.py            # ตัวรัน Native Messaging แบบ Headless (ไร้หน้าต่างดำ)
│   ├── launch_studio_mcp.py      # ออโต้ดิสคัฟเวอรี Roblox & Bloxstrap MCP
│   └── register.py               # ตัวลงทะเบียน Registry บน Windows
├── zxscript-extension/           # ส่วนขยายเบราว์เซอร์ Manifest V3
│   ├── manifest.json             # ผังการฉีดสคริปต์แยกหมวดหมู่
│   ├── background.js             # Service Worker ประสานงาน Native Host
│   ├── core/                     # โมดูลระบบหลัก (< 500 บรรทัดต่อไฟล์)
│   │   ├── constants.js          # จัดการตัวแปร สถานะระบบ และส่งออกเวอร์ชัน
│   │   ├── parser.js             # ตัวแยกคำสั่ง Luau / JSON แบบ Robust ทนทาน
│   │   ├── agent.js              # ลูป Autonomous Agent และระบบความจำ
│   │   ├── response-watcher.js   # ตัวตรวจจับสตรีมข้อความ AI ตอบกลับ
│   │   ├── tools.js              # ตัวส่งคำสั่ง RPC และระบบฉีดข้อความลง Composer
│   │   ├── ui-bar.js             # Dynamic Island Action Capsule พร้อมปีกมังกร
│   │   ├── ui-menu.js            # เมนูตั้งค่าและรายการเครื่องมือ MCP
│   │   └── ui-modals.js          # หน้าต่างแจ้งเตือนและ Terminal แสดงผลสด
│   ├── styles/                   # สไตล์ชีต Impeccable Style แยกหมวด
│   └── tests/                    # ชุดทดสอบ Unit Test แบบ Zero Dependency
└── scripts/
    └── bump_version.py           # สคริปต์ซิงค์เวอร์ชันอัตโนมัติครอบคลุม 16 ไฟล์
```

---

### 7. การจัดการเวอร์ชันในจุดเดียว (SSOT Version Manager)

ZXScript รวมศูนย์การควบคุมเวอร์ชันไว้ที่ [`version.json`](./version.json) เป็นศูนย์กลาง (Single Source of Truth) โดยมีสคริปต์ช่วยอัปเดตข้อมูลอัตโนมัติครบ 16 ไฟล์ในคำสั่งเดียว:

```powershell
# ตรวจสอบว่าทุกไฟล์ในโปรเจกต์มีเวอร์ชันตรงกัน 100% หรือไม่
.\bump-version.bat --check

# ปรับเวอร์ชัน Patch อัตโนมัติ (เช่น 0.0.3 -> 0.0.4)
.\bump-version.bat --patch

# ปรับเวอร์ชัน Minor อัตโนมัติ (เช่น 0.0.3 -> 0.1.0)
.\bump-version.bat --minor

# ระบุเวอร์ชันที่ต้องการด้วยตนเอง
.\bump-version.bat 0.0.5
```

---

### 8. สัญญาอนุญาต (License)
โปรเจกต์นี้เผยแพร่ภายใต้สัญญาอนุญาต **GNU General Public License v3.0 (GPL-3.0)**  
พัฒนาและถือลิขสิทธิ์โดย **ZXD44 (ZirconX)**

[ ⬆ กลับสู่ด้านบน ](#-zxscript)

---
<br/>

<a id="-english"></a>
# 🇬🇧 English

[ 🇹🇭 เปลี่ยนเป็นภาษาไทย ](#-ภาษาไทย) &nbsp;|&nbsp; [ ⬆ Back to Top ](#-zxscript)

---

### 📑 Table of Contents
1. [Project Overview](#1-project-overview)
2. [Key Highlights & Capabilities](#2-key-highlights--capabilities)
3. [Supported 9 AI Platforms](#3-supported-9-ai-platforms)
4. [3-Minute Quickstart Guide](#4-3-minute-quickstart-guide)
5. [34 Roblox Studio MCP Tools](#5-34-roblox-studio-mcp-tools)
6. [Clean Architecture & Modularity](#6-clean-architecture--modularity)
7. [Single Source of Truth (SSOT) Versioning](#7-single-source-of-truth-ssot-versioning)
8. [License](#8-license)

---

### 1. Project Overview
**ZXScript** is a developer-centric bridge and browser extension that turns free web-based AI chats (**DeepSeek, Claude, ChatGPT, Gemini, Kimi, Qwen, Z.ai, Meta AI, Arena**) into an autonomous game engineer inside **Roblox Studio**:
- **Zero API Costs:** Leverage your existing free web chat quotas without paid API keys.
- **No Intrusive Terminal Windows:** Managed directly from a floating, responsive Dynamic Island capsule inside your AI chat.
- **Engine-Level Safety:** Every Luau action is executed with `ChangeHistoryService` encapsulation, enabling immediate undo (`Ctrl + Z`) inside Roblox Studio.

---

### 2. Key Highlights & Capabilities

| Feature | Description |
| :--- | :--- |
| 🐉 **Red Dragon Dynamic Island HUD** | Glassmorphic floating capsule featuring **animated flapping dragon wings** (2.0s idle cycle / 1.0s active execution boost) and crimson ember aesthetics. |
| 🛡️ **Headless Native Host** | Fully backgrounded bridge via `CREATE_NO_WINDOW`. Zero annoying black CMD console popups; real-time streaming logs inside an in-page modal dialog. |
| ⚡ **34 Ready-to-Run Studio Tools** | Full access to Luau evaluation, large-script chunking, game-tree inspection, marketplace asset insertion, and viewport screen capture. |
| 🛡️ **Instant Ctrl + Z Undo Protection** | Every modification executed by the AI is grouped under `ChangeHistoryService` recording for instant rollback in Studio. |
| ⏱️ **Anti-Ban Humanized Shield** | Randomized jitter delays (`1000ms - 2200ms`) prevent rate-limiting and Cloudflare bot detection blocks. |
| 🔊 **Native Web Audio Synthesizer** | Success chimes and error pings synthesized directly in-memory via the Web Audio API without bulky external audio files. |
| 🧩 **Bloxstrap & Vanilla Studio Auto-Detection** | Seamless path discovery for `StudioMCP.exe` across standard Roblox paths and Bloxstrap directories. |

---

### 3. Supported 9 AI Platforms

| AI Platform | Support Status | Recommended Role |
| :--- | :---: | :--- |
| **DeepSeek** (`chat.deepseek.com`) | ⭐ **Recommended** | High code fidelity, thorough reasoning, excellent Luau compliance. |
| **Claude AI** (`claude.ai`) | ⭐ **Excellent** | Superior long-form architecture and full Thinking Block support. |
| **ChatGPT** (`chatgpt.com`) | ⭐ **Highly Stable** | Built-in Auto-Recovery engine detects stalled responses and resumes stream. |
| **Google Gemini** (`gemini.google.com`) | ✔️ Full Support | High generation speed, ideal for exploring large project scopes. |
| **Kimi AI** (`kimi.ai`) | ✔️ Full Support | Ultra-long context memory for thousands of lines of code. |
| **Z.ai / GLM** (`chat.z.ai`) | ✔️ Full Support | Rapid execution suitable for self-contained helper scripts. |
| **Qwen AI** (`chat.qwen.ai`) | ✔️ Full Support | Strong modern Luau syntax generation. |
| **Meta AI** (`meta.ai`) | ✔️ Full Support | Great for brainstorming game mechanics and simple state machines. |
| **LMSYS Arena** (`arena.ai`) | ✔️ Full Support | Ideal for blind side-by-side model benchmarking. |

---

### 4. 3-Minute Quickstart Guide

#### Step 1: Register Native Messaging Host (One-Time)
Run the registration script inside your project directory using PowerShell or CMD:
```powershell
python bridge/register.py
```

#### Step 2: Load the Browser Extension
1. Open Chrome or Edge and navigate to `chrome://extensions` or `edge://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `zxscript-extension` directory.

#### Step 3: Enable MCP Server in Roblox Studio
1. Open **Roblox Studio** and load your game Place.
2. In the top ribbon bar, click **Assistant AI**.
3. In the Assistant panel, click the three-dots menu `...` in the top right -> **Manage MCP Servers**.
4. Check **Enable Studio as MCP Server**.

#### Step 4: Launch the Bridge
- **Option A (Via Extension UI - Recommended):** Click the ZXScript extension icon in your browser toolbar and click **เปิดใช้งานทันที** (Start Bridge).
- **Option B (Via Launcher Script):** Double-click `start.bat` in the repository root.

#### Step 5: Start Building!
1. Open any supported web chat (e.g., `chat.deepseek.com`).
2. Verify the Red Dragon capsule indicator turns green.
3. Click **"▶ เริ่มทำงาน" (Start Session)** and prompt your AI to build your game mechanics!

---

### 5. 34 Roblox Studio MCP Tools

| Category | Tool Names | Capabilities |
| :--- | :--- | :--- |
| **Code & Scripting** | `execute_luau`, `multi_edit`, `script_search`, `script_grep`, `script_read` | Read, write, search, and execute modern Luau scripts with error handling. |
| **Game Hierarchy** | `search_game_tree`, `inspect_instance` | Inspect instances, properties, and hierarchy across Workspace and Services. |
| **Assets & Visuals** | `insert_asset`, `search_asset`, `generate_mesh`, `generate_material`, `generate_texture` | Search and import 3D models, PBR textures, and meshes directly from Marketplace. |
| **Diagnostics & UI** | `screen_capture`, `get_console_output`, `get_studio_state`, `start_stop_play` | Capture viewport frames, inspect live output logs, and toggle game simulation. |
| **Player & Navigation** | `auto_setup_avatar`, `character_navigation`, `generate_scene` | Configure humanoid characters, construct pathfinding, and generate levels. |

---

### 6. Clean Architecture & Modularity

All files across the repository strictly adhere to the **Single Responsibility Principle (SRP)** with a hard limit of **under 500-600 lines per file**:

```text
ZXScript/
├── version.json                  # Canonical Single Source of Truth for project version
├── VERSION                       # Plaintext semver file
├── bump-version.bat              # 1-Click Windows version bump shortcut
├── bridge/                       # Python Bridge & Native Messaging Server
│   ├── constants.py              # System constants, dynamic version loader, ANSI logger
│   ├── config_manager.py         # Atomic config.json reader/writer
│   ├── mcp_server.py             # JSON-RPC 2.0 client communicating with Studio MCP
│   ├── studio_watcher.py         # Zombie process killer and port conflict resolver
│   ├── tool_dispatcher.py        # ChangeHistoryService encapsulation and Luau modernizer
│   ├── bridge_server.py          # WebSocket server communicating with browser extension
│   ├── native_host.py            # Headless Native Messaging host (CREATE_NO_WINDOW)
│   ├── launch_studio_mcp.py      # Auto-discovery for vanilla Roblox and Bloxstrap MCP
│   └── register.py               # Registry installer for Windows Native Messaging
├── zxscript-extension/           # Manifest V3 Chrome/Edge Browser Extension
│   ├── manifest.json             # Content script injection mapping
│   ├── background.js             # Service worker coordinating native host IPC
│   ├── core/                     # Modular core components (< 500 lines each)
│   │   ├── constants.js          # Shared state, diagnostics, and dynamic version export
│   │   ├── parser.js             # Resilient Luau and JSON tool call parser
│   │   ├── agent.js              # Autonomous loop and turn-memory supervisor
│   │   ├── response-watcher.js   # AI response stream monitor
│   │   ├── tools.js              # Tool RPC execution and composer injector
│   │   ├── ui-bar.js             # Dynamic Island capsule with animated dragon wings
│   │   ├── ui-menu.js            # Settings popover and MCP tool inspector
│   │   └── ui-modals.js          # In-page alerts and real-time streaming terminal
│   ├── styles/                   # Impeccable Style modular CSS
│   └── tests/                    # Zero-dependency Node.js unit test suite
└── scripts/
    └── bump_version.py           # Universal synchronization script covering all 16 files
```

---

### 7. Single Source of Truth (SSOT) Versioning

ZXScript uses [`version.json`](./version.json) as the centralized single source of truth. The unified synchronizer script updates all 16 target files across the repository in a single command:

```powershell
# Verify that all 16 files across the project match version.json
.\bump-version.bat --check

# Increment patch version (e.g., 0.0.3 -> 0.0.4)
.\bump-version.bat --patch

# Increment minor version (e.g., 0.0.3 -> 0.1.0)
.\bump-version.bat --minor

# Explicitly set a target version
.\bump-version.bat 0.0.5
```

---

### 8. License
This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.  
Created & Maintained by **ZXD44 (ZirconX)**.

[ ⬆ Back to Top ](#-zxscript)
