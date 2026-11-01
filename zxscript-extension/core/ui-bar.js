// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * core/ui-bar.js - Consolidated floating dynamic island action bar and theme engine.
 */
(() => {
  "use strict";

  window.ZS = window.ZS || {};
  const { A, EXT_VERSION } = window.ZS.constants || window.ZS || {};

  const ui = (() => {
    let root, bar, dot, brandEl, stateEl, actionBtn, stopBtn, switchBtn, supportBtn, discordEl, menuEl, unstableEl;
    let badgeBtn, triggerBox;
    let bridgeOk = false, studioDown = false, placeDown = false, appDown = false, addonOk = false, studioProcUp = false;
    let wasConnected = false;
    let barRaf = null;
    let lastBarSig = "";
    let _hudStatusText = "";

    function build() {
      const P = window.ZSProvider;
      const wingUrl = (typeof chrome !== "undefined" && chrome && chrome.runtime && chrome.runtime.getURL)
        ? chrome.runtime.getURL("icons/dragon-wing.png")
        : "";
      root = document.createElement("div");
      root.id = "zs-root";

      root.innerHTML = `
        <div id="zs-bar">
          <img id="zs-wing-left" class="zs-wing" src="${wingUrl}" alt="" aria-hidden="true" draggable="false">
          
          <!-- Segment 1: Dragon Orb & AI Badge -->
          <button type="button" id="zs-badge" class="zs-hud-badge" title="สถานะ Studio และเมนูสลับโมเดล AI (คลิกเพื่อเปิดเมนู)">
            <span id="zs-dot" class="off" title="สถานะการเชื่อมต่อ Studio"></span>
            <span id="zs-switch-name">AI</span>
          </button>

          <div class="zs-hud-sep" aria-hidden="true"></div>

          <!-- Segment 2: Central Action Trigger -->
          <div id="zs-trigger-box" class="zs-hud-trigger">
            <button type="button" id="zs-action" data-kind="start">เริ่มทำงาน</button>
            <button type="button" id="zs-stop" hidden title="หยุดทำงาน">หยุดทำงาน</button>
            <span id="zs-state" hidden></span>
          </div>

          <!-- Hidden legacy hooks for compatibility -->
          <button type="button" id="zs-switch" style="display:none !important" aria-label="สลับ AI"></button>
          <span id="zs-brand" style="display:none !important"></span>
          <span id="zs-discord" style="display:none !important"></span>
          <span id="zs-support" style="display:none !important"></span>

          <img id="zs-wing-right" class="zs-wing" src="${wingUrl}" alt="" aria-hidden="true" draggable="false">
        </div>
        <div id="zs-menu" hidden></div>
        ${P && P.unstableWarning ? `<button type="button" id="zs-unstable" aria-label="Provider may be unstable" hidden>⚠ ไม่เสถียร</button>` : ""}
      `;
      document.documentElement.appendChild(root);
      bar = root.querySelector("#zs-bar");
      dot = root.querySelector("#zs-dot");
      brandEl = root.querySelector("#zs-brand");
      stateEl = root.querySelector("#zs-state");
      actionBtn = root.querySelector("#zs-action");
      stopBtn = root.querySelector("#zs-stop");
      switchBtn = root.querySelector("#zs-switch");
      supportBtn = root.querySelector("#zs-support");
      discordEl = root.querySelector("#zs-discord");
      badgeBtn = root.querySelector("#zs-badge");
      triggerBox = root.querySelector("#zs-trigger-box");
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
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        if (A.staleExtension) { location.reload(); return; }
        if (!A.bridge || !A.bridge.connected) {
          onActionClick();
        } else {
          if (window.ZS.showBridgeModal) window.ZS.showBridgeModal();
        }
      });
      if (badgeBtn) {
        badgeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (A.staleExtension) { location.reload(); return; }
          if (window.ZS.menu) window.ZS.menu.toggleMenu();
        });
      }
      stateEl.addEventListener("click", () => {
        if (A.staleExtension) { location.reload(); return; }
        if (!A.bridge || !A.bridge.connected) {
          onActionClick();
        } else {
          if (window.ZS.menu) window.ZS.menu.toggleMenu();
        }
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

      if (supportBtn) {
        supportBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (window.ZS.menu) {
            if (window.ZS.menu.isMenuOpen && window.ZS.menu.isMenuOpen()) {
              window.ZS.menu.closeMenu();
            } else {
              window.ZS.menu.openMenu(true);
            }
          }
        });
      }

      document.addEventListener(
        "click",
        (e) => {
          if (!menuEl || menuEl.hidden) return;
          if (
            !menuEl.contains(e.target) &&
            (!badgeBtn || !badgeBtn.contains(e.target)) &&
            !switchBtn.contains(e.target) &&
            (!supportBtn || !supportBtn.contains(e.target))
          ) {
            if (window.ZS.menu) window.ZS.menu.closeMenu();
            else menuEl.hidden = true;
          }
        },
        true
      );

      initThemeEngine();
      renderBar();
      schedulePlaceBar();

      // Passive event listeners for placeBar
      window.addEventListener("resize", schedulePlaceBar, { passive: true });
      window.addEventListener("scroll", schedulePlaceBar, { passive: true });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          if (barRaf) {
            cancelAnimationFrame(barRaf);
            barRaf = null;
          }
        } else {
          schedulePlaceBar();
        }
      }, { passive: true });

      // [PERF] Low-frequency idle heartbeat (2s) to catch async DOM host shifts without burning CPU
      setInterval(() => {
        if (!document.hidden) schedulePlaceBar();
      }, 2000);
    }

    async function onActionClick() {
      const kind = actionBtn ? actionBtn.dataset.kind : "";
      if (kind === "reload") {
        location.reload();
        return;
      }
      const bgFn = (window.ZS && window.ZS.tools && window.ZS.tools.bg) || (window.ZS && window.ZS.bg);
      if (!A.bridge || !A.bridge.connected) {
        if (bgFn) {
          try {
            const st = await bgFn({ type: "status" });
            if (st && st.connected) {
              setStatus(st);
              renderBar();
              if (window.ZS && window.ZS.startSession) {
                window.ZS.startSession();
              }
              return;
            }
          } catch (e) {
            console.warn("[ZXScript] status check error:", e);
          }
        }
        if (window.ZS && window.ZS.showBridgeModal) {
          window.ZS.showBridgeModal();
        }
        return;
      }
      if (window.ZS && window.ZS.startSession) {
        window.ZS.startSession();
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

    let lastThemeIsLight = null;
    let themeObserver = null;

    // [PERF] Reactive Theme Engine - caches state and avoids touching classList unless changed
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
      if (light !== lastThemeIsLight) {
        lastThemeIsLight = light;
        document.documentElement.classList.toggle("zs-light", light);
      }
    }

    function initThemeEngine() {
      applyTheme();
      try {
        if (typeof MutationObserver !== "undefined") {
          themeObserver = new MutationObserver(() => applyTheme());
          themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class", "data-theme", "data-color-mode", "data-color-scheme", "style"]
          });
        }
        if (window.matchMedia) {
          const mq = window.matchMedia("(prefers-color-scheme: dark)");
          if (mq.addEventListener) mq.addEventListener("change", applyTheme);
          else if (mq.addListener) mq.addListener(applyTheme);
        }
      } catch {}
      // Low-frequency fallback check (10s) instead of heavy 2s polling
      setInterval(applyTheme, 10000);
    }

    let lastUnstableL = "", lastUnstableT = "", lastUnstableH = 0;
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
      const uh = lastUnstableH || (lastUnstableH = u.offsetHeight || 20);
      const nL = Math.round(br.left) + "px";
      const nT = Math.round(Math.max(4, br.top - uh - 5)) + "px";
      if (lastUnstableL !== nL) {
        lastUnstableL = nL;
        u.style.left = nL;
      }
      if (lastUnstableT !== nT) {
        lastUnstableT = nT;
        u.style.top = nT;
      }
    }

    function placeBar() {
      barRaf = null;
      if (!bar || document.hidden) return;
      const P = window.ZSProvider;

      if (root && !root.isConnected) {
        try {
          document.documentElement.appendChild(root);
        } catch {}
      }

      if (bar.style.left) bar.style.left = "";

      placeUnstable();

      if (P && ((P.captchaPresent && P.captchaPresent()) || (P.overlayBlocking && P.overlayBlocking()))) {
        if (bar.style.display !== "none") bar.style.display = "none";
        if (menuEl && !menuEl.hidden) menuEl.hidden = true;
        return;
      }

      if (root && bar.parentElement !== root) {
        root.appendChild(bar);
      }
      if (bar.style.display !== "flex") bar.style.display = "flex";

      if (menuEl && !menuEl.hidden) {
        const br = bar.getBoundingClientRect();
        const menuWidth = 290;
        let left = Math.round(br.left + br.width / 2);
        const half = menuWidth / 2;
        if (left - half < 12) left = half + 12;
        if (left + half > window.innerWidth - 12) left = window.innerWidth - 12 - half;

        const nTop = Math.round(br.bottom + 8) + "px";
        const nLeft = left + "px";
        const nMaxH = Math.max(200, Math.round(window.innerHeight - br.bottom - 24)) + "px";

        if (menuEl.style.position !== "fixed") menuEl.style.position = "fixed";
        if (menuEl.style.top !== nTop) menuEl.style.top = nTop;
        if (menuEl.style.left !== nLeft) menuEl.style.left = nLeft;
        if (menuEl.style.transform !== "translateX(-50%)") menuEl.style.transform = "translateX(-50%)";
        if (menuEl.style.maxHeight !== nMaxH) menuEl.style.maxHeight = nMaxH;
      }
    }

    // [PERF] Coalesces placement calls into next animation frame
    function schedulePlaceBar() {
      if (typeof document !== "undefined" && document.hidden) return;
      if (!barRaf) {
        barRaf = (typeof requestAnimationFrame === "function")
          ? requestAnimationFrame(placeBar)
          : setTimeout(placeBar, 16);
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
        msg = `<b>ส่วนขยายอัปเดตแล้ว</b> · โปรดรีเฟรชหน้าเว็บ`;
        label = "รีเฟรช F5";
        kind = "reload";
        disabled = false;
      } else if (A.starting) {
        toneClass = "starting";
        indicator = `<span class="zs-spin"></span>`;
        msg = `<b>${_startingStep || "กำลังเริ่มระบบ…"}</b>`;
        label = `กำลังเริ่ม…`;
        kind = "starting";
        disabled = true;
      } else if (A.started) {
        const tools = (A.toolList && A.toolList.length) || (A.bridge && A.bridge.tools) || 0;
        if (!A.bridge || A.bridge.connected === false) {
          toneClass = "warn";
          warn = true;
          msg = `<b>AI พร้อม</b> · รอเปิดระบบเชื่อมต่อ`;
        } else if (!bridgeOk) {
          toneClass = "warn";
          warn = true;
          msg = studioProcUp ? `<b>AI พร้อม</b> · รอเปิดแมพใน Studio` : `<b>AI พร้อม</b> · ยังไม่ได้เปิด Studio`;
        } else {
          toneClass = "active";
          indicator = `<span class="zs-live-dot ${A.running ? "" : "idle"}"></span>`;
          msg = A.running
            ? (_hudStatusText ? `<b>${_hudStatusText}</b>` : `<b>AI กำลังทำงาน</b>`)
            : `<b>พร้อมรับคำสั่ง</b>${tools ? ` · ${tools} คำสั่ง` : ""}`;
        }
      } else {
        disabled = false;
        kind = "start";
        const hasBridge = !!(A.bridge && A.bridge.connected);
        const toolsCount = (A.toolList && A.toolList.length) || (A.bridge && A.bridge.tools) || 0;
        const studioReady = hasBridge && (A.bridge.studio === true || toolsCount > 0);

        if (!hasBridge) {
          toneClass = "warn";
          warn = true;
          msg = `<b>ยังไม่ได้เชื่อมต่อ</b> · คลิกเพื่อเปิดระบบ`;
          label = "เชื่อมต่อ Studio";
        } else if (!studioReady) {
          toneClass = "warn";
          warn = true;
          if (studioProcUp) {
            msg = `<b>ระบบพร้อม</b> · รอเปิดแมพใน Studio`;
            label = "รอเปิดแมพ Studio";
          } else {
            msg = `<b>ระบบพร้อม</b> · รอเปิดโปรแกรม Studio`;
            label = "รอเปิด Studio";
          }
        } else {
          toneClass = "standby";
          warn = false;
          msg = `<b>Studio พร้อมทำงาน</b> · ${toolsCount} คำสั่งพร้อมใช้`;
          label = "เริ่มทำงาน";
        }
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
      const showExtras = true;
      const sig = [toneClass, indicator, msg, label, kind, disabled, warn, busy, showExtras].join("|");
      if (sig === lastBarSig) return;
      lastBarSig = sig;

      bar.classList.remove("tone-standby", "tone-active", "tone-warn", "tone-noagent", "tone-starting");
      bar.classList.add(`tone-${toneClass}`);
      const isBusyOrRunning = busy || A.running || A.starting;
      bar.classList.toggle("zs-island-active", isBusyOrRunning);
      bar.classList.toggle("is-busy", isBusyOrRunning);
      // Update Dot status
      if (dot) {
        if (!A.bridge || !A.bridge.connected) dot.className = "off";
        else if (!bridgeOk) dot.className = "warn";
        else dot.className = "on";
      }

      if (badgeBtn) {
        const cleanMsg = msg.replace(/<[^>]*>/g, "");
        badgeBtn.title = `${cleanMsg} · คลิกเพื่อเปิดเมนู / สลับ AI`;
      }
      if (stateEl) {
        const fullTxt = (_hudStatusText || msg || "").replace(/<[^>]*>/g, "");
        stateEl.title = fullTxt ? `${fullTxt} · คลิกเพื่อเปิดเมนู` : "";
      }

      actionBtn.textContent = label;
      actionBtn.dataset.kind = kind;
      actionBtn.disabled = disabled;

      if (isBusyOrRunning || A.started) {
        actionBtn.style.display = "none";
        stopBtn.hidden = false;
        if (!stopBtn.dataset.state) {
          stopBtn.textContent = "หยุดทำงาน";
          stopBtn.disabled = false;
        }
        stateEl.hidden = false;
        stateEl.innerHTML = (isBusyOrRunning ? indicator : "") + `<span class="zs-state-txt">${_hudStatusText || msg}</span>`;
      } else {
        actionBtn.style.display = "";
        stopBtn.hidden = true;
        stateEl.hidden = true;
      }

      if (switchBtn) switchBtn.style.display = "none";
      if (supportBtn) supportBtn.style.display = "none";
      if (discordEl) discordEl.style.display = "none";
    }

    let _startingPct = 0;
    let _startingStep = "";

    function setStarted(v) {
      if (typeof v === "boolean") A.started = v;
      renderBar();
    }

    function setStarting(on, pct = 0, step = "") {
      A.starting = !!on;
      _startingPct = Math.max(0, Math.min(100, pct || 0));
      _startingStep = step || "";
      renderBar();
    }

    function setStartingProgress(pct, step) {
      _startingPct = Math.max(0, Math.min(100, pct || 0));
      if (step) _startingStep = step;
      renderBar();
    }

    function setStatus(s) {
      A.bridge = s;
      if (!dot) return;
      const servers = s.servers || [];
      const totalTools = s.tools || 0;
      const studioReady = s.connected && (s.studio === true || totalTools > 0);
      const procUp = s.studioProc === true;

      dot.className = s.connected ? (studioReady ? "on" : "warn") : "off";

      let txt;
      if (!s.connected) {
        txt = "คุณต้องเปิด start.bat ก่อนสิ · คลิกเพื่อเปิดระบบ (127.0.0.1:17613)";
      } else if (!studioReady) {
        txt = procUp ? "Bridge ออนไลน์แล้ว · รอเปิดแมพใน Roblox Studio" : "Bridge ออนไลน์แล้ว · ยังไม่ได้เปิดโปรแกรม Roblox Studio";
      } else {
        txt = `เชื่อมต่อ Studio สำเร็จ · พร้อมใช้งาน ${totalTools} คำสั่ง`;
      }
      dot.title = txt;
      bridgeOk = studioReady;
      studioDown = !studioReady;
      placeDown = s.connected && !s.studio;
      appDown = s.connected && !procUp;
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
      const allow = Boolean(v || A.stopping || A.running || A.starting);
      const was = stopBtn.hidden;
      stopBtn.hidden = !allow;
      if (allow && !A.stopping && stopBtn.dataset.state === "stopping") {
        stopBtn.disabled = false;
        stopBtn.textContent = "หยุด";
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
      setStartingProgress,
      showStop,
      markStopping,
      inputCover,
      setHudStatus,
      nudgeStart,
      updateStartGate,
      renderBar,
      toast: (...a) => (window.ZS.toast ? window.ZS.toast(...a) : console.log(...a)),
      banner: (...a) => (window.ZS.banner ? window.ZS.banner(...a) : console.warn(...a)),
      clearBanner: (...a) => (window.ZS.clearBanner ? window.ZS.clearBanner(...a) : undefined),
      showBridgeModal: (...a) => (window.ZS.showBridgeModal ? window.ZS.showBridgeModal(...a) : undefined),
      showImages: (...a) => (window.ZS.showImages ? window.ZS.showImages(...a) : undefined),
      staleExtensionAlert: (...a) => (window.ZS.staleExtensionAlert ? window.ZS.staleExtensionAlert(...a) : undefined),
      bridgeAlert: (...a) => (window.ZS.bridgeAlert ? window.ZS.bridgeAlert(...a) : undefined),
      refreshSetup: (c) => window.ZS.menu && window.ZS.menu.refreshSetup(c),
      getCustomPrompt: () => window.ZS.menu && window.ZS.menu.getCustomPrompt(),
      getCustomMcpServers: () => window.ZS.menu && window.ZS.menu.getCustomMcpServers(),
      openMenu: (toSupport) => window.ZS.menu && window.ZS.menu.openMenu(toSupport),
    };
  })();

  window.ZS = window.ZS || {};
  window.ZS.ui = Object.assign(window.ZS.ui || {}, ui);
  window.ui = window.ZS.ui;
})();
