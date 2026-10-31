// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * core/camouflage.js - DOM camouflage, tool card decoration, and code-block hiding.
 */
(() => {
  "use strict";

  window.ZS = window.ZS || {};
  const { A, diag, bareToolName, IMAGE_FEEDBACK_RE, RESUME_FRESH_MS } = window.ZS;

  function resetDecoration(item) {
    if (!item) return;
    const chip = item.querySelector(".zs-chip");
    if (chip) chip.remove();
    item.classList.remove("zs-hidden");
    item.querySelectorAll(".zs-tool-hide").forEach((e) => e.classList.remove("zs-tool-hide"));
    item.querySelectorAll(".zs-cmd-mask").forEach((e) => e.classList.remove("zs-cmd-mask"));
    delete item.dataset.zs;
    delete item.dataset.zsig;
    delete item.dataset.zphase;
    delete item.dataset.zStopped;
    delete item.dataset.zRegenLen;
    delete item.dataset.zRegenAt;
    delete item.__zsChip;
  }

  function formatCount(n) {
    if (n < 1000) return String(n);
    const units = [
      [1e9, "B"],
      [1e6, "M"],
      [1e3, "k"],
    ];
    for (const [div, suf] of units) {
      if (n >= div) {
        const v = n / div;
        const rounded = v < 10 ? Math.round(v * 10) / 10 : Math.round(v);
        return rounded + suf;
      }
    }
    return String(n);
  }

  function setChipDetail(item, text) {
    const dt = item && item.querySelector(".zs-chip .zs-chip-dt");
    if (dt) dt.textContent = text;
  }

  function setChipLabel(item, text) {
    const tx = item && item.querySelector(".zs-chip .zs-chip-tx");
    if (tx && tx.textContent !== text) tx.textContent = text;
  }

  function elapsedOn(item, key, fallbackStart) {
    if (!item) return 0;
    let t0 = Number(item.dataset[key] || 0);
    if (!t0) {
      t0 = fallbackStart || Date.now();
      item.dataset[key] = String(t0);
    }
    return (Date.now() - t0) / 1000;
  }

  const decorate = {
    chip(item, opts) {
      const P = window.ZSProvider;
      const { label, detail = "", body = "", category = "tool", phase, cls, whole } = opts;
      let chip = item.querySelector(".zs-chip");
      const hasBody = !!body;
      const sig = `${category}|${phase}|${cls || ""}|${whole ? 1 : 0}|${label}|${detail}|${hasBody ? body.length : 0}`;
      if (!chip) chip = document.createElement("div");

      if (chip.dataset.csig !== sig) {
        chip.dataset.csig = sig;
        chip.className = `zs-chip cat-${category} ${cls || ""}`;
        chip.innerHTML =
          `<div class="zs-chip-head">` +
          `<span class="zs-chip-ic">${window.ZS.iconFor(category, phase)}</span>` +
          `<span class="zs-chip-tx"></span>` +
          `<span class="zs-chip-dt"></span>` +
          (hasBody
            ? `<span class="zs-chip-cv">${window.ZS.SVG('<polyline points="6 9 12 15 18 9"/>')}</span>`
            : "") +
          `</div>` +
          (hasBody ? `<div class="zs-chip-body"><pre></pre></div>` : "");
        chip.querySelector(".zs-chip-tx").textContent = label;
        if (detail) chip.querySelector(".zs-chip-dt").textContent = detail;
        if (hasBody) {
          chip.querySelector(".zs-chip-body pre").textContent = body;
          const head = chip.querySelector(".zs-chip-head");
          head.style.cursor = "pointer";
          head.onclick = () => chip.classList.toggle("open");
        }
      }

      if (whole) {
        if (chip.parentElement !== item && item && typeof item.insertBefore === "function") {
          item.insertBefore(chip, item.firstChild);
        }
        item.classList.add("zs-hidden");
      } else {
        item.classList.remove("zs-hidden");
        const spot = P && P.findToolBlockSpot ? P.findToolBlockSpot(item, chip) : null;
        if (P && P.chipAtItemLevel) {
          const anchor = (P.chipAnchor && P.chipAnchor(item)) || item;
          if (anchor && typeof anchor.insertBefore === "function") {
            const wantLast = !!P.chipAppend;
            const trailRef = wantLast && P.chipTrailRef ? P.chipTrailRef(item) : null;
            const inPlace =
              chip.parentElement === anchor &&
              (wantLast ? chip.nextElementSibling === trailRef : anchor.firstElementChild === chip);
            if (!inPlace) {
              if (wantLast) anchor.insertBefore(chip, trailRef);
              else anchor.insertBefore(chip, anchor.firstChild);
            }
          }
        } else if (spot && spot.parent && typeof spot.parent.insertBefore === "function") {
          spot.parent.insertBefore(chip, spot.ref);
        } else if (spot && spot.nodeType === 1 && spot.parentElement && typeof spot.parentElement.insertBefore === "function") {
          spot.parentElement.insertBefore(chip, spot);
        } else if (!chip.parentElement && item && typeof item.insertBefore === "function") {
          item.insertBefore(chip, item.firstChild);
        }
      }
      item.dataset.zs = cls || "1";
      item.__zsChip = { ...opts };
      return chip;
    },

    ensureOwnedChip(item) {
      const P = window.ZSProvider;
      const opts = item.__zsChip;
      if (!opts) return;
      const chipEl = item.querySelector(".zs-chip");
      const chipGone = !chipEl;
      let rawVisible = false;
      if (!opts.whole && P) {
        rawVisible = [...item.querySelectorAll("pre, p, [class*='code'], .cm-line")].some(
          (e) =>
            !e.closest(".zs-tool-hide") &&
            !e.closest(".zs-chip") &&
            !(P.thinkingSel && e.closest(P.thinkingSel)) &&
            !e.querySelector(".zs-tool-hide") &&
            window.ZSParse.hasCommandShape(e.textContent || "")
        );
      }
      let drifted = false;
      if (!opts.whole && !chipGone && P && P.chipAtItemLevel && P.chipAppend) {
        const anchor = (P.chipAnchor && P.chipAnchor(item)) || item;
        const trailRef = P.chipTrailRef ? P.chipTrailRef(item) : null;
        drifted = chipEl.parentElement === anchor && chipEl.nextElementSibling !== trailRef;
      }
      if (chipGone || rawVisible || drifted) {
        diag("chip.rebuild", { name: opts.label, phase: opts.phase, chipGone, rawVisible, drifted });
        this.chip(item, opts);
      }
    },

    toolBox(item, name, phase, detail, owned, body, category) {
      if (!item) return;
      if (item.dataset.zphase !== phase) {
        diag("chip.phase", {
          name,
          from: item.dataset.zphase || "(new)",
          to: phase,
          by: owned ? "loop" : "sweep",
          detail: detail || "",
        });
      }
      const cls = phase === "run" ? "run" : phase === "err" ? "err" : phase === "idle" ? "idle" : "done";
      this.chip(item, {
        label: name,
        detail: detail || "",
        body: body || "",
        category: category || (window.ZS.toolCategory ? window.ZS.toolCategory(name) : "tool"),
        phase,
        cls,
      });
      item.dataset.zphase = phase;
      if (owned) item.dataset.zloop = "1";
    },

    classify(item, next) {
      const P = window.ZSProvider;
      const ZSParse = window.ZSParse;
      if (!P || !ZSParse) return;
      if (item.dataset.zloop) {
        this.ensureOwnedChip(item);
        return;
      }
      const txt = P.classifyText(item, ".zs-chip");
      const chipGone = !item.querySelector(".zs-chip");

      if (txt.includes(window.ZS.RESEND_MARKER)) {
        if (item.dataset.zs !== "resend" || chipGone) {
          const m = txt.match(/Output of '([^']+)'/);
          this.chip(item, {
            label: "ทบทวนคำสั่ง",
            detail: m ? `พร้อมผลลัพธ์ ${m[1]}` : "",
            category: "remind",
            phase: "remind",
            cls: "sys",
            whole: true,
          });
          item.dataset.zs = "resend";
          item.dataset.zphase = "remind";
        }
        return;
      }

      if (txt.includes(window.ZS.SYS_MARKER)) {
        const phase = A.starting ? "run" : "sys";
        if (item.dataset.zs !== "sys" || item.dataset.zphase !== phase || chipGone) {
          this.chip(item, { label: "กำลังเริ่มระบบ…", category: "tool", phase, cls: "sys", whole: true });
          item.dataset.zphase = phase;
        }
        return;
      }

      if (P.isUserItem(item) && ZSParse.isInjectedFeedback(txt)) {
        const m = txt.match(/Output of '([^']+)'/);
        const isErr = /^\s*ERROR\b/.test(txt);
        const hasImg = !isErr && IMAGE_FEEDBACK_RE.test(txt);
        if (hasImg && m && window.ZS.rememberImageTool) window.ZS.rememberImageTool(m[1]);
        const sig = (m ? m[1] : "note") + "|" + (isErr ? "err" : hasImg ? "img" : "result");
        if (item.dataset.zsig !== sig || !item.classList.contains("zs-hidden") || chipGone) {
          this.chip(item, {
            label: m ? `${m[1]} · ผลลัพธ์` : "ผลลัพธ์",
            category: hasImg ? "screen" : m && window.ZS.toolCategory ? window.ZS.toolCategory(m[1]) : "tool",
            body: txt,
            phase: isErr ? "err" : "result",
            cls: isErr ? "err" : "result",
            whole: true,
          });
          item.dataset.zsig = sig;
        }
        return;
      }

      if (P.isAssistantItem(item) && !ZSParse.hasCommandShape(txt) && next && P.isUserItem(next)) {
        const nt = P.classifyText(next, ".zs-chip");
        const m = nt.match(/^\s*Output of '([^']+)'/);
        if (m) {
          const isErr = /^\s*ERROR\b/.test(nt);
          const phase = isErr ? "err" : "done";
          if (item.dataset.zphase !== phase || chipGone) {
            this.toolBox(item, m[1], phase, "", false);
          }
          return;
        }
      }

      if (P.isAssistantItem(item) && ZSParse.hasCommandShape(txt) && (A.started || A.starting)) {
        if (item.dataset.zRegenLen) {
          const baseLen = Number(item.dataset.zRegenLen);
          const armedAt = Number(item.dataset.zRegenAt || 0);
          const replaced = txt.length < baseLen - 8;
          const expired = Date.now() - armedAt > 6000;
          if (!replaced && !expired) {
            const nm = ZSParse.toolNameFromText(txt) || "command";
            this.toolBox(item, nm, "err", "หยุดแล้ว", false);
            return;
          }
          delete item.dataset.zRegenLen;
          delete item.dataset.zRegenAt;
        }

        const regenerating = !A.userStopped && ((item === P.lastAssistant() && P.isGenerating()) || (A.running && A.toolItem === item));
        if (regenerating) {
          delete item.dataset.zStopped;
          if (window.ZS.forgetHalted) window.ZS.forgetHalted(item);
        }
        const stopped =
          !regenerating &&
          (item.dataset.zStopped === "1" ||
            (A.userStopped && item === P.lastAssistant()) ||
            (window.ZS.isRememberedHalted && window.ZS.isRememberedHalted(item, txt)));

        if (stopped && item.dataset.zStopped !== "1") {
          item.dataset.zStopped = "1";
          diag("chip.rehalt", { name: ZSParse.toolNameFromText(txt) });
        }

        if (
          !stopped &&
          A.running &&
          !A.toolRunning &&
          A.toolSettle &&
          (A.toolSettle.id !== undefined && P.lastAssistantId
            ? P.lastAssistantId() === A.toolSettle.id
            : A.toolSettle.count === P.assistantCount()) &&
          item === P.lastAssistant() &&
          ZSParse.toolNameFromText(txt) === A.toolName
        ) {
          diag("chip.reown", { name: A.toolName, phase: A.toolSettle.phase });
          this.toolBox(
            item,
            A.toolName,
            A.toolSettle.phase,
            A.toolSettle.detail,
            true,
            A.toolSettle.body,
            A.toolSettle.category
          );
          return;
        }

        const resultAfter = next && P.isUserItem(next) && ZSParse.isInjectedFeedback(P.classifyText(next, ".zs-chip"));
        const inFlight = (A.running || A.starting) && !resultAfter;
        const resumeGrace = A.resumeArmed && item === P.lastAssistant() && Date.now() - (A.resumeArmedAt || 0) < 2500;
        const live = !stopped && (inFlight || resumeGrace || (item === P.lastAssistant() && P.isGenerating()));

        const neverRun = !item.dataset.zloop && !resultAfter && !(window.ZS.isRememberedExecuted && window.ZS.isRememberedExecuted(item, txt));
        const supersededOrphan = neverRun && item !== P.lastAssistant();
        const staleLastOrphan = neverRun && item === P.lastAssistant() && !live && Date.now() - A.lastGenAt > RESUME_FRESH_MS;
        const orphanPending = !stopped && (supersededOrphan || staleLastOrphan);
        const pendingExec =
          !stopped && !orphanPending && !live && neverRun && item === P.lastAssistant() && Date.now() - A.lastGenAt <= RESUME_FRESH_MS;

        let phase = stopped ? "err" : orphanPending ? "idle" : live || pendingExec ? "run" : "done";
        let detail = stopped ? "หยุดแล้ว" : orphanPending ? "ไม่ได้รัน" : "";

        if (!stopped && !live && phase !== "err" && ZSParse.DSML_RE.test(txt)) {
          phase = "err";
          detail = "รูปแบบผิด";
        }

        if (phase === "done" && next && P.isUserItem(next)) {
          const nt = P.classifyText(next, ".zs-chip");
          if (ZSParse.isInjectedFeedback(nt) && window.ZS.feedbackIsError && window.ZS.feedbackIsError(nt)) {
            phase = "err";
            detail = "ข้อผิดพลาด";
            if (item.dataset.zphase !== "err") diag("chip.errSettle", { name: ZSParse.toolNameFromText(txt) });
          }
        }

        const rawVisible = [...item.querySelectorAll("pre, p, [class*='code'], .cm-line")].some(
          (e) =>
            !e.classList.contains("zs-tool-hide") &&
            !e.closest(".zs-tool-hide") &&
            !e.closest(".zs-chip") &&
            !(P.thinkingSel && e.closest(P.thinkingSel)) &&
            !e.querySelector(".zs-tool-hide") &&
            ZSParse.hasCommandShape(e.textContent || "")
        );

        const nm = ZSParse.toolNameFromText(txt);
        const cat = A.imageTools.has(bareToolName(nm)) ? "screen" : undefined;
        const chipNow = item.querySelector(".zs-chip");
        const catStale = cat === "screen" && chipNow && !chipNow.classList.contains("cat-screen");

        let drifted = false;
        if (P.chipAtItemLevel && P.chipAppend && chipNow) {
          const anchor = (P.chipAnchor && P.chipAnchor(item)) || item;
          const trailRef = P.chipTrailRef ? P.chipTrailRef(item) : null;
          drifted = chipNow.parentElement === anchor && chipNow.nextElementSibling !== trailRef;
        }

        if (item.dataset.zphase !== phase || chipGone || rawVisible || catStale || drifted) {
          if (item.dataset.zphase !== phase) {
            const suspectDone = phase === "done" && item === P.lastAssistant() && !resultAfter;
            diag("chip.why", {
              name: nm,
              to: phase,
              stopped,
              live,
              inFlight,
              resumeGrace,
              pendingExec,
              isLast: item === P.lastAssistant(),
              resultAfter,
              gen: P.isGenerating(),
              run: A.running,
              starting: A.starting,
              suspectDone,
            });
          }
          this.toolBox(item, nm, phase, detail, false, undefined, cat);
        }
        return;
      }

      const haltedTurn = item.dataset.zStopped === "1" || (A.userStopped && item === P.lastAssistant());
      if (haltedTurn && P.isAssistantItem(item) && item.dataset.zphase !== "err" && item.querySelector(".zs-chip")) {
        const tx = item.querySelector(".zs-chip-tx");
        const name = ZSParse.toolNameFromText(txt) || (tx && tx.textContent) || "tool";
        this.toolBox(item, name, "err", "stopped", false);
        return;
      }

      if (!txt.trim() && (item.dataset.zphase || item.dataset.zs)) return;

      if (item.dataset.zs || item.dataset.zphase || item.querySelector(".zs-chip")) {
        diag("chip.reset", { was: item.dataset.zphase || item.dataset.zs || "chip-only" });
        resetDecoration(item);
      }
    },

    sweep() {
      const P = window.ZSProvider;
      if (!P) return;
      const items = P.allItems();
      for (let i = 0; i < items.length; i++) this.classify(items[i], items[i + 1] || null);

      for (const chip of document.querySelectorAll(".zs-chip.run")) {
        let item = chip.parentElement;
        while (item && !(item.dataset && item.dataset.zStopped)) item = item.parentElement;
        if (item && item.dataset.zphase !== "err") {
          const tx = chip.querySelector(".zs-chip-tx");
          this.toolBox(item, (tx && tx.textContent) || "tool", "err", "stopped", false);
        }
      }
    },
  };

  let sweepScheduled = false;
  function scheduleSweep() {
    if (sweepScheduled) return;
    sweepScheduled = true;
    const run = () => {
      sweepScheduled = false;
      if (window.ZS.syncSessionState) window.ZS.syncSessionState();
      const P = window.ZSProvider;
      if (P && P.enforceComposer) P.enforceComposer();
      if (window.ZS.ui && window.ZS.ui.updateStartGate) window.ZS.ui.updateStartGate();
      decorate.sweep();
    };
    if (document.hidden) setTimeout(run, 100);
    else requestAnimationFrame(run);
  }

  function preHideWholeItems() {
    const P = window.ZSProvider;
    if (!P) return;
    const items = P.allItems();
    if (A.injectHideUntil && Date.now() < A.injectHideUntil) {
      const users = items.filter((it) => P.isUserItem(it));
      const last = users[users.length - 1];
      if (last && !last.classList.contains("zs-hidden")) last.classList.add("zs-hidden");
    }
  }

  function domHasZsSignal() {
    const P = window.ZSProvider;
    if (!P) return false;
    for (const it of P.allItems()) {
      const txt = it.textContent || "";
      if (txt.includes(window.ZS.SYS_MARKER)) return true;
      if (/(^|\n)\s*Output of '[^']+':/.test(txt) || txt.includes("(System note:")) return true;
    }
    return false;
  }

  const camExports = {
    resetDecoration,
    formatCount,
    setChipDetail,
    setChipLabel,
    elapsedOn,
    decorate,
    scheduleSweep,
    preHideWholeItems,
    domHasZsSignal,
  };
  Object.assign(window.ZS, camExports);
  window.ZS.camouflage = window.ZS;

  window.resetDecoration = resetDecoration;
  window.decorate = decorate;
  window.scheduleSweep = scheduleSweep;
  window.preHideWholeItems = preHideWholeItems;
  window.domHasZsSignal = domHasZsSignal;
})();

