// SPDX-License-Identifier: GPL-3.0-or-later
const DOTS = '<span class="zs-dots"><span>.</span><span>.</span><span>.</span></span>';
const RULES_PRESET = "ROBLOX AI RULES: 1) สำรวจ Explorer ก่อนทำเสมอ ห้ามเดา Path 2) จำกัดไม่เกิน 3-5 tool calls ต่อรอบแล้วหยุดรอคำสั่ง 3) ใช้ Modern Luau เท่านั้น (task.wait, task.spawn, WaitForChild 5s timeout) 4) execute_luau ผ่าน ###LUA### เท่านั้น 5) บันทึก architecture ลง game.ServerStorage.ZXScript.Memory";
const CAVEMAN_PRESET = "CAVEMAN MODE: ตอบภาษาไทยสั้นกระชับ ตรงประเด็น ห้ามเยิ่นเย้อ ห้ามทักทาย สั่งรันคำสั่ง Roblox Studio MCP ทันที ประหยัด token สูงสุด";

const DEFAULT_TOOLS = [
  { name: "execute_luau", desc: "รันโค้ด Luau บน Roblox Studio (Edit, Server, Client)" },
  { name: "multi_edit", desc: "สร้างหรือแก้ไข Source Code ของ Script ในโปรเจกต์" },
  { name: "script_read", desc: "อ่าน Source code ของ Script หรือ LocalScript" },
  { name: "script_search", desc: "ค้นหาข้อความหรือฟังก์ชันภายในสคริปต์ทั้งหมด" },
  { name: "script_grep", desc: "ค้นหาข้อความด้วย Regex ในสคริปต์" },
  { name: "search_game_tree", desc: "ค้นหา Instance ใน Explorer Tree ตามชื่อหรือ ClassName" },
  { name: "inspect_instance", desc: "ดู Properties และ Children ของ Instance อย่างละเอียด" },
  { name: "get_studio_state", desc: "ตรวจสอบสถานะ Roblox Studio (Edit หรือ Play mode)" },
  { name: "get_console_output", desc: "ดึง Error และ Output จาก Console ใน Studio" },
  { name: "screen_capture", desc: "ถ่ายภาพหน้าจอ Viewport ใน Roblox Studio" },
  { name: "insert_from_creator_store", desc: "นำเข้า Model หรือ Asset จาก Creator Store" },
  { name: "search_creator_store", desc: "ค้นหา Asset ใน Roblox Creator Store" },
  { name: "store_image", desc: "บันทึกรูปภาพ Texture หรือ Decal" },
  { name: "list_roblox_studios", desc: "แสดงรายชื่อหน้าต่าง Studio ที่เปิดอยู่" },
  { name: "list_commands", desc: "แสดงคำสั่ง MCP ทั้งหมดพร้อมเอกสารประกอบ" }
];

document.getElementById("ver").textContent = `v${chrome.runtime.getManifest().version}`;

let toolsList = [...DEFAULT_TOOLS];

function showToast(text, isError = false) {
  const el = document.getElementById("toast-msg");
  el.textContent = text;
  el.style.color = isError ? "#f87171" : "#10b981";
  setTimeout(() => {
    if (el.textContent === text) el.textContent = "";
  }, 2000);
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
    ? (ok ? "เชื่อมต่อแล้ว — Studio พร้อมทำงาน"
        : studioOff ? `รอการเชื่อมต่อ Studio${DOTS} (เปิด Assistant &gt; MCP)`
        : `กำลังเชื่อมต่อ Studio MCP${DOTS}`)
    : "Bridge ออฟไลน์";

  valBridge.textContent = s.connected ? "ออนไลน์" : "ออฟไลน์";
  valBridge.style.color = s.connected ? "#10b981" : "#71717a";

  valStudio.textContent = s.connected
    ? (ok ? "พร้อมทำงาน" : studioOff ? "รอเปิด Place" : "กำลังโหลด")
    : "รอเปิด Bridge";
  valStudio.style.color = ok ? "#10b981" : "#f59e0b";

  const count = s.tools || (s.connected ? toolsList.length : 0);
  valTools.textContent = `${count} รายการ`;

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
      valAuto.textContent = res.autostart ? "เปิดใช้งาน" : "ปิดอยู่";
      valAuto.style.color = res.autostart ? "#10b981" : "#71717a";
    }
  });
}

// ── Runner Controls ─────────────────────────────────────────────────────────
document.getElementById("btn-run-bridge").addEventListener("click", () => {
  const btn = document.getElementById("btn-run-bridge");
  btn.textContent = "กำลังเริ่มการทำงาน...";
  chrome.runtime.sendMessage({ type: "native_start" }, () => {
    showToast("เริ่มการทำงานแล้ว");
    setTimeout(() => {
      btn.textContent = "เริ่มการทำงาน Bridge";
      refresh();
    }, 1200);
  });
});

document.getElementById("btn-stop-bridge").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "native_stop" }, () => {
    showToast("หยุดการทำงานแล้ว");
    setTimeout(refresh, 800);
  });
});

document.getElementById("btn-restart-bridge").addEventListener("click", () => {
  const state = document.getElementById("screen-state");
  state.innerHTML = `กำลังรีสตาร์ตเซิร์ฟเวอร์${DOTS}`;
  chrome.runtime.sendMessage({ type: "restart_mcp" }, () => {
    showToast("รีสตาร์ตเสร็จสิ้น");
    setTimeout(refresh, 800);
  });
});

document.getElementById("btn-refresh-state").addEventListener("click", () => {
  refresh();
  showToast("อัปเดตสถานะแล้ว");
});

document.getElementById("chk-autostart").addEventListener("change", (e) => {
  const enable = e.target.checked;
  chrome.runtime.sendMessage({ type: "native_autostart", enable }, (res) => {
    if (res && res.ok) {
      showToast(enable ? "เปิดการทำงานเมื่อเปิดเครื่องแล้ว" : "ปิดการทำงานอัตโนมัติแล้ว");
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

// ── AI Quick Switch & Active Detection ──────────────────────────────────────
function highlightActiveTabs() {
  chrome.tabs.query({}, (tabs) => {
    document.querySelectorAll(".ai-card").forEach((card) => {
      const host = card.dataset.host;
      const isOpen = tabs.some((t) => t.url && t.url.includes(host));
      card.classList.toggle("active-tab", isOpen);
      const nameEl = card.querySelector(".ai-card-name");
      if (nameEl) {
        let dot = nameEl.querySelector(".ai-tab-dot");
        if (isOpen) {
          if (!dot) {
            dot = document.createElement("span");
            dot.className = "ai-tab-dot";
            dot.title = "มีแท็บนี้เปิดอยู่";
            nameEl.appendChild(dot);
          }
        } else if (dot) {
          dot.remove();
        }
      }
    });
  });
}

document.querySelectorAll(".ai-card, .ai-btn").forEach((btn) => {
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
        showToast(`สลับไปที่ ${targetHost}`);
      } else {
        chrome.tabs.create({ url: targetUrl });
      }
    });
  });
});

document.getElementById("btn-open-overlay").addEventListener("click", () => {
  const supported = [
    "chat.deepseek.com", "deepseek.com",
    "chatgpt.com", "chat.openai.com",
    "claude.ai",
    "gemini.google.com",
    "chat.qwen.ai",
    "kimi.ai", "www.kimi.ai",
    "chat.z.ai",
    "meta.ai", "www.meta.ai",
    "arena.ai"
  ];
  chrome.tabs.query({}, (tabs) => {
    const match = tabs.find((t) => t.url && supported.some((h) => t.url.includes(h)));
    if (match) {
      chrome.tabs.update(match.id, { active: true }, () => {
        chrome.tabs.sendMessage(match.id, { type: "zs-open-menu" }, () => {
          void chrome.runtime.lastError;
        });
      });
      showToast("เปิดแถบควบคุมแล้ว");
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
    box.innerHTML = '<div style="color: #71717a; font-size: 10px; text-align: center; padding: 12px 0;">ไม่พบคำสั่ง</div>';
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
  if (r && typeof r.zsCustomPrompt === "string" && r.zsCustomPrompt.trim() !== "") {
    promptInput.value = r.zsCustomPrompt;
  } else {
    promptInput.value = CAVEMAN_PRESET;
    chrome.storage.local.set({ zsCustomPrompt: CAVEMAN_PRESET });
  }
});

document.getElementById("btn-save-prompt").addEventListener("click", () => {
  const val = promptInput.value;
  chrome.storage.local.set({ zsCustomPrompt: val }, () => {
    showToast("บันทึกการตั้งค่าแล้ว");
  });
});

const REST_PRESET = "AUTONOMOUS MEMORY SYNC & REST INTENT: ขณะนี้ผู้ใช้ต้องการหยุดพัก/บันทึกงาน กรุณาสรุปผลงาน สถาปัตยกรรม และ TODO ล่าสุดลงใน game.ServerStorage.ZXScript.Memory ทันที จากนั้นตอบสั้นๆ ว่าบันทึกเรียบร้อย";

document.getElementById("btn-caveman").addEventListener("click", () => {
  promptInput.value = CAVEMAN_PRESET;
  chrome.storage.local.set({ zsCustomPrompt: CAVEMAN_PRESET }, () => {
    showToast("เปิดโหมด Caveman แล้ว");
  });
});

const btnRules = document.getElementById("btn-rules");
if (btnRules) {
  btnRules.addEventListener("click", () => {
    promptInput.value = RULES_PRESET;
    chrome.storage.local.set({ zsCustomPrompt: RULES_PRESET }, () => {
      showToast("เปิดใช้งานกฎเหล็ก 5 ข้อแล้ว");
    });
  });
}

const btnRest = document.getElementById("btn-rest");
if (btnRest) {
  btnRest.addEventListener("click", () => {
    promptInput.value = REST_PRESET;
    chrome.storage.local.set({ zsCustomPrompt: REST_PRESET }, () => {
      chrome.runtime.sendMessage({ type: "sync_memory" }, (res) => {
        if (res && res.ok) {
          showToast("✅ บันทึก Memory ของ Place ลงดิสก์สำเร็จ");
        } else {
          showToast("เปิดคำสั่งพักผ่อน/บันทึกแล้ว");
        }
      });
      navigator.clipboard.writeText("พักผ่อนแล้ว ช่วยสรุปและบันทึก Memory ลง game.ServerStorage.ZXScript.Memory ให้เรียบร้อย").catch(() => {});
    });
  });
}

// ── System Prompt Templates ────────────────────────────────────────────────
const PROMPT_TEMPLATES = {
  rest: REST_PRESET,
  rules: RULES_PRESET,
  caveman: CAVEMAN_PRESET,
  architecture: "PROJECT FOCUS (GOD-TIER ARCHITECTURE): วางสถาปัตยกรรมเกมแบบ Modular Service Framework (Init -> Start lifecycle). แยก Business Logic อยู่ฝั่ง Server 100%, Client เป็นเพียง Controller/Renderer. จดทะเบียน Remote ทั้งหมดใน ReplicatedStorage.Network ป้องกัน Circular Dependency และห้าม Yield ใน Init เด็ดขาด",
  combat: "PROJECT FOCUS (GOD-TIER COMBAT & ANTI-EXPLOIT): ระบบต่อสู้แบบ Server-Authoritative 100%. Client ส่งเพียง Action Intent (ทิศทาง/การคลิก) ฝั่ง Server ทำการตรวจ Cooldown Rate-Limit, Sanity Distance, และยิง workspace:Raycast ตรวจ Line-of-sight ป้องกันการยิงทะลุกำแพง (Wall-bang) และการเทเลพอร์ต",
  parallel: "PROJECT FOCUS (GOD-TIER PARALLEL LUAU): ใช้ Actor Framework ประมวลผลคู่ขนานแบบ Multi-core CPU. ใช้ task.desynchronize() คำนวณ Raycasts, Math, AI Steer behaviors ที่ 120+ FPS จากนั้นเรียก task.synchronize() เมื่อต้องการเขียนค่า CFrame กลับสู่ DataModel อย่างปลอดภัย",
  datastore: "PROJECT FOCUS (GOD-TIER DATA PERSISTENCE): วางระบบเซฟข้อมูลผู้เล่นโดยใช้ ProfileStore / DataStoreService ที่ปลอดภัย ป้องกัน Data Loss, รองรับ Session Locking, Auto-save ทุก 5 นาที, ปลอดภัยต่อ BindToClose, และจัดการ PlayerAdded/PlayerRemoving อย่างถูกต้องตามมาตรฐาน Luau 0.743",
  procedural: "PROJECT FOCUS (GOD-TIER PROCEDURAL GENERATION): สร้างระบบ Procedural Generation แมพ/ดันเจี้ยนด้วย Perlin Noise และ ChangeHistoryService chunking (task.wait ทุก 200 ชิ้น) เพื่อป้องกัน Studio Freeze และ Timeout ในการรันคำสั่ง",
  animation: "PROJECT FOCUS (GOD-TIER ANIMATIONS & IK): สร้างระบบท่าทางอนิเมชั่นระดับสูง โหลดผ่าน Animator:LoadAnimation() บน Client (Auto-replicate), ใช้ track:GetMarkerReachedSignal() เพื่อ sync ดาเมจ/เสียงให้ตรงเฟรมเป๊ะ, และใช้ IKControl ทำระบบหันศีรษะ/มองตามเป้าหมาย (LookAt) พร้อมระบบเอียงตัวขณะวิ่ง (Procedural Lean)",
  leaderstats: "PROJECT FOCUS: สร้างระบบ Leaderstats และเงิน (Coins, Level, Exp) พร้อมระบบเก็บเหรียญบนแมพ ตรวจจับ Touched ด้วย task.wait debounce และ sync ค่าให้ PlayerGui แบบเรียลไทม์",
  inventory: "PROJECT FOCUS: สร้างระบบกระเป๋าเก็บของ (Inventory) และร้านค้า (Shop) ด้วย ScreenGui ที่ทันสมัย แบ่งสัดส่วน Client/Server ผ่าน RemoteFunction/RemoteEvent ตรวจสอบความถูกต้องฝั่ง Server เสมอ",
  raycast_combat: "PROJECT FOCUS: สร้างระบบอาวุธ/การโจมตีแบบ Raycast ที่มีประสิทธิภาพ ใช้ workspace:Raycast พร้อม RaycastParams กรองตัวละครผู้ยิง มีระบบ Hitbox Detection และ Damage Verification ฝั่ง Server ป้องกันการแฮก",
  npc_ai: "PROJECT FOCUS: พัฒนาระบบ NPC AI และ PathfindingService อัจฉริยะ รองรับ State Machine (Patrol, Detect Player, Chase, Attack, Return), มี Waypoint Visualization และคำนวณ Raycast Line-of-Sight"
};

const selTemplate = document.getElementById("sel-template");
if (selTemplate) {
  selTemplate.addEventListener("change", (e) => {
    const key = e.target.value;
    if (key && PROMPT_TEMPLATES[key]) {
      promptInput.value = PROMPT_TEMPLATES[key];
      chrome.storage.local.set({ zsCustomPrompt: PROMPT_TEMPLATES[key] }, () => {
        showToast("ใช้งานเทมเพลต " + key + " แล้ว");
      });
    }
  });
}

// ── Boot ────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "zs-status") render(msg);
});

refresh();
loadTools();
highlightActiveTabs();
setInterval(() => {
  refresh();
  highlightActiveTabs();
}, 2500);


// ── Sound Toggle & 1-Click Chat Insert ────────────────────────────────────────
const btnSound = document.getElementById("btn-sound-toggle");
if (btnSound) {
  chrome.storage.local.get({ soundEnabled: true }, (res) => {
    const on = res.soundEnabled !== false;
    btnSound.textContent = on ? "🔔" : "🔕";
    btnSound.title = on ? "เสียงแจ้งเตือน: เปิดอยู่ (คลิกเพื่อปิด)" : "เสียงแจ้งเตือน: ปิดอยู่ (คลิกเพื่อเปิด)";
  });
  btnSound.addEventListener("click", () => {
    chrome.storage.local.get({ soundEnabled: true }, (res) => {
      const next = !res.soundEnabled;
      chrome.storage.local.set({ soundEnabled: next }, () => {
        btnSound.textContent = next ? "🔔" : "🔕";
        btnSound.title = next ? "เสียงแจ้งเตือน: เปิดอยู่ (คลิกเพื่อปิด)" : "เสียงแจ้งเตือน: ปิดอยู่ (คลิกเพื่อเปิด)";
        showToast(next ? "เปิดเสียงแจ้งเตือนแล้ว" : "ปิดเสียงแจ้งเตือนแล้ว");
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((t) => {
            chrome.tabs.sendMessage(t.id, { type: "zs-sound-toggle", enabled: next }, () => {
              void chrome.runtime.lastError;
            });
          });
        });
      });
    });
  });
}

const btnInsertChat = document.getElementById("btn-insert-chat");
if (btnInsertChat) {
  btnInsertChat.addEventListener("click", () => {
    const text = (promptInput && promptInput.value.trim()) || "";
    if (!text) {
      showToast("กรุณาเลือกหรือพิมพ์ข้อความก่อน");
      return;
    }
    const supported = [
      "deepseek.com",
      "chatgpt.com",
      "chat.openai.com",
      "gemini.google.com",
      "kimi.ai",
      "moonshot.cn",
      "chat.z.ai",
      "chatglm.cn",
      "qwen.ai",
      "tongyi.aliyun.com",
      "meta.ai",
      "arena.ai",
      "lmarena.ai"
    ];
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const targetTab = tabs[0];
      const isSupported = targetTab && targetTab.url && supported.some((h) => targetTab.url.includes(h));
      if (isSupported) {
        sendInsert(targetTab.id, text);
      } else {
        chrome.tabs.query({}, (allTabs) => {
          const found = allTabs.find((t) => t.url && supported.some((h) => t.url.includes(h)));
          if (found) {
            chrome.tabs.update(found.id, { active: true }, () => {
              sendInsert(found.id, text);
            });
            if (found.windowId) chrome.windows.update(found.windowId, { focused: true });
          } else {
            showToast("ไม่พบแท็บแชท AI ที่เปิดอยู่ (เปิด DeepSeek, ChatGPT, Gemini, Kimi ฯลฯ)");
          }
        });
      }
    });
  });
}

function sendInsert(tabId, text) {
  showToast("กำลังแทรกข้อความ...");
  chrome.tabs.sendMessage(tabId, { type: "zs-insert-text", text }, (res) => {
    const err = chrome.runtime.lastError;
    if (err) {
      showToast("⚠️ กรุณารีเฟรช (F5) หน้าเว็บแชท AI ก่อนใช้งานปุ่มนี้");
      return;
    }
    if (res && res.ok === false) {
      showToast("แทรกไม่สำเร็จ: " + (res.error || "เกิดข้อผิดพลาด"));
      return;
    }
    showToast("⚡ แทรกข้อความลงในแชทสำเร็จ!");
    setTimeout(() => {
      try { window.close(); } catch {}
    }, 450);
  });
}
