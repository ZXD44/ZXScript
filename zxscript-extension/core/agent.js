// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * core/agent.js - Main agentic turn loop, session bootstrap, and turn-memory tracking.
 */
(() => {
  "use strict";

  window.ZS = window.ZS || {};
  const {
    A,
    diag,
    sleep,
    bareToolName,
    decorate,
    runTool,
    argSummary,
    callBody,
    outSummary,
    feedbackIsError,
    notifyTurnComplete,
    ZSSound,
    ensureTools,
    submitAndGetBase,
    waitForResponse,
    waitVisible,
  } = window.ZS;

  const ui = window.ZS.ui || {};
  if (!ui.banner) ui.banner = (...a) => (window.ZS.banner ? window.ZS.banner(...a) : console.warn("[ZS banner]", ...a));
  if (!ui.toast) ui.toast = (...a) => (window.ZS.toast ? window.ZS.toast(...a) : console.log("[ZS toast]", ...a));
  if (!ui.clearBanner) ui.clearBanner = (...a) => (window.ZS.clearBanner ? window.ZS.clearBanner(...a) : undefined);

  const halted = new Map();
  const executed = new Map();

  const assistantIdx = (item) => {
    const P = window.ZSProvider;
    return P ? P.allItems().filter(P.isAssistantItem).indexOf(item) : -1;
  };

  const turnKey = (item) => {
    const P = window.ZSProvider;
    if (P && P.itemKey) {
      const k = P.itemKey(item);
      if (k != null) return `k${k}`;
    }
    return String(assistantIdx(item));
  };

  function rememberHalted(item) {
    const P = window.ZSProvider;
    try {
      if (!item || !P || assistantIdx(item) < 0) return;
      const pref = (P.itemText(item) || "").slice(0, 60);
      if (pref.trim().length < 12) return;
      halted.set(`${P.conversationKey()}|${turnKey(item)}`, pref);
    } catch {}
  }

  function forgetHalted(item) {
    const P = window.ZSProvider;
    if (!item || !halted.size || !P) return;
    try {
      halted.delete(`${P.conversationKey()}|${turnKey(item)}`);
    } catch {}
  }

  function isRememberedHalted(item, txt) {
    const P = window.ZSProvider;
    if (!halted.size || !P) return false;
    try {
      const pref = halted.get(`${P.conversationKey()}|${turnKey(item)}`);
      return pref != null && (txt || "").startsWith(pref);
    } catch {
      return false;
    }
  }

  function rememberExecuted(item) {
    const P = window.ZSProvider;
    if (!item || !P) return;
    try {
      if (assistantIdx(item) < 0) return;
      const pref = (P.itemText(item) || "").slice(0, 60);
      if (pref.trim().length < 12) return;
      executed.set(`${P.conversationKey()}|${turnKey(item)}`, pref);
    } catch {}
  }

  function isRememberedExecuted(item, txt) {
    const P = window.ZSProvider;
    if (!executed.size || !P) return false;
    try {
      const pref = executed.get(`${P.conversationKey()}|${turnKey(item)}`);
      return pref != null && (txt || "").startsWith(pref);
    } catch {
      return false;
    }
  }

  function stopLoop() {
    const P = window.ZSProvider;
    if (A.stopping) return;
    diag("stopLoop");
    A.stop = true;
    A.stopping = true;
    A.stopAt = Date.now();
    A.stopStreamLen = P && P.streamLen ? P.streamLen() : 0;
    A.userStopped = true;
    A.resumeArmed = false;
    A.injectHideUntil = 0;

    const it = P && P.lastAssistant ? P.lastAssistant() : null;
    if (it) {
      it.dataset.zStopped = "1";
      rememberHalted(it);
    }
    if (A.toolRunning && A.toolItem) {
      A.toolItem.dataset.zStopped = "1";
      rememberHalted(A.toolItem);
      decorate.toolBox(A.toolItem, A.toolName, "err", "stopped", true, "", window.ZS.toolCategory(A.toolName));
    }
    ui.markStopping();
    if (P && P.stopGeneration) P.stopGeneration();
    ui.toast("กำลังหยุดทำงาน…");
  }

  function systemPrompt() {
    const P = window.ZSProvider;
    return window.ZS.buildSystemPrompt({
      siteName: (P && P.displayName) || "AI",
      customPrompt: ui.getCustomPrompt(),
      providerNotes: (P && P.promptExtra) || "",
    });
  }

  const sysKey = () => `zsSys:${(window.ZSProvider && window.ZSProvider.conversationKey()) || "new"}`;
  let sysCount = { users: 0, results: 0 };
  let sysCountKey = "";

  async function loadSysCount() {
    const k = sysKey();
    if (k === sysCountKey) return sysCount;
    sysCountKey = k;
    const local = sysCount;
    sysCount = { users: 0, results: 0 };
    try {
      const r = await new Promise((res) => chrome.storage.local.get(k, res));
      const saved = r && r[k];
      if (saved) {
        sysCount = {
          users: Math.max(saved.users || 0, local.users || 0),
          results: Math.max(saved.results || 0, local.results || 0),
        };
      }
    } catch {}
    return sysCount;
  }

  function saveSysCount() {
    try {
      chrome.storage.local.set({ [sysCountKey]: sysCount });
    } catch {}
  }

  function bumpSys(field) {
    const P = window.ZSProvider;
    const RESEND_SYS_EVERY = (P && P.resendSystemEvery) || 6;
    if (!RESEND_SYS_EVERY) return;
    if (sysCountKey !== sysKey()) sysCountKey = sysKey();
    sysCount[field]++;
    saveSysCount();
  }

  function resetSysCount() {
    sysCount = { users: 0, results: 0 };
    saveSysCount();
  }

  function sinceLastSysInDom() {
    const P = window.ZSProvider;
    const ZSParse = window.ZSParse;
    if (!P || !ZSParse) return { users: 0, results: 0 };
    const items = P.allItems();
    let users = 0, results = 0;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const txt = P.classifyText(it, ".zs-chip");
      if (txt.includes(window.ZS.SYS_MARKER)) break;
      if (!P.isUserItem(it)) continue;
      if (ZSParse.isInjectedFeedback(txt)) results++;
      else users++;
    }
    return { users, results };
  }

  function sinceLastSys() {
    const dom = sinceLastSysInDom();
    return {
      users: Math.max(sysCount.users, dom.users),
      results: Math.max(sysCount.results, dom.results),
    };
  }

  function sysResendDue() {
    const P = window.ZSProvider;
    const RESEND_SYS_EVERY = (P && P.resendSystemEvery) || 6;
    const RESEND_SYS_EVERY_RESULTS = 8;
    if (!RESEND_SYS_EVERY) return false;
    const { users, results } = sinceLastSys();
    return users >= RESEND_SYS_EVERY || results >= RESEND_SYS_EVERY_RESULTS;
  }

  function withSysResend(text) {
    if (!sysResendDue()) return text;
    const prompt = systemPrompt();
    const rider = `\n\n${window.ZS.RESEND_MARKER}\n${prompt}`;
    if (text.length + rider.length > 32000) return text;
    resetSysCount();
    return text + rider;
  }

  async function agentLoop(base) {
    if (A.running) return;
    const P = window.ZSProvider;
    A.running = true;
    A.resumeArmed = false;
    A.stop = false;
    A.stopping = false;
    A.loopKey = null;
    let truncCount = 0;
    const MAX_TRUNC = 6;
    let emptyRetries = 0;
    const MAX_EMPTY_RETRIES = 2;
    const REMIND_TOOLS_EVERY = 8;
    ui.showStop(true);
    if (P) P.setInputLock(true);
    ui.inputCover(true, "เริ่มต้นทำงานใน Studio…");
    diag("loop.start", { base });

    try {
      while (!A.stop) {
        ui.setHudStatus("รอ AI ตอบกลับ…");
        if (document.hidden && !A.stop) {
          ui.inputCover(true);
          if (!(await waitVisible()) || A.stop) break;
        }
        const res = await waitForResponse(base);
        diag("response", { kind: res.kind });
        if (A.stop || res.kind === "stopped") break;

        if (res.kind === "context_limit") {
          ui.banner("limit", "เกินขีดจำกัด Context", "เปิดแชตใหม่เพื่อเริ่มเซสชันใหม่");
          break;
        }
        if (res.kind === "too_long") {
          ui.banner("limit", "การสนทนายาวเกินไป", "เปิดแชตใหม่เพื่อทำงานต่อ");
          break;
        }
        if (res.kind === "timeout") {
          ui.banner("warn", "ไม่มีการตอบกลับ", "AI ไม่ตอบสนองตามเวลาที่กำหนด");
          break;
        }

        if (res.kind === "empty") {
          if (emptyRetries < MAX_EMPTY_RETRIES && !A.stop) {
            emptyRetries++;
            ui.toast(`ข้อความว่าง สั่ง AI ทำงานต่อ (${emptyRetries}/${MAX_EMPTY_RETRIES})…`);
            if (P && P.clickRegenerateBtn && P.clickRegenerateBtn()) {
              window.ZS.captureSendToken();
              await sleep(1000);
              continue;
            }
            await sleep(1200);
            base = await submitAndGetBase("ทำงานต่อจากคำสั่งล่าสุด หรือรายงานสถานะงานปัจจุบัน");
            continue;
          }
          ui.banner("warn", "ข้อความตอบกลับว่างเปล่า", "AI ส่งข้อความเปล่า ลูปจึงหยุดทำงาน");
          break;
        }
        emptyRetries = 0;

        if (res.kind === "truncated") {
          if (P && P.turnHalted && P.turnHalted(res.item)) break;
          if (truncCount < MAX_TRUNC) {
            truncCount++;
            if (P && P.clickContinueBtn && P.clickContinueBtn() && (await window.ZS.waitFor(() => P.isGenerating(), 2500))) {
              continue;
            }
            ui.toast("ข้อความถูกตัด กำลังทำงานต่อ…");
            base = await submitAndGetBase(window.ZS.FEEDBACK.truncated);
            continue;
          }
          if (res.text) break;
          ui.banner("warn", "ข้อความถูกตัดซ้ำๆ", "โมเดลแตะขีดจำกัดความยาวต่อเนื่อง");
          break;
        }
        truncCount = 0;

        if (res.kind === "parse_error") {
          const failName = window.ZSParse.toolNameFromText(res.raw || "") || "command";
          if (res.item) {
            const detail =
              res.reason === "unclosed"
                ? "ข้อความถูกตัด"
                : res.reason === "luaOpener"
                ? "ลืม ###LUA###"
                : res.reason === "envelope"
                ? "รูปแบบผิด"
                : res.reason === "dsml"
                ? "รูปแบบผิด"
                : "JSON ไม่ถูกต้อง";
            decorate.toolBox(res.item, failName, "err", detail, true, "", window.ZS.toolCategory(failName));
          }
          base = await submitAndGetBase(window.ZS.FEEDBACK.parseError(res.reason, failName));
          continue;
        }

        if (res.kind === "text") break;

        if (res.kind === "tool") {
          const calls = res.calls;
          if (calls.length > 1) {
            base = await submitAndGetBase(window.ZS.FEEDBACK.multiTool(calls.map((c) => c.tool || "?")));
            continue;
          }
          const call = calls[0];
          const learnedImg = A.imageTools.has(bareToolName(call.tool));
          const category = learnedImg ? "screen" : window.ZS.toolCategory(call.tool);

          if (document.hidden && !A.stop) {
            if (!(await waitVisible()) || A.stop) break;
          }

          decorate.toolBox(res.item, call.tool, "run", argSummary(call), true, callBody(call), category);
          A.toolSettle = null;
          A.toolRunning = true;
          A.toolStart = Date.now();
          A.toolName = call.tool;
          A.toolItem = res.item;
          A.toolArg = argSummary(call);
          ui.setHudStatus(`รัน: ${call.tool}…`);

          rememberExecuted(res.item);
          diag("tool.start", { name: call.tool });
          const feedback = await runTool(call);
          A.toolRunning = false;

          if (A.stop) {
            if (res.item) {
              res.item.dataset.zStopped = "1";
              rememberHalted(res.item);
            }
            decorate.toolBox(res.item, call.tool, "err", "หยุดแล้ว", true, "", category);
            break;
          }

          const isErr = feedbackIsError(feedback);
          const outBody = feedback.replace(/^Output of '[^']*':\n?/, "");
          const hasImages = !!(A.pendingImages && A.pendingImages.length);
          if (hasImages) window.ZS.rememberImageTool(call.tool);
          const resultCat = hasImages ? "screen" : category;
          decorate.toolBox(res.item, call.tool, isErr ? "err" : "done", outSummary(feedback), true, outBody, resultCat);

          if (!isErr) window.ZS.playChime("tool");
          else window.ZS.playChime("tool_error");

          A.toolSettle = {
            phase: isErr ? "err" : "done",
            detail: outSummary(feedback),
            body: outBody,
            category: resultCat,
            count: P ? P.assistantCount() : 0,
            id: P && P.lastAssistantId ? P.lastAssistantId() : undefined,
          };

          let toSend = feedback;
          if (!isErr && call.tool !== "list_commands" && A.toolList.length) {
            A.toolCallsSinceReminder++;
            if (A.toolCallsSinceReminder >= REMIND_TOOLS_EVERY) {
              A.toolCallsSinceReminder = 0;
              const roblox = A.toolList.filter((t) => (t.server || "roblox") === "roblox");
              toSend += window.ZS.toolsReminder(roblox) + "\n" + window.ZS.memoryNudge();
            }
          }

          bumpSys("results");
          toSend = withSysResend(toSend);
          const images = A.pendingImages;
          A.pendingImages = null;
          ui.setHudStatus("ส่งผลลัพธ์กลับ…");
          base = await submitAndGetBase(toSend, images);
        }
      }
    } catch (e) {
      diag("loop.error", { msg: String((e && e.message) || e) });
      ZSSound.play("error");
      ui.banner("warn", "ข้อผิดพลาดภายในลูป", String((e && e.message) || e));
    } finally {
      A.running = false;
      A.stop = false;
      A.stopping = false;
      A.toolRunning = false;
      A.toolSettle = null;
      A.loopKey = null;
      ui.showStop(false);
      ui.inputCover(false);
      if (P) P.setInputLock(false);
      diag("loop.end");
      if (!A.stop && !A.stopping) {
        notifyTurnComplete("งานเสร็จสิ้นเรียบร้อยแล้ว!");
        ZSSound.play("done");
      }
    }
  }

  async function startSession() {
    const P = (window.ZS && window.ZS.getProvider ? window.ZS.getProvider() : null) || window.ZSProvider;
    if (A.running || A.starting) return;
    if (P && !P.chatIsEmpty() && !A.started) {
      const lastAst = P.lastAssistant ? P.lastAssistant() : null;
      const txt = lastAst ? (P.itemText ? P.itemText(lastAst) : "") : "";
      if (lastAst && window.ZSParse && window.ZSParse.hasToolSignature(txt)) {
        A.started = true;
        rememberSession(P.conversationKey ? P.conversationKey() : null);
        if (ui.setStarted) ui.setStarted(true);
        if (ui.toast) ui.toast("พบคำสั่งค้างอยู่ กำลังทำงานต่อ…");
        setTimeout(() => agentLoop(P.assistantCount ? P.assistantCount() - 1 : 0), 300);
        return;
      }
    }
    A.userStopped = false;
    A.stop = false;
    A.bootBaselineId = P && P.lastAssistantId ? P.lastAssistantId() : null;
    A.starting = true;
    const myGen = ++A.startGen;
    A.startingKey = null;
    const alive = () => A.startGen === myGen;
    A.toolCallsSinceReminder = 0;
    if (ui.setStartingProgress) ui.setStartingProgress(10, "ตรวจสอบ Bridge Server…");
    else if (ui.setStarting) ui.setStarting(true);
    ui.updateStartGate();
    if (P) P.setInputLock(true);
    ui.inputCover(true);

    try {
      // ── Step 1: Real Bridge Verification (127.0.0.1:17613) ────────
      if (ui.setStartingProgress) ui.setStartingProgress(20, "เช็กพอร์ต 17613…");
      const bgFn = window.ZS.bg || ((m) => new Promise((r) => chrome.runtime.sendMessage(m, r)));
      let st = null;
      try {
        st = await bgFn({ type: "reconnect" });
      } catch {}
      if (!st || !st.connected) {
        try { st = await bgFn({ type: "status" }); } catch {}
      }
      if (!alive()) return;

      if (!st || !st.connected) {
        if (ui.setStarting) ui.setStarting(false);
        if (ui.inputCover) ui.inputCover(false);
        if (P) P.setInputLock(false);
        if (ui.banner) {
          ui.banner(
            "warn",
            "คุณต้องเปิด start.bat ก่อนสิ!",
            "ยังไม่ได้เปิด Bridge Server (127.0.0.1:17613)\n• คุณต้องเปิดไฟล์ start.bat ก่อนสิ หรือกดปุ่ม 'เปิดการเชื่อมต่อ' ในหน้าต่างที่เปิดขึ้นมา"
          );
        }
        if (ui.showBridgeModal) ui.showBridgeModal();
        return;
      }

      // ── Step 2: Real Roblox Studio & MCP Tools Verification ───────
      if (ui.setStartingProgress) ui.setStartingProgress(35, "ตรวจสอบ Roblox Studio…");
      await ensureTools(true);
      if (!alive()) return;

      const currentTools = A.toolList || [];
      if (!currentTools.length) {
        if (ui.setStarting) ui.setStarting(false);
        if (ui.inputCover) ui.inputCover(false);
        if (P) P.setInputLock(false);
        const reason = (st.studioProc)
          ? "ตรวจพบโปรเซส Studio แล้ว แต่ยังไม่พบแมพที่เปิด (0 คำสั่ง)\n• วิธีแก้: เปิด Place/แมพ ใน Roblox Studio เพื่อโหลดคำสั่งอัตโนมัติ"
          : "ยังไม่ได้เปิดโปรแกรม Roblox Studio (0 คำสั่ง)\n• วิธีแก้: เปิดโปรแกรม Roblox Studio และเปิดแมพ";
        if (ui.banner) ui.banner("warn", "Roblox Studio ยังไม่พร้อม", reason);
        if (ui.showBridgeModal) ui.showBridgeModal();
        return;
      }

      if (ui.setStartingProgress) ui.setStartingProgress(50, `พบ ${currentTools.length} คำสั่ง Studio…`);
      await sleep(150);

      // ── Step 3: Check AI Model Composer ──────────────────────────
      if (ui.setStartingProgress) ui.setStartingProgress(65, "เตรียมช่องแชท AI…");
      const modeState = P && P.ensureComposerReady ? await P.ensureComposerReady("startup") : { ready: true };
      if (!alive()) return;
      if (!modeState.ready) {
        if (ui.setStarting) ui.setStarting(false);
        if (ui.inputCover) ui.inputCover(false);
        if (P) P.setInputLock(false);
        if (ui.banner) ui.banner("warn", "โหมด AI ไม่พร้อม", modeState.reason || "สลับโหมดไม่สำเร็จ");
        return;
      }

      // ── Step 4: Submit System Prompt ──────────────────────────────
      if (ui.setStartingProgress) ui.setStartingProgress(80, "ส่งคำสั่งตั้งค่าเริ่มต้น…");
      const prompt = systemPrompt();
      const base = await submitAndGetBase(prompt);
      if (!alive()) return;

      // ── Step 5: Await AI Acknowledgement ──────────────────────────
      if (ui.setStartingProgress) ui.setStartingProgress(90, "รอ AI ตอบรับคำสั่ง…");
      decorate.sweep();
      const startRes = await waitForResponse(base);
      if (!alive()) return;
      if (A.stop || startRes.kind === "stopped") return;

      const firstName = startRes.calls && startRes.calls[0] && startRes.calls[0].tool;
      if (
        startRes.kind === "tool" &&
        startRes.calls &&
        startRes.calls.length === 1 &&
        (firstName === "list_commands" || firstName === "list_tools")
      ) {
        if (ui.setStartingProgress) ui.setStartingProgress(95, "ยืนยันรายชื่อคำสั่ง…");
        decorate.toolBox(startRes.item, "กำลังโหลดคำสั่ง", "run", "", true);
        const toolFeedback = await runTool(startRes.calls[0]);
        if (/Roblox Studio is currently OFFLINE/.test(toolFeedback)) {
          decorate.toolBox(startRes.item, "กำลังโหลดคำสั่ง", "err", "Roblox ออฟไลน์", true);
        } else {
          const robloxCount = A.toolList.filter((t) => (t.server || "roblox") === "roblox").length;
          decorate.toolBox(startRes.item, "โหลดคำสั่งแล้ว", "done", `${robloxCount} คำสั่ง`, true);
        }
        const base2 = await submitAndGetBase(toolFeedback);
        const readyRes = await waitForResponse(base2);
        if (!alive()) return;
        if (A.stop || readyRes.kind === "stopped") return;
      }

      // ── Step 6: 100% Ready ────────────────────────────────────────
      if (ui.setStartingProgress) ui.setStartingProgress(100, `เชื่อมต่อสำเร็จ (${currentTools.length} คำสั่ง)`);
      A.started = true;
      rememberSession(P ? P.conversationKey() : null);
      if (ui.setStarted) ui.setStarted(true);
      if (ui.toast) ui.toast(`AI พร้อมทำงานแล้ว บอกให้สร้างแมพใน Roblox ได้เลย`);
    } catch (e) {
      try {
        if (alive() && ui.banner) ui.banner("warn", "เริ่มต้นระบบไม่สำเร็จ", String((e && e.message) || e));
      } catch {}
    } finally {
      if (alive()) {
        A.starting = false;
        A.startingKey = null;
        if (ui.setStarting) ui.setStarting(false);
        if (ui.inputCover) ui.inputCover(false);
        if (P) P.setInputLock(false);
        decorate.sweep();
      }
    }
  }

  const startedSessions = new Set();
  let lastSyncPath = null;

  function rememberSession(path) {
    if (!path || startedSessions.has(path)) return;
    startedSessions.add(path);
    try {
      chrome.storage.local.set({ zsStartedSessions: [...startedSessions].slice(-300) });
    } catch {}
  }

  try {
    chrome.storage.local.get("zsStartedSessions", (r) => {
      if (r && Array.isArray(r.zsStartedSessions)) {
        for (const p of r.zsStartedSessions) startedSessions.add(p);
        syncSessionState();
      }
    });
  } catch {}

  function syncSessionState() {
    const P = window.ZSProvider;
    if (!P) return;

    if (A.starting) {
      const key = P.conversationKey();
      if (A.startingKey == null) {
        if (key && !P.chatIsEmpty()) A.startingKey = key;
      } else if (key !== A.startingKey && P.chatIsEmpty()) {
        A.startGen++;
        A.starting = false;
        A.startingKey = null;
        P.setInputLock(false);
        ui.setStarting(false);
        ui.inputCover(false);
      }
    }

    if (A.running) {
      const key = P.conversationKey();
      if (A.loopKey == null) {
        if (key && !P.chatIsEmpty()) A.loopKey = key;
      } else if (key !== A.loopKey && P.chatIsEmpty()) {
        A.stop = true;
        A.loopKey = null;
      }
    }

    if (A.starting || A.injecting || A.running) return;
    const path = P.conversationKey();
    const markerInDom = window.ZS.domHasZsSignal ? window.ZS.domHasZsSignal() : false;
    if (markerInDom) rememberSession(path);

    let has;
    if (path && path === lastSyncPath) {
      has = A.started || markerInDom || (!!path && startedSessions.has(path));
    } else {
      has = markerInDom || (!!path && startedSessions.has(path));
      lastSyncPath = path;
    }

    if (has !== A.started) {
      A.started = has;
      ui.setStarted(has);
    }
  }

  const agentExports = {
    rememberHalted,
    forgetHalted,
    isRememberedHalted,
    rememberExecuted,
    isRememberedExecuted,
    stopLoop,
    systemPrompt,
    agentLoop,
    startSession,
    rememberSession,
    syncSessionState,
    loadSysCount,
    sysResendDue,
    sinceLastSys,
    resetSysCount,
  };
  Object.assign(window.ZS, agentExports);
  window.ZS.agent = window.ZS;

  window.agentLoop = agentLoop;
  window.startSession = startSession;
  window.stopLoop = stopLoop;
  window.syncSessionState = syncSessionState;
})();
