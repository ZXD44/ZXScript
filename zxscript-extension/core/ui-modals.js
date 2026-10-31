// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * core/ui-modals.js - Smart banners, toasts, screenshot viewer, and in-page bridge modal.
 */
(() => {
  "use strict";

  window.ZS = window.ZS || {};
  const { EXT_VERSION, playChime } = window.ZS;

  function formatMsg(m) {
    if (!m) return "";
    const str = String(m);
    if (str.includes("•")) {
      return str
        .split("\n")
        .map((line) => {
          line = line.trim();
          if (!line) return "";
          if (line.startsWith("• วิธีแก้:")) {
            return `<div class="zs-banner-sol"><span class="zs-sol-badge">วิธีแก้</span> ${line.replace(/^• วิธีแก้:\s*/, "")}</div>`;
          }
          if (line.startsWith("•")) {
            return `<div class="zs-banner-bullet"><span class="zs-bullet-dot"></span>${line.replace(/^•\s*/, "")}</div>`;
          }
          return `<div>${line}</div>`;
        })
        .join("");
    }
    return str.includes("<") ? str : str.replace(/\n/g, "<br>");
  }

  function toast(msg) {
    const root = document.getElementById("zs-root") || document.body || document.documentElement;
    const t = document.createElement("div");
    t.className = "zs-toast";
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 300);
    }, 3500);
  }

  function banner(kind, title, msg, stack) {
    const P = window.ZSProvider;
    if (kind === "warn" || kind === "limit" || kind === "error") {
      playChime(kind === "limit" ? "offline" : "tool_error");
    }

    const root = document.getElementById("zs-root") || document.body || document.documentElement;
    const existing = root.querySelector(`.zs-banner[data-title="${title}"]`);
    if (existing) {
      existing.classList.remove("zs-shake");
      void existing.offsetWidth;
      existing.classList.add("zs-shake");
      const msgEl = existing.querySelector(".zs-banner-m");
      if (msgEl) msgEl.innerHTML = formatMsg(msg);
      return;
    }

    let cat = "ระบบ";
    let catIcon = "";
    let actionBtnHtml = "";
    const textContext = (title + " " + msg).toLowerCase();
    const isStudio = /studio|roblox/i.test(textContext);
    const isBridge = /bridge|start\.bat/i.test(textContext);
    const isLimit = /context|ยาวเกิน|ขีดจำกัด|quota/i.test(textContext) || kind === "limit";
    const isEmpty = /ว่างเปล่า|ไม่มีการตอบกลับ|ไม่ตอบสนอง/i.test(textContext);

    if (isStudio) {
      cat = "Roblox Studio";
      catIcon = `<svg class="zs-rbx-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5.26 2L2 18.74 18.74 22 22 5.26 5.26 2zm8.28 11.23l-3.27-.63.63-3.27 3.27.63-.63 3.27z"/></svg>`;
      actionBtnHtml = `<button class="zs-banner-action zs-action-retry">ตรวจสอบการเชื่อมต่อ</button>`;
    } else if (isBridge) {
      cat = "ระบบเชื่อมต่อ";
      catIcon = "";
      actionBtnHtml = `<button class="zs-banner-action zs-action-openbridge">เชื่อมต่อ Studio</button><button class="zs-banner-action zs-action-retry">ตรวจสอบการเชื่อมต่อ</button>`;
    } else if (isEmpty) {
      cat = (P && P.displayName) || "AI Model";
      catIcon = "";
      actionBtnHtml = `<button class="zs-banner-action zs-action-continue">สั่งทำงานต่อ</button>`;
    } else if (isLimit) {
      cat = "ขีดจำกัด AI";
      catIcon = "";
      actionBtnHtml = `<button class="zs-banner-action zs-action-newchat">เปิดแชตใหม่</button>`;
    }

    const b = document.createElement("div");
    b.className = `zs-banner ${kind || "warn"}`;
    b.dataset.title = title || "";
    b.innerHTML = `
      <div class="zs-banner-hdr">
        <div class="zs-banner-tag">${catIcon} <span>${cat}</span></div>
        <button class="zs-banner-close" title="ปิดการแจ้งเตือน">✕</button>
      </div>
      <div class="zs-banner-t">${title}</div>
      <div class="zs-banner-m">${formatMsg(msg)}</div>
      ${stack ? `<details class="zs-banner-diag"><summary>รายละเอียดข้อผิดพลาด</summary><pre>${stack}</pre></details>` : ""}
      <div class="zs-banner-acts">
        ${actionBtnHtml}
        <button class="zs-banner-copy">คัดลอกรายงาน</button>
      </div>
    `;

    const openBridgeBtn = b.querySelector(".zs-action-openbridge");
    if (openBridgeBtn) {
      openBridgeBtn.addEventListener("click", async () => {
        openBridgeBtn.disabled = true;
        openBridgeBtn.textContent = "กำลังเชื่อมต่อ…";
        const bgFn = (window.ZS.tools && window.ZS.tools.bg) || window.ZS.bg;
        if (bgFn) {
          try {
            const rec = await bgFn({ type: "reconnect" });
            if (rec && rec.connected) {
              toast("เชื่อมต่อ Studio สำเร็จแล้ว");
              if (window.ZS.ui && window.ZS.ui.setStatus) window.ZS.ui.setStatus(rec);
              b.remove();
              return;
            }
          } catch {}
        }
        openBridgeBtn.disabled = false;
        openBridgeBtn.textContent = "เชื่อมต่อ Studio";
        showBridgeModal();
      });
    }

    const retryBtn = b.querySelector(".zs-action-retry");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        retryBtn.disabled = true;
        retryBtn.textContent = "กำลังตรวจสอบ…";
        if (window.ZS.ensureTools) {
          window.ZS.ensureTools(true).then((tools) => {
            if (tools && tools.length) {
              retryBtn.textContent = "เชื่อมต่อสำเร็จ";
              toast(`เชื่อมต่อสำเร็จ พบ ${tools.length} คำสั่ง`);
              setTimeout(() => b.remove(), 1000);
            } else {
              retryBtn.textContent = "ยังไม่พบ Studio";
              setTimeout(() => {
                if (retryBtn) {
                  retryBtn.textContent = "ตรวจสอบอีกครั้ง";
                  retryBtn.disabled = false;
                }
              }, 2000);
            }
          }).catch(() => {
            retryBtn.textContent = "ยังไม่พบ Studio";
            setTimeout(() => {
              if (retryBtn) {
                retryBtn.textContent = "ตรวจสอบอีกครั้ง";
                retryBtn.disabled = false;
              }
            }, 2000);
          });
        }
      });
    }

    const contBtn = b.querySelector(".zs-action-continue");
    if (contBtn && P) {
      contBtn.addEventListener("click", () => {
        contBtn.disabled = true;
        contBtn.textContent = "กำลังส่งคำสั่ง…";
        P.typeAndSend("ทำต่อ")
          .then(() => {
            toast("สั่งให้ AI ทำต่อแล้ว");
            b.remove();
          })
          .catch(() => {
            contBtn.textContent = "ส่งไม่สำเร็จ";
            setTimeout(() => {
              if (contBtn) {
                contBtn.textContent = "▶︎ ลองอีกครั้ง";
                contBtn.disabled = false;
              }
            }, 2000);
          });
      });
    }

    const newChatBtn = b.querySelector(".zs-action-newchat");
    if (newChatBtn && P) {
      newChatBtn.addEventListener("click", () => {
        if (P.openNewChat) P.openNewChat();
        b.remove();
      });
    }

    const reportPayload = [
      "=== รายงานข้อผิดพลาด ZXScript ===",
      `หมวดหมู่: ${cat} (${kind})`,
      `หัวข้อ: ${title}`,
      `ข้อความ: ${msg}`,
      stack ? `Stack Trace:\n${stack}` : "",
      `ลิงก์ (URL): ${location.href}`,
      `AI / เบราว์เซอร์: ${(P && P.displayName) || (P && P.id) || "Browser"}`,
      `เวลา: ${new Date().toLocaleString("th-TH")}`,
      `เวอร์ชัน: ${EXT_VERSION || "0.0.2"}`,
      "==================================",
    ].filter(Boolean).join("\n");

    const copyBtn = b.querySelector(".zs-banner-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(reportPayload).then(() => {
          copyBtn.textContent = "คัดลอกสำเร็จ";
          setTimeout(() => {
            if (copyBtn) copyBtn.textContent = "คัดลอกรายงาน";
          }, 2000);
        }).catch(() => {
          copyBtn.textContent = "คัดลอกไม่สำเร็จ";
        });
      });
    }

    const closeBtn = b.querySelector(".zs-banner-close");
    if (closeBtn) closeBtn.addEventListener("click", () => b.remove());

    root.appendChild(b);

    try {
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          {
            type: "zs_error_notify",
            title: title || "ZXScript แจ้งเตือน",
            message: msg || title,
            stack: reportPayload,
          },
          () => void chrome.runtime.lastError
        );
      }
    } catch {}
  }

  function clearBanner(keyword) {
    const root = document.getElementById("zs-root") || document.body || document.documentElement;
    root.querySelectorAll(".zs-banner").forEach((b) => {
      const t = (b.dataset.title || "") + " " + (b.textContent || "");
      if (t.toLowerCase().includes(keyword.toLowerCase())) b.remove();
    });
  }

  function staleExtensionAlert() {
    clearBanner("reload");
    banner(
      "warn",
      "กรุณารีโหลดหน้านี้ (F5)",
      "ส่วนขยาย ZXScript ได้รับการอัปเดตแล้ว โค้ดของหน้าเว็บนี้จึงหมดอายุ\n" +
        "• วิธีแก้: กดรีโหลดหน้านี้ (F5 หรือ Ctrl+R) เพื่อให้ทำงานร่วมกับส่วนขยายเวอร์ชันใหม่ได้สมบูรณ์"
    );
  }

  function bridgeAlert(on) {
    if (!on) {
      clearBanner("bridge");
      return;
    }
    banner(
      "warn",
      "คุณต้องเปิด start.bat ก่อนสิ!",
      "ยังไม่ได้เปิด Bridge Server (127.0.0.1:17613)\n" +
        "• คุณต้องเปิดไฟล์ start.bat ก่อนสิ หรือกดปุ่ม 'เชื่อมต่อ Studio' ด้านล่าง"
    );
  }

  function showImages(images, toolName) {
    const root = document.getElementById("zs-root") || document.body || document.documentElement;
    root.querySelectorAll(".zs-shot").forEach((e) => e.remove());
    const wrap = document.createElement("div");
    wrap.className = "zs-shot";
    const hdr = document.createElement("div");
    hdr.className = "zs-shot-hdr";
    const ttl = document.createElement("span");
    ttl.className = "zs-shot-ttl";
    ttl.textContent = `${toolName} · ${images.length} รูปภาพ`;
    const close = document.createElement("button");
    close.className = "zs-shot-x";
    close.textContent = "✕";
    close.addEventListener("click", () => wrap.remove());
    hdr.appendChild(ttl);
    hdr.appendChild(close);
    wrap.appendChild(hdr);
    const body = document.createElement("div");
    body.className = "zs-shot-body";
    for (const img of images) {
      const el = document.createElement("img");
      el.className = "zs-shot-img";
      el.src = `data:${img.mimeType || "image/jpeg"};base64,${img.data}`;
      body.appendChild(el);
    }
    wrap.appendChild(body);
    root.appendChild(wrap);
  }

  function showBridgeModal() {
    const root = document.getElementById("zs-root") || document.body || document.documentElement;
    const existing = root.querySelector(".zs-modal-backdrop");
    if (existing) existing.remove();

    const backdrop = document.createElement("div");
    backdrop.className = "zs-modal-backdrop";

    backdrop.innerHTML = `
      <div class="zs-modal-card">
        <div class="zs-modal-header">
          <span class="zs-modal-tag"><svg class="zs-rbx-icon" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:-1px;margin-right:4px;"><path d="M5.26 2L2 18.74 18.74 22 22 5.26 5.26 2zm8.28 11.23l-3.27-.63.63-3.27 3.27.63-.63 3.27z"/></svg>Studio</span>
          <button class="zs-modal-close" title="ปิดหน้าต่าง">&times;</button>
        </div>
        <div class="zs-modal-title">เชื่อมต่อ Roblox Studio</div>
        <div class="zs-modal-body">
          เริ่มระบบเชื่อมต่อในพื้นหลัง (Headless) เพื่อสั่งการ Roblox Studio
        </div>
        <div class="zs-modal-info">
          <div class="zs-modal-info-row">
            <span class="zs-modal-info-label">Server</span>
            <span class="zs-modal-info-val">127.0.0.1:17613</span>
          </div>
          <div class="zs-modal-info-row">
            <span class="zs-modal-info-label">Mode</span>
            <span class="zs-modal-info-val">Headless (No CMD window)</span>
          </div>
        </div>
        <div class="zs-modal-prog">
          <div class="zs-modal-prog-hdr">
            <span class="zs-modal-prog-label">สถานะการเชื่อมต่อ</span>
            <span class="zs-modal-prog-pct">0%</span>
          </div>
          <div class="zs-modal-prog-track">
            <div class="zs-modal-prog-fill" style="width: 0%"></div>
          </div>
          <div class="zs-modal-steps">
            <span class="zs-modal-step step-bridge"><span class="zs-modal-step-dot"></span> 1. Bridge Server</span>
            <span class="zs-modal-step step-studio"><span class="zs-modal-step-dot"></span> 2. Studio App</span>
            <span class="zs-modal-step step-tools"><span class="zs-modal-step-dot"></span> 3. Place & คำสั่ง</span>
          </div>
        </div>
        <div class="zs-modal-log" style="display:none;"></div>
        <div class="zs-modal-actions">
          <button class="zs-modal-btn secondary zs-modal-cancel">ยกเลิก</button>
          <button class="zs-modal-btn secondary zs-modal-copy">คัดลอกคำสั่ง</button>
          <button class="zs-modal-btn primary zs-modal-confirm">เปิดการเชื่อมต่อ</button>
        </div>
      </div>
    `;

    root.appendChild(backdrop);

    const progFill = backdrop.querySelector(".zs-modal-prog-fill");
    const progPct = backdrop.querySelector(".zs-modal-prog-pct");
    const progLabel = backdrop.querySelector(".zs-modal-prog-label");
    const stepBridge = backdrop.querySelector(".step-bridge");
    const stepStudio = backdrop.querySelector(".step-studio");
    const stepTools = backdrop.querySelector(".step-tools");
    const confirmBtn = backdrop.querySelector(".zs-modal-confirm");
    const copyBtn = backdrop.querySelector(".zs-modal-copy");
    const logBox = backdrop.querySelector(".zs-modal-log");

    function setStepClass(el, state) {
      if (!el) return;
      el.classList.remove("done", "active", "warn", "err");
      if (state) el.classList.add(state);
    }

    function updateProgress(pct, label, tone, steps = {}) {
      if (typeof pct === "number") {
        progPct.textContent = `${Math.round(pct)}%`;
        progFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      } else {
        progPct.textContent = String(pct);
      }
      if (label) progLabel.textContent = label;
      progFill.classList.remove("ok", "warn", "err");
      if (tone) progFill.classList.add(tone);

      if (steps.bridge) setStepClass(stepBridge, steps.bridge);
      if (steps.studio) setStepClass(stepStudio, steps.studio);
      if (steps.tools) setStepClass(stepTools, steps.tools);
    }

    const addLog = (text, cls) => {
      logBox.style.display = "";
      const line = document.createElement("div");
      if (cls) line.className = cls;
      const ts = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      line.textContent = `[${ts}] ${text}`;
      logBox.appendChild(line);
      logBox.scrollTop = logBox.scrollHeight;
    };

    const close = () => {
      backdrop.style.opacity = "0";
      setTimeout(() => backdrop.remove(), 150);
    };

    backdrop.querySelector(".zs-modal-close").addEventListener("click", close);
    backdrop.querySelector(".zs-modal-cancel").addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });

    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText("start.bat").then(() => {
          copyBtn.textContent = "✓ คัดลอกแล้ว";
          toast("คัดลอก start.bat แล้ว");
          addLog("คัดลอกคำสั่ง start.bat ไปยัง Clipboard แล้ว", "log-info");
          setTimeout(() => {
            if (copyBtn) copyBtn.textContent = "คัดลอกคำสั่ง";
          }, 2000);
        }).catch(() => {
          copyBtn.textContent = "คัดลอกไม่สำเร็จ";
        });
      });
    }

    const callBg = (msg) => {
      const fn = (window.ZS.tools && window.ZS.tools.bg) || window.ZS.bg;
      if (fn) return fn(msg);
      return new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage(msg, (r) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, kind: "stale-extension", error: chrome.runtime.lastError.message });
            } else {
              resolve(r || { ok: false });
            }
          });
        } catch (e) {
          resolve({ ok: false, kind: "stale-extension", error: String(e) });
        }
      });
    };

    // Inspect live state immediately upon open
    const checkState = async () => {
      const st = await callBg({ type: "reconnect" });
      if (st && st.kind === "stale-extension") {
        updateProgress(0, "ส่วนขยายได้รับการอัปเดตแล้ว กรุณารีเฟรชหน้านี้ (F5)", "err", { bridge: "err" });
        confirmBtn.disabled = false;
        confirmBtn.textContent = "🔄 รีเฟรชหน้านี้ (F5)";
        confirmBtn.onclick = () => location.reload();
        return;
      }
      if (st && st.connected) {
        const hasTools = (st.tools && st.tools > 0) || (window.ZS.A && window.ZS.A.toolList && window.ZS.A.toolList.length > 0);
        const studioReady = st.studio === true || hasTools;
        if (studioReady) {
          updateProgress(100, `เชื่อมต่อสำเร็จ (${st.tools || 0} คำสั่งพร้อมใช้งาน)`, "ok", {
            bridge: "done",
            studio: "done",
            tools: "done",
          });
          confirmBtn.textContent = "เชื่อมต่อแล้ว (100%)";
          setTimeout(close, 800);
          return;
        } else {
          updateProgress(75, st.studioProc ? "Bridge ออนไลน์ · รอเปิดแมพใน Studio" : "Bridge ออนไลน์ · รอเปิด Studio", "warn", {
            bridge: "done",
            studio: st.studioProc ? "done" : "active",
            tools: "",
          });
          confirmBtn.textContent = "Bridge พร้อม (รอเปิด Studio)";
        }
      }
    };
    checkState();

    let logTimer = null;

    function startModalPolling() {
      let polls = 0;
      const maxPolls = 25;
      if (logTimer) clearInterval(logTimer);

      logTimer = setInterval(async () => {
        polls++;
        const s = await callBg({ type: "status" });
        if (s && s.kind === "stale-extension") {
          clearInterval(logTimer);
          logTimer = null;
          updateProgress(0, "ส่วนขยายได้รับการอัปเดตแล้ว กรุณารีเฟรชหน้านี้ (F5)", "err", { bridge: "err" });
          confirmBtn.disabled = false;
          confirmBtn.textContent = "🔄 รีเฟรชหน้านี้ (F5)";
          confirmBtn.onclick = () => location.reload();
          return;
        }

        if (!s || !s.connected) {
          // Still waiting for Bridge port 17613
          const pct = Math.min(15 + Math.round((polls / maxPolls) * 35), 50);
          updateProgress(pct, `กำลังรอพอร์ต 17613 ตอบสนอง... (${polls}/${maxPolls})`, "", {
            bridge: "active",
            studio: "",
            tools: "",
          });
        } else {
          // Bridge is connected!
          const hasTools = (s.tools && s.tools > 0) || (window.ZS.A && window.ZS.A.toolList && window.ZS.A.toolList.length > 0);
          const studioReady = s.studio === true || hasTools;

          if (studioReady) {
            // REAL 100% verified!
            clearInterval(logTimer);
            logTimer = null;
            const count = s.tools || 0;
            updateProgress(100, `เชื่อมต่อ Studio สำเร็จ (${count} คำสั่งพร้อมใช้งาน)`, "ok", {
              bridge: "done",
              studio: "done",
              tools: "done",
            });
            addLog(`✓ เชื่อมต่อ Roblox Studio สำเร็จ (${count} คำสั่งพร้อมใช้งาน)`, "log-ok");
            confirmBtn.disabled = false;
            confirmBtn.textContent = "เชื่อมต่อแล้ว";
            setTimeout(close, 1100);
            return;
          } else {
            // Bridge connected, Studio app / place pending
            updateProgress(75, s.studioProc ? "Bridge ออนไลน์แล้ว · รอเปิดแมพใน Studio" : "Bridge ออนไลน์แล้ว · รอเปิด Roblox Studio", "warn", {
              bridge: "done",
              studio: s.studioProc ? "done" : "active",
              tools: "",
            });
            if (polls === 1 || polls % 4 === 0) {
              addLog("✓ Bridge ออนไลน์แล้ว (127.0.0.1:17613)", "log-ok");
              if (s.studioProc) {
                addLog("• ตรวจพบโปรเซส Studio แต่ยังไม่พบแมพที่เปิด (กรุณาเปิด Place)", "log-info");
              } else {
                addLog("• กำลังรอเปิดโปรแกรม Roblox Studio...", "log-info");
              }
            }
            if (polls >= 10) {
              confirmBtn.disabled = false;
              confirmBtn.textContent = "Bridge พร้อม (รอเปิด Studio)";
            }
          }
        }

        if (polls >= maxPolls) {
          clearInterval(logTimer);
          logTimer = null;
          const sFinal = await callBg({ type: "status" });
          if (!sFinal || !sFinal.connected) {
            updateProgress(0, "คุณต้องเปิด start.bat ก่อนสิ (ไม่พบเซิร์ฟเวอร์)", "err", {
              bridge: "err",
              studio: "",
              tools: "",
            });
            addLog("✕ คุณต้องเปิด start.bat ก่อนสิ! ยังไม่มีเซิร์ฟเวอร์ที่ 127.0.0.1:17613", "log-err");
            addLog("• ดับเบิลคลิกเปิดไฟล์ start.bat ในโฟลเดอร์โปรเจกต์ หรือกดปุ่มด้านล่าง", "log-info");
            confirmBtn.disabled = false;
            confirmBtn.textContent = "ลองอีกครั้ง";
          } else {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Bridge พร้อม (รอเปิด Studio)";
          }
        }
      }, 1000);
    }

    confirmBtn.addEventListener("click", async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = "กำลังตรวจสอบ...";

      // 1. Check if already connected or can connect directly
      const st = await callBg({ type: "reconnect" });
      if (st && st.kind === "stale-extension") {
        location.reload();
        return;
      }
      if (st && st.connected) {
        const hasTools = (st.tools && st.tools > 0) || (window.ZS.A && window.ZS.A.toolList && window.ZS.A.toolList.length > 0);
        if (st.studio === true || hasTools) {
          updateProgress(100, `เชื่อมต่ออยู่แล้ว (${st.tools || 0} คำสั่งพร้อมใช้งาน)`, "ok", {
            bridge: "done",
            studio: "done",
            tools: "done",
          });
          addLog(`✓ ระบบเชื่อมต่อและ Roblox Studio พร้อมใช้งานอยู่แล้ว (${st.tools || 0} คำสั่ง)`, "log-ok");
          confirmBtn.disabled = false;
          confirmBtn.textContent = "เชื่อมต่อแล้ว";
          setTimeout(close, 800);
          return;
        }
      }

      updateProgress(15, "กำลังเริ่มระบบเชื่อมต่อ (Headless)...", "", { bridge: "active" });
      addLog("กำลังส่งคำสั่งเชื่อมต่อในเบื้องหลัง...", "log-info");
      const resp = await callBg({ type: "native_start" });
      if (resp && resp.ok) {
        addLog("ระบบเชื่อมต่อเริ่มทำงานแล้ว (PID: " + (resp.pid || "Headless") + ")", "log-ok");
        startModalPolling();
      } else {
        const err = (resp && resp.error) || "Native host did not respond";
        addLog("Host: " + err, "log-err");
        // Fallback to Protocol Handler immediately
        addLog("กำลังสลับไปเปิดผ่าน Windows Protocol (zxscript://)...", "log-info");
        const link = document.createElement("a");
        link.href = "zxscript://start";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => link.remove(), 1000);
        addLog("หากเบราว์เซอร์แจ้งเตือน ให้กดยืนยันเพื่อเริ่มการเชื่อมต่อ", "log-ok");
        startModalPolling();
      }
    });
  }

  const modalMethods = {
    formatMsg,
    toast,
    banner,
    clearBanner,
    staleExtensionAlert,
    bridgeAlert,
    showImages,
    showBridgeModal,
  };

  window.ZS = window.ZS || {};
  window.ZS.ui = window.ZS.ui || {};
  Object.assign(window.ZS, modalMethods);
  Object.assign(window.ZS.ui, modalMethods);
  window.ZS.modals = modalMethods;

  window.toast = toast;
  window.banner = banner;
  window.clearBanner = clearBanner;
  window.showBridgeModal = showBridgeModal;
  window.showImages = showImages;
})();

