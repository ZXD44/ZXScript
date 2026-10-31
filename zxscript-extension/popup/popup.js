// SPDX-License-Identifier: GPL-3.0-or-later
const DOTS = '<span class="zs-dots"><span>.</span><span>.</span><span>.</span></span>';
const RULES_PRESET = "ROBLOX AI RULES: 1) สำรวจ Explorer ก่อนทำเสมอ ห้ามเดา Path 2) จำกัดไม่เกิน 3-5 tool calls ต่อรอบแล้วหยุดรอคำสั่ง 3) ใช้ Modern Luau เท่านั้น (task.wait, task.spawn, WaitForChild 5s timeout) 4) execute_luau ผ่าน ###LUA### เท่านั้น 5) บันทึก architecture ลง game.ServerStorage.ZXScript.Memory";
const CAVEMAN_PRESET = "CAVEMAN MODE: ตอบภาษาไทยสั้นกระชับ ตรงประเด็น ห้ามเยิ่นเย้อ ห้ามทักทาย สั่งรันคำสั่ง Roblox Studio MCP ทันที ประหยัด token สูงสุด";

const DEFAULT_TOOLS = [
  { name: "execute_luau", desc: "รันโค้ด Luau บน Roblox Studio (Edit, Server, Client)" },
  { name: "multi_edit", desc: "สร้างหรือแก้ไข Source Code ของ Script ในโปรเจกต์" },
  { name: "script_read", desc: "อ่าน Source code ของ Script หรือ LocalScript" },
  { name: "script_search", desc: "ค้นหาข้อความหรือฟังก์ชันภายในสคริปต์ทั้งหมด" },
  { name: "script_grep", desc: "ค้นหาข้อความด้วย Regex ในสคริปต์" },
  { name: "search_game_tree", desc: "ค้นหา Instance ใน Explorer Tree ตามชื่อหรือ ClassName" },
  { name: "inspect_instance", desc: "ดู Properties และ Children ของ Instance อย่างละเอียด" },
  { name: "get_studio_state", desc: "ตรวจสอบสถานะ Roblox Studio (Edit หรือ Play mode)" },
  { name: "get_console_output", desc: "ดึง Error และ Output จาก Console ใน Studio" },
  { name: "screen_capture", desc: "ถ่ายภาพหน้าจอ Viewport ใน Roblox Studio" },
  { name: "insert_from_creator_store", desc: "นำเข้า Model หรือ Asset จาก Creator Store" },
  { name: "search_creator_store", desc: "ค้นหา Asset ใน Roblox Creator Store" },
  { name: "store_image", desc: "บันทึกรูปภาพ Texture หรือ Decal" },
  { name: "list_roblox_studios", desc: "แสดงรายชื่อหน้าต่าง Studio ที่เปิดอยู่" },
  { name: "list_commands", desc: "แสดงคำสั่ง MCP ทั้งหมดพร้อมเอกสารประกอบ" }
];

document.getElementById("ver").textContent = `v${chrome.runtime.getManifest().version}`;

let toolsList = [...DEFAULT_TOOLS];

function showToast(text, isError = false) {
  const el = document.getElementById("toast-msg");
  el.textContent = text;
  el.style.color = isError ? "#f87171" : "#10b981";
  setTimeout(() => {
    if (el.textContent === text) el.textContent = "";
  }, 2000);
}

// ── Screen Rendering ────────────────────────────────────────────────────────
function render(s) {
  const dot = document.getElementById("screen-dot");
  const state = document.getElementById("screen-state");
  const valBridge = document.getElementById("val-bridge");
  const valStudio = document.getElementById("val-studio");
  const valTools = document.getElementById("val-tools");

  const runBtn = document.getElementById("btn-run-bridge");
  const onlineActions = document.getElementById("online-actions");

  const bridgeConnected = !!(s && s.connected);
  const totalTools = (s && s.tools) || 0;
  const studioReady = bridgeConnected && (s.studio === true || totalTools > 0);
  const studioProcRunning = !!(s && s.studioProc);

  dot.className = "dot " + (bridgeConnected ? (studioReady ? "on" : "warn") : "");

  if (!bridgeConnected) {
    state.textContent = "ออฟไลน์ (ยังไม่ได้เชื่อมต่อ Bridge)";
    valBridge.textContent = "ออฟไลน์";
    valBridge.style.color = "#71717a";
    valStudio.textContent = "รอเชื่อมต่อ Bridge";
    valStudio.style.color = "#71717a";
    valTools.textContent = "0 รายการ";
  } else if (!studioReady) {
    state.innerHTML = studioProcRunning
      ? `Bridge ออนไลน์ — รอเปิดแมพใน Studio${DOTS}`
      : `Bridge ออนไลน์ — ยังไม่ได้เปิด Roblox Studio${DOTS}`;
    valBridge.textContent = "ออนไลน์ (127.0.0.1:17613)";
    valBridge.style.color = "#10b981";
    valStudio.textContent = studioProcRunning ? "รอเปิด Place ใน Studio" : "ยังไม่เปิด Studio";
    valStudio.style.color = "#f59e0b";
    valTools.textContent = totalTools > 0 ? `${totalTools} รายการ` : "0 รายการ (รอ Studio)";
  } else {
    state.textContent = `เชื่อมต่อสำเร็จ — Roblox Studio พร้อมทำงาน (${totalTools} คำสั่ง)`;
    valBridge.textContent = "ออนไลน์ (127.0.0.1:17613)";
    valBridge.style.color = "#10b981";
    valStudio.textContent = "พร้อมทำงาน";
    valStudio.style.color = "#10b981";
    valTools.textContent = `${totalTools} รายการ`;
  }

  if (bridgeConnected) {
    runBtn.style.display = "none";
    onlineActions.style.display = "flex";
  } else {
    runBtn.style.display = "flex";
    onlineActions.style.display = "none";
  }
}

function refresh() {
  chrome.runtime.sendMessage({ type: "status" }, (s) => s && render(s));
  chrome.runtime.sendMessage({ type: "native_status" }, (res) => {
    if (res && typeof res.autostart === "boolean") {
      document.getElementById("chk-autostart").checked = res.autostart;
      const valAuto = document.getElementById("val-autostart");
      valAuto.textContent = res.autostart ? "เปิดใช้งาน" : "ปิดอยู่";
      valAuto.style.color = res.autostart ? "#10b981" : "#71717a";
    }
  });
}

// ── Bridge Launch Modal with Live Logs ──────────────────────────────────────
const popupModal = document.getElementById("zs-popup-modal");
const modalLogBox = document.getElementById("zs-modal-log");
const modalStartBtn = document.getElementById("zs-modal-start-btn");
const modalCloseBtn = document.getElementById("zs-modal-close-btn");
const modalCancelBtn = document.getElementById("zs-modal-cancel-btn");
const modalCopyBtn = document.getElementById("zs-modal-copy-btn");
const modalProgFill = document.getElementById("zs-modal-prog-fill");
const modalProgPct = document.getElementById("zs-modal-prog-pct");
const modalProgLabel = document.getElementById("zs-modal-prog-label");
const modalStepBridge = document.getElementById("step-bridge");
const modalStepStudio = document.getElementById("step-studio");
const modalStepTools = document.getElementById("step-tools");
let modalLogTimer = null;

function setModalStepState(el, state) {
  if (!el) return;
  el.classList.remove("done", "active", "warn", "err");
  if (state) el.classList.add(state);
}

function updateModalProgress(pct, label, tone, steps = {}) {
  if (typeof pct === "number") {
    if (modalProgPct) modalProgPct.textContent = `${Math.round(pct)}%`;
    if (modalProgFill) modalProgFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  } else if (modalProgPct) {
    modalProgPct.textContent = String(pct);
  }
  if (label && modalProgLabel) modalProgLabel.textContent = label;
  if (modalProgFill) {
    modalProgFill.classList.remove("ok", "warn", "err");
    if (tone) modalProgFill.classList.add(tone);
  }
  if (steps.bridge) setModalStepState(modalStepBridge, steps.bridge);
  if (steps.studio) setModalStepState(modalStepStudio, steps.studio);
  if (steps.tools) setModalStepState(modalStepTools, steps.tools);
}

if (modalCopyBtn) {
  modalCopyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText("start.bat").then(() => {
      modalCopyBtn.textContent = "✓ คัดลอกแล้ว";
      showToast("คัดลอก start.bat แล้ว");
      addModalLog("คัดลอกคำสั่ง start.bat ไปยัง Clipboard แล้ว", "log-info");
      setTimeout(() => {
        if (modalCopyBtn) modalCopyBtn.textContent = "คัดลอกคำสั่ง";
      }, 2000);
    }).catch(() => {
      modalCopyBtn.textContent = "คัดลอกไม่สำเร็จ";
    });
  });
}

function showPopupModal() {
  if (popupModal) {
    popupModal.style.display = "flex";
    if (modalLogBox) {
      modalLogBox.style.display = "none";
      modalLogBox.innerHTML = "";
    }
    if (modalStartBtn) {
      modalStartBtn.disabled = false;
      modalStartBtn.textContent = "เปิดการเชื่อมต่อ";
    }
    if (modalLogTimer) {
      clearInterval(modalLogTimer);
      modalLogTimer = null;
    }

    // Inspect live state immediately upon open
    try {
      chrome.runtime.sendMessage({ type: "status" }, (st) => {
        if (st && st.connected) {
          const hasTools = st.tools && st.tools > 0;
          const studioReady = st.studio === true || hasTools;
          if (studioReady) {
            updateModalProgress(100, `เชื่อมต่อสำเร็จ (${st.tools || 0} คำสั่งพร้อมใช้งาน)`, "ok", {
              bridge: "done",
              studio: "done",
              tools: "done",
            });
            if (modalStartBtn) modalStartBtn.textContent = "เชื่อมต่อแล้ว (100%)";
          } else {
            updateModalProgress(75, st.studioProc ? "Bridge ออนไลน์ · รอเปิดแมพใน Studio" : "Bridge ออนไลน์ · รอเปิด Studio", "warn", {
              bridge: "done",
              studio: st.studioProc ? "done" : "active",
              tools: "",
            });
            if (modalStartBtn) modalStartBtn.textContent = "Bridge พร้อม (รอเปิด Studio)";
          }
        } else {
          updateModalProgress(0, "พร้อมเชื่อมต่อ (พอร์ต 17613)", "", {
            bridge: "",
            studio: "",
            tools: "",
          });
        }
      });
    } catch {}
  }
}

function hidePopupModal() {
  if (popupModal) popupModal.style.display = "none";
  if (modalLogTimer) {
    clearInterval(modalLogTimer);
    modalLogTimer = null;
  }
}

function addModalLog(text, cls) {
  if (!modalLogBox) return;
  modalLogBox.style.display = "";
  const line = document.createElement("div");
  if (cls) line.className = cls;
  const ts = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  line.textContent = `[${ts}] ${text}`;
  modalLogBox.appendChild(line);
  modalLogBox.scrollTop = modalLogBox.scrollHeight;
}

if (modalCloseBtn) modalCloseBtn.addEventListener("click", hidePopupModal);
if (modalCancelBtn) modalCancelBtn.addEventListener("click", hidePopupModal);
if (popupModal) {
  popupModal.addEventListener("click", (e) => {
    if (e.target === popupModal) hidePopupModal();
  });
}

function startBridgePolling(onDone) {
  let polls = 0;
  const maxPolls = 25;
  if (modalLogTimer) clearInterval(modalLogTimer);

  modalLogTimer = setInterval(() => {
    polls++;
    chrome.runtime.sendMessage({ type: "status" }, (s) => {
      if (!s || !s.connected) {
        const pct = Math.min(15 + Math.round((polls / maxPolls) * 35), 50);
        updateModalProgress(pct, `กำลังรอพอร์ต 17613 ตอบสนอง... (${polls}/${maxPolls})`, "", {
          bridge: "active",
          studio: "",
          tools: "",
        });
      } else {
        const hasTools = s.tools && s.tools > 0;
        const studioReady = s.studio === true || hasTools;

        if (studioReady) {
          // REAL 100% verified!
          clearInterval(modalLogTimer);
          modalLogTimer = null;
          const count = s.tools || 0;
          updateModalProgress(100, `เชื่อมต่อ Studio สำเร็จ (${count} คำสั่งพร้อมใช้งาน)`, "ok", {
            bridge: "done",
            studio: "done",
            tools: "done",
          });
          addModalLog(`✓ เชื่อมต่อ Roblox Studio สำเร็จ (${count} คำสั่งพร้อมใช้งาน)`, "log-ok");
          if (modalStartBtn) {
            modalStartBtn.disabled = false;
            modalStartBtn.textContent = "เชื่อมต่อแล้ว";
          }
          showToast("เชื่อมต่อเรียบร้อยแล้ว");
          setTimeout(() => {
            hidePopupModal();
            refresh();
            if (onDone) onDone();
          }, 1100);
          return;
        } else {
          updateModalProgress(75, s.studioProc ? "Bridge ออนไลน์แล้ว · รอเปิดแมพใน Studio" : "Bridge ออนไลน์แล้ว · รอเปิด Roblox Studio", "warn", {
            bridge: "done",
            studio: s.studioProc ? "done" : "active",
            tools: "",
          });
          if (polls === 1 || polls % 4 === 0) {
            addModalLog("✓ Bridge ออนไลน์แล้ว (127.0.0.1:17613)", "log-ok");
            if (s.studioProc) {
              addModalLog("• ตรวจพบโปรเซส Studio แต่ยังไม่พบแมพที่เปิด (กรุณาเปิด Place)", "log-info");
            } else {
              addModalLog("• กำลังรอเปิดโปรแกรม Roblox Studio...", "log-info");
            }
          }
          if (polls >= 10 && modalStartBtn) {
            modalStartBtn.disabled = false;
            modalStartBtn.textContent = "Bridge พร้อม (รอเปิด Studio)";
          }
        }
      }
    });

    if (polls >= maxPolls) {
      clearInterval(modalLogTimer);
      modalLogTimer = null;
      chrome.runtime.sendMessage({ type: "status" }, (s) => {
        if (!s || !s.connected) {
          updateModalProgress(0, "คุณต้องเปิด start.bat ก่อนสิ (ไม่พบเซิร์ฟเวอร์)", "err", {
            bridge: "err",
            studio: "",
            tools: "",
          });
          addModalLog("✕ คุณต้องเปิด start.bat ก่อนสิ! ยังไม่มีเซิร์ฟเวอร์ที่ 127.0.0.1:17613", "log-err");
          addModalLog("• ดับเบิลคลิกเปิดไฟล์ start.bat ในโฟลเดอร์โปรเจกต์ หรือกด 'เปิดการเชื่อมต่อ'", "log-info");
          if (modalStartBtn) {
            modalStartBtn.disabled = false;
            modalStartBtn.textContent = "ลองอีกครั้ง";
          }
        } else if (modalStartBtn) {
          modalStartBtn.disabled = false;
          modalStartBtn.textContent = "Bridge พร้อม (รอเปิด Studio)";
        }
      });
    }
  }, 1000);
}

if (modalStartBtn) {
  modalStartBtn.addEventListener("click", () => {
    modalStartBtn.disabled = true;
    modalStartBtn.textContent = "กำลังตรวจสอบ...";

    // 1. Check if already connected
    chrome.runtime.sendMessage({ type: "status" }, (st) => {
      if (st && st.connected) {
        const hasTools = st.tools && st.tools > 0;
        if (st.studio === true || hasTools) {
          updateModalProgress(100, `เชื่อมต่ออยู่แล้ว (${st.tools || 0} คำสั่งพร้อมใช้งาน)`, "ok", {
            bridge: "done",
            studio: "done",
            tools: "done",
          });
          addModalLog(`✓ ระบบเชื่อมต่อและ Roblox Studio พร้อมใช้งานอยู่แล้ว (${st.tools || 0} คำสั่ง)`, "log-ok");
          modalStartBtn.disabled = false;
          modalStartBtn.textContent = "เชื่อมต่อแล้ว";
          setTimeout(() => { hidePopupModal(); refresh(); }, 800);
          return;
        }
      }

      updateModalProgress(15, "กำลังเริ่มระบบเชื่อมต่อ (Headless)...", "", { bridge: "active" });
      addModalLog("กำลังส่งคำสั่งเชื่อมต่อในเบื้องหลัง...", "log-info");
      chrome.runtime.sendMessage({ type: "native_start" }, (resp) => {
        if (resp && resp.ok) {
          addModalLog("ระบบเชื่อมต่อเริ่มทำงานแล้ว (PID: " + (resp.pid || "Headless") + ")", "log-ok");
          startBridgePolling();
        } else {
          const err = (resp && resp.error) || "Native host did not respond";
          addModalLog("Host: " + err, "log-err");
          // Fallback to Protocol Handler immediately
          addModalLog("กำลังสลับไปเปิดผ่าน Windows Protocol (zxscript://)...", "log-info");
          const link = document.createElement("a");
          link.href = "zxscript://start";
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          setTimeout(() => link.remove(), 1000);
          addModalLog("หากเบราว์เซอร์แจ้งเตือน ให้กดยืนยันเพื่อเริ่มการเชื่อมต่อ", "log-ok");
          startBridgePolling();
        }
      });
    });
  });
}

// ── Runner Controls ─────────────────────────────────────────────────────────
document.getElementById("btn-run-bridge").addEventListener("click", () => {
  showPopupModal();
});

document.getElementById("btn-stop-bridge").addEventListener("click", () => {
  const btn = document.getElementById("btn-stop-bridge");
  const origHtml = btn.innerHTML;
  btn.innerHTML = `กำลังหยุด...`;
  btn.disabled = true;
  chrome.runtime.sendMessage({ type: "native_stop" }, () => {
    showToast("หยุดการทำงานเรียบร้อย");
    setTimeout(() => {
      btn.innerHTML = origHtml;
      btn.disabled = false;
      refresh();
    }, 500);
  });
});

document.getElementById("btn-restart-bridge").addEventListener("click", () => {
  const state = document.getElementById("screen-state");
  state.innerHTML = `กำลังรีสตาร์ตเซิร์ฟเวอร์${DOTS}`;
  chrome.runtime.sendMessage({ type: "restart_mcp" }, () => {
    showToast("รีสตาร์ตเสร็จสิ้น");
    setTimeout(refresh, 800);
  });
});

document.getElementById("btn-refresh-state").addEventListener("click", () => {
  refresh();
  showToast("อัปเดตสถานะแล้ว");
});

document.getElementById("chk-autostart").addEventListener("change", (e) => {
  const enable = e.target.checked;
  chrome.runtime.sendMessage({ type: "native_autostart", enable }, (res) => {
    if (res && res.ok) {
      showToast(enable ? "เปิดการทำงานเมื่อเปิดเครื่องแล้ว" : "ปิดการทำงานอัตโนมัติแล้ว");
      refresh();
    }
  });
});

// ── Segmented Navigation ────────────────────────────────────────────────────
document.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".seg-pane").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const pane = document.getElementById(btn.dataset.pane);
    if (pane) pane.classList.add("active");
  });
});

// ── AI Quick Switch & Active Detection ──────────────────────────────────────
function highlightActiveTabs() {
  chrome.tabs.query({}, (tabs) => {
    document.querySelectorAll(".ai-card").forEach((card) => {
      const host = card.dataset.host;
      const isOpen = tabs.some((t) => t.url && t.url.includes(host));
      card.classList.toggle("active-tab", isOpen);
      const nameEl = card.querySelector(".ai-card-name");
      if (nameEl) {
        let dot = nameEl.querySelector(".ai-tab-dot");
        if (isOpen) {
          if (!dot) {
            dot = document.createElement("span");
            dot.className = "ai-tab-dot";
            dot.title = "มีแท็บนี้เปิดอยู่";
            nameEl.appendChild(dot);
          }
        } else if (dot) {
          dot.remove();
        }
      }
    });
  });
}

document.querySelectorAll(".ai-card, .ai-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetUrl = btn.dataset.url;
    const targetHost = btn.dataset.host;
    chrome.tabs.query({}, (tabs) => {
      const match = tabs.find((t) => t.url && t.url.includes(targetHost));
      if (match) {
        chrome.tabs.update(match.id, { active: true }, () => {
          chrome.tabs.sendMessage(match.id, { type: "zs-open-menu" }, () => {
            void chrome.runtime.lastError;
          });
        });
        if (match.windowId) chrome.windows.update(match.windowId, { focused: true });
        showToast(`สลับไปที่ ${targetHost}`);
      } else {
        chrome.tabs.create({ url: targetUrl });
      }
    });
  });
});

// ── Tools List ──────────────────────────────────────────────────────────────
function renderTools(list) {
  const box = document.getElementById("tools-box");
  box.innerHTML = "";
  if (!list.length) {
    box.innerHTML = '<div style="color: #71717a; font-size: 10px; text-align: center; padding: 12px 0;">ไม่พบคำสั่ง</div>';
    return;
  }
  list.forEach((t) => {
    const item = document.createElement("div");
    item.className = "tool-item";
    const name = t.name || t;
    const desc = t.description || t.desc || "คำสั่งควบคุม Roblox Studio";
    item.innerHTML = `
      <div class="tool-name">${name}</div>
      <div class="tool-desc">${desc}</div>
    `;
    box.appendChild(item);
  });
}

function loadTools() {
  chrome.runtime.sendMessage({ type: "list_tools" }, (res) => {
    if (res && res.ok && Array.isArray(res.tools) && res.tools.length > 0) {
      toolsList = res.tools;
    }
    renderTools(toolsList);
  });
}

document.getElementById("tool-search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = toolsList.filter((t) => {
    const name = (t.name || t).toLowerCase();
    const desc = (t.description || t.desc || "").toLowerCase();
    return name.includes(q) || desc.includes(q);
  });
  renderTools(filtered);
});

// ── Prompt & Caveman ────────────────────────────────────────────────────────
const promptInput = document.getElementById("prompt-input");
chrome.storage.local.get("zsCustomPrompt", (r) => {
  if (r && typeof r.zsCustomPrompt === "string" && r.zsCustomPrompt.trim() !== "") {
    promptInput.value = r.zsCustomPrompt;
  } else {
    promptInput.value = CAVEMAN_PRESET;
    chrome.storage.local.set({ zsCustomPrompt: CAVEMAN_PRESET });
  }
});

document.getElementById("btn-save-prompt").addEventListener("click", () => {
  const val = promptInput.value;
  chrome.storage.local.set({ zsCustomPrompt: val }, () => {
    showToast("บันทึกการตั้งค่าแล้ว");
  });
});

const REST_PRESET = "AUTONOMOUS MEMORY SYNC & REST INTENT: ขณะนี้ผู้ใช้ต้องการหยุดพัก/บันทึกงาน กรุณาสรุปผลงาน สถาปัตยกรรม และ TODO ล่าสุดลงใน game.ServerStorage.ZXScript.Memory ทันที จากนั้นตอบสั้นๆ ว่าบันทึกเรียบร้อย";

document.getElementById("btn-caveman").addEventListener("click", () => {
  promptInput.value = CAVEMAN_PRESET;
  chrome.storage.local.set({ zsCustomPrompt: CAVEMAN_PRESET }, () => {
    showToast("เปิดโหมด Caveman แล้ว");
  });
});

const btnRules = document.getElementById("btn-rules");
if (btnRules) {
  btnRules.addEventListener("click", () => {
    promptInput.value = RULES_PRESET;
    chrome.storage.local.set({ zsCustomPrompt: RULES_PRESET }, () => {
      showToast("เปิดใช้งานกฎเหล็ก 5 ข้อแล้ว");
    });
  });
}

const btnRest = document.getElementById("btn-rest");
if (btnRest) {
  btnRest.addEventListener("click", () => {
    promptInput.value = REST_PRESET;
    chrome.storage.local.set({ zsCustomPrompt: REST_PRESET }, () => {
      chrome.runtime.sendMessage({ type: "sync_memory" }, (res) => {
        if (res && res.ok) {
          showToast("บันทึก Memory ของ Place ลงดิสก์สำเร็จ");
        } else {
          showToast("เปิดคำสั่งพักผ่อน/บันทึกแล้ว");
        }
      });
      navigator.clipboard.writeText("พักผ่อนแล้ว ช่วยสรุปและบันทึก Memory ลง game.ServerStorage.ZXScript.Memory ให้เรียบร้อย").catch(() => {});
    });
  });
}

// ── System Prompt Templates ────────────────────────────────────────────────
const PROMPT_TEMPLATES = {
  rest: REST_PRESET,
  rules: RULES_PRESET,
  caveman: CAVEMAN_PRESET,
  architecture: "PROJECT FOCUS (GOD-TIER ARCHITECTURE): วางสถาปัตยกรรมเกมแบบ Modular Service Framework (Init -> Start lifecycle). แยก Business Logic อยู่ฝั่ง Server 100%, Client เป็นเพียง Controller/Renderer. จดทะเบียน Remote ทั้งหมดใน ReplicatedStorage.Network ป้องกัน Circular Dependency และห้าม Yield ใน Init เด็ดขาด",
  combat: "PROJECT FOCUS (GOD-TIER COMBAT & ANTI-EXPLOIT): ระบบต่อสู้แบบ Server-Authoritative 100%. Client ส่งเพียง Action Intent (ทิศทาง/การคลิก) ฝั่ง Server ทำการตรวจ Cooldown Rate-Limit, Sanity Distance, และยิง workspace:Raycast ตรวจ Line-of-sight ป้องกันการยิงทะลุกำแพง (Wall-bang) และการเทเลพอร์ต",
  parallel: "PROJECT FOCUS (GOD-TIER PARALLEL LUAU): ใช้ Actor Framework ประมวลผลคู่ขนานแบบ Multi-core CPU. ใช้ task.desynchronize() คำนวณ Raycasts, Math, AI Steer behaviors ที่ 120+ FPS จากนั้นเรียก task.synchronize() เมื่อต้องการเขียนค่า CFrame กลับสู่ DataModel อย่างปลอดภัย",
  datastore: "PROJECT FOCUS (GOD-TIER DATA PERSISTENCE): วางระบบเซฟข้อมูลผู้เล่นโดยใช้ ProfileStore / DataStoreService ที่ปลอดภัย ป้องกัน Data Loss, รองรับ Session Locking, Auto-save ทุก 5 นาที, ปลอดภัยต่อ BindToClose, และจัดการ PlayerAdded/PlayerRemoving อย่างถูกต้องตามมาตรฐาน Luau 0.743",
  procedural: "PROJECT FOCUS (GOD-TIER PROCEDURAL GENERATION): สร้างระบบ Procedural Generation แมพ/ดันเจี้ยนด้วย Perlin Noise และ ChangeHistoryService chunking (task.wait ทุก 200 ชิ้น) เพื่อป้องกัน Studio Freeze และ Timeout ในการรันคำสั่ง",
  animation: "PROJECT FOCUS (GOD-TIER ANIMATIONS & IK): สร้างระบบท่าทางอนิเมชั่นระดับสูง โหลดผ่าน Animator:LoadAnimation() บน Client (Auto-replicate), ใช้ track:GetMarkerReachedSignal() เพื่อ sync ดาเมจ/เสียงให้ตรงเฟรมเป๊ะ, และใช้ IKControl ทำระบบหันศีรษะ/มองตามเป้าหมาย (LookAt) พร้อมระบบเอียงตัวขณะวิ่ง (Procedural Lean)",
  leaderstats: "PROJECT FOCUS: สร้างระบบ Leaderstats และเงิน (Coins, Level, Exp) พร้อมระบบเก็บเหรียญบนแมพ ตรวจจับ Touched ด้วย task.wait debounce และ sync ค่าให้ PlayerGui แบบเรียลไทม์",
  inventory: "PROJECT FOCUS: สร้างระบบกระเป๋าเก็บของ (Inventory) และร้านค้า (Shop) ด้วย ScreenGui ที่ทันสมัย แบ่งสัดส่วน Client/Server ผ่าน RemoteFunction/RemoteEvent ตรวจสอบความถูกต้องฝั่ง Server เสมอ",
  raycast_combat: "PROJECT FOCUS: สร้างระบบอาวุธ/การโจมตีแบบ Raycast ที่มีประสิทธิภาพ ใช้ workspace:Raycast พร้อม RaycastParams กรองตัวละครผู้ยิง มีระบบ Hitbox Detection และ Damage Verification ฝั่ง Server ป้องกันการแฮก",
  npc_ai: "PROJECT FOCUS: พัฒนาระบบ NPC AI และ PathfindingService อัจฉริยะ รองรับ State Machine (Patrol, Detect Player, Chase, Attack, Return), มี Waypoint Visualization และคำนวณ Raycast Line-of-Sight"
};

const selTemplate = document.getElementById("sel-template");
if (selTemplate) {
  selTemplate.addEventListener("change", (e) => {
    const key = e.target.value;
    if (key && PROMPT_TEMPLATES[key]) {
      promptInput.value = PROMPT_TEMPLATES[key];
      chrome.storage.local.set({ zsCustomPrompt: PROMPT_TEMPLATES[key] }, () => {
        showToast("ใช้งานเทมเพลต " + key + " แล้ว");
      });
    }
  });
}

// ── Boot ────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "zs-status") render(msg);
});

refresh();
loadTools();
highlightActiveTabs();
setInterval(() => {
  refresh();
  highlightActiveTabs();
}, 2500);


// ── Sound Toggle & 1-Click Chat Insert ────────────────────────────────────────
const btnSound = document.getElementById("btn-sound-toggle");
if (btnSound) {
  chrome.storage.local.get({ soundEnabled: true }, (res) => {
    const on = res.soundEnabled !== false;
    btnSound.style.opacity = on ? "1" : "0.35";
    btnSound.title = on ? "เสียงแจ้งเตือน: เปิดอยู่ (คลิกเพื่อปิด)" : "เสียงแจ้งเตือน: ปิดอยู่ (คลิกเพื่อเปิด)";
  });
  btnSound.addEventListener("click", () => {
    chrome.storage.local.get({ soundEnabled: true }, (res) => {
      const next = !res.soundEnabled;
      chrome.storage.local.set({ soundEnabled: next }, () => {
        btnSound.style.opacity = next ? "1" : "0.35";
        btnSound.title = next ? "เสียงแจ้งเตือน: เปิดอยู่ (คลิกเพื่อปิด)" : "เสียงแจ้งเตือน: ปิดอยู่ (คลิกเพื่อเปิด)";
        showToast(next ? "เปิดเสียงแจ้งเตือนแล้ว" : "ปิดเสียงแจ้งเตือนแล้ว");
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((t) => {
            chrome.tabs.sendMessage(t.id, { type: "zs-sound-toggle", enabled: next }, () => {
              void chrome.runtime.lastError;
            });
          });
        });
      });
    });
  });
}

const btnInsertChat = document.getElementById("btn-insert-chat");
if (btnInsertChat) {
  btnInsertChat.addEventListener("click", () => {
    const text = (promptInput && promptInput.value.trim()) || "";
    if (!text) {
      showToast("กรุณาเลือกหรือพิมพ์ข้อความก่อน");
      return;
    }
    const supported = [
      "deepseek.com",
      "chatgpt.com",
      "chat.openai.com",
      "gemini.google.com",
      "kimi.ai",
      "moonshot.cn",
      "chat.z.ai",
      "chatglm.cn",
      "qwen.ai",
      "tongyi.aliyun.com",
      "meta.ai",
      "arena.ai",
      "lmarena.ai"
    ];
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const targetTab = tabs[0];
      const isSupported = targetTab && targetTab.url && supported.some((h) => targetTab.url.includes(h));
      if (isSupported) {
        sendInsert(targetTab.id, text);
      } else {
        chrome.tabs.query({}, (allTabs) => {
          const found = allTabs.find((t) => t.url && supported.some((h) => t.url.includes(h)));
          if (found) {
            chrome.tabs.update(found.id, { active: true }, () => {
              sendInsert(found.id, text);
            });
            if (found.windowId) chrome.windows.update(found.windowId, { focused: true });
          } else {
            showToast("ไม่พบแท็บแชท AI ที่เปิดอยู่ (เปิด DeepSeek, ChatGPT, Gemini, Kimi ฯลฯ)");
          }
        });
      }
    });
  });
}

function sendInsert(tabId, text) {
  showToast("กำลังแทรกข้อความ...");
  chrome.tabs.sendMessage(tabId, { type: "zs-insert-text", text }, (res) => {
    const err = chrome.runtime.lastError;
    if (err) {
      showToast("กรุณารีเฟรช (F5) หน้าเว็บแชท AI ก่อนใช้งาน");
      return;
    }
    if (res && res.ok === false) {
      showToast("แทรกไม่สำเร็จ: " + (res.error || "เกิดข้อผิดพลาด"));
      return;
    }
    showToast("แทรกข้อความลงในแชทสำเร็จ");
    setTimeout(() => {
      try { window.close(); } catch {}
    }, 450);
  });
}
