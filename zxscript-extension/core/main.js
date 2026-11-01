// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * core/main.js - Extension entry point orchestrator.
 * Connects UI, background RPC, provider hooks, and auto-resume supervisory loops.
 */
(() => {
  "use strict";

  if (window.__zsInjected) return;
  window.__zsInjected = true;

  window.ZS = window.ZS || {};

  const Z = window.ZS || {};
  const C = Z.constants || Z;
  const A = C.A || Z.A || {};
  const diag = C.diag || Z.diag || (() => {});
  const SYS_MARKER = C.SYS_MARKER || Z.SYS_MARKER || "⟦ZS-SYS⟧";
  const TOKEN_CHARS = C.TOKEN_CHARS || Z.TOKEN_CHARS || 4;

  const ui = Z.ui || {};
  const P = (window.ZS && window.ZS.getProvider ? window.ZS.getProvider() : null) || window.ZSProvider;
  if (!P) {
    console.warn("[ZXScript] No provider registered for this page");
    return;
  }

  const tools = Z.tools || Z;
  const bg = tools.bg || Z.bg;

  const agent = Z.agent || Z;
  const stopLoop = agent.stopLoop || Z.stopLoop;
  const agentLoop = agent.agentLoop || Z.agentLoop;
  const startSession = agent.startSession || Z.startSession;
  const sysResendDue = agent.sysResendDue || Z.sysResendDue || (() => false);
  const sinceLastSys = agent.sinceLastSys || Z.sinceLastSys || (() => ({ users: 0, results: 0 }));
  const resetSysCount = agent.resetSysCount || Z.resetSysCount || (() => {});
  const loadSysCount = agent.loadSysCount || Z.loadSysCount || (() => {});
  const rememberExecuted = agent.rememberExecuted || Z.rememberExecuted || (() => {});
  const isRememberedExecuted = agent.isRememberedExecuted || Z.isRememberedExecuted || (() => false);
  const syncSessionState = agent.syncSessionState || Z.syncSessionState || (() => {});
  const systemPrompt = agent.systemPrompt || Z.systemPrompt || (() => "");

  const watcher = Z.watcher || Z;
  const submitAndGetBase = watcher.submitAndGetBase || Z.submitAndGetBase;
  const waitForResponse = watcher.waitForResponse || Z.waitForResponse;
  const elapsedOn = watcher.elapsedOn || Z.elapsedOn || (() => "");
  const formatCount = watcher.formatCount || Z.formatCount || (() => "");

  const camouflage = Z.camouflage || Z;
  const scheduleSweep = camouflage.scheduleSweep || Z.scheduleSweep || (() => {});
  const setChipLabel = camouflage.setChipLabel || Z.setChipLabel || (() => {});
  const setChipDetail = camouflage.setChipDetail || Z.setChipDetail || (() => {});

  const audio = Z.audio || Z;
  const ZSSound = audio.ZSSound || Z.ZSSound;

  if (P.init) P.init({ diag });

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    // Esc closes menu
    if (e.key === "Escape" && window.ZS.menu && window.ZS.menu.isMenuOpen()) {
      window.ZS.menu.closeMenu();
      return;
    }
    // Alt+Z / Cmd+Z starts or stops agent
    if ((e.altKey || (e.metaKey && e.shiftKey)) && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      if (A.running || A.starting) stopLoop();
      else if (!A.started && (P.isFreshChat() || P.chatIsEmpty())) startSession();
    }
  });

  // ── Native Send / Stop Hooks ───────────────────────────────────────────────
  if (P.installSendHooks) {
    P.installSendHooks({
      isBlocked: () => A.injecting || A.running || A.starting,
      isStarted: () => A.started,
      onBlockedAttempt: () => (ui.nudgeStart ? ui.nudgeStart() : undefined),
      onUserMessage: (base) => {
        if (!A.started || A.userStopped) return; // Do NOT auto-run when stopped!
        A.lastGenAt = Date.now();
        syncSessionState();
        setTimeout(() => {
          if (A.started && !A.running && !A.userStopped && agentLoop) agentLoop(base);
        }, 300);
      },
      onUserSend: () => {
        if (!A.started || A.userStopped) return;
        A.lastGenAt = Date.now();
        syncSessionState();
      },
      onNativeStop: () => {
        A.userStopped = true;
        A.stopping = true;
        A.stop = true;
        A.stopAt = Date.now();
        A.stopStreamLen = P.streamLen ? P.streamLen() : 0;
        if (A.running && !A.stopping && ui.markStopping) ui.markStopping();
        diag("native.stopClicked");
      },
      onNativeContinue: () => {
        A.userStopped = false;
        A.stop = false;
        const it = P.lastAssistant ? P.lastAssistant() : null;
        if (it) { delete it.dataset.zStopped; }
        diag("nativeContinue");
      },
    });
  }

  // ── Background Message Listener ────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === "zs-status") {
      A.staleExtension = false;
      ui.setStatus({
        connected: msg.connected,
        mcpAlive: msg.mcpAlive,
        studio: msg.studio,
        studioApp: msg.studioApp,
        studioProc: msg.studioProc,
        tools: msg.tools,
        servers: msg.servers,
      });
    } else if (msg.type === "zs-open-menu") {
      if (window.ZS.menu) window.ZS.menu.openMenu(false);
    } else if (msg.type === "zs-insert-text") {
      if (msg.text && window.ZS.tools && window.ZS.tools.insertTextToEditor) {
        window.ZS.tools.insertTextToEditor(msg.text).then((ok) => {
          try { sendResponse({ ok }); } catch {}
        }).catch((err) => {
          try { sendResponse({ ok: false, error: String(err) }); } catch {}
        });
        return true;
      }
      try { sendResponse({ ok: false, error: "ไม่มีข้อความ" }); } catch {}
      return false;
    } else if (msg.type === "zs-sound-toggle") {
      if (ZSSound && ZSSound.setEnabled) ZSSound.setEnabled(msg.enabled);
    }
  });

  // ── Status Polling ─────────────────────────────────────────────────────────
  let statusTimer = 0;
  function onStatus(s) {
    if (!s) return;
    if (s.kind === "stale-extension") {
      A.staleExtension = true;
      clearInterval(statusTimer);
      if (ui.renderBar) ui.renderBar();
      if (window.ZS.staleExtensionAlert) window.ZS.staleExtensionAlert();
      diag("bridge.staleExtension", { via: "status", error: s.error });
      return;
    }
    A.staleExtension = false;
    ui.setStatus(s);
  }

  loadSysCount();
  bg({ type: "status" }).then(onStatus);
  statusTimer = setInterval(() => bg({ type: "status" }).then(onStatus), 5000);

  // ── Streaming UI Monitor (200ms tick) ──────────────────────────────────────
  setInterval(() => {
    // [PERF] Sleep UI queries when tab is in background (visibilitychange optimization)
    if (typeof document !== "undefined" && document.hidden) return;
    const gen = P.isGenerating();
    if (gen) A.lastGenAt = Date.now();

    // Wedged stop button check
    if (A.stopping) {
      if (A.started && P.isHardGenerating()) {
        const grown = (P.streamLen ? P.streamLen() : 0) > (A.stopStreamLen || 0) + 24;
        if (grown && Date.now() - (A.stopRetryAt || 0) > 800) {
          A.stopRetryAt = Date.now();
          A.stopStreamLen = P.streamLen ? P.streamLen() : 0;
          try { P.stopGeneration(); } catch {}
          diag("stop.retry");
        } else if (!grown && Date.now() - (A.stopAt || 0) > 2500) {
          A.stopping = false;
          diag("stop.quiet", { wedged: true });
        }
      } else {
        A.stopping = false;
        diag("stop.quiet");
      }
    }

    ui.showStop(A.running || A.toolRunning || A.stopping || (A.started && P.isHardGenerating()));

    // Live tool chip timer & token count
    if (A.toolRunning && A.toolItem) {
      const s = elapsedOn(A.toolItem, "zsToolT0", A.toolStart).toFixed(1);
      setChipDetail(A.toolItem, (A.toolArg ? A.toolArg + " · " : "") + `${s}s`);
      return;
    }

    if (gen) {
      const item = P.lastAssistant();
      const reply = item ? P.itemText(item) : "";
      const zphase = item && item.dataset.zphase;
      if (item && zphase !== "done" && zphase !== "err" && window.ZSParse.hasToolSignature(reply)) {
        const name = window.ZSParse.toolNameFromText(reply);
        if (name && name !== "command") setChipLabel(item, name);
        const tokens = Math.floor(reply.length / TOKEN_CHARS);
        const s = Math.round(elapsedOn(item, "zsGenT0"));
        setChipDetail(item, `~${formatCount(tokens)} tokens · ${s}s`);
      }
    }
  }, 200);

  // ── Watchdog Auto-Resume (1s tick) ─────────────────────────────────────────
  setInterval(() => {
    syncSessionState();
    if (!A.started || A.userStopped || A.running || A.starting || A.injecting) return;
    if (document.hidden) return;
    if (P.isGenerating()) return;
    if (Date.now() - A.lastGenAt > 8000) return;

    const item = P.lastAssistant();
    if (!item) return;

    const curId = P.itemKey ? Number(P.itemKey(item)) : NaN;
    if (Number.isFinite(curId) && A.maxTurnId != null && curId < A.maxTurnId) return;

    const all = P.allItems();
    const after = all[all.indexOf(item) + 1];
    if (after && P.isUserItem(after) && window.ZSParse.isInjectedFeedback(P.classifyText(after, ".zs-chip"))) return;

    const txt = P.itemText(item);
    if (!window.ZSParse.hasToolSignature(txt)) return;
    if (isRememberedExecuted(item, txt)) return;
    if (!window.ZSParse.parseToolCalls(txt).length) return;

    const len = txt.length;
    if (item.dataset.zResume && Number(item.dataset.zResumeLen || 0) >= len) return;
    item.dataset.zResume = "1";
    item.dataset.zResumeLen = String(len);
    rememberExecuted(item);
    diag("autoResume", { len });

    A.sendToken = null;
    agentLoop(P.assistantCount() - 1);
  }, 1000);

  // ── System-Prompt Re-Injection Fallback (5s tick) ───────────────────────────
  const SYS_FALLBACK_IDLE_MS = 20000;
  setInterval(async () => {
    if (!sysResendDue()) return;
    if (!A.started || A.running || A.starting || A.injecting) return;
    if (document.hidden || A.userStopped) return;
    if (P.isGenerating()) return;

    try { if ((P.editorText() || "").trim() !== "") return; } catch { return; }
    if (Date.now() - A.lastGenAt < SYS_FALLBACK_IDLE_MS) return;

    const spent = sinceLastSys();
    resetSysCount();
    A.sysResendAt = Date.now();
    diag("sys.resend", { via: "ownTurn", ...spent });
    try {
      const base = await submitAndGetBase(systemPrompt());
      await waitForResponse(base);
    } catch (e) {
      diag("sys.resendFailed", { err: String(e && e.message || e) });
    }
  }, 5000);

  // Initial sweep
  scheduleSweep(false);
  console.log(`[ZXScript] Content script initialized (${P.id})`);
})();
