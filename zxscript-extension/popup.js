// SPDX-License-Identifier: GPL-3.0-or-later
const SUPPORTED_HOSTS = [
  "chat.deepseek.com", "deepseek.com", "chatgpt.com", "chat.openai.com",
  "gemini.google.com", "www.kimi.ai", "kimi.ai",
  "chat.z.ai", "chat.qwen.ai", "arena.ai", "www.meta.ai", "meta.ai",
];
const DEFAULT_AI_URL = "https://chat.deepseek.com/";
const DOTS = '<span class="zs-dots"><span>.</span><span>.</span><span>.</span></span>';
const CAVEMAN_PRESET = "CAVEMAN MODE: ตอบภาษาไทยสั้นกระชับ ตรงประเด็น ห้ามเยิ่นเย้อ ห้ามทักทาย สั่งรันคำสั่ง Roblox Studio MCP ทันที ประหยัด token สูงสุด";

document.getElementById("ver").textContent = `v${chrome.runtime.getManifest().version}`;

const viewMain = document.getElementById("view-main");
const viewSettings = document.getElementById("view-settings");
const promptInput = document.getElementById("custom-prompt");
const promptFeedback = document.getElementById("prompt-feedback");

function showFeedback(text, isError = false) {
  promptFeedback.textContent = text;
  promptFeedback.style.color = isError ? "#f87171" : "#10b981";
  setTimeout(() => {
    if (promptFeedback.textContent === text) promptFeedback.textContent = "";
  }, 2200);
}

function render(s) {
  const dot = document.getElementById("dot");
  const state = document.getElementById("state");
  const tools = document.getElementById("tools");
  const servers = document.getElementById("servers");
  const list = s.servers || [];
  const up = list.filter((x) => x.alive).length;
  const mcpOk = s.connected && (s.mcpAlive || up > 0 || s.tools > 0);
  const studioOff = mcpOk && s.studio === false;
  const ok = mcpOk && !studioOff;

  dot.className = "dot " + (s.connected ? (ok ? "on" : "warn") : "");
  state.innerHTML = s.connected
    ? (ok ? "🟢 เชื่อมต่อแล้ว · Studio พร้อมทำงาน"
        : studioOff ? `🟡 กำลังรอเชื่อม Studio${DOTS} (เปิด Assistant &gt; MCP)`
        : `🟡 กำลังเชื่อมต่อแมพ Studio${DOTS}`)
    : "⚪ Bridge ออฟไลน์ · ดับเบิลคลิก start.bat";
  tools.textContent = s.connected ? `⚡ พร้อมใช้งาน ${s.tools || 0} เครื่องมือ` : "รัน start.bat เพื่อเริ่มเชื่อมต่อ";
  servers.textContent = s.connected
    ? list.map((x) => `${x.alive ? "●" : "○"} ${x.id} (${x.alive ? x.tools + " คำสั่ง" : "ปิดอยู่"})`).join("\n")
    : "";
}

function refresh() {
  chrome.runtime.sendMessage({ type: "status" }, (s) => s && render(s));
}

// ── Bridge Actions ──────────────────────────────────────────────────────────
document.getElementById("reconnect").addEventListener("click", () => {
  const state = document.getElementById("state");
  state.innerHTML = `กำลังเชื่อมต่อ Bridge ใหม่${DOTS}`;
  document.getElementById("dot").className = "dot warn";
  chrome.runtime.sendMessage({ type: "reconnect" }, () => setTimeout(refresh, 600));
});

document.getElementById("restart").addEventListener("click", (e) => {
  const target = e.currentTarget;
  target.textContent = "กำลังรีสตาร์ต...";
  const state = document.getElementById("state");
  state.innerHTML = `กำลังรีสตาร์ต Roblox Server${DOTS}`;
  document.getElementById("dot").className = "dot warn";
  chrome.runtime.sendMessage({ type: "restart_mcp" }, () => {
    target.textContent = "⟳ รีสตาร์ต Roblox Server";
    setTimeout(refresh, 600);
  });
});

// ── View Switching ──────────────────────────────────────────────────────────
document.getElementById("settings").addEventListener("click", () => {
  viewMain.style.display = "none";
  viewSettings.style.display = "block";
  chrome.storage.local.get("zsCustomPrompt", (r) => {
    if (r && typeof r.zsCustomPrompt === "string") {
      promptInput.value = r.zsCustomPrompt;
    }
  });
});

document.getElementById("back-btn").addEventListener("click", () => {
  viewSettings.style.display = "none";
  viewMain.style.display = "block";
  refresh();
});

// ── AI Buttons ──────────────────────────────────────────────────────────────
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
      } else {
        chrome.tabs.create({ url: targetUrl });
      }
    });
  });
});

// ── Custom Prompt Controls ──────────────────────────────────────────────────
document.getElementById("btn-save-prompt").addEventListener("click", () => {
  const text = promptInput.value;
  chrome.storage.local.set({ zsCustomPrompt: text }, () => {
    showFeedback("บันทึกคำสั่งสำเร็จ ✓");
  });
});

document.getElementById("btn-caveman").addEventListener("click", () => {
  promptInput.value = CAVEMAN_PRESET;
  chrome.storage.local.set({ zsCustomPrompt: CAVEMAN_PRESET }, () => {
    showFeedback("เปิดโหมด Caveman สำเร็จ ✓");
  });
});

// ── Open Overlay on Active Tab ──────────────────────────────────────────────
document.getElementById("open-overlay-btn").addEventListener("click", () => {
  chrome.tabs.query({}, (tabs) => {
    const active = tabs.find((t) => t.active && t.url && SUPPORTED_HOSTS.some((h) => t.url.includes(h)));
    const target = active || tabs.find((t) => t.url && SUPPORTED_HOSTS.some((h) => t.url.includes(h)));
    if (target) {
      chrome.tabs.update(target.id, { active: true }, () => {
        chrome.tabs.sendMessage(target.id, { type: "zs-open-menu" }, () => {
          void chrome.runtime.lastError;
        });
      });
      showFeedback("เปิดแถบควบคุมบนแท็บแล้ว ✓");
    } else {
      chrome.tabs.create({ url: DEFAULT_AI_URL });
      showFeedback("กำลังเปิด DeepSeek...");
    }
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "zs-status") render(msg);
});

refresh();
setInterval(refresh, 2000);
