// Global error catcher for ZXScript
if (typeof window !== "undefined" && !window.__ZS_ERR_GUARD__) {
  window.__ZS_ERR_GUARD__ = true;

  function showZSErrorModal(title, msg, stack) {
    try {
      let el = document.getElementById("zs-error-reporter");
      if (!el) {
        el = document.createElement("div");
        el.id = "zs-error-reporter";
        el.style.cssText = [
          "position: fixed", "top: 16px", "right: 16px", "max-width: 380px",
          "width: calc(100vw - 32px)", "background: #18181b", "color: #f4f4f5",
          "border: 1px solid rgba(239, 68, 68, 0.45)", "border-left: 4px solid #ef4444",
          "border-radius: 10px", "padding: 12px 14px", "box-shadow: 0 20px 40px rgba(0,0,0,0.6)",
          "z-index: 2147483647", "font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
          "font-size: 12px", "line-height: 1.4", "user-select: text"
        ].join(";");
        (document.body || document.documentElement).appendChild(el);
      }

      const reportPayload = [
        "=== ZXScript Error Report ===",
        `Title: ${title}`,
        `Message: ${msg}`,
        `Stack: ${stack || "N/A"}`,
        `URL: ${location.href}`,
        `Time: ${new Date().toLocaleString("th-TH")}`,
        `UserAgent: ${navigator.userAgent}`,
        "============================="
      ].join("\n");

      const esc = (s) => String(s || "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

      el.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <div style="font-weight: 600; color: #f87171; display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>ZXScript ตรวจพบ Error</span>
          </div>
          <button id="zs-err-close" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 14px; padding: 0 4px;">✕</button>
        </div>
        <div style="font-size: 11.5px; color: #e4e4e7; margin-bottom: 6px; font-weight: 500; word-break: break-word;">${esc(msg || title)}</div>
        <div style="font-size: 10px; color: #71717a; max-height: 90px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 6px; font-family: monospace; margin-bottom: 10px; white-space: pre-wrap; word-break: break-all;">${esc(stack || "ไม่มี Stack Trace")}</div>
        <div style="display: flex; gap: 6px;">
          <button id="zs-err-copy" style="flex: 1; background: #10b981; color: #09090b; border: none; border-radius: 6px; padding: 7px 10px; font-size: 11px; font-weight: 600; cursor: pointer; transition: opacity 0.15s;">📋 คัดลอก Log Error ไปส่ง</button>
        </div>
      `;

      el.querySelector("#zs-err-close").addEventListener("click", () => el.remove());
      const copyBtn = el.querySelector("#zs-err-copy");
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(reportPayload).then(() => {
          copyBtn.textContent = "✓ คัดลอกเรียบร้อยแล้ว!";
          copyBtn.style.background = "#059669";
          copyBtn.style.color = "#ffffff";
          setTimeout(() => {
            if (copyBtn) {
              copyBtn.textContent = "📋 คัดลอก Log Error ไปส่ง";
              copyBtn.style.background = "#10b981";
              copyBtn.style.color = "#09090b";
            }
          }, 2500);
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

Roblox Studio เชื่อมต่อผ่าน Local Bridge เสมอ — ให้เรียกใช้ \`list_commands\` เป็นคำสั่งแรกเพื่อดึงรายการคำสั่งและพารามิเตอร์ทั้งหมด หากต้องการใช้งานแอปอื่น (เช่น Blender, Sketchfab) ให้เรียก \`list_mcp_servers\` ก่อนเสมอ ห้ามเดาคำสั่งขึ้นมาเอง

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
    inspect_instance:
      "Path is dot-notation and case-insensitive, e.g. 'Workspace.Model.Part'. Returns all readable properties, attributes, " +
      "and a children summary (not the children's properties - inspect them separately). If several instances share the path, " +
      "up to 20 matches are returned. Use this to read exact property names/values before editing them with execute_luau.",
    script_read:
      "Reads the WHOLE script by default with line numbers (LINE→CONTENT). Use it before multi_edit so your old_string " +
      "matches exactly. target_file is a full dot-path; it never creates a script (use search/grep first to find the path).",
    user_keyboard_input:
      "Simulates a real player typing during PLAY. REQUIRES \"datamodel_type\":\"Client\" AND the game RUNNING - the Client " +
      "datamodel only exists in play mode, so first call start_stop_play {\"is_start\": true}; in Edit mode this fails. " +
      "(ZXScript auto-fills datamodel_type:\"Client\" if you omit it, but the game must still be running.) " +
      "\"actions\" is an ORDERED array of OBJECTS - each step MUST be {\"action\": ...}, NOT a bare string (a missing/misnamed action " +
      "gives 'Unknown ... action: nil'). action is one of: keyDown | keyUp | keyPress (down+up) | textInput | wait. " +
      "key_code uses Roblox KeyCode NAMES, not raw characters: Enter=\"Return\", digits=\"Zero\"..\"Nine\", letters=single uppercase " +
      "\"A\"..\"Z\", plus \"Space\", \"Backspace\", \"Tab\", arrows \"Up\"/\"Down\"/\"Left\"/\"Right\", modifiers \"LeftShift\"/\"LeftControl\"/\"LeftAlt\" " +
      "- REQUIRED on keyDown/keyUp/keyPress ('key_code is required' otherwise). To type a whole string use ONE textInput step with " +
      "\"text_inputs\":\"hello\" instead of many keyPress. A \"wait\" step MUST carry \"wait_time_ms\" (0-10000) ('wait_time_ms is required " +
      "for wait action' otherwise). Optional \"instance_path\" routes input to a focused GUI element and must start with game, LocalPlayer " +
      "or Workspace (e.g. \"LocalPlayer.PlayerGui.Menu.NameBox\"); omit it to send to whatever currently has focus. " +
      "Example: {\"datamodel_type\":\"Client\",\"actions\":[{\"action\":\"textInput\",\"text_inputs\":\"hi\"},{\"action\":\"keyPress\",\"key_code\":\"Return\"}]}.",
    generate_mesh:
      "Unlike generate_procedural_model, this call YIELDS: it blocks until the AI mesh generation finishes and only then " +
      "returns the result (the finished mesh) - there is no separate poll/wait step needed, just wait for the response.",
    generate_procedural_model:
      "Unlike generate_mesh, this call does NOT yield: it returns immediately with a generationId while the model builds " +
      "in the background and auto-inserts into the workspace once done - do NOT run other commands assuming the model already " +
      "exists yet. Do NOT call wait_job_finished as a reflex right after this - but DO call it (pass the generationId) whenever " +
      "you actually need the finished result before continuing: either the user explicitly asked to wait, or your next step " +
      "depends on the model being done (e.g. editing/coloring it, checking its geometry).",
    user_mouse_input:
      "Simulates real player mouse actions during PLAY. Same requirement as user_keyboard_input: \"datamodel_type\":\"Client\" (auto-filled " +
      "if omitted) AND the game RUNNING (start_stop_play {\"is_start\": true} first; fails in Edit mode). " +
      "\"actions\" is an ORDERED array of OBJECTS - each step MUST be {\"action\": ...}, NOT a bare string (a missing/misnamed action gives " +
      "'Unknown mouse action: nil'). action is one of: moveTo | mouseButtonDown | mouseButtonUp | mouseButtonClick | scrollUp | scrollDown | wait. " +
      "You MUST establish a position BEFORE any click/scroll: the FIRST step needs \"x\"/\"y\" (screen pixels) OR \"instance_path\" " +
      "(starts with game/LocalPlayer/Workspace; if set, x/y are ignored) - else 'Either x and y, instance_path, or a prior action ... is " +
      "required'. Later steps may omit x/y and reuse the last position (click then scroll at the same spot). " +
      "mouseButtonDown/Up/Click need \"mouse_button\":\"left\" or \"right\". A \"wait\" step needs \"wait_time_ms\" (0-10000). " +
      "Example: {\"datamodel_type\":\"Client\",\"actions\":[{\"action\":\"mouseButtonClick\",\"mouse_button\":\"left\",\"instance_path\":\"LocalPlayer.PlayerGui.Menu.PlayBtn\"}]}.",
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
