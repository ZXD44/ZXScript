# ZXScript (by ZXD44) - AI Roblox Studio Agent (ChatGPT, DeepSeek, Claude, Gemini, Kimi, Z.ai / GLM, Qwen, Arena, Meta AI)

Control Roblox Studio with AI, for free. ZXScript turns a normal AI chat (ChatGPT, DeepSeek, Claude, Google Gemini, Kimi, Z.ai / GLM, Qwen, Arena, or Meta AI) into an agent that builds and scripts your Roblox game for you: just describe what you want, and it reads/edits scripts, runs Luau, inspects the game tree, and generates assets directly in Roblox Studio. No API key, no terminal, no coding required.

It's a Chrome/Edge browser extension plus a small local bridge that connects the chat to Roblox Studio through the official MCP server. **DeepSeek is the recommended provider.** ChatGPT, Claude, Gemini, Kimi, Z.ai / GLM, Qwen, Arena, and Meta AI also work. On ChatGPT, screenshots and image input are disabled on purpose (its free tier caps files/images on a separate quota from messages, so vision would only work part of the day); ChatGPT also summarises its own context in long sessions, so ZXScript re-states its operating instructions periodically (shown as a "Reminder" chip) to stop it forgetting it can run commands. Gemini and Kimi are fully supported with continuous tool prompt enforcement. On Arena, keep the mode dropdown on **Direct** (ZXScript only supports Direct mode).

## ✨ Latest Features & Enhancements
- 🏝️ **Dynamic Island Morph HUD:** Center-anchored top floating capsule with smooth morphing animation, breathing cyan neon glow, dual-ring radar live pulse, and quick emergency stop button (`■ หยุด`).
- 🛡️ **Smart Error Notification System:** Categorizes errors into Studio, Bridge, AI Model, and Context Limit with 1-click actions, solution badges (`[วิธีแก้]`), collapsible stack trace drawer, and duplicate anti-spam shake.
- ⚡ **ChatGPT Auto-Recovery:** Eliminates empty response dropouts by automatically prompting continuation or triggering native retry.
- 📱 **3x3 App Launcher Popup:** Symmetrical 3x3 grid in the extension popup with brand icons and live active tab tracking across all 9 AI platforms.
- 🔔 **Web Audio Chimes:** Zero-latency synthesized pleasant chime on turn completion and subtle error pings (toggleable in popup).
- 🔄 **Zero-F5 Reconnection:** Automatic connection health recovery that dismisses warning banners as soon as Studio or the Bridge is back online.
- ⚡ **1-Click Prompt Injector:** Send ready-made architecture, Caveman, or ProfileStore prompts into the active chat in 1 click.
- 🇹🇭 **Thai Error Diagnostics:** Friendly localized error messages for `execute_luau` replacing internal `AssistantCommand:XX:` frames with line numbers.

## Setup

**Load the extension manually (Edge or Chrome):**
1. Go to `edge://extensions` (Edge) or `chrome://extensions` (Chrome)
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `zxscript-extension` folder
5. The extension is now active

**Then set up the Bridge:**
1. **Download the Bridge** from the [GitHub releases page](https://github.com/zxd44/ZXScript)
2. **Open Roblox Studio** and load a Place
3. **Enable the MCP server in Roblox Studio** (first time only): click **Assistant AI** in the top bar, then **...** > **Manage MCP Servers** > **Enable Studio as MCP Server**
4. **Run the Bridge** - double-click `start.bat` (Windows) or `MacOS_Start.command` (macOS); a small window opens, the Bridge is running. On macOS, the first launch shows a Gatekeeper warning (normal for any downloaded script): click **Done**, then **System Settings > Privacy & Security**, scroll down, and click **Open Anyway**.
5. **Go to https://chat.deepseek.com** (recommended), https://chatgpt.com, https://gemini.google.com, https://www.kimi.com, https://claude.ai/new, https://z.ai, https://chat.z.ai, https://chat.qwen.ai, https://arena.ai, or https://www.meta.ai, open a new chat (only works on these exact addresses; on Arena use Direct mode)
6. Click **Start session** in the ZXScript panel
7. Type what you want to build

📺 [Watch the setup tutorial](https://youtu.be/kPKiZLZ9_Ps)

## Architecture (for contributors)

The extension is split between a provider-agnostic core and per-AI-site providers:

```
core/config.js        system prompt, feedback strings, tool categories (global ZS)
core/parser.js        ZXScript command parsing - pure string logic   (global ZSParse)
core/main.js          agentic loop, UI, camouflage, session state      (uses ZSProvider)
providers/claude.js   same interface for Claude / claude.ai (React DOM,
                      contenteditable composer, reasoning-content)
providers/deepseek.js everything DeepSeek-specific: DOM selectors, generation
                      detection, send mechanics, composer modes…       (global ZSProvider)
providers/gemini.js   same interface for Google Gemini (Angular DOM, Quill
                      composer, code-block masking)                    (global ZSProvider)
providers/kimi.js     same interface for Kimi / Moonshot AI (Vue DOM, Lexical
                      composer, segment-code masking)                  (global ZSProvider)
providers/glm.js      same interface for GLM / Z.ai (Svelte DOM, code-block
                      wrapper masking)                                 (global ZSProvider)
providers/qwen.js     same interface for Qwen / chat.qwen.ai (Vue DOM, network-tap
                      SSE stream, Monaco disposal guard)               (global ZSProvider)
providers/qwen-net.js MAIN-world fetch tap for Qwen SSE stream        (injected by manifest)
providers/chatgpt.js  same interface for ChatGPT / chatgpt.com (React DOM,
                      ProseMirror composer, CodeMirror reply reading) (global ZSProvider)
providers/chatgpt-cm.js MAIN-world CodeMirror tap: republishes each code block's
                      TRUE document (the rendered DOM truncates long
                      lines)                                          (injected by manifest)
providers/arena.js    same interface for Arena / arena.ai (React DOM, multi-model
                      playground, A/B-comparison auto-commit, Direct-mode gate) (global ZSProvider)
providers/meta.js     same interface for Meta AI / meta.ai (React DOM, textarea
                      composer, JSON-viewer + code-collapse masking)   (global ZSProvider)
background.js         WebSocket to the local bridge (provider-agnostic)
```

`core/main.js` never touches the host site's DOM directly - it only calls the
`ZSProvider` interface. To integrate another AI site: write a new
`providers/<site>.js` exporting the same interface, then add its URL pattern to
`manifest.json` (`content_scripts` + `host_permissions`) and to
`PROVIDER_URLS` in `background.js`. No core change required.

Smoke tests (plain Node, no dependencies - run them from this directory):

- `node test-parser.js` - the command parser (`core/parser.js`).
- `node test-chatgpt.js` - ChatGPT reply reading (`providers/chatgpt.js`),
  driven against a stub DOM: CodeMirror line joining, the `data-zs-cm`
  MAIN-world tap that long code blocks depend on, and subtree exclusion.

Both print `PASS`/`FAIL` per case and exit non-zero on failure.

## Support

☕ [Ko-fi](https://github.com/zxd44/ZXScript) - Robux tip passes available in the extension panel
