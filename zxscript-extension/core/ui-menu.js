// SPDX-License-Identifier: GPL-3.0-or-later
// core/ui-menu.js - Settings dropdown menu and first-run setup wizard.

(() => {
  "use strict";

  window.ZS = window.ZS || {};

  const { A, AI_SITES, EXT_VERSION, GITHUB_URL, VIDEO_URL, diag } = window.ZS.constants || window.ZS || {};

  let menuEl = null;
  let customPrompt = "";
  let customMcpServers = [];
  let mcpBusy = false;
  let setupCard = null;
  let setupSeen = false;

  // Hydrate custom prompt from storage
  try {
    chrome.storage.local.get("zsCustomPrompt", (r) => {
      if (r && typeof r.zsCustomPrompt === "string") {
        customPrompt = r.zsCustomPrompt;
        syncMenuPrompt();
      }
    });
  } catch {}

  // Hydrate custom MCP servers from storage
  try {
    chrome.storage.local.get("zsCustomMcpServers", (r) => {
      if (r && Array.isArray(r.zsCustomMcpServers)) {
        customMcpServers = r.zsCustomMcpServers;
        if (menuEl && !menuEl.hidden) buildMenu();
      }
    });
  } catch {}

  // Hydrate setup-seen flag
  try {
    chrome.storage.local.get("zsSetupSeen", (r) => {
      if (r && r.zsSetupSeen) setupSeen = true;
    });
  } catch {}

  function getCustomPrompt() {
    return customPrompt;
  }

  function syncMenuPrompt() {
    const ta = menuEl && menuEl.querySelector("#zs-set-text");
    if (ta && document.activeElement !== ta) ta.value = customPrompt;
  }

  function getCustomMcpServers() {
    return customMcpServers;
  }

  function saveCustomMcpServers() {
    try {
      chrome.storage.local.set({ zsCustomMcpServers: customMcpServers });
    } catch {}
  }

  function mergedMcpServers() {
    const live = ((A.bridge && A.bridge.servers) || []).filter((sv) => sv.id !== "roblox");
    const byId = new Map(customMcpServers.map((s) => [s.id, s]));
    const merged = live.map((sv) => {
      const cached = byId.get(sv.id);
      return {
        id: sv.id,
        name: (cached && cached.name) || sv.id,
        command: cached && cached.command,
        alive: sv.alive,
        tools: sv.tools,
      };
    });

    let healed = false;
    for (const sv of live) {
      if (!byId.has(sv.id)) {
        customMcpServers.push({ id: sv.id, name: sv.id });
        healed = true;
      }
    }
    if (healed) saveCustomMcpServers();

    for (const s of customMcpServers) {
      if (!merged.some((m) => m.id === s.id)) merged.push({ ...s, alive: undefined, tools: undefined });
    }
    return merged;
  }

  function mcpSlug(name) {
    let s = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!s || s === "roblox") s = `addon-${s || "server"}`;
    let id = s, n = 2;
    while (customMcpServers.some((x) => x.id === id)) id = `${s}-${n++}`;
    return id;
  }

  function splitCommand(raw) {
    const parts = String(raw || "").match(/"[^"]*"|'[^']*'|\S+/g) || [];
    const clean = parts.map((p) => p.replace(/^["']|["']$/g, ""));
    return { command: clean[0] || "", args: clean.slice(1) };
  }

  async function waitForBridgeBack(id, timeoutMs = 15000) {
    const t0 = Date.now();
    await new Promise((r) => setTimeout(r, 1200));
    while (Date.now() - t0 < timeoutMs) {
      const s = await window.ZS.bg({ type: "status" });
      if (s && s.connected) {
        if (!id || (Array.isArray(s.servers) && s.servers.some((x) => x.id === id))) return true;
      }
      await new Promise((r) => setTimeout(r, 700));
    }
    return false;
  }

  function setMcpBusy(on, label) {
    mcpBusy = on;
    if (!menuEl) return;
    const btn = menuEl.querySelector("#zs-mcp-add-btn");
    const status = menuEl.querySelector("#zs-mcp-status");
    if (btn) btn.disabled = on;
    menuEl.querySelectorAll(".zs-mcp-remove").forEach((b) => (b.disabled = on));
    if (status) status.textContent = on ? label || "กำลังดำเนินการ…" : "";
  }

  function buildMenu() {
    if (!menuEl) return;
    const P = window.ZSProvider;
    const here = ((P && P.displayName) || "").toLowerCase();
    const hostOf = (u) => {
      try {
        return new URL(u).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    };

    const esc = (s) =>
      String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    let sites = "";
    for (const s of AI_SITES) {
      const current = s.name.toLowerCase() === here;
      const host = hostOf(s.url);
      if (current) {
        sites += `
          <div class="zs-site-card zs-site-current" title="${esc(s.name)} (กำลังใช้งานหน้านี้)">
            <div class="zs-site-card-top">
              <span class="zs-site-badge-dot on"></span>
              <span class="zs-site-name">${esc(s.name)}</span>
            </div>
            <div class="zs-site-card-bot">
              <span class="zs-site-host">${esc(host)}</span>
              <span class="zs-site-badge-active">ใช้งานอยู่</span>
            </div>
          </div>`;
      } else {
        sites += `
          <button class="zs-site-card" data-u="${esc(s.url)}" title="เปิด ${esc(s.name)} ในแท็บใหม่">
            <div class="zs-site-card-top">
              <span class="zs-site-badge-dot"></span>
              <span class="zs-site-name">${esc(s.name)}</span>
              <span class="zs-site-go">&rarr;</span>
            </div>
            <div class="zs-site-card-bot">
              <span class="zs-site-host">${esc(host)}</span>
            </div>
          </button>`;
      }
    }

    const mergedServers = mergedMcpServers();
    const robloxAlive = A.bridge && A.bridge.connected && (A.bridge.studio === true || (A.bridge.tools > 0));
    const robloxHealth = !A.bridge || !A.bridge.connected ? "off" : robloxAlive ? "on" : "warn";
    const robloxTitle = !A.bridge || !A.bridge.connected
      ? "Bridge ออฟไลน์"
      : robloxAlive
      ? `เชื่อมต่อ Studio แล้ว (${A.bridge.tools || 0} คำสั่ง)`
      : (A.bridge && A.bridge.studioProc)
      ? "รอเปิด Place ใน Studio"
      : "รอเปิด Roblox Studio";
    const robloxSub = !A.bridge || !A.bridge.connected
      ? "ระบบหลัก · ออฟไลน์ (พอร์ต 17613)"
      : robloxAlive
      ? `พร้อมใช้งาน · ${A.bridge.tools || 0} คำสั่ง`
      : "รอเชื่อมต่อแมพใน Studio";

    let mcpList = `<div class="zs-mcp-item zs-mcp-item-primary"><span class="zs-mcp-health zs-mcp-health-${robloxHealth}" title="${esc(robloxTitle)}"></span><div class="zs-mcp-info"><span class="zs-mcp-name">Roblox Studio</span><span class="zs-mcp-url">${esc(robloxSub)}</span></div></div>`;
    mergedServers.forEach((s) => {
      const healthClass = s.alive === true ? "on" : s.alive === false ? "off" : "unknown";
      const healthTitle =
        s.alive === true ? `พร้อมใช้งาน ${s.tools || 0} คำสั่ง` : s.alive === false ? "ออฟไลน์" : "ไม่ทราบสถานะ";
      mcpList += `<div class="zs-mcp-item"><span class="zs-mcp-health zs-mcp-health-${healthClass}" title="${healthTitle}"></span><div class="zs-mcp-info"><span class="zs-mcp-name">${esc(s.name)}</span><span class="zs-mcp-url">${esc(s.command || s.id)}</span></div><button class="zs-mcp-remove" data-id="${esc(s.id)}" title="ลบเซิร์ฟเวอร์">✕</button></div>`;
    });

    menuEl.innerHTML = `
      <div class="zs-menu-head">
        <div class="zs-menu-brand">
          <svg class="zs-dragon-icon" width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L2 7l6 8 6-8-6-6zm0 3l3.5 3.5L8 12.5 4.5 7.5 8 4z"/></svg>
          <span class="zs-menu-logo">ZXScript</span>
          <span class="zs-menu-tag">v${EXT_VERSION}</span>
        </div>
        <button id="zs-menu-close" class="zs-menu-close" title="ปิดหน้าต่าง">✕</button>
      </div>

      <section class="zs-menu-sec">
        <div class="zs-sec-head">
          <span class="zs-sec-title">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z"/></svg>
            สลับโมเดล AI
          </span>
          <span class="zs-sec-badge">${AI_SITES.length} โมเดล</span>
        </div>
        <div class="zs-site-grid">${sites}</div>
      </section>

      <section class="zs-menu-sec">
        <div class="zs-sec-head">
          <span class="zs-sec-title">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1h8v3H4V1zm-2 5h12v4H2V6zm2 6h8v3H4v-3z"/></svg>
            เซิร์ฟเวอร์ MCP เสริม
          </span>
        </div>
        <div class="zs-sec-sub">คำสั่งและเครื่องมือจะส่งต่อไปยังโมเดล AI อัตโนมัติ</div>
        <div id="zs-mcp-list">${mcpList}</div>
        <div class="zs-mcp-add-box">
          <div class="zs-mcp-inputs">
            <input type="text" id="zs-mcp-name" class="zs-input" placeholder="ชื่อเซิร์ฟเวอร์ (เช่น Filesystem)">
            <input type="text" id="zs-mcp-url" class="zs-input" placeholder="คำสั่งรัน (เช่น npx -y @modelcontextprotocol/...)">
          </div>
          <div class="zs-mcp-actions">
            <button id="zs-mcp-add-btn" class="zs-btn-pixel">+ เพิ่มเซิร์ฟเวอร์</button>
            <span id="zs-mcp-status" class="zs-mcp-status"></span>
          </div>
        </div>
      </section>

      <section class="zs-menu-sec">
        <div class="zs-sec-head">
          <span class="zs-sec-title">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v2H2V2zm0 4h10v2H2V6zm0 4h12v2H2v-2zm0 4h8v2H2v-2z"/></svg>
            คำสั่งระบบเสริม (Custom Prompt)
          </span>
        </div>
        <div class="zs-sec-sub">จะส่งประกบคำสั่งเริ่มต้นของ ZXScript ให้ AI เสมอ</div>
        <textarea id="zs-set-text" class="zs-textarea" rows="3" placeholder="ตัวอย่าง: ตอบเป็นภาษาไทยเสมอ, ใช้ Rojo ในการจัดโครงสร้างโค้ด...">${esc(customPrompt)}</textarea>
        <div class="zs-menu-row">
          <button id="zs-set-save" class="zs-btn-pixel">💾 บันทึกคำสั่ง</button>
          <span id="zs-set-status" class="zs-set-status"></span>
        </div>
      </section>

      <div class="zs-menu-foot">
        <div class="zs-foot-left">
          <span class="zs-foot-dev" title="ผู้พัฒนา ZXD44">ZXD44</span>
          <span class="zs-foot-dragon">Red Dragon</span>
        </div>
        <div class="zs-foot-links">
          <a href="https://www.zirconx.xyz" target="_blank" rel="noopener" class="zs-foot-link" title="เว็บไซต์ผู้พัฒนา: www.zirconx.xyz">🌐 เว็บไซต์</a>
          <span class="zs-foot-sep">·</span>
          <a href="${GITHUB_URL}" target="_blank" rel="noopener" class="zs-foot-link">GitHub</a>
          ${VIDEO_URL ? `<span class="zs-foot-sep">·</span><a href="${VIDEO_URL}" target="_blank" rel="noopener" class="zs-foot-link">คู่มือ</a>` : ""}
        </div>
      </div>
    `;

    // Hook listeners
    const closeBtn = menuEl.querySelector("#zs-menu-close");
    if (closeBtn) closeBtn.addEventListener("click", () => closeMenu());

    menuEl.querySelectorAll(".zs-site-card[data-u]").forEach((b) =>
      b.addEventListener("click", () => {
        window.open(b.dataset.u, "_blank", "noopener");
        closeMenu();
      })
    );

    const promptText = menuEl.querySelector("#zs-set-text");
    const savePromptBtn = menuEl.querySelector("#zs-set-save");
    const promptStatus = menuEl.querySelector("#zs-set-status");

    savePromptBtn.addEventListener("click", () => {
      customPrompt = promptText.value.trim();
      try {
        chrome.storage.local.set({ zsCustomPrompt: customPrompt }, () => {
          promptStatus.textContent = "✓ บันทึกเรียบร้อย";
          setTimeout(() => {
            promptStatus.textContent = "";
          }, 2000);
        });
      } catch {
        promptStatus.textContent = "✕ บันทึกไม่สำเร็จ";
      }
    });

    const mcpNameEl = menuEl.querySelector("#zs-mcp-name");
    const mcpUrlEl = menuEl.querySelector("#zs-mcp-url");
    const mcpAddBtn = menuEl.querySelector("#zs-mcp-add-btn");
    const mcpStatus = menuEl.querySelector("#zs-mcp-status");

    menuEl.querySelectorAll(".zs-mcp-remove").forEach((b) =>
      b.addEventListener("click", async () => {
        if (mcpBusy) return;
        const id = b.dataset.id;
        if (!id) return;
        setMcpBusy(true, "กำลังรีสตาร์ตระบบเชื่อมต่อ…");
        const r = await window.ZS.bg({ type: "remove_server", server_id: id });
        if (!r || !r.ok) {
          setMcpBusy(false);
          mcpStatus.textContent = (r && r.error) || "ลบเซิร์ฟเวอร์ไม่สำเร็จ";
          setTimeout(() => {
            if (!mcpBusy) mcpStatus.textContent = "";
          }, 2400);
          return;
        }
        customMcpServers = customMcpServers.filter((s) => s.id !== id);
        saveCustomMcpServers();
        await waitForBridgeBack(null);
        buildMenu();
      })
    );

    mcpAddBtn.addEventListener("click", async () => {
      if (mcpBusy) return;
      const name = mcpNameEl.value.trim();
      const command = mcpUrlEl.value.trim();
      if (!name || !command) {
        mcpStatus.textContent = "กรุณาระบุชื่อและคำสั่งรัน";
        setTimeout(() => {
          if (!mcpBusy) mcpStatus.textContent = "";
        }, 1800);
        return;
      }
      const id = mcpSlug(name);
      const { command: cmd, args } = splitCommand(command);
      setMcpBusy(true, "กำลังรีสตาร์ตระบบเชื่อมต่อ…");
      const r = await window.ZS.bg({ type: "add_server", server_id: id, command: cmd, args });
      if (!r || !r.ok) {
        setMcpBusy(false);
        mcpStatus.textContent = (r && r.error) || "เพิ่มเซิร์ฟเวอร์ไม่สำเร็จ";
        setTimeout(() => {
          if (!mcpBusy) mcpStatus.textContent = "";
        }, 2400);
        return;
      }
      customMcpServers.push({ id, name, command });
      saveCustomMcpServers();
      await waitForBridgeBack(id);
      buildMenu();
    });
  }

  function openMenu(toSupport = false) {
    if (!menuEl) return;
    buildMenu();
    menuEl.hidden = false;
    const swBtn = document.getElementById("zs-switch");
    if (swBtn) swBtn.classList.add("zs-switch-open");
    requestAnimationFrame(() => {
      if (!menuEl || menuEl.hidden) return;
      if (toSupport) {
        menuEl.scrollTop = menuEl.scrollHeight;
      } else {
        menuEl.scrollTop = 0;
      }
    });
  }

  function closeMenu() {
    if (menuEl) menuEl.hidden = true;
    const swBtn = document.getElementById("zs-switch");
    if (swBtn) swBtn.classList.remove("zs-switch-open");
  }

  function toggleMenu() {
    if (!menuEl) return;
    if (menuEl.hidden) openMenu();
    else closeMenu();
  }

  function isMenuOpen() {
    return menuEl && !menuEl.hidden;
  }

  function buildSetup() {
    setupCard = document.createElement("div");
    setupCard.id = "zs-setup";
    setupCard.hidden = true;
    const videoBtn = VIDEO_URL
      ? `<a id="zs-setup-video" href="${VIDEO_URL}" target="_blank" rel="noopener">คู่มือการใช้งาน</a>`
      : "";
    setupCard.innerHTML = `
      <div id="zs-setup-head"><span id="zs-setup-logo">ZXScript</span><span id="zs-setup-tag">Setup</span></div>
      <div id="zs-setup-sub">ระบบเชื่อมต่อ AI เข้ากับ Roblox Studio:</div>
      <ol id="zs-setup-steps">
        <li>เปิดโฟลเดอร์โปรเจกต์</li>
        <li>ดับเบิลคลิกไฟล์ <code>start.bat</code></li>
        <li>กลับมาหน้านี้แล้วกดปุ่ม <b>เริ่มทำงาน</b></li>
      </ol>
      <div class="zs-setup-copy-row">
        <input type="text" id="zs-setup-link" readonly value="${GITHUB_URL}">
        <button id="zs-setup-copy">คัดลอก</button>
      </div>
      ${videoBtn}
      <button id="zs-setup-dismiss">เข้าใจแล้ว</button>
    `;
    document.documentElement.appendChild(setupCard);

    setupCard.querySelector("#zs-setup-copy").addEventListener("click", () => {
      try {
        navigator.clipboard.writeText(GITHUB_URL);
      } catch {
        const inp = setupCard.querySelector("#zs-setup-link");
        inp.select();
        try {
          document.execCommand("copy");
        } catch {}
      }
      const btn = setupCard.querySelector("#zs-setup-copy");
      btn.textContent = "คัดลอกสำเร็จ";
      setTimeout(() => {
        btn.textContent = "คัดลอก";
      }, 1600);
    });

    setupCard.querySelector("#zs-setup-dismiss").addEventListener("click", () => {
      setupSeen = true;
      try {
        chrome.storage.local.set({ zsSetupSeen: true });
      } catch {}
      hideSetup();
    });
  }

  function showSetup() {
    if (!setupCard) buildSetup();
    if (setupCard.hidden) setupCard.hidden = false;
  }

  function hideSetup() {
    if (setupCard) setupCard.hidden = true;
  }

  function refreshSetup(bridgeConnected) {
    const P = window.ZSProvider;
    if (setupSeen || bridgeConnected) {
      hideSetup();
      return;
    }
    if (!A.started && !A.starting && P && !P.chatIsEmpty()) {
      hideSetup();
      return;
    }
    showSetup();
  }

  function init(element) {
    menuEl = element;
  }

  window.ZS.menu = {
    init,
    openMenu,
    closeMenu,
    toggleMenu,
    isMenuOpen,
    getCustomPrompt,
    syncMenuPrompt,
    getCustomMcpServers,
    saveCustomMcpServers,
    mergedMcpServers,
    buildSetup,
    showSetup,
    hideSetup,
    refreshSetup,
  };
})();

