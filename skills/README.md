# 🧠 ZXScript Skills Knowledge Base

คลังความรู้และชุดทักษะระดับมืออาชีพ (Verified Expert Roblox & Luau 0.743 / Studio 0.744 Knowledge Base) สำหรับให้ AI Agent และนักพัฒนาใช้งานเพื่อสร้างเกม Roblox ที่มีคุณภาพระดับ Production

---

## 📚 รายการทักษะทั้งหมด (Skill Catalogue)

### 1. [roblox-dev-skill](./roblox-dev/SKILL.md)
* **แกนหลัก:** คลังความรู้ทางการของ Roblox Studio 0.744 และ Luau 0.743 ที่ผ่านการทดสอบจริงใน Studio
* **ครอบคลุม:**
  - รายการเครื่องมือ MCP ครบทั้ง 33 รายการ (`execute_luau`, `multi_edit`, `search_game_tree`, `generate_mesh`, `auto_setup_avatar` ฯลฯ)
  - กฎการแยก Datamodel Asymmetry (`Edit` สำหรับแก้ไขสคริปต์, `Client/Server` สำหรับ Playtest)
  - ChangeHistoryService Undo Safety (Ctrl+Z)
  - มาตรฐาน Luau สากล (`task.wait`, `task.spawn`, Strict Typing)

### 2. [God-Tier StudioMCP 33 Tools Complete Reference & Decision Matrix](./roblox-dev/references/godtier-mcp-tools-reference.md)
* คู่มือเจาะลึกคำสั่ง StudioMCP ครบทั้ง 33 คำสั่ง พร้อมตารางตัดสินใจ (Decision Matrix)
* รายละเอียดพารามิเตอร์, ตัวอย่างโค้ด JSON/Luau, รูปแบบการคืนค่า และกับดักทางเทคนิคที่พบบ่อย
* คำแนะนำการเชื่อมโยงคำสั่งกับ 6 ทักษะระดับเทพเพื่อประสิทธิภาพสูงสุด

### 3. [God-Tier Modular Service Architecture](./roblox-dev/references/godtier-architecture.md)
* สถาปัตยกรรมระดับองค์กร (Knit-like / Rojo-ready)
* แยก Layer ชัดเจน: ServiceManager -> Init -> Start -> Networking
* ป้องกันปัญหา Circular Dependency และ Yielding in Init 100%

### 4. [God-Tier Server-Authoritative Combat & Anti-Exploit](./roblox-dev/references/godtier-combat-anti-exploit.md)
* การตรวจสอบการโจมตีฝั่ง Server 100% (Never Trust Client)
* ระบบตรวจจับ Raycast Line-of-sight, Distance Sanity, Cooldown Rate-Limiter
* ป้องกัน Wall-Bang, Teleport Hits, และ Remote Spam

### 5. [God-Tier Parallel Luau & Multithreaded Actors](./roblox-dev/references/godtier-parallel-luau.md)
* เทคนิคประมวลผลแบบคู่ขนานบน CPU หลายคอร์ด้วย Actor
* `task.desynchronize()` สำหรับคำนวณ Raycast / AI / Math 120+ FPS
* `task.synchronize()` สำหรับเขียนข้อมูลกลับสู่ DataModel อย่างปลอดภัย

### 6. [God-Tier Monetization & Bulletproof Data Persistence](./roblox-dev/references/godtier-monetization-profilestore.md)
* มาตรฐาน ProfileStore ป้องกันข้อมูลผู้เล่นสูญหาย (Session Locking & Auto-Save)
* Idempotent `MarketplaceService.ProcessReceipt` ป้องกันการจ่ายไอเทมซ้ำ

### 7. [God-Tier Procedural World & Dungeon Generation](./roblox-dev/references/godtier-procedural-world.md)
* อัลกอริทึมสร้างภูมิประเทศและดันเจี้ยนด้วย Perlin Noise / Voxel
* การ Chunking และ Yielding ด้วย ChangeHistoryService ไม่ทำให้ Studio ค้าง

### 8. [God-Tier Character Animations, Markers & Procedural IK](./roblox-dev/references/godtier-animations-and-ik.md)
* การโหลดและจัดการอนิเมชั่นระดับ Production ผ่าน `Animator:LoadAnimation()` (ห้ามใช้ Humanoid:LoadAnimation เก่า)
* การจับจังหวะโจมตี/เสียงที่แม่นยำระดับเฟรมด้วย `GetMarkerReachedSignal()`
* ระบบหันหน้า/ลำตัวตามเป้าหมายแบบเรียลไทม์ด้วย `IKControl` และระบบเอียงตัวขณะวิ่ง (Procedural Lean/Tilt)
