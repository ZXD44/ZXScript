// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * core/constants.js - Constants, state definitions, and diagnostics for ZXScript.
 */
(() => {
  "use strict";

  window.ZS = window.ZS || {};

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.log("[zxscript]", ...a);

  const HUMANIZE_SEND = true;
  const SEND_JITTER_MS = [1000, 2200];
  function jitterBeforeSend() {
    if (!HUMANIZE_SEND) return Promise.resolve();
    const [lo, hi] = SEND_JITTER_MS;
    return sleep(lo + Math.random() * (hi - lo));
  }

  const bareToolName = (name) => (name && name.includes("/") ? name.split("/").pop() : name) || "";
  const IMAGE_FEEDBACK_RE = /image is attached to THIS message/i;
  const RESUME_FRESH_MS = 180000;
  const TOKEN_CHARS = 4;

  const WEBSITE_URL = "https://www.zirconx.xyz";
  const GITHUB_URL = "https://github.com/ZXD44/ZXScript";

  const getExtensionVersion = () => {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest) {
        const v = chrome.runtime.getManifest().version;
        if (v) return v;
      }
    } catch (_) {}
    try {
      if (typeof browser !== "undefined" && browser.runtime && browser.runtime.getManifest) {
        const v = browser.runtime.getManifest().version;
        if (v) return v;
      }
    } catch (_) {}
    return "0.0.3";
  };

  const EXT_VERSION = getExtensionVersion();
  const VERSION = EXT_VERSION;
  const VIDEO_URL = "https://youtu.be/kPKiZLZ9_Ps";

  const AI_SITES = [
    { name: "DeepSeek", url: "https://chat.deepseek.com/" },
    { name: "ChatGPT", url: "https://chatgpt.com/" },
    { name: "Claude", url: "https://claude.ai/new" },
    { name: "Gemini", url: "https://gemini.google.com/app" },
    { name: "Kimi", url: "https://www.kimi.ai/" },
    { name: "Z.ai / GLM", url: "https://chat.z.ai/" },
    { name: "Qwen", url: "https://chat.qwen.ai/" },
    { name: "Arena", url: "https://arena.ai/text/direct" },
    { name: "Meta AI", url: "https://www.meta.ai/" },
  ];

  // Global agent state
  const A = {
    running: false,
    stop: false,
    stopping: false,
    userStopped: false,
    lastGenAt: 0,
    started: false,
    starting: false,
    startingKey: null,
    startGen: 0,
    loopKey: null,
    bootBaselineId: null,
    injecting: false,
    toolRunning: false,
    toolStart: 0,
    toolName: "",
    toolItem: null,
    toolArg: "",
    toolList: [],
    toolNames: new Set(),
    toolCallsSinceReminder: 0,
    sysResendAt: 0,
    staleExtension: false,
    bridge: { connected: false, mcpAlive: false, tools: 0 },
    pendingImages: null,
    imageTools: new Set(),
    parked: false,
    toolsAt: 0,
    injectHideUntil: 0,
  };

  // Diagnostics breadcrumb ring buffer
  const ZS_DIAG_MAX = 300;
  const _diag = [];
  function diag(event, data) {
    const P = window.ZSProvider;
    const snap = P ? { ...P.snapshot(), gen: P.isGenerating(), run: A.running } : {};
    const e = {
      t: Date.now(),
      iso: new Date().toISOString().slice(11, 23),
      event,
      data: data || null,
      snap,
    };
    _diag.push(e);
    if (_diag.length > ZS_DIAG_MAX) _diag.shift();
    try {
      let n = document.getElementById("zs-diag-log");
      if (!n) {
        n = document.createElement("script");
        n.type = "application/json";
        n.id = "zs-diag-log";
        (document.body || document.documentElement).appendChild(n);
      }
      n.textContent = JSON.stringify(_diag);
    } catch {}
    try { window.__zsDiag = _diag; } catch {}
  }

  // Stall detector
  function initStallDetector() {
    const EXPECT = 250, STALL = 800;
    let _lastTick = Date.now();
    setInterval(() => {
      const now = Date.now();
      const gap = now - _lastTick;
      _lastTick = now;
      if (gap > STALL) {
        diag("stall.detected", {
          ms: gap,
          overBy: gap - EXPECT,
          toolRunning: A.toolRunning,
          running: A.running,
          injecting: A.injecting,
        });
      }
    }, EXPECT);
  }

  const constantsObj = {
    sleep,
    log,
    HUMANIZE_SEND,
    SEND_JITTER_MS,
    jitterBeforeSend,
    bareToolName,
    IMAGE_FEEDBACK_RE,
    RESUME_FRESH_MS,
    TOKEN_CHARS,
    WEBSITE_URL,
    GITHUB_URL,
    EXT_VERSION,
    VERSION,
    VIDEO_URL,
    AI_SITES,
    A,
    diag,
    initStallDetector,
  };

  A.version = EXT_VERSION;

  const getProvider = () =>
    (typeof window !== "undefined" && window.ZSProvider) ||
    (typeof window !== "undefined" && window.ZS && window.ZS.provider) ||
    (typeof ZSProvider !== "undefined" ? ZSProvider : null);

  constantsObj.getProvider = getProvider;

  // Export to namespace
  Object.assign(window.ZS, constantsObj);
  window.ZS.constants = window.ZS;
  window.ZS.EXT_VERSION = EXT_VERSION;
  window.ZS.VERSION = EXT_VERSION;
  window.ZS.getProvider = getProvider;
  window.getProvider = getProvider;

  window.bareToolName = bareToolName;
  window.IMAGE_FEEDBACK_RE = IMAGE_FEEDBACK_RE;
  window.RESUME_FRESH_MS = RESUME_FRESH_MS;

  window.A = A;
  window.diag = diag;
  window.sleep = sleep;
  window.log = log;
})();
