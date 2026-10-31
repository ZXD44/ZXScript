// Quick Node smoke test for providers/claude.js (run: node test-claude.js).
// Not shipped.

const fs = require("fs");

// ── Minimal Stub DOM ─────────────────────────────────────────────────────────
function txt(v) {
  return { nodeType: 3, nodeValue: v, childNodes: [] };
}

function matchesSelector(node, fullSel) {
  if (node.nodeType !== 1) return false;
  const parts = fullSel.split(",").map((s) => s.trim());
  for (const part of parts) {
    if (!part) continue;
    // Strip simple combinators or :has pseudo-selectors if not relevant
    let s = part;
    if (s.includes(":has(")) continue; // ignore complex :has in stub

    let ok = true;
    const attrs = node.attributes || {};

    // 1. Match attributes [attr=val]
    const attrRegex = /\[([a-zA-Z0-9_-]+)(?:([*~^$]?=)"?([^"\]]*)"?)?\]/g;
    let m;
    while ((m = attrRegex.exec(s)) !== null) {
      const [, attr, op, val] = m;
      if (!(attr in attrs)) { ok = false; break; }
      if (op === "=" && attrs[attr] !== val) { ok = false; break; }
      if (op === "*=" && !attrs[attr].includes(val)) { ok = false; break; }
    }
    if (!ok) continue;
    s = s.replace(attrRegex, "");

    // 2. Match classes .cls
    const classRegex = /\.([a-zA-Z0-9_-]+)/g;
    while ((m = classRegex.exec(s)) !== null) {
      const cls = m[1];
      if (!node.classList.contains(cls)) { ok = false; break; }
    }
    if (!ok) continue;
    s = s.replace(classRegex, "");

    // 3. Match tag name
    s = s.trim();
    if (s && s !== "*" && s.toLowerCase() !== node.tagName.toLowerCase()) {
      ok = false;
      continue;
    }

    if (ok) return true;
  }
  return false;
}

function el(tag, opts, children) {
  const o = opts || {};
  const classes = (o.class || "").split(/\s+/).filter(Boolean);
  const attrs = { ...(o.attrs || {}) };
  if (o.class) attrs["class"] = o.class;
  if (o.id) attrs["id"] = o.id;

  const node = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    id: o.id || "",
    attributes: attrs,
    childNodes: (children || []).map((c) => (typeof c === "string" ? txt(c) : c)),
    classList: {
      contains: (c) => classes.includes(c),
      add: (c) => { if (!classes.includes(c)) classes.push(c); },
      remove: (c) => { const idx = classes.indexOf(c); if (idx >= 0) classes.splice(idx, 1); },
    },
    getAttribute: (n) => (n in attrs ? attrs[n] : null),
    setAttribute: (n, v) => { attrs[n] = String(v); },
    removeAttribute: (n) => { delete attrs[n]; },
    closest: (sel) => (matchesSelector(node, sel) ? node : null),
    dispatchEvent: () => true,
    focus: () => {},
    offsetParent: {}, // truthy so not hidden
    get textContent() {
      let s = "";
      const walk = (n) => {
        if (n.nodeType === 3) s += n.nodeValue;
        if (n.nodeType === 1) { for (const c of n.childNodes) walk(c); }
      };
      walk(node);
      return s;
    },
    get innerText() {
      return node.textContent;
    },
  };

  node.matches = (sel) => matchesSelector(node, sel);

  node.querySelector = (sel) => {
    const hit = (n) => {
      if (n.nodeType !== 1) return null;
      if (matchesSelector(n, sel)) return n;
      for (const c of n.childNodes) {
        const r = hit(c);
        if (r) return r;
      }
      return null;
    };
    for (const c of node.childNodes) {
      const r = hit(c);
      if (r) return r;
    }
    return null;
  };

  node.querySelectorAll = (sel) => {
    const res = [];
    const collect = (n) => {
      if (n.nodeType !== 1) return;
      if (matchesSelector(n, sel)) res.push(n);
      for (const c of n.childNodes) collect(c);
    };
    for (const c of node.childNodes) collect(c);
    return res;
  };

  return node;
}

// ── Global environment stub ──────────────────────────────────────────────────
let rootElements = [];

global.document = {
  querySelector: (sel) => {
    for (const root of rootElements) {
      if (matchesSelector(root, sel)) return root;
      const found = root.querySelector(sel);
      if (found) return found;
    }
    return null;
  },
  querySelectorAll: (sel) => {
    let list = [];
    for (const root of rootElements) {
      if (matchesSelector(root, sel)) list.push(root);
      list = list.concat(root.querySelectorAll(sel));
    }
    return list;
  },
  addEventListener: () => {},
  dispatchEvent: () => true,
  documentElement: el("html", {}, []),
  body: el("body", {}, []),
};

global.window = {
  location: { pathname: "/" },
  addEventListener: () => {},
  getSelection: () => ({ removeAllRanges: () => {}, addRange: () => {} }),
};
global.location = global.window.location;
global.CustomEvent = class { constructor(t) { this.type = t; } };
global.Event = class { constructor(t) { this.type = t; } };
global.KeyboardEvent = class { constructor(t) { this.type = t; } };
global.MutationObserver = class { observe() {} disconnect() {} };
global.getComputedStyle = () => ({});

// ── Load Claude Provider ────────────────────────────────────────────────────
const P = new Function(
  fs.readFileSync(__dirname + "/../providers/claude.js", "utf8") + "; return ZSProvider;"
)();

const ok = (name, cond) => {
  console.log((cond ? "PASS" : "FAIL") + "  " + name);
  if (!cond) process.exitCode = 1;
};

// ── Tests ───────────────────────────────────────────────────────────────────

// 1. Identity & Config
ok("provider id is claude", P.id === "claude");
ok("provider displayName is Claude", P.displayName === "Claude");
ok("supportsVision is true", P.supportsVision === true);

// 2. Role detection (user vs assistant)
const userMsg = el("div", { attrs: { "data-message-author-role": "user" } }, ["Hello Claude"]);
const claudeMsg = el("div", { attrs: { "data-message-author-role": "assistant" } }, ["Hello human"]);
const altClaudeMsg = el("div", { class: "font-claude-message" }, ["Another assistant reply"]);

ok("identifies user message correctly", P.isUserItem(userMsg) && !P.isAssistantItem(userMsg));
ok("identifies assistant message correctly", P.isAssistantItem(claudeMsg) && !P.isUserItem(claudeMsg));
ok("identifies font-claude-message as assistant", P.isAssistantItem(altClaudeMsg));

// 3. Thinking Separation & textWithout
const thinkingContent = el("div", { attrs: { "data-testid": "thinking-content" } }, ["Thinking about Luau code..."]);
const replyBody = el("div", { class: "prose" }, [
  "Here is the code:\n",
  el("pre", {}, [el("code", {}, ["###LUA###\nprint('hello')\n###END_LUA###"])]),
]);

const complexAssistant = el("div", { attrs: { "data-message-author-role": "assistant" } }, [
  thinkingContent,
  replyBody,
]);

rootElements = [userMsg, complexAssistant];

const parsed = P.readAssistant();
ok("readAssistant finds assistant response", parsed.present === true);
ok("readAssistant extracts thinking block", parsed.thinking.includes("Thinking about Luau"));
ok("readAssistant reply excludes thinking block", !parsed.reply.includes("Thinking about Luau"));
ok("readAssistant reply contains luau code", parsed.reply.includes("###LUA###\nprint('hello')\n###END_LUA###"));

// 4. Editor extraction
const editor = el("div", {
  class: "ProseMirror",
  attrs: { contenteditable: "true" }
}, ["Test editor content"]);

rootElements.push(editor);
ok("getEditor finds ProseMirror editor", P.getEditor() === editor);
ok("editorText extracts text properly", P.editorText() === "Test editor content");

// 5. Generating state
const stopBtn = el("button", { attrs: { "data-testid": "stop-button" } }, ["Stop"]);
ok("isGenerating false before stop button added", P.isGenerating() === false);

rootElements.push(stopBtn);
ok("isGenerating true when stop button is present", P.isGenerating() === true);

// Remove stop button
rootElements = rootElements.filter((x) => x !== stopBtn);
ok("isGenerating returns to false after stop button removed", P.isGenerating() === false);

// 6. Error & Limit detection
ok("isTooLongMsg detects context length warning", P.isTooLongMsg("Your conversation is getting too long. Please start a new one."));
ok("isTooLongMsg ignores normal response", !P.isTooLongMsg("Here is the script you requested."));
ok("isBusyMsg detects server capacity", P.isBusyMsg("Claude is currently at capacity. Please try again soon."));
ok("isBusyMsg ignores normal response", !P.isBusyMsg("Workspace updated."));

console.log("\nClaude provider tests complete.");
