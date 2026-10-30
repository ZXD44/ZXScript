# ZXScript Development Roadmap
> **เจ้าของโครงการและผู้พัฒนา:** [zxd44](https://github.com/zxd44) (ZirconX)  
> **เว็บไซต์:** [www.zirconx.xyz](https://www.zirconx.xyz)  
> **คลังโค้ดทางการ (Official GitHub):** [https://github.com/zxd44/ZXScript](https://github.com/zxd44/ZXScript)  
> **อีเมล:** [gonhackergamer0@gmail.com](mailto:gonhackergamer0@gmail.com)  
> **เวอร์ชันปัจจุบัน:** `0.0.1` | **สิทธิ์การใช้งาน:** GPL-3.0

เอกสารนี้ระบุแผนผังทิศทางการพัฒนา (Roadmap) และฟีเจอร์สำหรับเวอร์ชันถัดไปของโปรเจกต์ **ZXScript** โดยกำหนดให้ทุกการเชื่อมต่อ บริการ และการอัปเดตทั้งหมดขึ้นตรงกับคลังโค้ดของ **zxd44** แต่เพียงผู้เดียว

---

## 🎯 แผนการพัฒนาระยะสั้น (Phase 1: GitHub & Release Automation)

### 1. ระบบตรวจสอบเวอร์ชันใหม่ (GitHub Auto-Update Checker)
> ⚠️ **ข้อกำหนดเคร่งครัด:** ระบบอัปเดตทั้งหมดต้องเชื่อมต่อไปยัง GitHub ของ **zxd44** เท่านั้น (`https://github.com/zxd44/ZXScript`) ห้ามชี้ไปยัง Repository ของผู้อื่นเด็ดขาด

- **API Endpoint:** ตรวจสอบผ่าน `https://api.github.com/repos/zxd44/ZXScript/releases/latest`
- **Bridge Startup Check:** เมื่อ `bridge.py` เริ่มการทำงาน ให้ส่ง Request ตรวจสอบเวอร์ชันล่าสุดแบบ Asynchronous ไม่บล็อกการทำงานหลัก
- **Popup Notification Badge:** หากพบว่ามีเวอร์ชันใหม่กว่าตัวปัจจุบันในเครื่อง ให้แสดงป้ายแจ้งเตือนพร้อมปุ่ม `[ดาวน์โหลดเวอร์ชันใหม่]` ซึ่งเปิดตรงไปยัง `https://github.com/zxd44/ZXScript/releases`
- **Release Automation (CI/CD):** สร้าง GitHub Actions Workflow เมื่อผู้พัฒนา (`zxd44`) แท็กเวอร์ชันใหม่ (เช่น `v0.0.2`) ให้ระบบ Build `ZXScript-Bridge.exe` และบีบอัด `zxscript-extension.zip` แนบใน Release อัตโนมัติ

---

## 🖼️ แผนการพัฒนาระยะกลาง (Phase 2: Visual & UI Enhancements)

### 2. แกลเลอรีภาพหน้าจอ Studio (Viewport History Gallery)
- **ประวัติการแคปภาพ:** เพิ่มแท็บ "ภาพแคปหน้าจอ" ใน Extension Popup เพื่อแสดง Thumbnail ภาพที่ได้จากคำสั่ง `screen_capture` ย้อนหลัง
- **เปรียบเทียบก่อน-หลัง (Before/After Slider):** ให้ผู้ใช้และ AI สามารถดูภาพแมพก่อนและหลังการสร้างโมเดลได้แบบเรียลไทม์

### 3. คลังโมเดล Creator Store ด่วน (Asset Quick-Insert)
- เพิ่มหน้าค้นหาและเลือกใส่ Asset ID, Texture, หรือ Decal เข้าสู่ Workspace ใน Roblox Studio ได้โดยตรงจากหน้าจอ Popup โดยไม่ต้องเปิดเว็บ Roblox

---

## 🏗️ แผนการพัฒนาระบบเกม (Phase 3: Game Systems & Scaffolding)

### 4. ตัวสร้างโครงสร้างเกมต้นแบบในคลิกเดียว (1-Click Map Scaffolder)
- เพิ่มคำสั่งลัดและ UI ในการสร้างโครงสร้างโฟลเดอร์สำหรับเกมประเภทต่างๆ อัตโนมัติ:
  - **Simulator Preset:** โฟลเดอร์เหรียญ, จุดขายของ, ประตูปดล็อกโซน, Leaderstats
  - **Obby Preset:** ด่าน Stage 1–50, Checkpoint Detection, Leaderboard บันทึกด่าน
  - **Tower Defense Preset:** Path Nodes, Spawner, Tower Placement Grid, Wave System
  - **RPG / Combat Preset:** NPC Spawn, Weapon Hitbox, Safe Zones

### 5. ระบบ Network Remote Binder อัตโนมัติ
- สคริปต์ช่วยจับคู่ RemoteEvent และ RemoteFunction อัตโนมัติระหว่าง `ServerScriptService` และ `StarterPlayerScripts` เพื่อลดโอกาสเกิด Error จากการสะกดชื่อ Remote ผิด

---

## 📦 แผนการพัฒนาแพ็กเกจแจกจ่าย (Phase 4: Distribution & Native App)

### 6. โปรแกรมติดตั้งแบบรวมเสร็จสรรพ (Standalone All-in-One Installer)
- **Windows Executable:** คอมไพล์เป็น `ZXScript-Bridge.exe` (ผ่าน `scripts/build_exe.py`) ที่มี Python Runtime ในตัว ไม่ต้องติดตั้งโปรแกรมเสริม
- **macOS Native App:** จัดทำ Bundle ในรูปแบบ `.app` สำหรับผู้ใช้ Mac ใช้งานสะดวกด้วยการดับเบิลคลิก

---

## 📌 สรุปสถานะฟีเจอร์ตามเวอร์ชัน (Version Milestones)

| เวอร์ชัน | สถานะ | ฟีเจอร์หลัก |
|---|---|---|
| **v0.0.1** | ปล่อยแล้ว | Core Bridge, Bloxstrap 31 Tools, Ctrl+Z Undo, Game Tree Pruning, Modern Luau, Audio Chime, Mega-Script Chunking, Play Auto-Routing, CI/CD |
| **v0.0.2** | **ปล่อยแล้ว (ปัจจุบัน)** | รองรับ 9 แพลตฟอร์ม AI (เพิ่ม Claude + Z.ai), 33 เครื่องมือ Studio, Dynamic Island Morph Bar, ระบบแจ้งเตือน Error อัจฉริยะ 1 คลิก, Auto-Recovery แก้ปัญหา ChatGPT ข้อความว่าง, Popup 3x3 App Launcher |
| **v0.0.2** | กำลังพัฒนา | Auto-Update Checker ผูกกับ `zxd44/ZXScript`, ป้ายแจ้งเตือนใน Popup |
| **v0.0.3** | ตามแผน | 1-Click Game Project Scaffolding (Obby, Simulator, RPG), Visual Gallery |
| **v0.1.0** | ตามแผน | Standalone `ZXScript-Bridge.exe` Release พร้อมใช้งานแบบไม่ต้องติดตั้ง Python |
