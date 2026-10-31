// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * core/response-watcher.js - Detection and streaming watcher for assistant model responses.
 */
(() => {
  "use strict";

  window.ZS = window.ZS || {};
  const { A, diag, sleep, log, jitterBeforeSend, bareToolName, ui } = window.ZS;

  async function waitFor(pred, timeout) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (pred()) return true;
      await sleep(120);
    }
    return false;
  }

  async function waitVisible() {
    if (!document.hidden || A.stop) return !A.stop;
    A.parked = true;
    try {
      if (ui && ui.setStarting) ui.setStarting();
    } catch {}
    try {
      await new Promise((resolve) => {
        const done = () => {
          document.removeEventListener("visibilitychange", onVis);
          clearInterval(iv);
          resolve();
        };
        const onVis = () => {
          if (!document.hidden) done();
        };
        document.addEventListener("visibilitychange", onVis);
        const iv = setInterval(() => {
          if (A.stop || !document.hidden) done();
        }, 1000);
      });
    } finally {
      A.parked = false;
      try {
        if (ui && ui.setStarting) ui.setStarting();
      } catch {}
    }
    return !A.stop;
  }

  async function parkHidden() {
    if (!document.hidden || A.stop) return 0;
    const t0 = Date.now();
    await waitVisible();
    const parked = Date.now() - t0;
    diag("park.resumed", { parkedMs: parked });
    if (!A.stop) await sleep(400);
    return parked;
  }

  function captureSendToken() {
    const P = window.ZSProvider;
    A.sendToken = P && P.lastAssistantId ? P.lastAssistantId() : undefined;
  }

  async function submitAndGetBase(text, images) {
    const P = window.ZSProvider;
    captureSendToken();
    diag("send", { text: String(text).slice(0, 60), busy: P && P.isBusyNow ? P.isBusyNow() : false });
    A.injecting = true;
    if (ui && ui.inputCover) ui.inputCover(true);
    try {
      const _settleItem = P && P.lastAssistant ? P.lastAssistant() : null;
      const _settleLen0 = _settleItem && P.streamLen ? P.streamLen(_settleItem) : 0;
      await sleep(200);
      if (
        _settleItem &&
        P &&
        _settleItem === P.lastAssistant() &&
        P.streamLen &&
        P.streamLen(_settleItem) > _settleLen0
      ) {
        await waitFor(() => !P.isGenerating(), 4000);
      }
      const base = P && P.assistantCount ? P.assistantCount() : 0;
      const preUser = P && P.userCount ? P.userCount() : 0;
      A.injectPreUser = preUser;
      A.injectHideUntil = Date.now() + 2500;
      const landed = () => (P ? P.userCount() > preUser || P.assistantCount() > base : true);

      let tries = 0;
      let messageSent = false;
      while (!messageSent && !landed() && tries < 4 && !A.stop) {
        if (document.hidden) {
          diag("send.waitVisible", { tries });
          if (!(await waitVisible()) || A.stop) break;
        }
        await jitterBeforeSend();
        diag("submit.typeAndSend", { hasImages: !!(images && images.length) });
        if (P) await P.typeAndSend(text, images);
        A.injectHideUntil = Date.now() + 2500;
        await waitFor(() => {
          if (P && P.editorText && P.editorText().trim() === "") messageSent = true;
          return messageSent || landed();
        }, 3500);
        tries++;
      }
      if (messageSent) diag("send.cleared", { tries });
      if (!messageSent && !landed() && !A.stop) {
        diag("send.failed", { tries });
        if (ui && ui.banner) {
          ui.banner("warn", "ส่งข้อความไม่สำเร็จ", `• พยายามส่ง ${tries} ครั้งไม่ผ่าน\n• วิธีแก้: พิมพ์ "ทำต่อ" ในแชท`);
        }
      }
      return base;
    } finally {
      if (!A.starting && !A.running && ui && ui.inputCover) ui.inputCover(false);
      setTimeout(() => (A.injecting = false), 400);
      setTimeout(() => {
        if (window.ZS.scheduleSweep) window.ZS.scheduleSweep();
      }, 200);
      setTimeout(() => {
        if (window.ZS.scheduleSweep) window.ZS.scheduleSweep();
      }, 700);
    }
  }

  async function waitForResponse(base) {
    const P = window.ZSProvider;
    const ZSParse = window.ZSParse;
    const T = (P && P.timings) || {
      RESPONSE_TIMEOUT_MS: 300000,
      STABLE_MS: 15000,
      WARMUP_MS: 5000,
      REASON_NOREPLY_MS: 45000,
    };
    const t0 = Date.now();
    const TIMEOUT = T.RESPONSE_TIMEOUT_MS;
    let lastActiveAt = Date.now();
    const STABLE_MS = T.STABLE_MS;
    let started = false, doneSince = 0, lastLimitScan = 0;
    let lastText = null, lastChangeAt = Date.now(), genFalseSince = 0;
    let genOffFirstAt = 0, genFlickers = 0, prevGen = null;
    let waitedBlock = 0, waitedFlicker = 0;
    let preStartSilent = 0;
    let curItem = null, sawContent = false, warmSince = 0;
    let lastGoodReply = "";
    let reasonSince = 0;
    let noTurnSince = 0;
    let unsettledSince = 0;
    const WARMUP_MS = T.WARMUP_MS;
    const REASON_NOREPLY_MS = T.REASON_NOREPLY_MS;
    const NO_TURN_GRACE_MS = 30000;
    const UNSETTLED_GRACE_MS = 8000;
    const GEN_STOP_GRACE_MS = 2500;

    const finalizeDiag = (kind) => {
      const now = Date.now();
      diag("stopGoneToResp", {
        kind,
        stopGoneToRespMs: genOffFirstAt ? now - genOffFirstAt : null,
        genStableForMs: genFalseSince ? now - genFalseSince : null,
        lastChangeAgoMs: now - lastChangeAt,
        genFlickers,
        waitedBlock,
        waitedFlicker,
        totalMs: now - t0,
      });
    };

    while (Date.now() - lastActiveAt < TIMEOUT) {
      if (A.stop) return { kind: "stopped" };
      if (document.hidden && !A.stop) {
        const parked = await parkHidden();
        if (A.stop) return { kind: "stopped" };
        if (parked) {
          lastActiveAt += parked;
          lastChangeAt += parked;
          if (doneSince) doneSince += parked;
          if (genFalseSince) genFalseSince += parked;
          if (preStartSilent) preStartSilent += parked;
          if (warmSince) warmSince += parked;
          if (reasonSince) reasonSince += parked;
          if (noTurnSince) noTurnSince += parked;
          if (unsettledSince) unsettledSince += parked;
          if (genOffFirstAt) genOffFirstAt += parked;
        }
        continue;
      }

      const gen = P ? P.isGenerating() : false;
      if (gen) lastActiveAt = Date.now();
      const d = P ? P.readAssistant() : { reply: "", thinking: "", item: null };
      const curTok = P && P.lastAssistantId ? P.lastAssistantId() : undefined;
      const newReply =
        curTok !== undefined && curTok !== null ? curTok !== A.sendToken : P ? P.assistantCount() > base : false;

      if (d.item !== curItem) {
        curItem = d.item;
        sawContent = false;
        warmSince = 0;
        lastGoodReply = "";
      }
      if ((d.reply && d.reply.length) || (d.thinking && d.thinking.length)) sawContent = true;
      if (d.reply && d.reply.length) lastGoodReply = d.reply;

      if (!started) {
        const hasText = !!((d.reply && d.reply.length) || (d.thinking && d.thinking.length));
        if (gen || (newReply && hasText)) {
          started = true;
        } else {
          if (!preStartSilent) preStartSilent = Date.now();
          if (Date.now() - preStartSilent > 60000) {
            diag("empty.why", { branch: "preStart", rep: (d.reply || "").length });
            return { kind: "empty" };
          }
          await sleep(200);
          continue;
        }
      }

      const replyNorm = (d.reply || "").replace(/\s+/g, " ").trim();
      if (replyNorm !== lastText) {
        lastText = replyNorm;
        lastChangeAt = Date.now();
        lastActiveAt = Date.now();
      }
      if (gen) genFalseSince = 0;
      else if (!genFalseSince) genFalseSince = Date.now();
      if (started && !gen && !genOffFirstAt) genOffFirstAt = Date.now();
      if (prevGen === false && gen && genOffFirstAt) genFlickers++;
      prevGen = gen;

      if (Date.now() - lastLimitScan > 1000) {
        lastLimitScan = Date.now();
        const ctx = P && P.scanError ? P.scanError() : null;
        if (ctx) return { kind: "context_limit", detail: ctx };
      }

      const blockActive = ZSParse && ZSParse.hasOpenToolBlock(d.reply) && Date.now() - lastChangeAt < 6000;
      const genStopped = !gen && genFalseSince && Date.now() - genFalseSince > GEN_STOP_GRACE_MS;
      const effectiveBlock = blockActive && !genStopped;

      const stuckDone =
        started &&
        d.reply &&
        Date.now() - lastChangeAt > STABLE_MS &&
        !(gen && ZSParse && ZSParse.hasOpenToolBlock(d.reply));

      if ((gen || effectiveBlock) && !stuckDone) {
        if (genOffFirstAt) {
          if (gen) waitedFlicker++;
          else if (effectiveBlock) waitedBlock++;
        }
        doneSince = 0;
        await sleep(160);
        continue;
      }
      if (stuckDone && gen) log("generating flag stuck - text stability fallback");

      if (P && P.reliableCounts && !newReply) {
        if (!noTurnSince) noTurnSince = Date.now();
        if (Date.now() - noTurnSince < NO_TURN_GRACE_MS) {
          await sleep(200);
          continue;
        }
      } else {
        noTurnSince = 0;
      }

      if (!doneSince) doneSince = Date.now();
      if (Date.now() - doneSince < 500) {
        await sleep(120);
        continue;
      }

      if (!sawContent) {
        if (d && d.item) {
          const raw = (d.item.innerText || d.item.textContent || "").trim();
          if (raw) {
            sawContent = true;
            d.reply = raw;
            lastGoodReply = raw;
          }
        }
      }
      if (!sawContent) {
        if (!warmSince) warmSince = Date.now();
        if (Date.now() - warmSince < WARMUP_MS) {
          await sleep(200);
          continue;
        }
        return { kind: "empty" };
      }

      if (d.thinking && d.thinking.length && !(d.reply && d.reply.length) && !(P && P.turnHalted && P.turnHalted(d.item))) {
        if (!reasonSince) reasonSince = Date.now();
        if (Date.now() - reasonSince < REASON_NOREPLY_MS) {
          await sleep(200);
          continue;
        }
      } else {
        reasonSince = 0;
      }

      let r = d.reply;
      if (!r && lastGoodReply) r = lastGoodReply;
      if (r.length < 400 && P && P.isTooLongMsg && P.isTooLongMsg(r)) return { kind: "too_long" };

      const cmdShaped =
        P &&
        P.replyUnsettled &&
        ZSParse &&
        (ZSParse.hasToolSignature(r) ||
          (ZSParse.LUA_END_RE.test(r) && !ZSParse.LUA_START_RE.test(r)) ||
          (/"(?:datamodel_type|edits|old_string|new_string|file_path|target_file)"\s*:/.test(r) && !/"command"\s*:/.test(r)));

      if (cmdShaped && P.replyUnsettled(d.item)) {
        if (!unsettledSince) unsettledSince = Date.now();
        if (Date.now() - unsettledSince < UNSETTLED_GRACE_MS) {
          await sleep(250);
          continue;
        }
      } else {
        unsettledSince = 0;
      }

      if (P && P.isComparisonTurn && P.isComparisonTurn(d.item)) {
        if (P.isGenerating()) {
          await sleep(250);
          continue;
        }
        if (P.resolveComparison && P.resolveComparison()) {
          diag("carousel.resolved");
          await sleep(400);
          continue;
        }
        await sleep(250);
        continue;
      }

      if (ZSParse && ZSParse.hasToolSignature(r)) {
        const calls = ZSParse.parseToolCalls(r);
        if (calls.length) {
          finalizeDiag("tool");
          return { kind: "tool", calls, item: d.item };
        }
        if (P && P.findContinueBtn && P.findContinueBtn()) return { kind: "truncated", text: r, item: d.item };
        if (r.includes(ZSParse.START_M) || ZSParse.LUA_START_RE.test(r)) {
          return { kind: "parse_error", reason: "malformed", raw: r, item: d.item };
        }
        if (ZSParse.hasOpenToolBlock(r)) {
          const saved = ZSParse.salvageCutOff(r);
          if (saved) {
            finalizeDiag("tool");
            return { kind: "tool", calls: [saved], item: d.item };
          }
          return { kind: "parse_error", reason: "unclosed", raw: r, item: d.item };
        }
        const nm = ZSParse.toolNameFromText(r);
        if (nm && nm !== "command" && (A.toolNames.has(nm) || A.toolNames.has(bareToolName(nm)))) {
          return { kind: "parse_error", reason: "malformed", raw: r, item: d.item };
        }
      }

      if (ZSParse && ZSParse.DSML_RE.test(r)) {
        return { kind: "parse_error", reason: "dsml", raw: r, item: d.item };
      }
      if (ZSParse && ZSParse.LUA_END_RE.test(r) && !ZSParse.LUA_START_RE.test(r) && !r.includes(ZSParse.START_M)) {
        return { kind: "parse_error", reason: "luaOpener", raw: r, item: d.item };
      }
      if (/"(?:datamodel_type|edits|old_string|new_string|file_path|target_file)"\s*:/.test(r) && !/"command"\s*:/.test(r)) {
        return { kind: "parse_error", reason: "envelope", raw: r, item: d.item };
      }

      const wrongKey = /"(?:toolName|tool_name|tool|name|function|action)"\s*:\s*"([A-Za-z0-9_.\/-]+)"/.exec(r);
      if (wrongKey && !/"command"\s*:/.test(r)) {
        const wk = wrongKey[1];
        if (window.ZS.knownTool && window.ZS.knownTool(wk)) {
          return { kind: "parse_error", reason: "toolKey", raw: r, item: d.item };
        }
      }

      if (P && P.findContinueBtn && P.findContinueBtn()) return { kind: "truncated", text: r, item: d.item };
      if (r === "") {
        if (d && d.item) {
          const raw = (d.item.innerText || d.item.textContent || "").trim();
          if (raw) r = raw;
        }
      }
      if (r === "") return { kind: "empty" };
      return { kind: "text", text: r };
    }
    return { kind: "timeout" };
  }

  const watcherExports = {
    waitFor,
    waitVisible,
    parkHidden,
    captureSendToken,
    submitAndGetBase,
    waitForResponse,
  };
  Object.assign(window.ZS, watcherExports);
  window.ZS.watcher = window.ZS;

  window.waitFor = waitFor;
  window.waitVisible = waitVisible;
  window.submitAndGetBase = submitAndGetBase;
  window.waitForResponse = waitForResponse;
})();

