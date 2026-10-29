// SPDX-License-Identifier: GPL-3.0-or-later
const SUPPORTED_HOSTS = [
  "chat.deepseek.com", "deepseek.com", "chatgpt.com", "chat.openai.com",
  "gemini.google.com", "www.kimi.ai", "kimi.ai",
  "chat.z.ai", "chat.qwen.ai", "arena.ai", "www.meta.ai", "meta.ai",
];
const DEFAULT_AI_URL = "https://chat.deepseek.com/";
const DOTS = '<span class="zs-dots"><span>.</span><span>.</span><span>.</span></span>';

document.getElementById("ver").textContent = `v${chrome.runtime.getManifest().version}`;

function render(s) {
  const dot = document.getElementById("dot");
  const state = document.getElementById("state");
  const tools = document.getElementById("tools");
  const servers = document.getElementById("servers");
  const list = s.servers || [];
  const up = list.filter((x) => x.alive).length;
  const mcpOk = s.connected && (s.mcpAlive || up > 0 || s.tools > 0);
  const studioOff = mcpOk && s.studio === false; // MCP up but no Studio attached
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

document.getElementById("reconnect").addEventListener("click", () => {
  const state = document.getElementById("state");
  state.innerHTML = `กำลังเชื่อมต่อ Bridge ใหม่${DOTS}`;
  document.getElementById("dot").className = "dot warn";
  chrome.runtime.sendMessage({ type: "reconnect" }, () => setTimeout(refresh, 600));
});
document.getElementById("restart").addEventListener("click", (e) => {
  e.innerHTML = `กำลังรีสตาร์ต${DOTS}`;
  const state = document.getElementById("state");
  state.innerHTML = `กำลังรีสตาร์ต Roblox Server${DOTS}`;
  document.getElementById("dot").className = "dot warn";
  chrome.runtime.sendMessage({ type: "restart_mcp" }, () => {
    e.textContent = "⟳ รีสตาร์ต Roblox Server";
    setTimeout(refresh, 600);
  });
});
document.getElementById("settings").addEventListener("click", () => {
  chrome.tabs.query({}, (tabs) => {
    const active = tabs.find((t) => t.active && t.url && SUPPORTED_HOSTS.some((h) => t.url.includes(h)));
    const anySupported = active || tabs.find((t) => t.url && SUPPORTED_HOSTS.some((h) => t.url.includes(h)));
    if (anySupported) {
      chrome.tabs.sendMessage(anySupported.id, { type: "zs-open-menu" });
      chrome.tabs.update(anySupported.id, { active: true });
    } else {
      chrome.tabs.create({ url: DEFAULT_AI_URL });
    }
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "zs-status") render(msg);
});
refresh();
setInterval(refresh, 2000);
