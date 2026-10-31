// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * core/tools.js - Tool communication, MCP execution supervisor, and feedback formatters.
 */
(() => {
  "use strict";

  window.ZS = window.ZS || {};
  const { A, diag, bareToolName, IMAGE_FEEDBACK_RE, ui } = window.ZS;

  const isContextInvalidated = (m) =>
    /Extension context invalidated|Receiving end does not exist|message port closed/i.test(m || "");

  function bg(msg) {
    return new Promise((resolve) => {
      const fail = (m) =>
        resolve({
          ok: false,
          kind: isContextInvalidated(m) ? "stale-extension" : "disconnected",
          error: m,
        });
      try {
        chrome.runtime.sendMessage(msg, (resp) => {
          if (chrome.runtime.lastError) fail(chrome.runtime.lastError.message);
          else resolve(resp || { ok: false, kind: "disconnected", error: "no response from background" });
        });
      } catch (e) {
        fail(String((e && e.message) || e));
      }
    });
  }

  const ALWAYS_BLOCKED_TOOLS = new Set();
  const VISION_TOOLS = new Set();
  const bareKey = (n) => String(n || "").split("/").pop().split(".").pop();

  function knownTool(name) {
    if (!name || !A.toolNames.size) return false;
    if (A.toolNames.has(name) || A.toolNames.has(bareToolName(name))) return true;
    const b = bareKey(name);
    for (const t of A.toolNames) if (bareKey(t) === b) return true;
    return false;
  }

  const isBlockedTool = (name) => {
    const P = window.ZSProvider;
    const bare = bareToolName(name);
    if (ALWAYS_BLOCKED_TOOLS.has(bare)) return true;
    if (VISION_TOOLS.has(bare) && P && !P.supportsVision) return true;
    return false;
  };

  function rememberImageTool(name) {
    const bare = bareToolName(name);
    if (!bare || A.imageTools.has(bare)) return;
    A.imageTools.add(bare);
    diag("imageTool.remember", { name: bare, total: A.imageTools.size });
    try {
      chrome.storage.local.set({ zsImageTools: [...A.imageTools].slice(-200) });
    } catch {}
  }

  try {
    chrome.storage.local.get("zsImageTools", (r) => {
      if (r && Array.isArray(r.zsImageTools)) for (const n of r.zsImageTools) A.imageTools.add(n);
      diag("imageTool.loaded", { tools: [...A.imageTools] });
    });
  } catch {}

  const TOOLS_TTL_MS = 30000;

  async function ensureTools(force) {
    if (!force && A.toolList.length && Date.now() - A.toolsAt < TOOLS_TTL_MS) {
      diag("tools.cached", { age: Date.now() - A.toolsAt, n: A.toolList.length });
      return A.toolList;
    }
    const t0 = Date.now();
    const r = await bg({ type: "list_tools" });
    diag("tools.fetched", { ms: Date.now() - t0, n: (r && r.tools && r.tools.length) || 0 });
    if (r && r.tools && r.tools.length) {
      const tools = r.tools.filter((t) => !isBlockedTool(t.name));
      A.toolList = tools;
      A.toolNames = new Set(tools.map((t) => t.name));
      A.toolsAt = Date.now();
    }
    return A.toolList;
  }

  async function runTool(call) {
    const P = window.ZSProvider;
    const name = call.tool;
    const args = call.arguments || {};
    if (!name) return window.ZS.FEEDBACK.parseError("malformed");

    if (document.hidden && !A.stop) {
      diag("tool.waitVisible", { name });
      if (!window.ZS.waitVisible || !(await window.ZS.waitVisible()) || A.stop) {
        return "[ข้อผิดพลาด: คำสั่งไม่ได้รัน - ผู้ใช้สั่งหยุด]";
      }
    }

    const bareName = bareToolName(name);
    if (isBlockedTool(name)) {
      if (VISION_TOOLS.has(bareName)) {
        return `[ข้อผิดพลาด: คำสั่ง '${bareName}' ไม่รองรับ]\n• ผู้ช่วย AI นี้มองไม่เห็นรูปภาพ ห้ามเรียกคำสั่งนี้ซ้ำ\n• วิธีแก้: ใช้คำสั่งตรวจสอบแบบโค้ดแทน เช่น inspect_instance, get_studio_state, search_game_tree, script_read`;
      }
      return `[ข้อผิดพลาด: คำสั่ง '${bareName}' หมดเวลา]\n• คำสั่งนี้ไม่พร้อมใช้งานในระบบนี้ ห้ามเรียกซ้ำ\n• วิธีแก้: ใช้คำสั่งอื่นทำงานแทน (execute_luau, multi_edit เป็นต้น)`;
    }

    if (name === "list_mcp_servers") {
      await ensureTools();
      const servers = (A.bridge && A.bridge.servers) || [];
      const lines = servers.length
        ? servers.map((sv) => {
            const label = sv.id === "roblox" ? "Roblox Studio (primary)" : `${sv.id} (addon)`;
            return `- ${sv.id}: ${label} - ${sv.alive ? `${sv.tools || 0} commands available` : "offline (no tools)"}`;
          })
        : ["- roblox: Roblox Studio (primary) - unknown"];
      return (
        `Output of 'list_mcp_servers':\n` +
        `Connected MCP servers (${lines.length}):\n${lines.join("\n")}\n` +
        `Use list_commands with a "server" param to see commands.`
      );
    }

    if (name === "list_commands" || name === "list_tools") {
      await ensureTools();
      const requested = (args.server || "roblox").trim();
      if (requested === "roblox") {
        const s = A.bridge || {};
        const srv = s.servers || [];
        const rbx = srv.find((x) => x.id === "roblox");
        const rbxAlive = rbx ? !!rbx.alive : !!s.mcpAlive || srv.some((x) => x.alive);
        const rbxUsable = !!s.connected && rbxAlive && s.studio !== false;
        if (!rbxUsable) {
          const others = srv.filter((x) => x.id !== "roblox" && x.alive && (x.tools || 0) > 0);
          const otherStr = others.length
            ? `Other connected MCP server(s): ${others.map((x) => x.id).join(", ")}.`
            : `No other MCP server is connected right now.`;
          return `Output of '${name}':\nRoblox Studio is currently OFFLINE (closed, no place open, or its MCP server disabled). ${otherStr}`;
        }
      }
      const known = new Set(A.toolList.map((t) => t.server).filter(Boolean));
      const scoped = A.toolList.filter((t) => (t.server || "roblox") === requested);
      if (!A.toolList.length) return `Output of '${name}':\nNo commands available - bridge or Roblox Studio offline.`;
      if (!scoped.length) {
        return `Output of '${name}':\nERROR: no server named "${requested}". Connected servers: ${[...known].join(", ") || "roblox"}.`;
      }
      const lines = scoped.map((t) => {
        const props = (t.inputSchema && t.inputSchema.properties) || {};
        const req = new Set((t.inputSchema && t.inputSchema.required) || []);
        const compact = [];
        const detailed = [];
        for (const [k, v] of Object.entries(props)) {
          const items = v.items && typeof v.items === "object" ? v.items : null;
          const itemProps = items && items.properties;
          const mark = req.has(k) ? "" : "?";
          if (v.type === "array" && itemProps) {
            const itemReq = new Set(items.required || []);
            const fields = Object.entries(itemProps).map(([ik, iv]) => {
              const en = Array.isArray(iv.enum) && iv.enum.length <= 12 ? `(${iv.enum.join("|")})` : iv.type || "any";
              return `${ik}${itemReq.has(ik) ? "" : "?"}:${en}`;
            });
            detailed.push(`    ${k}${mark}: array [each: {${fields.join(", ")}}]${v.description ? " - " + v.description : ""}`);
          } else if (v.description && v.description.length > 45) {
            detailed.push(`    ${k}${mark}: ${v.type || "any"} - ${v.description}`);
          } else {
            const ty = Array.isArray(v.enum) && v.enum.length <= 8 ? `(${v.enum.join("|")})` : v.type || "any";
            compact.push(`${k}${mark}:${ty}${v.description ? ` "${v.description}"` : ""}`);
          }
        }
        const paramLines = [compact.length ? `    ${compact.join(", ")}` : "", ...detailed].filter(Boolean).join("\n");
        const note = window.ZS.TOOL_NOTES ? window.ZS.TOOL_NOTES[bareToolName(t.name)] : "";
        const noteStr = note ? `\n    [เตือน] ${note}` : "";
        return `${t.name}: ${(t.description || "").split("\n")[0]}${paramLines ? "\n" + paramLines : ""}${noteStr}`;
      });
      return `Output of '${name}':\n${requested} commands (${scoped.length}):\n\n${lines.join("\n\n")}`;
    }

    if (A.toolNames.size && !A.toolNames.has(name)) {
      return window.ZS.FEEDBACK.unknownTool(name, [...A.toolNames]);
    }

    if (bareName === "execute_luau" && !args.datamodel_type) args.datamodel_type = "Edit";
    if ((bareName === "user_keyboard_input" || bareName === "user_mouse_input") && !args.datamodel_type) {
      args.datamodel_type = "Client";
    }

    const timeout = name === "execute_luau" ? 20000 : 120000;
    const hardCap = new Promise((res) =>
      setTimeout(() => res({ ok: false, kind: "timeout", error: "worker timeout" }), timeout + 30000)
    );

    let stopTimer;
    const stopWatch = new Promise((res) => {
      stopTimer = setInterval(() => {
        if (A.stop) res({ ok: false, kind: "stopped" });
      }, 150);
    });

    let r = await Promise.race([bg({ type: "call_tool", name, arguments: args, timeout }), hardCap, stopWatch]);
    clearInterval(stopTimer);

    if (r && r.kind === "stopped") return "(stopped by user)";
    if (!r) return window.ZS.FEEDBACK.bridgeOffline;

    if (r.ok && /Unable to find an active Studio instance|previously active Studio has disconnected/i.test(r.text || "")) {
      if (ui && ui.banner) {
        ui.banner("warn", "Roblox Studio ยังไม่พร้อม", "เปิดแมพ หรือเปิด MCP Server ใน Studio Settings");
      }
      return window.ZS.FEEDBACK.studioOffline;
    }

    if (r.ok && r.text && /^[\w .'"-]{0,60}\bis (required|not available|invalid)\b[\w .'"-]{0,80}$/i.test(r.text.trim())) {
      return `[ข้อผิดพลาดในการเรียกใช้ '${name}']\n• สาเหตุ: ${r.text.trim()}\n• แก้ไขพารามิเตอร์แล้วส่งใหม่`;
    }

    if (r.ok && bareName === "execute_luau" && r.text && /\b(?:ExecuteLuauTool|CommandExecution):\d+:/.test(r.text)) {
      r = { ok: false, error: r.text.replace(/^(?:\S*(?:ExecuteLuauTool|CommandExecution):\d+:\s*)+/, "").trim() || r.text };
    }

    if (r.ok) {
      if (r.images && r.images.length && P && !P.supportsVision) {
        return `[ข้อผิดพลาด: '${bareName}' คืนค่าเป็นรูปภาพ]\n• ผู้ช่วยนี้ไม่รองรับรูปภาพ`;
      }
      if (r.images && r.images.length) {
        if (ui && ui.showImages) ui.showImages(r.images, name);
        A.pendingImages = r.images;
        diag("images.stashed", { count: r.images.length });
        const caption = r.text && r.text.trim() ? r.text.trim() : `${r.images.length} image(s) captured.`;
        return `Output of '${name}':\n${caption}\n(The image is attached to THIS message - you can see it directly. Analyse it and continue.)`;
      }
      const text = r.text && r.text.length ? r.text : "(tool returned an empty result)";
      return `Output of '${name}':\n${text}`;
    }

    if (r.kind === "stale-extension") {
      if (ui && ui.banner) ui.banner("warn", "กรุณารีเฟรชหน้านี้", "Extension ได้รับการอัปเดตใหม่");
      diag("bridge.staleExtension", { name, error: r.error });
      return window.ZS.FEEDBACK.staleExtension;
    }

    if (r.kind === "disconnected") return window.ZS.FEEDBACK.bridgeOffline;

    if (r.kind === "timeout") {
      return `[ข้อผิดพลาด: คำสั่ง '${name}' หมดเวลา]\n• รายละเอียด: คำสั่งหมดเวลา (${name === "execute_luau" ? 20 : 120}s) - ${r.error}`;
    }

    if (name === "execute_luau") {
      let err = (r.error || "").trim();
      err = err.replace(/\bAssistantCommand:(\d+):/g, "สคริปต์บรรทัดที่ $1:");
      err = err.replace(/\b(?:CommandExecution|ExecuteLuauTool):\d+:\s*/g, "");
      return `[ข้อผิดพลาดใน execute_luau]\n• รายละเอียด: ${err}\n• คำแนะนำ: กรุณาแก้ไขโค้ดแล้วลองใหม่อีกครั้ง`;
    }

    return `[ข้อผิดพลาดในการเรียกใช้ '${name}']\n• รายละเอียด: ${r.error}`;
  }

  function argSummary(call) {
    if (!call) return "";
    if (call.tool === "execute_luau") {
      const code = (call.arguments && call.arguments.code) || "";
      const first = code.split("\n").map((s) => s.trim()).filter(Boolean)[0] || "";
      return first.slice(0, 46);
    }
    const a = call.arguments || {};
    const k = Object.keys(a)[0];
    if (!k) return "";
    let v = String(a[k]);
    if (v.length > 34) v = v.slice(0, 31) + "…";
    return `${k}: ${v}`;
  }

  const BODY_ERR_RE =
    /^\s*(error executing|error:|erreur|exception|traceback|communication error|failed to|could ?not|cannot |unable to|fatal|ข้อผิดพลาด)\b/i;
  const stripOutputPrefix = (feedback) => feedback.replace(/^Output of '[^']*':\n?/, "");

  function bodyLooksFailed(feedback) {
    if (!feedback || feedback.startsWith("ERROR")) return false;
    const first = stripOutputPrefix(feedback).split("\n").map((s) => s.trim()).find(Boolean) || "";
    return BODY_ERR_RE.test(first);
  }

  const feedbackIsError = (feedback) =>
    feedback.startsWith("ERROR") ||
    feedback.startsWith("[ข้อผิดพลาด") ||
    feedback.startsWith("ข้อผิดพลาด") ||
    bodyLooksFailed(feedback);

  function jsonSummary(body) {
    if (!/^[[{]/.test(body) || body.length > 200000) return null;
    let v;
    try {
      v = JSON.parse(body);
    } catch {
      return null;
    }
    if (Array.isArray(v)) return `${v.length} รายการ`;
    if (!v || typeof v !== "object") return null;
    const keys = Object.keys(v);
    if (keys.length === 1 && Array.isArray(v[keys[0]])) {
      const n = v[keys[0]].length;
      const word = n === 1 ? keys[0].replace(/s$/, "") : keys[0];
      return `${n} ${word}`;
    }
    const scalars = keys.filter((k) => v[k] === null || typeof v[k] !== "object").map((k) => `${k}: ${v[k]}`);
    if (scalars.length) return scalars.join(", ").slice(0, 44);
    return `${keys.length} ฟิลด์`;
  }

  function outSummary(feedback) {
    if (!feedback) return "";
    const isErr = feedbackIsError(feedback);
    const body = stripOutputPrefix(feedback).trim();
    if (!body) return "";
    if (!isErr) {
      const j = jsonSummary(body);
      if (j) return j;
    }
    const all = body.split("\n").map((l) => l.trim()).filter(Boolean);
    const lines = all.length;
    let first = all[0] || "";
    if (!isErr && lines > 1 && /^(warning|warn|note|deprecat|info)\b/i.test(first)) {
      first = all.find((l) => !/^(warning|warn|note|deprecat|info)\b/i.test(l)) || first;
    }
    if (isErr) {
      if (lines > 1 && /^\[?ข้อผิดพลาด/i.test(first)) {
        const detailLine = all.find((l) => l.startsWith("• รายละเอียด:") || l.startsWith("• สาเหตุ:"));
        if (detailLine) {
          return detailLine.replace(/^• (?:รายละเอียด|สาเหตุ):\s*/, "").slice(0, 48);
        }
      }
      return first.slice(0, 48);
    }
    first = first.slice(0, 44);
    return lines > 1 ? `${first} · ${lines} บรรทัด` : first;
  }

  function callBody(call) {
    const a = call.arguments || {};
    if (call.tool === "execute_luau") return (a.code || "").trim();
    try {
      return JSON.stringify(a, null, 2);
    } catch {
      return String(a);
    }
  }

  async function insertTextToEditor(text) {
    if (!text) return false;
    const P = window.ZSProvider;
    try {
      const ed = (P && P.getEditor ? P.getEditor() : null) || document.querySelector("textarea, [contenteditable='true']");
      if (!ed) {
        if (ui && ui.toast) ui.toast("ไม่พบช่องพิมพ์ข้อความ");
        return false;
      }

      if (P && P.setInputLock) {
        try {
          P.setInputLock(false);
        } catch {}
      }
      if (ed.getAttribute("contenteditable") === "false" || ed.hasAttribute("data-zs-locked")) {
        ed.setAttribute("contenteditable", "true");
        ed.removeAttribute("data-zs-locked");
        ed.removeAttribute("readonly");
      }

      ed.focus();

      if (P && P.setEditorText) {
        try {
          await P.setEditorText(ed, text);
        } catch {
          await P.setEditorText(text);
        }
      } else {
        const tag = (ed.tagName || "").toUpperCase();
        if (tag === "TEXTAREA" || tag === "INPUT") {
          const proto = (tag === "TEXTAREA" ? window.HTMLTextAreaElement : window.HTMLInputElement)?.prototype;
          const setter = proto && Object.getOwnPropertyDescriptor(proto, "value")?.set;
          if (setter) setter.call(ed, text);
          else ed.value = text;
          ed.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
          ed.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
        } else {
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(ed);
          sel.removeAllRanges();
          sel.addRange(range);

          let ok = false;
          try {
            const lines = String(text).split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (lines[i]) document.execCommand("insertText", false, lines[i]);
              if (i < lines.length - 1) document.execCommand("insertLineBreak");
            }
            ok = true;
          } catch {
            ok = false;
          }

          if (!ok || (P && P.editorText && P.editorText().trim() === "")) {
            try {
              document.execCommand("insertText", false, text);
            } catch {}
          }
          if (P && P.editorText && P.editorText().trim() === "") {
            ed.textContent = text;
          }
          ed.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
        }
      }

      try {
        ed.focus();
        if (ed.scrollIntoView) ed.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch {}

      if (ui && ui.toast) ui.toast("แทรกข้อความแล้ว");
      return true;
    } catch (err) {
      console.error("[zs-insert-text-err]", err);
      if (ui && ui.toast) ui.toast("แทรกข้อความไม่สำเร็จ: " + ((err && err.message) || err));
      return false;
    }
  }

  const toolExports = {
    bg,
    knownTool,
    rememberImageTool,
    ensureTools,
    runTool,
    argSummary,
    bodyLooksFailed,
    feedbackIsError,
    jsonSummary,
    outSummary,
    callBody,
    insertTextToEditor,
  };
  Object.assign(window.ZS, toolExports);
  window.ZS.tools = window.ZS;

  window.bg = bg;
  window.knownTool = knownTool;
  window.ensureTools = ensureTools;
  window.runTool = runTool;
  window.feedbackIsError = feedbackIsError;
  window.insertTextToEditor = insertTextToEditor;
})();

