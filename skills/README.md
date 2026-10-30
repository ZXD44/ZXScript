# 🧠 ZXScript Skills Knowledge Base

คลังความรู้และชุดทักษะระดับมืออาชีพ (Verified Expert Roblox & Luau 0.743 / Studio 0.744 Knowledge Base) สำหรับให้ AI Agent และนักพัฒนาใช้งานเพื่อสร้างเกม Roblox ที่มีคุณภาพระดับ Production

---

## 📚 รายการทักษะทั้งหมด (Skill Catalogue)

### 1. [roblox-dev-skill](./roblox-dev/SKILL.md)
* **แกนหลัก:** คลังความรู้ทางการของ Roblox Studio 0.744 และ Luau 0.743 ที่ผ่านการทดสอบจริงใน Studio
* **ครอบคลุม:**
  - รายการเครื่องมือ MCP 28 รายการ (`execute_luau`, `multi_edit`, `search_game_tree`, `script_read` ฯลฯ)
  - กฎการแยก Datamodel Asymmetry (`Edit` สำหรับแก้ไขสคริปต์, `Client/Server` สำหรับ Playtest)
  - ChangeHistoryService Undo Safety (Ctrl+Z)
  - มาตรฐาน Luau สากล (`task.wait`, `task.spawn`, Strict Typing)

### 2. [God-Tier Modular Service Architecture](./roblox-dev/references/godtier-architecture.md)
* สถาปัตยกรรมระดับองค์กร (Knit-like / Rojo-ready)
* แยก Layer ชัดเจน: ServiceManager -> Init -> Start -> Networking
* ป้องกันปัญหา Circular Dependency และ Yielding in Init 100%

### 3. [God-Tier Server-Authoritative Combat & Anti-Exploit](./roblox-dev/references/godtier-combat-anti-exploit.md)
* การตรวจสอบการโจมตีฝั่ง Server 100% (Never Trust Client)
* ระบบตรวจจับ Raycast Line-of-sight, Distance Sanity, Cooldown Rate-Limiter
* ป้องกัน Wall-Bang, Teleport Hits, และ Remote Spam

### 4. [God-Tier Parallel Luau & Multithreaded Actors](./roblox-dev/references/godtier-parallel-luau.md)
* เทคนิคประมวลผลแบบคู่ขนานบน CPU หลายคอร์ด้วย Actor
* `task.desynchronize()` สำหรับคำนวณ Raycast / AI / Math 120+ FPS
* `task.synchronize()` สำหรับเขียนข้อมูลกลับสู่ DataModel อย่างปลอดภัย

### 5. [God-Tier Monetization & Bulletproof Data Persistence](./roblox-dev/references/godtier-monetization-profilestore.md)
* มาตรฐาน ProfileStore ป้องกันข้อมูลผู้เล่นสูญหาย (Session Locking & Auto-Save)
* Idempotent `MarketplaceService.ProcessReceipt` ป้องกันการจ่ายไอเทมซ้ำ

### 6. [God-Tier Procedural World & Dungeon Generation](./roblox-dev/references/godtier-procedural-world.md)
* อัลกอริทึมสร้างภูมิประเทศและดันเจี้ยนด้วย Perlin Noise / Voxel
* การ Chunking และ Yielding ด้วย ChangeHistoryService ไม่ทำให้ Studio ค้าง
