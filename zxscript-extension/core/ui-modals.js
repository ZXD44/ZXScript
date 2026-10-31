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
      openBridgeBtn.addEventListener("click", () => showBridgeModal());
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
      "ยังไม่ได้เชื่อมต่อ Studio",
      "ไม่สามารถเชื่อมต่อไปยัง Studio ได้\n" +
        "• วิธีแก้: กดปุ่ม 'เชื่อมต่อ Studio' ด้านล่างเพื่อเริ่มระบบ"
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
          <span class="zs-modal-tag">Studio</span>
          <button class="zs-modal-close" title="Close">&times;</button>
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
        <div class="zs-modal-log" style="display:none;"></div>
        <div class="zs-modal-actions">
          <button class="zs-modal-btn secondary zs-modal-cancel">ยกเลิก</button>
          <button class="zs-modal-btn secondary zs-modal-copy">คัดลอกคำสั่ง</button>
          <button class="zs-modal-btn primary zs-modal-confirm">เปิดการเชื่อมต่อ</button>
        </div>
      </div>
    `;

    root.appendChild(backdrop);

    const copyBtn = backdrop.querySelector(".zs-modal-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText("start.bat").then(() => {
          copyBtn.textContent = "คัดลอกสำเร็จ";
          toast("คัดลอก start.bat แล้ว");
          setTimeout(() => {
            if (copyBtn) copyBtn.textContent = "คัดลอก start.bat";
          }, 2000);
        });
      });
    }

    const logBox = backdrop.querySelector(".zs-modal-log");
    const addLog = (text, cls) => {
      logBox.style.display = "";
      const line = document.createElement("div");
      if (cls) line.className = cls;
      line.textContent = `[${new Date().toLocaleTimeString("th-TH")}] ${text}`;
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

    const confirmBtn = backdrop.querySelector(".zs-modal-confirm");
    let logTimer = null;

    function startModalPolling() {
      let polls = 0;
      if (logTimer) clearInterval(logTimer);
      logTimer = setInterval(() => {
        polls++;
        chrome.runtime.sendMessage({ type: "status" }, (s) => {
          if (s && s.connected) {
            clearInterval(logTimer);
            logTimer = null;
            addLog("เชื่อมต่อสำเร็จ (34 เครื่องมือพร้อมใช้งาน)", "log-ok");
            confirmBtn.disabled = false;
            confirmBtn.textContent = "เชื่อมต่อแล้ว";
            setTimeout(close, 700);
          }
        });
        if (polls > 14) {
          clearInterval(logTimer);
          logTimer = null;
          addLog("หมดเวลาเชื่อมต่อ: ตรวจสอบสถานะแล้วลองใหม่อีกครั้ง", "log-err");
          confirmBtn.disabled = false;
          confirmBtn.textContent = "ลองอีกครั้ง";
        }
      }, 1200);
    }

    confirmBtn.addEventListener("click", () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = "กำลังเปิด...";

      // 1. Check if already connected
      chrome.runtime.sendMessage({ type: "status" }, (st) => {
        if (st && st.connected) {
          addLog("เชื่อมต่ออยู่แล้ว (พร้อมใช้งาน)", "log-ok");
          confirmBtn.disabled = false;
          confirmBtn.textContent = "เชื่อมต่อแล้ว";
          setTimeout(close, 600);
          return;
        }

        addLog("กำลังส่งคำสั่งเชื่อมต่อในเบื้องหลัง...", "log-info");
        chrome.runtime.sendMessage({ type: "native_start" }, (resp) => {
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
      });
    });
  }

  Object.assign(window.ZS, {
    formatMsg,
    toast,
    banner,
    clearBanner,
    staleExtensionAlert,
    bridgeAlert,
    showImages,
    showBridgeModal,
  });
  window.ZS.modals = window.ZS;

  window.toast = toast;
  window.banner = banner;
  window.clearBanner = clearBanner;
  window.showBridgeModal = showBridgeModal;
  window.showImages = showImages;
})();

