// SPDX-License-Identifier: GPL-3.0-or-later
// providers/claude.js - Claude (claude.ai) provider by ZXD44.
// Exports the ZSProvider interface; the core (core/main.js) is provider-agnostic.

// eslint-disable-next-line no-unused-vars
const ZSProvider = (() => {
  "use strict";

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let diag = () => {};

  const S = {
    userItem: '[data-message-author-role="user"], div.font-user-message, div.group:has(div.bg-bg-300)',
    assistantItem: '[data-message-author-role="assistant"], div.font-claude-message, div.standard-markdown',
    anyItem: '[data-message-author-role], div.font-user-message, div.font-claude-message',
    reply: '.standard-markdown, div.font-claude-message, [data-message-author-role="assistant"]',
    thinking: '[data-testid="thinking-content"], [class*="thinking"], div.ant-thinking',
    editor: 'div.ProseMirror[contenteditable="true"], div[contenteditable="true"][data-placeholder], fieldset div[contenteditable="true"], div[data-testid="chat-input"], div[contenteditable="true"]',
    composer: 'fieldset, div:has(> div.ProseMirror), div.relative:has(div[contenteditable="true"])',
    sendBtn: 'button[aria-label="Send Message"], button[aria-label*="Send"], button[data-testid="send-button"], button.bg-accent-main-000',
    stopBtn: 'button[aria-label*="Stop"], button[aria-label*="stop"], button[data-testid="stop-button"]',
    fileInput: 'input[type="file"]',
    codeWrap: 'div.code-block, pre:has(code), div[class*="code-block"]',
    errorSurfaces: '[role="alert"], [class*="toast"], [class*="error"], [class*="alert"]',
  };

  const RE = {
    contextLimit: /conversation.{0,20}(too long|limit|exceeded)|maximum.{0,20}length|context.{0,15}limit/i,
    tooLong: /conversation.{0,20}(too long|getting too long)/i,
    busy: /something went wrong|try again|server is busy|overloaded|capacity/i,
  };

  const timings = {
    GEN_IDLE_MS: 1500,
    REASON_IDLE_MS: 12000,
    WARMUP_MS: 45000,
    REASON_NOREPLY_MS: 90000,
    STABLE_MS: 9000,
    RESPONSE_TIMEOUT_MS: 300000,
  };

  const isUserItem = (item) => !!item && item.matches && item.matches(S.userItem);
  const isAssistantItem = (item) => !!item && item.matches && item.matches(S.assistantItem);

  function textWithout(root, excludeSel) {
    if (!root) return "";
    const skip = S.thinking + ", .zs-chip" + (excludeSel ? ", " + excludeSel : "");
    let t = "";
    const walk = (n) => {
      if (n.nodeType === 3) { t += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      if (n.matches && n.matches(skip)) return;
      for (const c of n.childNodes) walk(c);
    };
    walk(root);
    return t;
  }

  const itemText = (item) => textWithout(item);
  const classifyText = (item, excludeSel) => textWithout(item, excludeSel);

  const allItems = () => [...document.querySelectorAll(S.anyItem)];
  const assistantItems = () => [...document.querySelectorAll(S.assistantItem)];
  const assistantCount = () => assistantItems().length;
  const userCount = () => document.querySelectorAll(S.userItem).length;

  const getEditor = () => {
    for (const sel of [S.editor, "div.ProseMirror", "div[contenteditable='true']"]) {
      for (const e of document.querySelectorAll(sel)) {
        if (!e.closest("#zs-root")) return e;
      }
    }
    return null;
  };

  const editorText = () => {
    const e = getEditor();
    if (!e) return "";
    return e.textContent || e.innerText || "";
  };

  const lastAssistant = () => {
    const it = assistantItems();
    return it.length ? it[it.length - 1] : null;
  };

  function lastAssistantId() {
    const it = lastAssistant();
    if (!it) return null;
    return it.getAttribute("data-message-id") || it.getAttribute("id") || null;
  }

  function readAssistant() {
    const item = lastAssistant();
    if (!item) return { present: false, reply: "", thinking: "", item: null };
    const think = item.querySelector(S.thinking);
    return {
      present: true,
      reply: textWithout(item).trim(),
      thinking: think ? (think.textContent || "").trim() : "",
      item,
    };
  }

  function streamLen(item) {
    try {
      const it = item || lastAssistant();
      if (!it) return { th: 0, rp: 0 };
      const think = it.querySelector(S.thinking);
      return {
        th: think ? (think.textContent || "").length : 0,
        rp: textWithout(it).length,
      };
    } catch {
      return {};
    }
  }

  function snapshot(item) {
    const it = item || lastAssistant();
    return {
      text: it ? itemText(it) : "",
      id: lastAssistantId(),
    };
  }

  const isFreshChat = () => {
    const p = location.pathname;
    return p === "/new" || p === "/" || p === "/chats";
  };

  const chatIsEmpty = () => allItems().length === 0;

  function composerFrame() {
    const ed = getEditor();
    return ed ? (ed.closest(S.composer) || ed.closest("fieldset") || ed.parentElement) : null;
  }

  function barMount() {
    const frm = composerFrame();
    if (!frm || !frm.parentElement) return null;
    return { parent: frm.parentElement, before: frm, inside: false };
  }

  let _locked = false;
  function setInputLock(on) {
    _locked = on;
    const ed = getEditor();
    if (!ed) return;
    ed.setAttribute("contenteditable", on ? "false" : "true");
    if (on) ed.setAttribute("data-zs-locked", "1");
    else ed.removeAttribute("data-zs-locked");
  }

  async function setEditorText(ed, text) {
    if (!ed) ed = getEditor();
    if (!ed) return;
    ed.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(ed);
    sel.removeAllRanges();
    sel.addRange(range);

    const lines = String(text).split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]) document.execCommand("insertText", false, lines[i]);
      if (i < lines.length - 1) document.execCommand("insertLineBreak");
    }
    ed.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function sendButton() {
    for (const sel of [S.sendBtn, 'button[aria-label*="Send"]', 'button[data-testid="send-button"]']) {
      const b = document.querySelector(sel);
      if (b && !b.disabled && b.getAttribute("aria-disabled") !== "true") return b;
    }
    return null;
  }

  function stopButton() {
    for (const sel of [S.stopBtn, 'button[aria-label*="Stop"]', 'button[data-testid="stop-button"]']) {
      const b = document.querySelector(sel);
      if (b && b.offsetParent !== null) return b;
    }
    return null;
  }

  function isGenerating() {
    if (stopButton()) return true;
    if (document.querySelector('[data-is-streaming="true"]')) return true;
    return false;
  }

  function isBusyNow() {
    return isGenerating();
  }

  function isHardGenerating() {
    return isGenerating();
  }

  function stopGeneration() {
    const b = stopButton();
    if (b) try { b.click(); } catch {}
  }

  function enforceComposer() {
    return { ready: true };
  }

  async function ensureComposerReady(reason) {
    diag("claude.ensureComposerReady", { reason });
    return { ready: !!getEditor() };
  }

  function scanError() {
    for (const el of document.querySelectorAll(S.errorSurfaces)) {
      if (el.offsetParent === null) continue;
      const t = (el.innerText || "").trim();
      if (t.length > 8 && t.length < 500 && RE.contextLimit.test(t)) return t.slice(0, 240);
    }
    return null;
  }

  const isTooLongMsg = (t) => RE.tooLong.test(t);
  const isBusyMsg = (t) => RE.busy.test(t);

  async function attachImages(images) {
    if (!images || !images.length) return false;
    try {
      const fi = document.querySelector(S.fileInput);
      if (fi) {
        const dt = new DataTransfer();
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const b64 = img.data || img.base64 || img;
          const mime = img.mime_type || "image/png";
          const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
          const bin = atob(b64);
          const u8 = new Uint8Array(bin.length);
          for (let j = 0; j < bin.length; j++) u8[j] = bin.charCodeAt(j);
          const file = new File([u8], `image_${i}.${ext}`, { type: mime });
          dt.items.add(file);
        }
        fi.files = dt.files;
        fi.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    } catch (e) {
      diag("claude.attachImages.err", { err: String(e) });
    }
    return false;
  }

  function clearAttachments() {}

  function conversationKey() {
    return location.pathname;
  }

  function installSendHooks(handlers) {
    if (!handlers) return;
    const isFn = typeof handlers === "function";

    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
        const ed = getEditor();
        if (!ed || (e.target !== ed && !ed.contains(e.target))) return;
        if (editorText().trim() === "") return;

        if (isFn) {
          handlers();
          return;
        }
        if (handlers.isBlocked && handlers.isBlocked()) return;
        if (handlers.isStarted && !handlers.isStarted()) {
          if (!chatIsEmpty()) return;
          if (handlers.onBlockedAttempt) handlers.onBlockedAttempt();
          return;
        }
        if (handlers.onUserMessage) handlers.onUserMessage(assistantCount());
      },
      true
    );

    document.addEventListener(
      "click",
      (e) => {
        if (!getEditor()) return;
        const t = e.target;
        const stop = t && t.closest && t.closest(S.stopBtn);
        if (stop) {
          if (!isFn && handlers.onNativeStop) handlers.onNativeStop();
          return;
        }
        const btn = t && t.closest && t.closest(S.sendBtn);
        if (!btn) return;
        if (isFn) {
          handlers();
          return;
        }
        if (handlers.isBlocked && handlers.isBlocked()) return;
        if (handlers.isStarted && !handlers.isStarted()) {
          if (!chatIsEmpty()) return;
          if (handlers.onBlockedAttempt) handlers.onBlockedAttempt();
          return;
        }
        if (handlers.onUserMessage) handlers.onUserMessage(assistantCount());
      },
      true
    );
  }

  const CMD_SHAPE = /"(?:command|tool)"\s*:\s*"|###\s*(?:lua|mcp_tool)###/i;

  function findToolBlockSpot(item /*, chip */) {
    if (!item) return null;
    const replies = [...item.querySelectorAll(S.reply || ".standard-markdown, .font-claude-message")].filter(
      (m) => !m.closest(S.thinking)
    );
    let hidAny = null;
    for (const mc of replies) {
      mc.querySelectorAll(S.codeWrap).forEach((cb) => {
        if (cb.closest(".zs-chip")) return;
        if (CMD_SHAPE.test(cb.textContent || "")) {
          cb.classList.add("zs-tool-hide");
          mc.classList.add("zs-cmd-mask");
          hidAny = hidAny || { parent: cb.parentElement, ref: cb };
        }
      });
      [...mc.children].forEach((el) => {
        if (el.classList.contains("zs-chip") || el.querySelector(S.codeWrap)) return;
        const t = el.textContent || "";
        if (t.length < 600 && CMD_SHAPE.test(t)) {
          el.classList.add("zs-tool-hide");
          hidAny = hidAny || { parent: el.parentElement, ref: el };
        }
      });
    }
    return hidAny;
  }

  const turnHalted = (item) => false;
  const findContinueBtn = () => null;
  const clickContinueBtn = () => false;

  async function typeAndSend(text, images) {
    const ed = getEditor();
    if (!ed) throw new Error("Claude input box not found");
    const wasLocked = _locked;
    if (wasLocked) ed.setAttribute("contenteditable", "true");

    try {
      await setEditorText(ed, text);
      if (images && images.length) {
        await attachImages(images);
        await sleep(500);
      }

      // Wait for send button to be ready
      const t0 = Date.now();
      while (Date.now() - t0 < 8000) {
        const btn = sendButton();
        if (btn) {
          btn.click();
          break;
        }
        await sleep(150);
      }

      // Fallback: dispatch Enter key
      if (editorText().trim() !== "") {
        const o = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
        ed.dispatchEvent(new KeyboardEvent("keydown", o));
        ed.dispatchEvent(new KeyboardEvent("keyup", o));
      }
    } finally {
      if (wasLocked) ed.setAttribute("contenteditable", "false");
    }
  }

  return {
    id: "claude",
    displayName: "Claude",
    supportsVision: true,
    chipAtItemLevel: true,
    timings,
    init({ diag: d } = {}) { if (d) diag = d; },
    allItems, isUserItem, isAssistantItem, itemText, classifyText,
    assistantCount, userCount, lastAssistant, lastAssistantId, readAssistant,
    streamLen, snapshot,
    getEditor, editorText, chatIsEmpty, isFreshChat, composerFrame, barMount,
    setInputLock, typeAndSend, setEditorText, stopGeneration,
    isGenerating, isBusyNow, isHardGenerating,
    enforceComposer, ensureComposerReady,
    scanError, isTooLongMsg, isBusyMsg,
    attachImages, clearAttachments, conversationKey,
    installSendHooks, findToolBlockSpot,
    turnHalted, findContinueBtn, clickContinueBtn,
  };
})();
