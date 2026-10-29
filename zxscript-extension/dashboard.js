// SPDX-License-Identifier: GPL-3.0-or-later
const CAVEMAN_PRESET = "CAVEMAN MODE: ตอบภาษาไทยสั้นกระชับ ตรงประเด็น ห้ามเยิ่นเย้อ ห้ามทักทาย สั่งรันคำสั่ง Roblox Studio MCP ทันที ประหยัด token สูงสุด";

const KNOWN_TOOLS = [
  { name: "execute_luau", category: "edit", desc: "รันโค้ด Luau บน Roblox Studio โดยตรง (รองรับ Edit, Server, Client)" },
  { name: "multi_edit", category: "edit", desc: "สร้างหรือแก้ไขสคริปต์หลายไฟล์พร้อมกันในโปรเจกต์" },
  { name: "script_read", category: "read", desc: "อ่าน Source code ของ Script หรือ LocalScript ตามที่ระบุ" },
  { name: "script_search", category: "read", desc: "ค้นหาข้อความหรือฟังก์ชันภายในสคริปต์ทั้งหมดในเกม" },
  { name: "script_grep", category: "read", desc: "ค้นหาด้วย Regex ภายในสคริปต์ทั้งหมด" },
  { name: "search_game_tree", category: "read", desc: "ค้นหาออบเจกต์ (Instance) ใน Explorer Tree ตามชื่อหรือ ClassName" },
  { name: "inspect_instance", category: "read", desc: "ดู Properties และ Children ของ Instance ที่ระบุอย่างละเอียด" },
  { name: "get_studio_state", category: "read", desc: "ตรวจสอบสถานะปัจจุบันของ Roblox Studio (โหมด Edit หรือ Play)" },
  { name: "get_console_output", category: "read", desc: "ดึงข้อความ Error และ Output จาก Console ใน Studio" },
  { name: "screen_capture", category: "screen", desc: "ถ่ายภาพหน้าจอ Viewport ใน Roblox Studio แบบเรียลไทม์" },
  { name: "insert_from_creator_store", category: "edit", desc: "นำเข้าโมเดลหรือ Asset จาก Roblox Creator Store เข้าสู่เกม" },
  { name: "search_creator_store", category: "read", desc: "ค้นหา Model, Decal, Audio ใน Roblox Creator Store" },
  { name: "store_image", category: "edit", desc: "บันทึกรูปภาพเพื่อใช้งานเป็น Texture หรือ Decal" },
  { name: "list_roblox_studios", category: "read", desc: "แสดงรายชื่อหน้าต่าง Roblox Studio ทั้งหมดที่กำลังเปิดอยู่" },
  { name: "list_commands", category: "read", desc: "แสดงคำสั่ง MCP ทั้งหมดพร้อมเอกสารประกอบ" }
];

function toast(msg, duration = 2500) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => {
    if (el.textContent === msg) el.style.display = "none";
  }, duration);
}

// ── Tab Navigation ──────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const pane = document.getElementById(btn.dataset.tab);
    if (pane) pane.classList.add("active");
    if (btn.dataset.tab === "tab-logs") fetchLogs();
  });
});

// ── Status Polling ──────────────────────────────────────────────────────────
let liveToolsList = [...KNOWN_TOOLS];

function renderStatus(s) {
  const dot = document.getElementById("header-dot");
  const stateText = document.getElementById("header-state");
  const mBridge = document.getElementById("m-bridge");
  const mBridgeSub = document.getElementById("m-bridge-sub");
  const mStudio = document.getElementById("m-studio");
  const mStudioSub = document.getElementById("m-studio-sub");
  const mTools = document.getElementById("m-tools");
  const mToolsSub = document.getElementById("m-tools-sub");

  const list = s.servers || [];
  const up = list.filter((x) => x.alive).length;
  const mcpOk = s.connected && (s.mcpAlive || up > 0 || s.tools > 0);
  const studioOff = mcpOk && s.studio === false;
  const ok = mcpOk && !studioOff;

  dot.className = "dot " + (s.connected ? (ok ? "on" : "warn") : "");
  stateText.textContent = s.connected
    ? (ok ? "เชื่อมต่อสมบูรณ์ · Studio พร้อมทำงาน"
        : studioOff ? "กำลังรอ Studio (เปิด Assistant > MCP)"
        : "กำลังเชื่อมต่อ Studio MCP…")
    : "Bridge ออฟไลน์ (กดเปิดได้ทันที)";

  mBridge.textContent = s.connected ? "ออนไลน์ 🟢" : "ออฟไลน์ ⚪";
  mBridge.style.color = s.connected ? "#10b981" : "#94a3b8";
  mBridgeSub.textContent = s.connected ? "WebSocket ws://127.0.0.1:17613" : "คลิกปุ่ม 'เปิด Bridge' ด้านบน";

  mStudio.textContent = s.connected
    ? (ok ? "เชื่อมต่อแล้ว ✓" : studioOff ? "รอเปิด Place" : "กำลังโหลด")
    : "รอเปิด Bridge";
  mStudio.style.color = ok ? "#10b981" : "#f59e0b";
  mStudioSub.textContent = s.connected
    ? (ok ? "Roblox Studio MCP พร้อมทำงาน" : "เปิด Assistant > Manage MCP Servers")
    : "ตรวจจับ Bloxstrap & Vanilla อัตโนมัติ";

  const count = s.tools || (s.connected ? liveToolsList.length : 0);
  mTools.textContent = `${count} คำสั่ง`;
  mToolsSub.textContent = s.connected ? "พร้อมรับคำสั่งจาก AI ทุกเว็บ" : "รันระบบเพื่อเริ่มใช้งาน";
}

function refresh() {
  chrome.runtime.sendMessage({ type: "status" }, (s) => s && renderStatus(s));
  chrome.runtime.sendMessage({ type: "native_status" }, (res) => {
    if (res && typeof res.autostart === "boolean") {
      document.getElementById("chk-autostart").checked = res.autostart;
      document.getElementById("m-autostart").textContent = res.autostart ? "เปิดอัตโนมัติ ✓" : "พร้อมใช้งาน";
      document.getElementById("m-autostart").style.color = res.autostart ? "#10b981" : "#f8fafc";
    }
  });
}

// ── Control Actions ─────────────────────────────────────────────────────────
function startBridge() {
  toast("กำลังสั่งสตาร์ต Bridge Server ใน Background…");
  chrome.runtime.sendMessage({ type: "native_start" }, (res) => {
    if (res && res.ok) {
      toast("Bridge Server เริ่มทำงานแล้ว 🟢");
      setTimeout(refresh, 1000);
      setTimeout(fetchLogs, 1500);
    } else {
      toast("แจ้งเตือน: " + ((res && res.error) || "ส่งคำสั่งแล้ว"), 3500);
    }
  });
}

function stopBridge() {
  toast("กำลังปิด Bridge Server…");
  chrome.runtime.sendMessage({ type: "native_stop" }, (res) => {
    toast("Bridge ปิดการทำงานเรียบร้อย ⚪");
    setTimeout(refresh, 1000);
  });
}

function restartBridge() {
  toast("กำลังรีสตาร์ต Roblox Server…");
  chrome.runtime.sendMessage({ type: "restart_mcp" }, () => {
    toast("รีสตาร์ตเสร็จสิ้น ✓");
    setTimeout(refresh, 800);
  });
}

document.getElementById("btn-start").addEventListener("click", startBridge);
document.getElementById("panel-btn-start").addEventListener("click", startBridge);
document.getElementById("btn-stop").addEventListener("click", stopBridge);
document.getElementById("panel-btn-stop").addEventListener("click", stopBridge);
document.getElementById("btn-restart").addEventListener("click", restartBridge);

document.getElementById("chk-autostart").addEventListener("change", (e) => {
  const enable = e.target.checked;
  chrome.runtime.sendMessage({ type: "native_autostart", enable }, (res) => {
    if (res && res.ok) {
      toast(enable ? "เปิดใช้งานอัตโนมัติพร้อม Windows แล้ว ✓" : "ปิดการทำงานอัตโนมัติแล้ว");
      refresh();
    }
  });
});

// ── AI Quick Connect ────────────────────────────────────────────────────────
document.querySelectorAll(".ai-card").forEach((card) => {
  card.addEventListener("click", () => {
    const targetUrl = card.dataset.url;
    const targetHost = card.dataset.host;
    chrome.tabs.query({}, (tabs) => {
      const match = tabs.find((t) => t.url && t.url.includes(targetHost));
      if (match) {
        chrome.tabs.update(match.id, { active: true }, () => {
          chrome.tabs.sendMessage(match.id, { type: "zs-open-menu" }, () => {
            void chrome.runtime.lastError;
          });
        });
        if (match.windowId) chrome.windows.update(match.windowId, { focused: true });
        toast(`สลับไปยังแท็บ ${targetHost} แล้ว ✓`);
      } else {
        chrome.tabs.create({ url: targetUrl });
        toast(`กำลังเปิด ${targetHost}…`);
      }
    });
  });
});

// ── Tools Catalogue Render ──────────────────────────────────────────────────
function renderTools(list) {
  const container = document.getElementById("tools-container");
  container.innerHTML = "";
  if (!list.length) {
    container.innerHTML = '<div style="color: #64748b; font-size: 12px;">ไม่พบคำสั่งที่ค้นหา</div>';
    return;
  }
  list.forEach((t) => {
    const card = document.createElement("div");
    card.className = "tool-item";
    const name = t.name || t;
    const desc = t.description || t.desc || "คำสั่งควบคุม Roblox Studio MCP";
    card.innerHTML = `
      <div class="tool-name">${name}</div>
      <div class="tool-desc">${desc}</div>
    `;
    container.appendChild(card);
  });
}

function loadTools() {
  chrome.runtime.sendMessage({ type: "list_tools" }, (res) => {
    if (res && res.ok && Array.isArray(res.tools) && res.tools.length > 0) {
      liveToolsList = res.tools;
    }
    renderTools(liveToolsList);
  });
}

document.getElementById("tools-search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = liveToolsList.filter((t) => {
    const name = (t.name || t).toLowerCase();
    const desc = (t.description || t.desc || "").toLowerCase();
    return name.includes(q) || desc.includes(q);
  });
  renderTools(filtered);
});

// ── Custom Prompt & Settings ────────────────────────────────────────────────
const customPromptInput = document.getElementById("dash-custom-prompt");
chrome.storage.local.get("zsCustomPrompt", (r) => {
  if (r && typeof r.zsCustomPrompt === "string") {
    customPromptInput.value = r.zsCustomPrompt;
  }
});

document.getElementById("dash-btn-save-prompt").addEventListener("click", () => {
  const val = customPromptInput.value;
  chrome.storage.local.set({ zsCustomPrompt: val }, () => {
    toast("บันทึกคำสั่งพิเศษเรียบร้อย ✓");
  });
});

document.getElementById("dash-btn-caveman").addEventListener("click", () => {
  customPromptInput.value = CAVEMAN_PRESET;
  chrome.storage.local.set({ zsCustomPrompt: CAVEMAN_PRESET }, () => {
    toast("เปิดโหมด Caveman สำเร็จ ✓ (ประหยัด token สูงสุด)");
  });
});

// ── Logs Viewer ─────────────────────────────────────────────────────────────
function fetchLogs() {
  const box = document.getElementById("log-viewer");
  chrome.runtime.sendMessage({ type: "native_logs", lines: 60 }, (res) => {
    if (res && res.ok && res.logs) {
      box.textContent = res.logs;
      box.scrollTop = box.scrollHeight;
    } else {
      box.textContent = "ยังไม่มีบันทึกข้อมูล หรือ Bridge ยังไม่เริ่มทำงาน";
    }
  });
}
document.getElementById("btn-refresh-logs").addEventListener("click", fetchLogs);

// ── Initial Boot ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "zs-status") renderStatus(msg);
});

refresh();
loadTools();
setInterval(refresh, 2500);
