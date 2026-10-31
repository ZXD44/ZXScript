// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * core/ui-bar.js - Consolidated floating dynamic island action bar and theme engine.
 */
(() => {
  "use strict";

  window.ZS = window.ZS || {};
  const { A, EXT_VERSION } = window.ZS.constants || window.ZS || {};

  const ui = (() => {
    let root, bar, dot, brandEl, stateEl, actionBtn, stopBtn, switchBtn, creditEl, menuEl, unstableEl;
    let bridgeOk = false, studioDown = false, placeDown = false, appDown = false, addonOk = false, studioProcUp = false;
    let wasConnected = false;
    let barRaf = null;
    let lastBarSig = "";
    let _hudStatusText = "";

    function build() {
      const P = window.ZSProvider;
      root = document.createElement("div");
      root.id = "zs-root";

      root.innerHTML = `
        <div id="zs-bar">
          <span id="zs-dot" class="off" title=""></span>
          <span id="zs-brand"><svg class="zs-rbx-icon" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:-1px;margin-right:4px;"><path d="M5.26 2L2 18.74 18.74 22 22 5.26 5.26 2zm8.28 11.23l-3.27-.63.63-3.27 3.27.63-.63 3.27z"/></svg>Studio <span class="zs-free">v${EXT_VERSION}</span></span>
          <span class="zs-sep"></span>
          <span id="zs-state"></span>
          <button id="zs-action"></button>
          <button id="zs-stop" hidden title="หยุดการทำงาน">หยุด</button>
          <span class="zs-sep"></span>
          <button id="zs-switch" aria-label="สลับ AI และการตั้งค่า" title="สลับเว็บ AI, ตั้งค่า Prompt, จัดการ MCP"><span id="zs-switch-name"></span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>
          <span id="zs-credit" class="zs-credit" title="ผู้พัฒนา ZXD44">ZXD44</span>
        </div>
        <div id="zs-menu" hidden></div>
        ${P && P.unstableWarning ? `<button id="zs-unstable" aria-label="Provider may be unstable" hidden>ไม่เสถียร</button>` : ""}
      `;
      document.documentElement.appendChild(root);
      bar = root.querySelector("#zs-bar");
      dot = root.querySelector("#zs-dot");
      brandEl = root.querySelector("#zs-brand");
      stateEl = root.querySelector("#zs-state");
      actionBtn = root.querySelector("#zs-action");
      stopBtn = root.querySelector("#zs-stop");
      switchBtn = root.querySelector("#zs-switch");
      creditEl = root.querySelector("#zs-credit");
      const swName = root.querySelector("#zs-switch-name");
      if (swName && P) swName.textContent = P.displayName || P.id;
      menuEl = root.querySelector("#zs-menu");

      if (window.ZS.menu && window.ZS.menu.init) {
        window.ZS.menu.init(menuEl);
      }

      if (P) {
        bar.classList.add(`zs-prov-${P.id}`);
        document.documentElement.classList.add(`zs-site-${P.id}`);
      }

      actionBtn.addEventListener("click", onActionClick);
      stopBtn.addEventListener("click", () => {
        if (window.ZS.stopLoop) window.ZS.stopLoop();
      });
      dot.addEventListener("click", () => {
        if (!A.bridge || !A.bridge.connected) window.ZS.showBridgeModal();
      });
      stateEl.addEventListener("click", () => {
        if (!A.bridge || !A.bridge.connected) window.ZS.showBridgeModal();
      });

      unstableEl = root.querySelector("#zs-unstable");
      if (unstableEl && P) {
        unstableEl.title = P.unstableWarning || "";
        unstableEl.addEventListener("click", (e) => {
          e.stopPropagation();
          window.ZS.toast(P.unstableWarning);
        });
      }

      switchBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.ZS.menu) window.ZS.menu.toggleMenu();
      });

      document.addEventListener(
        "click",
        (e) => {
          if (!menuEl || menuEl.hidden) return;
          if (!menuEl.contains(e.target) && !switchBtn.contains(e.target)) {
            if (window.ZS.menu) window.ZS.menu.closeMenu();
            else menuEl.hidden = true;
          }
        },
        true
      );

      applyTheme();
      setInterval(applyTheme, 2000);
      renderBar();
      placeBar();
    }

    function onActionClick() {
      const kind = actionBtn.dataset.kind;
      if (kind === "start" || kind === "start-degraded") {
        if (window.ZS.startSession) window.ZS.startSession();
      }
    }

    function pageThemeHint() {
      const de = document.documentElement, b = document.body;
      const cls = (de.className + " " + (b ? b.className : "")).toLowerCase();
      if (/\bdark\b/.test(cls)) return "dark";
      if (/\blight\b/.test(cls)) return "light";
      const attr = (
        de.getAttribute("data-theme") ||
        de.getAttribute("data-color-mode") ||
        de.getAttribute("data-color-scheme") ||
        ""
      ).toLowerCase();
      if (/dark/.test(attr)) return "dark";
      if (/light/.test(attr)) return "light";
      const cs = (getComputedStyle(de).colorScheme || "").toLowerCase();
      if (/dark/.test(cs) && !/light/.test(cs)) return "dark";
      if (/light/.test(cs) && !/dark/.test(cs)) return "light";
      return null;
    }

    function effectiveBg() {
      let n = document.body;
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/(transparent)/.test(c) && !/,\s*0\s*\)$/.test(c)) return c;
        n = n.parentElement;
      }
      return getComputedStyle(document.documentElement).backgroundColor || "rgb(255,255,255)";
    }

    function applyTheme() {
      let light;
      const hint = pageThemeHint();
      if (hint) {
        light = hint === "light";
      } else {
        const m = (effectiveBg().match(/\d+(?:\.\d+)?/g) || []).map(Number);
        if (m.length < 3) return;
        light = 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2] > 140;
      }
      document.documentElement.classList.toggle("zs-light", light);
    }

    function placeUnstable() {
      const u = unstableEl;
      if (!u) return;
      if (!bar || bar.style.display === "none") {
        if (!u.hidden) u.hidden = true;
        return;
      }
      const br = bar.getBoundingClientRect();
      if (!br.width) {
        if (!u.hidden) u.hidden = true;
        return;
      }
      if (u.hidden) u.hidden = false;
      const uh = u.offsetHeight || 20;
      const nL = Math.round(br.left) + "px";
      const nT = Math.round(Math.max(4, br.top - uh - 5)) + "px";
      if (u.style.left !== nL) u.style.left = nL;
      if (u.style.top !== nT) u.style.top = nT;
    }

    function placeBar() {
      barRaf = requestAnimationFrame(placeBar);
      if (!bar) return;
      const P = window.ZSProvider;

      if (root && !root.isConnected) {
        try {
          document.documentElement.appendChild(root);
        } catch {}
      }

      placeUnstable();

      if (P && ((P.captchaPresent && P.captchaPresent()) || (P.overlayBlocking && P.overlayBlocking()))) {
        bar.style.display = "none";
        if (menuEl) menuEl.hidden = true;
        return;
      }

      if (root && bar.parentElement !== root) {
        root.appendChild(bar);
      }
      bar.style.display = "flex";

      if (menuEl && !menuEl.hidden) {
        const br = bar.getBoundingClientRect();
        menuEl.style.position = "fixed";
        menuEl.style.top = Math.round(br.bottom + 8) + "px";
        menuEl.style.left = Math.round(br.left + br.width / 2) + "px";
        menuEl.style.transform = "translateX(-50%)";
        menuEl.style.maxHeight = Math.max(160, Math.round(window.innerHeight - br.bottom - 24)) + "px";
      }
    }

    function updateStartGate() {
      renderBar();
    }

    function cleanHudText(text) {
      if (!text) return "";
      let t = String(text).trim().replace(/^[⚡\s]+/, "");
      if (t.includes("เริ่มต้นทำงาน") || t.includes("กำลังเริ่ม")) return "กำลังเริ่ม…";
      if (t.includes("รอ AI ตอบกลับ")) return "รอ AI ตอบกลับ…";
      if (t.includes("ส่งผลลัพธ์")) return "ส่งผลลัพธ์…";
      if (t.startsWith("รัน: ")) {
        const tool = t.replace("รัน: ", "").replace(/[…\s]+$/, "");
        return `รัน: ${tool}`;
      }
      return t;
    }

    function inputCover(on, text) {
      const P = window.ZSProvider;
      const ed = P && P.getEditor ? P.getEditor() : null;
      const oldCover = document.getElementById("zs-input-cover");
      if (oldCover) try { oldCover.remove(); } catch {}

      if (!on) {
        _hudStatusText = "";
        if (ed) ed.classList.remove("zs-typing");
        renderBar();
        return;
      }

      if (text) _hudStatusText = cleanHudText(text);
      if (ed) {
        if (A.injecting) ed.classList.add("zs-typing");
        else ed.classList.remove("zs-typing");
      }
      if (stopBtn && (A.running || A.starting)) stopBtn.hidden = false;
      if (actionBtn && (A.running || A.starting)) actionBtn.style.display = "none";
      renderBar();
    }

    function setHudStatus(text) {
      _hudStatusText = cleanHudText(text);
      renderBar();
    }

    function renderBar() {
      if (!bar) return;
      const P = window.ZSProvider;
      let toneClass = "standby", indicator = "", msg = "", label = "", kind = "", disabled = false, warn = false;

      if (A.staleExtension) {
        if (dot) dot.className = "off";
        toneClass = "warn";
        warn = true;
        msg = `รีเฟรชหน้าเพื่อเชื่อมต่อใหม่`;
      } else if (A.starting) {
        toneClass = "starting";
        indicator = `<span class="zs-spin"></span>`;
        msg = `<b>กำลังเริ่ม…</b>`;
        label = "กำลังเริ่ม…";
        kind = "starting";
        disabled = true;
      } else if (A.started) {
        const healthTotal = A.bridge && (A.bridge.servers || []).reduce((n, x) => n + (x.tools || 0), 0);
        const tools = A.toolList.length || healthTotal || (A.bridge && A.bridge.tools) || 0;
        if (A.bridge && A.bridge.connected === false) {
          toneClass = "warn";
          warn = true;
          msg = `<b>AI พร้อม</b> · ออฟไลน์`;
        } else if ((placeDown || appDown || studioDown) && addonOk) {
          toneClass = "warn";
          msg = A.running ? (_hudStatusText ? `<b>${_hudStatusText}</b>` : `<b>AI กำลังทำงาน</b>`) : `<b>พร้อมรับคำสั่ง</b> · Studio ออฟไลน์`;
        } else if (placeDown) {
          toneClass = "warn";
          warn = true;
          msg = `<b>AI พร้อม</b> · เปิดแมพใน Studio`;
        } else if (appDown || studioDown) {
          toneClass = "warn";
          warn = true;
          msg = `<b>AI พร้อม</b> · รอเปิด Studio`;
        } else {
          toneClass = "active";
          msg = A.running
            ? (_hudStatusText ? `<b>${_hudStatusText}</b>` : `<b>AI กำลังทำงาน</b>`)
            : `<b>พร้อมรับคำสั่ง</b>${tools ? ` · ${tools} คำสั่ง` : ""}`;
        }
      } else if (P && (P.isFreshChat() || P.chatIsEmpty())) {
        if (bridgeOk) {
          toneClass = "standby";
          msg = `พร้อมเชื่อมต่อ Studio`;
          label = "เริ่มให้ AI ทำงาน";
          kind = "start";
        } else if (addonOk) {
          toneClass = "warn";
          warn = true;
          msg = !A.bridge.connected
            ? `กรุณาเปิดระบบเชื่อมต่อ`
            : studioProcUp
            ? `<b>เปิด Studio แล้ว</b>`
            : `<b>Studio ออฟไลน์</b>`;
          label = "เริ่มทำงาน (Studio ออฟไลน์)";
          kind = "start-degraded";
        } else {
          toneClass = "warn";
          warn = true;
          msg = !A.bridge.connected
            ? `รอเชื่อมต่อ Studio<span class="zs-dots"><span>.</span><span>.</span><span>.</span></span>`
            : placeDown
            ? `รอเปิดแมพใน Studio<span class="zs-dots"><span>.</span><span>.</span><span>.</span></span>`
            : `กำลังเชื่อมต่อ Studio<span class="zs-dots"><span>.</span><span>.</span><span>.</span></span>`;
          label = "เริ่มทำงาน";
          kind = "start";
        }
        disabled = !bridgeOk && !addonOk;
      } else {
        toneClass = "noagent";
        msg = `เปิดแชตใหม่เพื่อเริ่มใช้งาน`;
      }

      if (A.parked && (A.running || A.starting)) {
        toneClass = "warn";
        warn = false;
        msg = `<b>หยุดชั่วคราว</b> · สลับแท็บนี้มาด้านหน้าเพื่อทำงานต่อ`;
      }

      if (!A.started && !A.starting && P && P.modeWarning) {
        const modeWarn = P.modeWarning();
        if (modeWarn) {
          toneClass = "warn";
          warn = true;
          msg = modeWarn;
          if (kind === "start" || kind === "start-degraded") disabled = true;
        }
      }

      const busy = !stopBtn.hidden;
      const showExtras = !!A.started;
      const sig = [toneClass, indicator, msg, label, kind, disabled, warn, busy, showExtras].join("|");
      if (sig === lastBarSig) return;
      lastBarSig = sig;

      bar.classList.remove("tone-standby", "tone-active", "tone-warn", "tone-noagent", "tone-starting");
      bar.classList.add(`tone-${toneClass}`);
      const isBusyOrRunning = busy || A.running || A.starting;
      bar.classList.toggle("zs-island-active", isBusyOrRunning);
      bar.classList.toggle("is-busy", isBusyOrRunning);
      stateEl.innerHTML = indicator + `<span class="zs-state-txt">${msg}</span>`;
      stateEl.classList.toggle("zs-state-warn", warn);
      actionBtn.textContent = label;
      actionBtn.dataset.kind = kind;
      actionBtn.disabled = disabled;
      actionBtn.style.display = busy || !kind ? "none" : "";
      if (switchBtn) switchBtn.style.display = showExtras ? "" : "none";
    }

    function setStarted() {
      renderBar();
    }
    function setStarting() {
      renderBar();
    }

    function setStatus(s) {
      A.bridge = s;
      if (!dot) return;
      const servers = s.servers || [];
      const roblox = servers.find((x) => x.id === "roblox");
      const mcpUp = roblox ? !!roblox.alive : !!s.mcpAlive || servers.some((x) => x.alive);
      const robloxTools = roblox ? roblox.tools || 0 : s.tools || 0;
      const mcpOk = s.connected && (mcpUp || robloxTools > 0);
      const totalTools = servers.reduce((n, x) => n + (x.tools || 0), 0) || s.tools || robloxTools;
      const studioOff = mcpOk && s.studio === false;
      const noApp = studioOff && s.studioApp === false;
      const noPlace = studioOff && s.studioApp === true;
      const ok = mcpOk && !studioOff;
      dot.className = s.connected ? (ok ? "on" : "warn") : "off";

      const procUp = s.studioProc === true;
      let txt;
      if (!s.connected) txt = "ออฟไลน์, คลิกเพื่อเชื่อมต่อ";
      else if (!mcpOk) txt = "เชื่อมต่อแล้ว, เปิด Roblox Studio";
      else if (noPlace) txt = "Studio เปิดอยู่, ยังไม่มีแมพ";
      else if (noApp) txt = procUp ? "Studio เปิดอยู่แต่ยังไม่พร้อม" : "Roblox Studio ออฟไลน์";
      else if (studioOff) txt = "Studio ยังไม่ได้เชื่อมต่อ";
      else txt = `เชื่อมต่อแล้ว · พร้อมใช้งาน ${totalTools} คำสั่ง`;
      dot.title = txt;
      bridgeOk = ok;
      studioDown = studioOff;
      placeDown = noPlace;
      appDown = noApp;
      studioProcUp = procUp;
      addonOk = !!s.connected && servers.some((x) => x.id !== "roblox" && x.alive && (x.tools || 0) > 0);

      if (wasConnected && !s.connected && window.ZS.bridgeAlert) window.ZS.bridgeAlert(true);
      if (s.connected && window.ZS.bridgeAlert) {
        window.ZS.bridgeAlert(false);
        window.ZS.clearBanner("Studio ยังไม่พร้อม");
        window.ZS.clearBanner("Studio ออฟไลน์");
        window.ZS.clearBanner("ขาดการเชื่อมต่อ");
      }
      if (!wasConnected && s.connected && window.ZS.ensureTools) {
        window.ZS.ensureTools(true).catch(() => {});
      }
      wasConnected = s.connected;
      renderBar();
      if (window.ZS.menu && window.ZS.menu.refreshSetup) {
        window.ZS.menu.refreshSetup(s.connected);
      }
    }

    function showStop(v) {
      if (!stopBtn) return;
      const allow = (v || A.stopping) && !A.starting;
      const was = stopBtn.hidden;
      stopBtn.hidden = !allow;
      if (allow && !A.stopping && stopBtn.dataset.state === "stopping") {
        stopBtn.disabled = false;
        stopBtn.textContent = "หยุดการทำงาน";
        delete stopBtn.dataset.state;
      }
      if (was !== stopBtn.hidden) renderBar();
    }

    function markStopping() {
      if (!stopBtn) return;
      stopBtn.hidden = false;
      stopBtn.disabled = true;
      stopBtn.dataset.state = "stopping";
      stopBtn.textContent = "กำลังหยุด…";
      renderBar();
    }

    let nudged = false;
    function nudgeStart() {
      const P = window.ZSProvider;
      if (A.started || (P && !P.isFreshChat())) return;
      if (!nudged) {
        nudged = true;
        window.ZS.toast("คำแนะนำ: กดปุ่ม “เริ่มให้ AI ทำงาน” เพื่อเริ่มการทำงาน");
      }
      if (!actionBtn) return;
      actionBtn.classList.add("zs-flash");
      setTimeout(() => actionBtn.classList.remove("zs-flash"), 1200);
    }

    build();

    return {
      setStatus,
      setStarted,
      setStarting,
      showStop,
      markStopping,
      inputCover,
      setHudStatus,
      nudgeStart,
      updateStartGate,
      renderBar,
      refreshSetup: (c) => window.ZS.menu && window.ZS.menu.refreshSetup(c),
      getCustomPrompt: () => window.ZS.menu && window.ZS.menu.getCustomPrompt(),
      getCustomMcpServers: () => window.ZS.menu && window.ZS.menu.getCustomMcpServers(),
      openMenu: (toSupport) => window.ZS.menu && window.ZS.menu.openMenu(toSupport),
    };
  })();

  window.ZS.ui = ui;
  window.ui = ui;
})();
