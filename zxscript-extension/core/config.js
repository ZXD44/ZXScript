// Global error catcher for ZXScript
if (typeof window !== "undefined" && !window.__ZS_ERR_GUARD__) {
  window.__ZS_ERR_GUARD__ = true;

  function showZSErrorModal(title, msg, stack) {
    try {
      if (typeof window !== "undefined" && window.__ZS_PLAY_CHIME__) {
        try { window.__ZS_PLAY_CHIME__("error"); } catch {}
      }
      let el = document.getElementById("zs-error-reporter");
      if (!el) {
        el = document.createElement("div");
        el.id = "zs-error-reporter";
        el.style.cssText = [
          "position: fixed", "top: 16px", "right: 16px", "max-width: 380px",
          "width: calc(100vw - 32px)", "background: rgba(18, 20, 24, 0.96)",
          "backdrop-filter: blur(28px) saturate(190%)", "-webkit-backdrop-filter: blur(28px) saturate(190%)",
          "color: #f4f4f5", "border: 1px solid rgba(226, 35, 26, 0.45)",
          "border-radius: 12px", "padding: 12px 14px",
          "box-shadow: 0 20px 48px -4px rgba(0, 0, 0, 0.8), 0 0 16px rgba(226, 35, 26, 0.2)",
          "z-index: 2147483647", "font-family: 'Builder Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          "font-size: 11.5px", "line-height: 1.45", "user-select: text",
          "animation: zs-banner-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        ].join(";");
        (document.body || document.documentElement).appendChild(el);
      }

      const reportPayload = [
        "=== รายงานข้อผิดพลาด ZXScript ===",
        `หมวดหมู่: ระบบ (error)`,
        `หัวข้อ: ${title}`,
        `ข้อความ: ${msg}`,
        stack ? `Stack Trace:\n${stack}` : "",
        `ลิงก์ (URL): ${location.href}`,
        `เวลา: ${new Date().toLocaleString("th-TH")}`,
        `เวอร์ชัน: 0.0.2`,
        "=================================="
      ].filter(Boolean).join("\n");

      const esc = (s) => String(s || "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

      el.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; background: rgba(226, 35, 26, 0.15); border: 1px solid rgba(226, 35, 26, 0.35); color: #f87171;">
            <span>⚠️ ระบบ</span>
          </div>
          <button id="zs-err-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 13px; padding: 0 4px; line-height: 1; transition: color 0.15s;">✕</button>
        </div>
        <div style="font-size: 12.5px; font-weight: 700; color: #ffffff; margin-bottom: 4px; letter-spacing: -0.01em;">${esc(title)}</div>
        <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 8px; word-break: break-word;">${esc(msg || title)}</div>
        ${stack ? `
          <details style="margin-bottom: 10px; font-size: 10.5px; color: #64748b;">
            <summary style="cursor: pointer; color: #00a2ff; font-weight: 600; padding: 2px 0; user-select: none;">🔍 ดู Stack Trace / รายละเอียดเทคนิค</summary>
            <pre style="margin: 6px 0 0; padding: 8px; border-radius: 6px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); font-size: 9.5px; font-family: Consolas, monospace; overflow-x: auto; max-height: 110px; color: #e2e8f0; white-space: pre-wrap; word-break: break-all;">${esc(stack)}</pre>
          </details>
        ` : ""}
        <div style="display: flex; gap: 6px;">
          <button id="zs-err-copy" style="flex: 1; height: 28px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; background: rgba(0, 176, 111, 0.15); border: 1px solid rgba(0, 176, 111, 0.4); color: #00b06f; transition: all 0.15s ease;">📋 คัดลอกรายงาน</button>
        </div>
      `;

      el.querySelector("#zs-err-close").addEventListener("click", () => el.remove());
      const copyBtn = el.querySelector("#zs-err-copy");
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(reportPayload).then(() => {
          copyBtn.textContent = "✓ คัดลอกแล้ว";
          copyBtn.style.background = "rgba(0, 176, 111, 0.3)";
          copyBtn.style.color = "#ffffff";
          setTimeout(() => {
            if (copyBtn) {
              copyBtn.textContent = "📋 คัดลอกรายงาน";
              copyBtn.style.background = "rgba(0, 176, 111, 0.15)";
              copyBtn.style.color = "#00b06f";
            }
          }, 2000);
        }).catch(() => {
          copyBtn.textContent = "คัดลอกไม่สำเร็จ";
        });
      });

      try {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: "zs_error_notify",
            title: "ZXScript ตรวจพบ Error",
            message: msg || title,
            stack: reportPayload
          }, () => void (chrome.runtime && chrome.runtime.lastError));
        }
      } catch {}
    } catch {}
  }

  window.addEventListener("error", (e) => {
    const fn = e.filename || "";
    const isExtension = fn.includes("chrome-extension://") || fn.includes("moz-extension://") ||
                        fn.includes("core/") || fn.includes("providers/") ||
                        (e.error && (e.error.stack || "").includes("chrome-extension://")) ||
                        (e.message && (e.message.includes("ZXScript") || e.message.includes("execute_luau")));
    if (isExtension) {
      showZSErrorModal("Uncaught Error", e.message || "Unknown error", e.error ? e.error.stack : `${fn}:${e.lineno}:${e.colno}`);
    }
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    const stack = (reason && reason.stack) || String(reason || "");
    if (stack.includes("chrome-extension://") || stack.includes("core/") || stack.includes("providers/") || stack.includes("zxscript")) {
      showZSErrorModal("Unhandled Promise Rejection", (reason && reason.message) || String(reason), stack);
    }
  });

  window.__ZS_SHOW_ERROR__ = showZSErrorModal;
}

// SPDX-License-Identifier: GPL-3.0-or-later
// core/config.js - provider-agnostic constants: app identity, system prompt,
// feedback strings, tool categorisation. NOTHING in this file may reference a
// specific AI site (DOM, selectors, site names) - that lives in providers/*.
// eslint-disable-next-line no-unused-vars
const ZS = (() => {
  "use strict";

  // Display name + unique marker injected at the top of the system prompt so the
  // content script can reliably recognise (and camouflage) the bootstrap turn.
  const APP_NAME = "ZXScript";
  const SYS_MARKER = "⟦ZS-SYS⟧";
  // A re-statement of the system prompt mid-session (see withSysResend in
  // core/main.js). It carries SYS_MARKER TOO - that is what drives camouflage
  // and session detection, and neither should change - plus this second marker,
  // purely so the chip can say "Reminder" instead of inheriting the bootstrap's
  // "Starting Up". Same content, different label: a re-injection is not a start.
  const RESEND_MARKER = "⟦ZS-RE⟧";

  // ── Tool → visual category (icon + colour theme for the chips) ─────────
  // Roblox Studio MCP only. Returns one of:
  //   read | edit | screen | generate | roblox | tool
  function toolCategory(name) {
    const n = (name || "").includes("/") ? name.split("/").pop() : (name || "");
    if (n === "list_commands" || n === "list_tools") return "read";
    if (/^(script_read|script_search|script_grep|search_game_tree|inspect_instance|get_studio_state|get_console_output|search_creator_store|list_roblox_studios)$/.test(n))
      return "read";
    if (/^(multi_edit|insert_from_creator_store|store_image)$/.test(n) || n === "execute_luau")
      return "edit";
    if (n === "screen_capture") return "screen";
    if (/^generate_/.test(n)) return "generate";
    if (n.startsWith("roblox") || /studio|luau|instance|workspace/i.test(n)) return "roblox";
    return "tool";
  }

  // Feedback strings sent back to the model so it can self-correct.
  const FEEDBACK = {
    // ข้อความตอบกลับเมื่อเกิดข้อผิดพลาดในการประมวลผลคำสั่ง บังคับใช้ภาษาไทยและโหมด Caveman
    parseError: (reason, toolName) => {
      const otherCmd = toolName && toolName !== "command" && toolName !== "execute_luau";
      const luaMalformed = otherCmd ? "" : " (หรือใช้บล็อก ###LUA### / ###END_LUA### สำหรับ execute_luau)";
      const luaUnclosed = otherCmd ? "" : " (หรือบล็อก ###LUA### ... ###END_LUA### ที่สมบูรณ์)";
      const objAlt = otherCmd ? "" : " (หรือบล็อก ###...###)";
      const notes = {
        malformed:
          "[ข้อผิดพลาด: JSON ไม่ถูกต้อง]\n" +
          '• รูปแบบ: ต้องเป็น JSON ก้อนเดียว เช่น {"command": "name", "params": {...}}' + luaMalformed + "\n" +
          "• โหมด Caveman: ตอบภาษาไทยสั้นกระชับ ตรงประเด็น ห้ามเกริ่นนำ",
        unclosed:
          "[ข้อผิดพลาด: JSON ปิดไม่สมบูรณ์]\n" +
          "• สาเหตุ: คำสั่งถูกตัดก่อนพิมพ์เสร็จ\n" +
          '• วิธีแก้: เขียนใหม่ให้ครบถ้วน เช่น {"command": "name", "params": {...}}' + luaUnclosed,
        luaOpener:
          "[ข้อผิดพลาด: ขาดบล็อก ###LUA###]\n" +
          "• วิธีแก้: ใส่ ###LUA### หน้าโค้ด และปิดท้ายด้วย ###END_LUA### เสมอ",
        envelope:
          "[ข้อผิดพลาด: ขาดโครงสร้างคำสั่ง]\n" +
          '• วิธีแก้: ครอบคำสั่งด้วย {"command": "name", "params": { ... }}\n' +
          '• พารามิเตอร์ทั้งหมดต้องอยู่ข้างใน "params"',
        toolKey:
          "[ข้อผิดพลาด: คีย์คำสั่งผิด]\n" +
          '• วิธีแก้: ต้องใช้ "command" เท่านั้น (ไม่ใช่ "name" หรือ "toolName")\n' +
          '• ใส่พารามิเตอร์ใน "params"',
        dsml:
          "[ข้อผิดพลาด: ตรวจพบแท็ก DSML]\n" +
          "• ห้ามใช้แท็กภายในของโมเดล\n" +
          '• วิธีแก้: ใช้ JSON ธรรมดา เช่น {"command": "name", "params": { ... }}',
      };
      return notes[reason] || notes.malformed;
    },
    multiTool: (names) =>
      "[ข้อผิดพลาด: สั่งหลายคำสั่งพร้อมกัน]\n" +
      "• กฎ: ส่งทีละ 1 คำสั่งเท่านั้น รอผลลัพธ์ก่อนส่งคำสั่งถัดไป\n" +
      "• คำสั่งที่คุณส่ง: " + names.join(", ") + "\n" +
      "• วิธีแก้: ส่งเฉพาะคำสั่งแรกที่ต้องทำก่อน",
    unknownTool: (name, valid) =>
      `[ข้อผิดพลาด: ไม่พบคำสั่ง "${name}"]\n• คำสั่งที่มี: ` + valid.join(", "),
    studioOffline:
      "[ข้อผิดพลาด: Studio ออฟไลน์]\n" +
      "• ยังไม่พบการเชื่อมต่อ Roblox Studio หรือยังไม่ได้เปิด Place\n" +
      "• แจ้งผู้ใช้ 1 ประโยคสั้นๆ ให้เปิด Place และเปิด MCP Server ใน Studio",
    staleExtension:
      "[ข้อผิดพลาด: Extension อัปเดตใหม่]\n" +
      "• แจ้งผู้ใช้ 1 ประโยคสั้นๆ ให้กดรีเฟรชหน้านี้ (F5)",
    bridgeOffline:
      "[ข้อผิดพลาด: Bridge ออฟไลน์]\n" +
      "• แจ้งผู้ใช้ 1 ประโยคสั้นๆ ให้ดับเบิลคลิก start.bat บนคอมพิวเตอร์",
    truncated:
      "[ระบบ: ข้อความก่อนหน้าถูกตัดความยาว]\n" +
      "• ทำงานต่อจากจุดที่ค้างไว้ทันที ห้ามเกริ่นนำหรือทักทาย (โหมด Caveman)",
  };

  const BT = "```";

  function compactTools(tools) {
    return (tools || [])
      .map((t) => {
        const name = t.name || "?";
        const desc = (t.description || "").split("\n")[0].trim();
        const props = (t.inputSchema && t.inputSchema.properties) || {};
        const args = Object.keys(props).join(", ");
        return `  ${name}(${args}) - ${desc}`;
      })
      .join("\n");
  }

  // ── System prompt ─────────────────────────────────────────────────────────
  // ONE unified prompt sent to every AI on the first turn. To change the wording,
  // just edit the text below - it is a single template, no profiles or branching.
  // `${siteName}` is filled in with the AI's display name (e.g. "DeepSeek").
  // `${toolsString}` is filled in with the live command list.
  //
  // `opts` may be a string (just the siteName) or an object { siteName,
  // customPrompt, providerNotes }. `customPrompt` is the user's own extra
  // instructions; when present it is appended at the very bottom under a clear
  // "User's Custom prompt" heading. It NEVER edits the prompt above - it only
  // adds a layer below it.
  //
  // `providerNotes` is a rules block supplied by the ACTIVE provider (its
  // `promptExtra`) for behaviour that is genuinely specific to one AI site. It
  // is passed IN rather than branched on here, so this file keeps its rule of
  // never naming a specific site - the text lives in providers/<site>.js and
  // every other provider is untouched by definition.
  function buildSystemPrompt(opts = {}) {
    if (typeof opts === "string") opts = { siteName: opts };
    const { siteName = "this AI site", customPrompt = "", providerNotes = "" } = opts;

    const prompt = `บริบทระบบ (CONTEXT): ผู้ใช้ได้ติดตั้งส่วนขยายเบราว์เซอร์ ZXScript เพื่อเชื่อมต่อแชต AI เข้ากับ Roblox Studio ของผู้ใช้โดยตรงผ่าน MCP Server (Local Bridge)
เมื่อคุณส่งคำสั่ง ZXScript ในข้อความตอบกลับ ส่วนขยายจะรันคำสั่งบน Roblox Studio ทันทีและส่งผลลัพธ์กลับมาในรอบถัดไป คุณจะได้รับผลลัพธ์เสมอ (ทั้งสำเร็จและแจ้ง Error) เพื่อให้คุณทำงานต่อเนื่องได้จนจบ

Roblox Studio เชื่อมต่อผ่าน Local Bridge เสมอ — มีคำสั่ง StudioMCP ครบทั้ง 33 คำสั่งพร้อมใช้งานโดยตรงตามหมวดหมู่และตารางตัดสินใจ (DECISION MATRIX) ด้านล่าง ห้ามเดาคำสั่งขึ้นมาเองเด็ดขาด

━━━ บัญชีคำสั่ง ROBLOX STUDIO MCP ทั้ง 33 คำสั่ง (33 TOOLS DIRECTORY) ━━━
[1. สำรวจโครงสร้างและอ่านโค้ด (Inspection & Reading)]
• search_game_tree(path, max_depth, keywords, instance_type, head_limit, datamodel_type) - ค้นหาและดูโครงสร้าง Instance แบนเป็น JSON (ใช้ค้นหาวัตถุในเกม)
• inspect_instance(path) - อ่าน Properties, Attributes ทั้งหมด และสรุป Children ของ Instance นั้น (ใช้ก่อนแก้ไข)
• script_search(keywords) - ค้นหาชื่อสคริปต์แบบ Fuzzy search (สูงสุด 10 รายการ)
• script_grep(query) - ค้นหาข้อความ/ลอจิกในโค้ดสคริปต์ทั้งหมดในเกม (สูงสุด 50 ผลลัพธ์)
• script_read(target_file, should_read_entire_file, start_line_one_indexed, end_line_one_indexed_inclusive) - อ่านซอร์สโค้ดพร้อมเลขบรรทัด LINE->CONTENT (ต้องอ่านก่อนใช้ multi_edit ทุกครั้ง)
• get_console_output() - ดึง Error/Warning/Print Log จาก Studio Console เพื่อใช้ตรวจจับบั๊กอัตโนมัติ
• get_studio_state() - เช็กสถานะว่า Studio กำลังรัน Play Mode หรือ Edit Mode และ DataModel ใดพร้อมใช้

[2. สร้างและแก้ไขสคริปต์ / รันโค้ด (Scripting & Execution)]
• multi_edit(file_path, edits, className, datamodel_type) - แก้ไขโค้ดแบบเจาะจง (old_string ต้องตรงเป๊ะ 100%) หรือสร้างสคริปต์ใหม่ (className="Script"|"LocalScript"|"ModuleScript" และ old_string="")
• execute_luau(code, datamodel_type) - รันคำสั่ง Luau สดใน Studio ใช้สร้าง Part, จัดแสง, คำนวณคณิตศาสตร์ (ใช้บล็อก ###LUA### และใช้ return สำหรับค่าผลลัพธ์)

[3. เจนเนอเรตโมเดล 3D และโลกเสมือน (3D AI Generation & World)]
• generate_mesh(textPrompt, segmentation, size, maxTriangles, partNames, async) - เจน 3D Mesh พร้อมเท็กซ์เจอร์ด้วย AI (Organic/Weapons/Props)
• generate_procedural_model(prompt, partNames, attachedImageUri, segmentation, async) - สร้าง 3D Model จาก Roblox Primitive Parts (Blocks, Cylinders, Wedges, Spheres) เหมาะกับสิ่งก่อสร้างและโมเดลแยกชิ้นได้
• generate_scene(textPrompt, images, boundingBoxPosition, boundingBoxSize) - สร้างทั้งฉาก/เกาะ/ดันเจี้ยนพร้อมวัตถุจัดวางเสร็จสรรพ
• generate_material(materialDescription, baseMaterial, materialPattern, materialId, async) - สร้าง PBR MaterialVariant คุณภาพสูงสำหรับ BaseParts
• generate_texture(textPrompt, instance_path, model, hintImage) - เปลี่ยนเท็กซ์เจอร์ของโมเดล/Mesh ที่มีอยู่แล้วด้วย AI Prompt
• segment_mesh(instance_path, parts) - แยกชิ้นส่วน Mesh เดิมออกเป็นชิ้นๆ ตามชื่อ เช่น ["head", "body", "left_arm"]
• auto_setup_avatar(instance_path, setup_type, align_front_angle, r15_plus, reduce_triangles, decal_to_dynamic_head) - แปลง Static 3D Model ให้กลายเป็น R15 Avatar พร้อมกระดูก Motor6D ใช้งานได้ทันที

[4. แอสเซทและคลังข้อมูล (Assets & Store)]
• search_asset(query, assetType, audioMinDuration, audioMaxDuration, priceFilter, tags, verifiedCreatorsOnly, scope, maxResults) - ค้นหา Asset ใน Creator Store หรือ Inventory (Models, Audio, Decals, Animations)
• insert_asset(assetId, assetName, assetType, parentPath) - โหลดและแทรก Asset ลงเกมตาม numeric asset ID
• store_image(filePath) - โหลดไฟล์ภาพจากเครื่องมาเป็น URI สำหรับสร้าง Texture/Procedural Model
• upload_image(imagePaths) - อัปโหลดรูปภาพหลายรูปขึ้น Roblox CDN เพื่อใช้เป็น rbxassetid://

[5. ทดสอบและจำลองผู้เล่น (Playtest & Simulation)]
• start_stop_play(is_start) - เปิด/ปิด Play Mode ใน Studio เพื่อทดสอบเกม (is_start=true เริ่มเล่น, false หยุดเล่น)
• user_keyboard_input(actions, datamodel_type) - กดปุ่มคีย์บอร์ดเสมือนจริงในโหมด Play (keyDown, keyUp, keyPress, textInput, wait)
• user_mouse_input(actions, datamodel_type) - คลิก/ขยับเมาส์เสมือนจริงในโหมด Play (moveTo, mouseButtonClick, mouseButtonDown, mouseButtonUp, scrollUp, scrollDown, wait)
• character_navigation(x, y, z, instance_path, speed_multiplier, datamodel_type) - สั่งตัวละครเดินไปยังพิกัดหรือวัตถุเป้าหมาย
• screen_capture(camera_position, look_at_position, capture_id) - แคปเจอร์หน้าจอภาพมุมมอง Studio เพื่อดูผลลัพธ์ด้วยตา

[6. ระบบทักษะและเอเจนต์ย่อย (Skills & Subagents)]
• list_skills() - แสดงรายการทักษะความรู้พิเศษทั้งหมดที่มีใน Studio MCP
• skill(skill_name) - โหลดคำแนะนำ วิธีปฏิบัติที่ดีที่สุด (Best Practices) ของทักษะนั้นๆ จาก Studio
• create_skill(skill_name, skill_description, skill_body) - สร้างทักษะความรู้ใหม่ลงใน Studio MCP เพื่อให้ AI เรียกใช้ซ้ำได้
• edit_skill(skill_name, new_name, new_description, new_skill_body) - แก้ไขทักษะเดิมที่เคยสร้างไว้ใน Studio
• คลังทักษะระดับเทพ 8 ด้าน (8 God-Tier Skills Arsenal): คุณมีคลังความรู้ระดับมืออาชีพฝังในระบบเรียบร้อยแล้ว:
  (1) God-Tier Service Architecture (Init -> Start lifecycle)
  (2) God-Tier Server-Authoritative Combat & Anti-Exploit (Raycast validation)
  (3) God-Tier Parallel Luau (Actor desynchronize/synchronize)
  (4) God-Tier ProfileStore Persistence & Session Lock
  (5) God-Tier Procedural World & Dungeon Generation
  (6) God-Tier Modern Animations, Markers & IKControl
  (7) God-Tier 33 StudioMCP Tools Reference & Decision Matrix
  (8) Verified roblox-dev Knowledge Base (Roblox 0.744 / Luau 0.743)
• subagent(subagent_type, task, description) - เปิด Subagent ทำงานใหญ่แบบอิสระ
• wait_job_finished(jobId, timeout) - รอ Job ที่รันเบื้องหลัง (เช่น Async Mesh) จนเสร็จ
• http_get(url, query, return_full) - ดึงข้อมูลภายนอกผ่าน HTTP GET (Docs/API)
• list_roblox_studios() - แสดงรายชื่อ Studio Windows ที่เปิดอยู่เพื่อเลือก studio_id

━━━ กลยุทธ์การเลือกใช้คำสั่ง (DECISION MATRIX): ━━━
• ต้องการดูว่ามีอะไรในเกม / ตำแหน่งไหน? -> search_game_tree ก่อนเสมอ ห้ามเดา Path
• ต้องการดู Properties ละเอียดของ Part/Model ก่อนแก้? -> inspect_instance
• ต้องการค้นหาสคริปต์ในโปรเจกต์? -> script_search (หาจากชื่อ) หรือ script_grep (หาจากข้อความข้างใน)
• ต้องการแก้โค้ดสคริปต์เดิม? -> script_read ดึงเนื้อหาก่อน -> multi_edit แก้ไขตรงจุด
• ต้องการสร้างสคริปต์ใหม่? -> multi_edit ระบุ className="Script"|"LocalScript"|"ModuleScript" และ old_string=""
• ต้องการเสก Part / วัตถุ / เซ็ตแสง / ลอจิกฉุกเฉิน? -> execute_luau ครอบด้วย ###LUA###
• ต้องการตรวจจับ Runtime Error หลังแก้โค้ด? -> get_console_output
• ต้องการสร้างสิ่งก่อสร้าง/บล็อกแยกชิ้นได้? -> generate_procedural_model
• ต้องการสร้างมอนสเตอร์/ตัวละคร/อาวุธ 3D สวยงาม? -> generate_mesh
• ต้องการใส่กระดูก R15 ให้โมเดลตัวละคร? -> auto_setup_avatar
• ต้องการหาเสียงเพลง/อนิเมชั่น/โมเดลฟรีจาก Store? -> search_asset -> insert_asset
• ต้องการเทสต์การเล่นจริง? -> start_stop_play -> character_navigation / user_keyboard_input / user_mouse_input -> screen_capture

คำเตือนสำคัญ: ฟีเจอร์ Function Calling หรือ Code Interpreter ของเว็บ AI นี้ทำงานใน Sandbox ที่ไม่สามารถเข้าถึง Roblox Studio ในเครื่องของผู้ใช้ได้ คำสั่ง ZXScript ต้องพิมพ์เป็นข้อความธรรมดา (Plain Text) ภายในบล็อกโค้ดตามรูปแบบที่กำหนดเท่านั้น ห้ามเรียก Tool ผ่านฟังก์ชันภายในของระบบ AI

⚠️ รูปแบบการเขียนคำสั่ง (บังคับ 100%): ทุกคำสั่งต้องอยู่ภายใน Fenced Code Block (ครอบด้วย \`\`\`) เสมอ

━━━ รูปแบบคำสั่งมาตรฐาน (คำสั่ง JSON ทั้งหมด ยกเว้น execute_luau) ━━━
เขียนในบล็อกโค้ด json แทนที่ placeholder ด้วยชื่อคำสั่งและพารามิเตอร์จริง:
${BT}json
{
  "command": "ชื่อคำสั่ง",
  "params": {"key": "value"}
}
${BT}
ตัวอย่าง: เรียกดูคำสั่งทั้งหมด เขียน ${BT}{"command": "list_commands"}${BT}

━━━ รูปแบบพิเศษสำหรับ execute_luau ━━━
execute_luau เป็นข้อยกเว้นเดียว: บังคับใช้บล็อก ###LUA### เสมอ ห้ามใส่ใน JSON format
${BT}
###LUA###
-- เขียนโค้ด Luau ที่นี่ ไม่ต้อง escape เครื่องหมายคำพูด
local part = Instance.new("Part")
part.Anchored = true
part.Parent = workspace
return part.Name
###END_LUA###
${BT}

🚨 กฎเหล็กโหมด CAVEMAN & การสื่อสารภาษาไทย (TOKEN EFFICIENCY สูงสุด - บังคับใช้ 100%):
- สื่อสารด้วยภาษาไทยแบบ Caveman Mode เคร่งครัด: สั้น กระชับ ตรงเป้าหมาย ตรงประเด็น ไร้น้ำยา (Zero Fluff)
- ห้ามพิมพ์คำทักทาย, คำเกริ่นนำ, ข้อความสุภาพ หรือคำลงท้ายที่ไม่จำเป็น (ห้ามพูดว่า "สวัสดีครับ", "ยินดีที่ได้ช่วย", "ผมจะเริ่มทำ...", "ขอตรวจสอบ...")
- ส่งคำสั่ง Tool ทันที ไม่ต้องพิมพ์บรรยายว่าจะทำอะไร ให้ยิงคำสั่งเลย
- เมื่อเสร็จงานหรือสรุปผล ให้ตอบด้วยภาษาไทยสั้นๆ 1 ประโยคเท่านั้น ประหยัด token สูงสุด
- ส่งได้ครั้งละ 1 คำสั่งต่อข้อความ และรอรับผลลัพธ์ก่อนส่งคำสั่งถัดไป
- ใช้เฉพาะชื่อคำสั่งและพารามิเตอร์จริงจาก list_commands เท่านั้น ห้ามเดา
- execute_luau: ครอบด้วย ###LUA### ... ###END_LUA### เสมอ ถ้าเกมกำลังรัน Play Mode ให้ใช้ ###LUA:Server### หรือ ###LUA:Client### ใช้ return สำหรับค่า output (print() จะไม่ถูกจับผลลัพธ์)
- MODERN LUAU (ROBLOX 0.744 / LUAU 0.743): บังคับใช้ task.wait(), task.spawn(), task.delay(), task.cancel() ห้ามใช้ wait(), spawn(), delay() เก่าเด็ดขาด ใช้ workspace:Raycast() แทน FindPartOnRay
- ZERO GUESSING: ห้ามเดา Path ใน Explorer ก่อนแก้ไขหรือเขียนโค้ด ต้อง inspect_instance หรือ search_game_tree เสมอ
- GOD-TIER SERVICE ARCHITECTURE: แยก Server / Client ชัดเจน Server คุม Data และ Logic 100%, Client เรนเดอร์ UI และส่ง Input Intent. ใช้ Init -> Start lifecycle
- SERVER-AUTHORITATIVE COMBAT: ห้ามให้ Client ส่งดาเมจ ให้ส่งเฉพาะ Action Intent แล้ว Server ยิง Raycast ตรวจ Line-of-sight, Distance, และ Cooldown Rate-Limiting
- PROFILESTORE DATA PERSISTENCE: ข้อมูลผู้เล่นต้องเซฟผ่าน ProfileStore / DataStoreService ปลอดภัย รองรับ Session Locking, Auto-save ทุก 5 นาที, และ BindToClose
- PARALLEL LUAU (ACTORS): งานคำนวณหนัก (AI/Pathfinding/Raycasts 100+ ตัว) ให้รันใน Actor ด้วย task.desynchronize() และ task.synchronize() เขียนค่ากลับ
- MODERN ANIMATIONS & IK: บังคับใช้ Animator:LoadAnimation() บน Client (ห้ามใช้ Humanoid:LoadAnimation เก่าเด็ดขาด) และใช้ track:GetMarkerReachedSignal() สำหรับ sync ดาเมจ/เสียง ใช้ IKControl สำหรับหันศีรษะ/มองเป้าหมาย
- สร้าง UI/วัตถุก่อนเขียนสคริปต์: สร้าง Instance ก่อน แล้วจึงเขียน Script เชื่อมโยงผ่าน WaitForChild(name, 5)
- ห้าม Destroy() สุ่มสี่สุ่มห้า: ห้ามสั่ง ClearAllChildren() หรือ Destroy() โฟลเดอร์หลักโดยไม่ระบุเป้าหมายชัดเจน
- AUTO-DEBUG: หลังสร้างหรือแก้สคริปต์ ให้รัน get_console_output เพื่อตรวจจับ runtime error และแก้ปัญหาอัตโนมัติ

━━━ หน่วยความจำโปรเจกต์ (PROJECT MEMORY) ━━━
game.ServerStorage.ZXScript.Memory (ModuleScript) เป็นหน่วยความจำถาวรของโปรเจกต์นี้
- สรุปและบันทึกเฉพาะสิ่งที่สำคัญ: โครงสร้างเกม, ตำแหน่งสคริปต์หลัก, Convention, ข้อตกลงระบบ, TODO
- เมื่อผู้ใช้บอกพักผ่อน ("พัก", "พักผ่อน", "หยุดทำ", "เสร็จแล้ว", "ไปนอน", "นอนละ", "บาย", "done", "rest"):
  คุณต้องอ่านและอัปเดตสรุปความก้าวหน้าลงใน game.ServerStorage.ZXScript.Memory อัตโนมัติทันทีผ่าน multi_edit จากนั้นตอบสั้นๆ 1 ประโยคว่าบันทึกเรียบร้อยแล้วและขอให้พักผ่อนให้สบาย`;

    const siteRules = providerNotes.trim()
      ? `\n\n━━━ ข้อกำหนดเพิ่มเติมเฉพาะเว็บ AI นี้ ━━━\n${providerNotes.trim()}`
      : "";

    const extra = customPrompt.trim()
      ? `\n\n━━━ คำสั่งเพิ่มเติมจากผู้ใช้ (USER CUSTOM PROMPT) ━━━\n${customPrompt.trim()}`
      : "";

    return `${SYS_MARKER}\n${prompt}${siteRules}${extra}`;
  }

  // ── Curated, TESTED usage notes per command ─────────────────────────────────
  // The MCP's own schema descriptions are thin, and the model makes the same
  // mistakes repeatedly. These notes were validated by actually running each
  // command against a live Roblox Studio (2026-06). Keyed by BARE command name;
  // appended to that command in the list_commands output. Keep each note tight
  // and concrete - it costs context on every reminder.
  const TOOL_NOTES = {
    execute_luau:
      "Use `return` to produce output - `print()` is NOT captured (a script with only print() returns nil). " +
      "Only the FIRST returned value is shown: `return a, b` shows just `a`; to return several values return ONE table, " +
      "e.g. `return {ok=true, n=3}` (tables come back as JSON). " +
      "Runs synchronously with a ~20s budget: a brief `task.wait(1)` is fine, but anything that can block or never resolve will TIME OUT. " +
      "ALWAYS pass a timeout to WaitForChild - write `obj:WaitForChild(\"X\", 5)`, NEVER `obj:WaitForChild(\"X\")`: without the timeout it blocks until the budget kills the whole call. " +
      "Same for `:Wait()` on events, infinite loops, HttpService/DataStore - set those up inside a real Script/LocalScript instance instead, never directly in execute_luau. " +
      "Property types must match exactly (e.g. Position needs Vector3.new(...), not a string). " +
      "On error you get a long internal stack prefix - the REAL message is the LAST segment after the final ':' " +
      "(e.g. '... : Vector3 expected, got string', or 'Failed to parse command code' for a syntax error). " +
      "Create objects with Instance.new and set .Parent; reach services via game:GetService(\"Name\").",
    multi_edit:
      "old_string must match the script's current text EXACTLY, byte-for-byte, including tabs and spaces - otherwise you get " +
      "'old_string ... not found in current content'. ALWAYS script_read the file FIRST and copy the exact text. " +
      "It replaces the FIRST match and does NOT warn on multiple matches, so a short old_string can silently edit the WRONG " +
      "line and break the code - include enough surrounding context (whole lines) to be unique, or set replace_all:true for renames. " +
      "old_string and new_string must differ ('identical old_string and new_string' otherwise). " +
      "WATCH FOR BAD UNICODE in old_string: do NOT retype code that contains quotes or dashes - this chat can silently turn " +
      "straight quotes \" into curly ones and -- into a long unicode dash, which then do NOT byte-match the script and the edit fails. " +
      "Paste old_string verbatim from script_read. (new_string may contain unicode safely - it is written as-is.) " +
      "Edits apply in order, each on the result of the previous, and are atomic (all succeed or none). " +
      "To CREATE a script: set className (Script/LocalScript/ModuleScript) and make the first edit old_string:\"\" with the full initial source. " +
      "datamodel_type must be \"Edit\".",
    search_game_tree:
      "Explores instance hierarchy returning a flat JSON list. Filter with 'path' (e.g. 'Workspace', 'ReplicatedStorage'), " +
      "'max_depth' (default 2), 'keywords', and 'instance_type'. ALWAYS run this first before modifying instances to avoid path guessing.",
    inspect_instance:
      "Path is dot-notation and case-insensitive, e.g. 'Workspace.Model.Part'. Returns all readable properties, attributes, " +
      "and a children summary (not the children's properties - inspect them separately). If several instances share the path, " +
      "up to 20 matches are returned. Use this to read exact property names/values before editing them with execute_luau.",
    script_search:
      "Fuzzy search by script name across the entire place. Returns up to 10 matches. Use to find target script before script_read.",
    script_grep:
      "Full-text search inside all scripts for a keyword or pattern. Capped at 50 results. Ideal for tracking function usage or RemoteEvents.",
    script_read:
      "Reads the WHOLE script by default with line numbers (LINE->CONTENT). Use it before multi_edit so your old_string " +
      "matches exactly. target_file is a full dot-path; it never creates a script (use search/grep first to find the path).",
    get_console_output:
      "Fetches Output log messages (prints, warnings, and errors) from Roblox Studio. Run immediately after script edits or during playtests to catch bugs.",
    get_studio_state:
      "Returns Studio play state (isPlaying, isEdit) and available datamodel types (Edit, Server, Client). Check before sending player inputs.",
    start_stop_play:
      "Toggles playtesting simulation in Studio: set is_start:true to begin playtest, is_start:false to return to Edit mode.",
    user_keyboard_input:
      "Simulates a real player typing during PLAY. REQUIRES \"datamodel_type\":\"Client\" AND the game RUNNING - the Client " +
      "datamodel only exists in play mode, so first call start_stop_play {\"is_start\": true}; in Edit mode this fails. " +
      "actions is an ORDERED array of objects: keyDown | keyUp | keyPress | textInput | wait. Key names: Space, Return, A..Z, Zero..Nine, LeftShift.",
    user_mouse_input:
      "Simulates real player mouse actions during PLAY. Requires datamodel_type:\"Client\" AND game RUNNING. " +
      "First step needs x/y coordinates or instance_path (e.g. 'LocalPlayer.PlayerGui.ShopGui.BuyBtn'). Actions: moveTo, mouseButtonClick, mouseButtonDown, mouseButtonUp, scrollUp, scrollDown, wait.",
    character_navigation:
      "Navigates player character to target Vector3 position (x, y, z) or instance_path with speed_multiplier during playtest.",
    screen_capture:
      "Captures high-resolution screenshot of the Studio viewport. Optional camera_position and look_at_position let you view builds from any angle.",
    generate_mesh:
      "AI textured 3D mesh generator. Unlike generate_procedural_model, this call YIELDS: it blocks until generation completes and inserts the mesh into Workspace.",
    generate_procedural_model:
      "Generates 3D models made from primitive parts (blocks, spheres, cylinders, wedges). Returns immediately with generationId. Use wait_job_finished if next step depends on it.",
    generate_scene:
      "Generates a complete multi-part scene from text prompt and bounding box (boundingBoxPosition, boundingBoxSize). Inserts models and parts in place.",
    generate_material:
      "Generates PBR MaterialVariant. Returns baseMaterial and MaterialVariant name; apply both to BasePart.Material and BasePart.MaterialVariant.",
    generate_texture:
      "Re-textures existing MeshPart or Model in place based on text prompt. Warning: replaces texture on target; duplicate instance first if backup needed.",
    segment_mesh:
      "AI-segments single mesh into separate sub-parts by names (e.g. ['head', 'body', 'tail']). Inserts new Model beside original.",
    auto_setup_avatar:
      "Automatically rigs a static 3D Model into a fully functional R15 Avatar with Motor6D joints, ready for animation and player spawning.",
    search_asset:
      "Searches Creator Store (marketplace) and Inventory. Filter by query, assetType (Model, Decal, Audio, Animation), price, and verifiedCreatorsOnly.",
    insert_asset:
      "Inserts asset by numeric Roblox Asset ID (assetId) into parentPath (default: Workspace).",
    store_image:
      "Loads local image file (<=5MB) into an IMAGEID_<id> URI for use with generate_procedural_model or texture tools.",
    upload_image:
      "Uploads batch of images from HTTP URLs to Roblox CDN, returning map of {url: 'rbxassetid://...'}.",
    wait_job_finished:
      "Waits for an async generation job to complete (Completed, Failed, or Cancelled). Pass jobId from async generate calls.",
    list_skills:
      "Lists available specialized Studio MCP skills and descriptions.",
    skill:
      "Loads specialized guidelines and best practices for specific Roblox Studio skill (e.g. rbx-debug, rbx-perf).",
    create_skill:
      "Creates and registers a custom skill into Studio MCP for future reuse.",
    edit_skill:
      "Edits an existing user-created skill in Studio MCP.",
    subagent:
      "Spawns an autonomous subagent inside Studio to handle multi-step exploration or testing tasks.",
    http_get:
      "Fetches external documentation or API markdown files via HTTP GET.",
    list_roblox_studios:
      "Lists connected Studio instances. Required when multiple Studio windows are open to obtain studio_id.",
  };

  // A short, clearly-labelled reminder of the available commands, injected under
  // a tool result every so often so the model does not drift from the exact
  // command names over a long session. It is explicitly framed as an automatic
  // ZXScript reminder (NOT a user message and NOT a new command to run).
  function toolsReminder(tools) {
    const toolsString =
      "  list_commands() - แสดงรายการคำสั่ง Roblox Studio ทั้งหมดพร้อมพารามิเตอร์\n" +
      compactTools(tools);
    return (
      "\n\n────────────────────────────────\n" +
      "(ข้อความระบบอัตโนมัติจาก ZXScript - ทบทวนคำสั่ง: ปฏิบัติตามโหมด CAVEMAN เคร่งครัด ตอบภาษาไทยสั้น กระชับ ตรงประเด็น ไร้น้ำยา ประหยัด token สูงสุด ห้ามพูดทักทายหรือเกริ่นนำ)\n" +
      "รายการคำสั่ง Roblox Studio:\n" +
      toolsString
    );
  }

  function memoryNudge() {
    return (
      "(ทบทวน: หากมีข้อมูลสถาปัตยกรรมหรือข้อตกลงสำคัญของโปรเจกต์ที่ต้องจดจำ ให้บันทึกลง game.ServerStorage.ZXScript.Memory ด้วย multi_edit - สรุปเฉพาะเนื้อหาสำคัญที่จำเป็น)"
    );
  }

  return {
    APP_NAME,
    SYS_MARKER,
    RESEND_MARKER,
    FEEDBACK,
    toolCategory,
    buildSystemPrompt,
    compactTools,
    toolsReminder,
    memoryNudge,
    TOOL_NOTES,
  };
})();
