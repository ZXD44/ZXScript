# แผนผังทิศทางการพัฒนา ZXScript (Development Roadmap)
> **เจ้าของโครงการและผู้พัฒนา:** [ZXD44](https://github.com/ZXD44) (ZirconX)  
> **เว็บไซต์:** [www.zirconx.xyz](https://www.zirconx.xyz)  
> **คลังโค้ดทางการ:** [https://github.com/ZXD44/ZXScript](https://github.com/ZXD44/ZXScript)  
> **อีเมล:** [gonhackergamer0@gmail.com](mailto:gonhackergamer0@gmail.com)  
> **เวอร์ชันปัจจุบัน:** `0.0.3` | **สิทธิ์การใช้งาน:** GPL-3.0

เอกสารนี้ระบุแผนผังทิศทางการพัฒนา (Roadmap) และฟีเจอร์สำหรับเวอร์ชันถัดไปของโปรเจกต์ **ZXScript** โดยกำหนดให้ทุกการเชื่อมต่อ บริการ และการอัปเดตทั้งหมดขึ้นตรงกับคลังโค้ดของ **ZXD44** แต่เพียงผู้เดียว

---

## 1. ระยะที่เสร็จสมบูรณ์แล้ว (Completed Milestones)

### เวอร์ชัน 0.0.1
- พัฒนาระบบ Core WebSocket Bridge เชื่อมต่อเบราว์เซอร์กับ Roblox Studio
- ระบบเลิกทำผ่าน Studio (ChangeHistoryService) ด้วย `Ctrl + Z`
- ตรวจจับโฟลเดอร์ Roblox และ Bloxstrap อัตโนมัติ
- รองรับเครื่องมือพื้นฐานและการแปลง Luau ยุคใหม่

### เวอร์ชัน 0.0.2
- รองรับ 9 แพลตฟอร์ม AI ชั้นนำ (Claude, DeepSeek, ChatGPT, Gemini, Qwen, Kimi, Z.ai, Meta AI, Arena)
- ระบบ Dynamic Island Morph ปรับขนาดตามสถานะการทำงาน
- ระบบแจ้งเตือนข้อผิดพลาดอัจฉริยะ (Smart Error Banner) พร้อมปุ่มแก้ไข 1 คลิก
- ระบบ Auto-Recovery แก้ปัญหา ChatGPT สตรีมข้อความว่าง

### เวอร์ชัน 0.0.3 (เวอร์ชันปัจจุบัน)
- **ปรับโครงสร้างโค้ดแบบ Clean Architecture:** แยกไฟล์ทุกไฟล์ให้อยู่ภายใต้ขีดจำกัด 500-600 บรรทัด ตามหลัก Single Responsibility Principle
- **ระบบทำงานเบื้องหลัง (Headless Native Host):** ซ่อนหน้าต่าง CMD ด้วย `CREATE_NO_WINDOW` พร้อมระบบส่ง Log สดผ่าน IPC
- **ยกเครื่องหน้าต่างผู้ใช้ตาม Impeccable Style:** Dynamic Island Action Capsule ปีกมังกรกระพือ 60fps ลื่นไหล
- **ตัวกรองไวยากรณ์ Luau ก่อนรัน (Pre-flight Sanitizer):** กรองและแปลงโอเปอเรเตอร์อัตโนมัติ (`!=` -> `~=`, `&&` -> `and`, `||` -> `or`) พร้อมซ่อมบล็อก `end` อัตโนมัติ
- **ระบบสำรองสคริปต์อัตโนมัติลงดิสก์ (Local Script Snapshot):** บันทึกสำเนาไฟล์ `.luau` พร้อมประวัติย้อนหลังใน `projects/<PlaceName>/backups/` ป้องกันโค้ดหายเมื่อ Studio ปิดตัว
- **ระบบตรวจสุขภาพและวินิจฉัยปัญหาอัตโนมัติ (Health Check Doctor):** คำสั่ง `.\doctor.bat` ตรวจสอบ 13 จุดสำคัญ พร้อมโหมด `--fix` ซ่อมแซมระบบ 1 คลิก
- **ระบบควบคุมเวอร์ชันแบบจุดเดียว (Single Source of Truth):** จัดการเวอร์ชันจาก `version.json` และซิงค์ 16 ไฟล์ด้วย `.\bump-version.bat`

---

## 2. แผนการพัฒนาระยะถัดไป (Upcoming Phases)

### ระยะที่ 4: การตรวจสอบการอัปเดตอัตโนมัติ (Phase 4: Auto-Update Checker)
- ตรวจสอบเวอร์ชันล่าสุดผ่าน GitHub Releases ของ `ZXD44/ZXScript` โดยตรง
- แจ้งเตือนในหน้าต่าง Popup เมื่อมีเวอร์ชันใหม่ พร้อมปุ่มดาวน์โหลดตรงจากคลังทางการ
- ระบบ CI/CD สร้างไฟล์ติดตั้งอัตโนมัติเมื่อมีการปล่อย Release

### ระยะที่ 5: แกลเลอรีภาพถ่ายหน้าจอ Studio (Phase 5: Studio Viewport Gallery)
- เพิ่มแท็บดูประวัติภาพที่ได้จากคำสั่ง `screen_capture` ย้อนหลังใน Popup
- แสดงภาพเปรียบเทียบก่อนและหลังการรันคำสั่งโมเดลสามมิติ

### ระยะที่ 6: แม่แบบโครงสร้างเกมสำเร็จรูป (Phase 6: Game Project Scaffolding)
- คำสั่งลัดในการสร้างโครงสร้างโฟลเดอร์สำหรับเกมประเภทต่างๆ อัตโนมัติ:
  - แม่แบบเกมแนว Simulator (จุดเกิดเหรียญ, จุดขายของ, ประตูปดล็อกโซน, Leaderstats)
  - แม่แบบเกมแนว Obby (ระบบ Stage Checkpoint, Leaderboard)
  - แม่แบบเกมแนว RPG / Combat (ระบบ Raycast Weapon, Cooldown, Hitbox Server)

---

## 3. สรุปสถานะฟีเจอร์ตามเวอร์ชัน (Version Milestones Summary)

| เวอร์ชัน | สถานะ | ฟีเจอร์หลัก |
|---|---|---|
| **v0.0.1** | ปล่อยแล้ว | Core Bridge, Bloxstrap Auto-Discovery, Ctrl+Z Undo, Game Tree Pruning, Modern Luau, Audio Chime |
| **v0.0.2** | ปล่อยแล้ว | รองรับ 9 แพลตฟอร์ม AI, Dynamic Island Morph Bar, ระบบแจ้งเตือน Error อัจฉริยะ, ChatGPT Auto-Recovery |
| **v0.0.3** | **ปล่อยแล้ว (ปัจจุบัน)** | Clean Architecture (< 500 บรรทัด), Headless Bridge, Luau Sanitizer, Auto-Backup, Health Doctor, SSOT Versioning |
| **v0.0.4** | ตามแผน | Place Name Badge & Switch Warning, Atomic Turn Undo (1 Prompt = 1 Ctrl+Z), Smart Output Compactor, Auto-Updater |
| **v0.1.0** | ตามแผน | ระบบสร้างโครงสร้างเกมสำเร็จรูป (Simulator, Obby, RPG) ในคลิกเดียว, คลังภาพถ่ายหน้าจอ |
