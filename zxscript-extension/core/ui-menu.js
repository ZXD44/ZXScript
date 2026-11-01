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

    const esc = (s) =>
      String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    // Compact AI model pills
    let sites = "";
    for (const s of AI_SITES) {
      const current = s.name.toLowerCase() === here;
      if (current) {
        sites += `
          <div class="zs-site-pill active" title="${esc(s.name)} (กำลังใช้งานหน้านี้)">
            <span class="zs-pill-dot on"></span>
            <span class="zs-pill-name">${esc(s.name)}</span>
            <span class="zs-pill-badge">หน้านี้</span>
          </div>`;
      } else {
        sites += `
          <button class="zs-site-pill" data-u="${esc(s.url)}" title="เปิด ${esc(s.name)} ในหน้าต่างใหม่">
            <span class="zs-pill-dot"></span>
            <span class="zs-pill-name">${esc(s.name)}</span>
          </button>`;
      }
    }

    const mergedServers = mergedMcpServers();
    const robloxAlive = A.bridge && A.bridge.connected && (A.bridge.studio === true || (A.bridge.tools > 0));
    const robloxHealth = !A.bridge || !A.bridge.connected ? "off" : robloxAlive ? "on" : "warn";
    const robloxTitle = !A.bridge || !A.bridge.connected
      ? "ยังไม่ได้เปิดระบบเชื่อมต่อ"
      : robloxAlive
      ? `เชื่อมต่อ Studio แล้ว (${A.bridge.tools || 0} คำสั่ง)`
      : (A.bridge && A.bridge.studioProc)
      ? "ตรวจพบโปรแกรม แต่ยังไม่ได้เปิดแมพ"
      : "รอเปิดโปรแกรม Roblox Studio";
    const robloxSub = !A.bridge || !A.bridge.connected
      ? "ระบบเชื่อมต่อออฟไลน์ (พอร์ต 17613)"
      : robloxAlive
      ? `พร้อมใช้งาน · ${A.bridge.tools || 0} คำสั่ง`
      : "รอเปิด Place ใน Roblox Studio";

    let mcpList = `<div class="zs-mcp-item zs-mcp-item-primary"><span class="zs-mcp-health zs-mcp-health-${robloxHealth}"></span><div class="zs-mcp-info"><span class="zs-mcp-name">Roblox Studio</span><span class="zs-mcp-url">${esc(robloxSub)}</span></div></div>`;
    mergedServers.forEach((s) => {
      const healthClass = s.alive === true ? "on" : s.alive === false ? "off" : "unknown";
      const healthTitle =
        s.alive === true ? `พร้อมใช้งาน ${s.tools || 0} คำสั่ง` : s.alive === false ? "ออฟไลน์" : "ไม่ทราบสถานะ";
      mcpList += `<div class="zs-mcp-item"><span class="zs-mcp-health zs-mcp-health-${healthClass}" title="${healthTitle}"></span><div class="zs-mcp-info"><span class="zs-mcp-name">${esc(s.name)}</span><span class="zs-mcp-url">${esc(s.command || s.id)}</span></div><button class="zs-mcp-remove" data-id="${esc(s.id)}" title="ลบรายการ">✕</button></div>`;
    });

    menuEl.innerHTML = `
      <div class="zs-menu-head">
        <div class="zs-menu-brand">
          <svg class="zs-dragon-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 9l3 13 6-4 6 4 3-13-9-7zm0 3.5l5.5 4.3-1.8 7.8-3.7-2.5-3.7 2.5-1.8-7.8L12 5.5z"/></svg>
          <span class="zs-menu-logo">ZXScript</span>
          <span class="zs-menu-tag">ตั้งค่า</span>
        </div>
        <button id="zs-menu-close" class="zs-menu-close" title="ปิดหน้าต่าง">✕</button>
      </div>

      <!-- ส่วนที่ 1: สถานะเชื่อมต่อ Studio -->
      <div class="zs-menu-status-card ${robloxHealth}">
        <span class="zs-status-card-dot ${robloxHealth}"></span>
        <div class="zs-status-card-text">
          <span class="zs-status-card-title">${esc(robloxTitle)}</span>
          <span class="zs-status-card-sub">${esc(robloxSub)}</span>
        </div>
      </div>

      <!-- ส่วนที่ 2: สลับหน้าต่าง AI (กะทัดรัด สบายตา) -->
      <section class="zs-menu-sec">
        <div class="zs-sec-head">
          <span class="zs-sec-title">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z"/></svg>
            สลับหน้าต่าง AI
          </span>
          <span class="zs-sec-badge">${AI_SITES.length} โมเดล</span>
        </div>
        <div class="zs-site-pills">${sites}</div>
      </section>

      <!-- ส่วนที่ 3: คำแนะนำช่วยจำสำหรับ AI -->
      <section class="zs-menu-sec">
        <div class="zs-sec-head">
          <span class="zs-sec-title">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v2H2V2zm0 4h10v2H2V6zm0 4h12v2H2v-2zm0 4h8v2H2v-2z"/></svg>
            คำแนะนำช่วยจำสำหรับ AI
          </span>
        </div>
        <div class="zs-sec-sub">ส่งข้อความนี้ให้ AI ช่วยจำทุกครั้ง (เช่น สไตล์โค้ด)</div>
        <textarea id="zs-set-text" class="zs-textarea" rows="2" placeholder="เช่น ตอบเป็นภาษาไทยเสมอ, ใช้โครงสร้าง Rojo ในการเขียนสคริปต์...">${esc(customPrompt)}</textarea>
        <div class="zs-menu-row">
          <button id="zs-set-save" class="zs-btn-pixel">บันทึกข้อมูล</button>
          <span id="zs-set-status" class="zs-set-status"></span>
        </div>
      </section>

      <!-- ส่วนที่ 4: เครื่องมือเสริมขั้นสูง (พับเก็บได้ ไม่รก ไม่เรื่องเยอะ) -->
      <details class="zs-mcp-fold">
        <summary class="zs-fold-title">
          <span>เครื่องมือเสริมขั้นสูง (MCP)</span>
          <span class="zs-fold-arrow">›</span>
        </summary>
        <div class="zs-fold-content">
          <div class="zs-sec-sub">คำสั่งเครื่องมือเสริมจะส่งต่อไปยัง AI อัตโนมัติ</div>
          <div id="zs-mcp-list">${mcpList}</div>
          <div class="zs-mcp-add-box">
            <div class="zs-mcp-inputs">
              <input type="text" id="zs-mcp-name" class="zs-input" placeholder="ชื่อเครื่องมือ (เช่น Filesystem)">
              <input type="text" id="zs-mcp-url" class="zs-input" placeholder="คำสั่งเปิด (เช่น npx -y @modelcontextprotocol/...)">
            </div>
            <div class="zs-mcp-actions">
              <button id="zs-mcp-add-btn" class="zs-btn-pixel">+ เพิ่มเครื่องมือ</button>
              <span id="zs-mcp-status" class="zs-mcp-status"></span>
            </div>
          </div>
        </div>
      </details>

      <div class="zs-menu-foot">
        <div class="zs-foot-left">
          <span class="zs-foot-dev" title="ผู้พัฒนา">ZXD44</span>
          <span class="zs-foot-dragon">มังกรดิสคอร์ด</span>
        </div>
        <div class="zs-foot-links">
          <a href="https://www.zirconx.xyz" target="_blank" rel="noopener" class="zs-foot-link" title="เว็บไซต์หลัก">เว็บไซต์</a>
          <span class="zs-foot-sep">·</span>
          <a href="${GITHUB_URL}" target="_blank" rel="noopener" class="zs-foot-link">GitHub</a>
          ${VIDEO_URL ? `<span class="zs-foot-sep">·</span><a href="${VIDEO_URL}" target="_blank" rel="noopener" class="zs-foot-link">คู่มือ</a>` : ""}
        </div>
      </div>
    `;

    // Hook listeners
    const closeBtn = menuEl.querySelector("#zs-menu-close");
    if (closeBtn) closeBtn.addEventListener("click", () => closeMenu());

    menuEl.querySelectorAll(".zs-site-pill[data-u], .zs-site-card[data-u]").forEach((b) =>
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

