// SPDX-License-Identifier: GPL-3.0-or-later
const DOTS = '<span class="zs-dots"><span>.</span><span>.</span><span>.</span></span>';
const CAVEMAN_PRESET = "CAVEMAN MODE: ตอบภาษาไทยสั้นกระชับ ตรงประเด็น ห้ามเยิ่นเย้อ ห้ามทักทาย สั่งรันคำสั่ง Roblox Studio MCP ทันที ประหยัด token สูงสุด";

const DEFAULT_TOOLS = [
  { name: "execute_luau", desc: "รันโค้ด Luau บน Roblox Studio (Edit, Server, Client)" },
  { name: "multi_edit", desc: "สร้างหรือแก้ไข Source Code ของ Script ในเกม" },
  { name: "script_read", desc: "อ่าน Source code ของ Script หรือ LocalScript" },
  { name: "script_search", desc: "ค้นหาข้อความหรือฟังก์ชันภายในสคริปต์ทั้งหมด" },
  { name: "script_grep", desc: "ค้นหาข้อความด้วย Regex ในสคริปต์" },
  { name: "search_game_tree", desc: "ค้นหา Instance ใน Explorer Tree ตามชื่อหรือ Class" },
  { name: "inspect_instance", desc: "ดู Properties และ Children ของ Instance อย่างละเอียด" },
  { name: "get_studio_state", desc: "ตรวจสอบสถานะ Roblox Studio (Edit หรือ Play mode)" },
  { name: "get_console_output", desc: "ดึง Error และ Output จาก Console ใน Studio" },
  { name: "screen_capture", desc: "ถ่ายภาพหน้าจอ Viewport ใน Roblox Studio" },
  { name: "insert_from_creator_store", desc: "นำเข้าโมเดล/Asset จาก Creator Store" },
  { name: "search_creator_store", desc: "ค้นหา Asset ใน Roblox Creator Store" },
  { name: "store_image", desc: "บันทึกรูปภาพ Texture / Decal" },
  { name: "list_roblox_studios", desc: "แสดงรายชื่อหน้าต่าง Studio ที่เปิดอยู่" },
  { name: "list_commands", desc: "แสดงคำสั่ง MCP ทั้งหมดพร้อมเอกสาร" }
];

document.getElementById("ver").textContent = `v${chrome.runtime.getManifest().version}`;

let toolsList = [...DEFAULT_TOOLS];

function showToast(text, isError = false) {
  const el = document.getElementById("toast-msg");
  el.textContent = text;
  el.style.color = isError ? "#f87171" : "#10b981";
  setTimeout(() => {
    if (el.textContent === text) el.textContent = "";
  }, 2200);
}

// ── Screen Rendering ────────────────────────────────────────────────────────
function render(s) {
  const dot = document.getElementById("screen-dot");
  const state = document.getElementById("screen-state");
  const valBridge = document.getElementById("val-bridge");
  const valStudio = document.getElementById("val-studio");
  const valTools = document.getElementById("val-tools");

  const runBtn = document.getElementById("btn-run-bridge");
  const onlineActions = document.getElementById("online-actions");

  const list = s.servers || [];
  const up = list.filter((x) => x.alive).length;
  const mcpOk = s.connected && (s.mcpAlive || up > 0 || s.tools > 0);
  const studioOff = mcpOk && s.studio === false;
  const ok = mcpOk && !studioOff;

  dot.className = "dot " + (s.connected ? (ok ? "on" : "warn") : "");
  state.innerHTML = s.connected
    ? (ok ? "🟢 เชื่อมต่อแล้ว · Studio พร้อมทำงาน"
        : studioOff ? `🟡 กำลังรอ Studio${DOTS} (เปิด Assistant &gt; MCP)`
        : `🟡 กำลังเชื่อมต่อ Studio MCP${DOTS}`)
    : "⚪ Bridge ออฟไลน์ · กดปุ่มเพื่อเปิดทันที";

  valBridge.textContent = s.connected ? "ออนไลน์ 🟢" : "ออฟไลน์ ⚪";
  valBridge.style.color = s.connected ? "#10b981" : "#94a3b8";

  valStudio.textContent = s.connected
    ? (ok ? "พร้อมทำงาน ✓" : studioOff ? "รอเปิด Place" : "กำลังโหลด")
    : "รอเปิด Bridge";
  valStudio.style.color = ok ? "#10b981" : "#f59e0b";

  const count = s.tools || (s.connected ? toolsList.length : 0);
  valTools.textContent = `${count} คำสั่ง`;

  if (s.connected) {
    runBtn.style.display = "none";
    onlineActions.style.display = "flex";
  } else {
    runBtn.style.display = "flex";
    onlineActions.style.display = "none";
  }
}

function refresh() {
  chrome.runtime.sendMessage({ type: "status" }, (s) => s && render(s));
  chrome.runtime.sendMessage({ type: "native_status" }, (res) => {
    if (res && typeof res.autostart === "boolean") {
      document.getElementById("chk-autostart").checked = res.autostart;
      const valAuto = document.getElementById("val-autostart");
      valAuto.textContent = res.autostart ? "เปิดอัตโนมัติ ✓" : "ปิดอยู่";
      valAuto.style.color = res.autostart ? "#10b981" : "#94a3b8";
    }
  });
}

// ── Runner Controls ─────────────────────────────────────────────────────────
document.getElementById("btn-run-bridge").addEventListener("click", () => {
  const btn = document.getElementById("btn-run-bridge");
  btn.textContent = "กำลังเริ่ม Bridge ใน Background...";
  chrome.runtime.sendMessage({ type: "native_start" }, (res) => {
    showToast("เริ่ม Bridge สำเร็จ 🟢");
    setTimeout(() => {
      btn.textContent = "▶ สตาร์ต Bridge (เริ่มรันอัตโนมัติ)";
      refresh();
    }, 1200);
  });
});

document.getElementById("btn-stop-bridge").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "native_stop" }, () => {
    showToast("ปิด Bridge Server เรียบร้อย ⚪");
    setTimeout(refresh, 800);
  });
});

document.getElementById("btn-restart-bridge").addEventListener("click", () => {
  const state = document.getElementById("screen-state");
  state.innerHTML = `กำลังรีสตาร์ต Roblox Server${DOTS}`;
  chrome.runtime.sendMessage({ type: "restart_mcp" }, () => {
    showToast("รีสตาร์ต Server สำเร็จ ✓");
    setTimeout(refresh, 800);
  });
});

document.getElementById("btn-refresh-state").addEventListener("click", () => {
  refresh();
  showToast("รีเฟรชข้อมูลแล้ว ✓");
});

document.getElementById("chk-autostart").addEventListener("change", (e) => {
  const enable = e.target.checked;
  chrome.runtime.sendMessage({ type: "native_autostart", enable }, (res) => {
    if (res && res.ok) {
      showToast(enable ? "เปิดทำงานอัตโนมัติพร้อม Windows แล้ว ✓" : "ปิดการทำงานอัตโนมัติแล้ว");
      refresh();
    }
  });
});

// ── Segmented Navigation ────────────────────────────────────────────────────
document.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".seg-pane").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const pane = document.getElementById(btn.dataset.pane);
    if (pane) pane.classList.add("active");
  });
});

// ── AI Quick Switch ─────────────────────────────────────────────────────────
document.querySelectorAll(".ai-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetUrl = btn.dataset.url;
    const targetHost = btn.dataset.host;
    chrome.tabs.query({}, (tabs) => {
      const match = tabs.find((t) => t.url && t.url.includes(targetHost));
      if (match) {
        chrome.tabs.update(match.id, { active: true }, () => {
          chrome.tabs.sendMessage(match.id, { type: "zs-open-menu" }, () => {
            void chrome.runtime.lastError;
          });
        });
        if (match.windowId) chrome.windows.update(match.windowId, { focused: true });
        showToast(`สลับไป ${targetHost} แล้ว ✓`);
      } else {
        chrome.tabs.create({ url: targetUrl });
      }
    });
  });
});

document.getElementById("btn-open-overlay").addEventListener("click", () => {
  const supported = ["chat.deepseek.com", "chatgpt.com", "gemini.google.com", "chat.qwen.ai"];
  chrome.tabs.query({}, (tabs) => {
    const match = tabs.find((t) => t.url && supported.some((h) => t.url.includes(h)));
    if (match) {
      chrome.tabs.update(match.id, { active: true }, () => {
        chrome.tabs.sendMessage(match.id, { type: "zs-open-menu" }, () => {
          void chrome.runtime.lastError;
        });
      });
      showToast("เปิดแถบควบคุมบนแท็บแล้ว ✓");
    } else {
      chrome.tabs.create({ url: "https://chat.deepseek.com/" });
    }
  });
});

// ── Tools List ──────────────────────────────────────────────────────────────
function renderTools(list) {
  const box = document.getElementById("tools-box");
  box.innerHTML = "";
  if (!list.length) {
    box.innerHTML = '<div style="color: #64748b; font-size: 10px; text-align: center;">ไม่พบคำสั่ง</div>';
    return;
  }
  list.forEach((t) => {
    const item = document.createElement("div");
    item.className = "tool-item";
    const name = t.name || t;
    const desc = t.description || t.desc || "คำสั่งควบคุม Roblox Studio";
    item.innerHTML = `
      <div class="tool-name">${name}</div>
      <div class="tool-desc">${desc}</div>
    `;
    box.appendChild(item);
  });
}

function loadTools() {
  chrome.runtime.sendMessage({ type: "list_tools" }, (res) => {
    if (res && res.ok && Array.isArray(res.tools) && res.tools.length > 0) {
      toolsList = res.tools;
    }
    renderTools(toolsList);
  });
}

document.getElementById("tool-search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = toolsList.filter((t) => {
    const name = (t.name || t).toLowerCase();
    const desc = (t.description || t.desc || "").toLowerCase();
    return name.includes(q) || desc.includes(q);
  });
  renderTools(filtered);
});

// ── Prompt & Caveman ────────────────────────────────────────────────────────
const promptInput = document.getElementById("prompt-input");
chrome.storage.local.get("zsCustomPrompt", (r) => {
  if (r && typeof r.zsCustomPrompt === "string") {
    promptInput.value = r.zsCustomPrompt;
  }
});

document.getElementById("btn-save-prompt").addEventListener("click", () => {
  const val = promptInput.value;
  chrome.storage.local.set({ zsCustomPrompt: val }, () => {
    showToast("บันทึกคำสั่งสำเร็จ ✓");
  });
});

document.getElementById("btn-caveman").addEventListener("click", () => {
  promptInput.value = CAVEMAN_PRESET;
  chrome.storage.local.set({ zsCustomPrompt: CAVEMAN_PRESET }, () => {
    showToast("เปิดโหมด Caveman แล้ว ✓");
  });
});

// ── Boot ────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "zs-status") render(msg);
});

refresh();
loadTools();
setInterval(refresh, 2500);
