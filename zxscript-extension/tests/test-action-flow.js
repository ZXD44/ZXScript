// scripts/test_action_flow.js
const fs = require("fs");
const path = require("path");

const elements = {};
function createMockEl(id, tag = "div") {
  const el = {
    id: id || "",
    tagName: tag.toUpperCase(),
    dataset: {},
    classList: {
      _classes: new Set(),
      add: function(...c) { c.forEach(x => this._classes.add(x)); },
      remove: function(...c) { c.forEach(x => this._classes.delete(x)); },
      toggle: function(c, v) { if (v === undefined) v = !this._classes.has(c); if (v) this._classes.add(c); else this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); },
    },
    style: {},
    hidden: false,
    disabled: false,
    textContent: "",
    innerHTML: "",
    addEventListener: (evt, fn) => { el._listeners[evt] = fn; },
    dispatchEvent: () => {},
    closest: () => null,
    _listeners: {},
    contains: () => false,
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 200, height: 40, bottom: 40, right: 200 }),
    querySelector: (sel) => (sel.startsWith("#") ? elements[sel.slice(1)] || null : null),
    querySelectorAll: (sel) => (sel.startsWith("#") && elements[sel.slice(1)] ? [elements[sel.slice(1)]] : []),
  };
  if (id) elements[id] = el;
  return el;
}

[
  "zs-root", "zs-bar", "zs-dot", "zs-brand", "zs-state", "zs-action",
  "zs-stop", "zs-discord", "zs-switch", "zs-support", "zs-switch-name", "zs-menu",
  "prompt-textarea", "chat-input"
].forEach(id => createMockEl(id));

global.window = {
  location: { pathname: "/" },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  setInterval: setInterval,
  clearInterval: clearInterval,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
};
global.location = global.window.location;
global.document = {
  hidden: false,
  visibilityState: "visible",
  documentElement: createMockEl("html"),
  body: createMockEl("body"),
  createElement: (tag) => createMockEl("", tag),
  getElementById: (id) => elements[id] || null,
  querySelector: (sel) => (sel.startsWith("#") ? elements[sel.slice(1)] || null : null),
  querySelectorAll: (sel) => (sel.startsWith("#") && elements[sel.slice(1)] ? [elements[sel.slice(1)]] : []),
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
};

global.CustomEvent = class { constructor(t, d) { this.type = t; this.detail = d; } };
global.MutationObserver = class { observe() {} disconnect() {} };
global.getComputedStyle = () => ({});
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.chrome = {
  runtime: {
    onMessage: { addListener: () => {} },
    getManifest: () => ({ version: "0.0.4" }),
    sendMessage: (msg, cb) => {
      if (msg.type === "reconnect" || msg.type === "status") {
        cb({ connected: true, studio: true, tools: 34 });
      } else if (msg.type === "list_tools" || msg.type === "tools") {
        cb({ ok: true, tools: [{ name: "list_commands", server: "roblox" }] });
      } else {
        cb({});
      }
    },
  },
  storage: {
    local: {
      get: (keys, cb) => cb({}),
      set: (data, cb) => { if (cb) cb(); },
    },
  },
};

console.log("1. Testing script load sequence in manifest order...");
const extDir = path.join(__dirname, "..");

const files = [
  "core/config.js",
  "core/constants.js",
  "core/parser.js",
  "providers/deepseek.js",
  "core/icons.js",
  "core/audio.js",
  "core/camouflage.js",
  "core/ui-modals.js",
  "core/ui-menu.js",
  "core/ui-bar.js",
  "core/tools.js",
  "core/response-watcher.js",
  "core/agent.js",
  "core/main.js",
];

for (const f of files) {
  const code = fs.readFileSync(path.join(extDir, f), "utf8");
  try {
    eval(code);
  } catch (err) {
    console.error(`Failed executing ${f}:`, err);
    process.exit(1);
  }
}

console.log("2. Verifying ZSProvider registered on window:");
const P = window.ZS.getProvider();
if (!P || P.id !== "deepseek") {
  console.error("FAIL: ZSProvider not registered properly:", P);
  process.exit(1);
}
console.log("PASS: ZSProvider is:", P.displayName, `(id: ${P.id})`);

console.log("3. Testing startSession bootstrap call & typeAndSend invocation:");
let typeAndSendCalledWith = null;
P.typeAndSend = async (text, images) => {
  typeAndSendCalledWith = text;
  console.log("Mock typeAndSend called successfully! Prompt bytes:", text.length);
};

const actionBtn = elements["zs-action"];
if (!actionBtn._listeners["click"]) {
  console.error("FAIL: actionBtn has no click listener registered!");
  process.exit(1);
}

// Ensure HUMANIZE_SEND jitter is disabled for fast unit test
window.ZS.HUMANIZE_SEND = false;

window.ZS.diag = (k, v) => console.log("DIAG:", k, v);

(async () => {
  try {
    console.log("Simulating click on #zs-action button...");
    await actionBtn._listeners["click"]();
    console.log("Action button click handled!");
  } catch (err) {
    console.error("Error in actionBtn click:", err);
  }
})();

setTimeout(async () => {
  if (typeAndSendCalledWith && typeAndSendCalledWith.includes("⟦ZS-SYS⟧")) {
    console.log("PASS: Clicking #zs-action successfully called typeAndSend with system prompt!");
    console.log("Prompt preview:\n" + typeAndSendCalledWith.slice(0, 150) + "...\n");
    process.exit(0);
  } else {
    console.error("FAIL: typeAndSend was not called or missing system prompt!", typeAndSendCalledWith);
    process.exit(1);
  }
}, 3500);
