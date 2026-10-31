// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * core/audio.js - Web Audio synthesizer and background notification manager.
 */
(() => {
  "use strict";

  window.ZS = window.ZS || {};

  function playChime(kind = "tool", boost = false) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;

      if (kind === "done") {
        const vol = boost ? 0.40 : 0.28;
        const notes = [
          { f: 659.25, t: 0.00, d: 0.22, g: vol * 0.8 },
          { f: 830.61, t: 0.10, d: 0.24, g: vol * 0.9 },
          { f: 987.77, t: 0.22, d: 0.55, g: vol * 1.0 },
        ];

        notes.forEach(({ f, t, d, g }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, now + t);

          gain.gain.setValueAtTime(0.0001, now + t);
          gain.gain.exponentialRampToValueAtTime(g, now + t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);

          const harm = ctx.createOscillator();
          const harmGain = ctx.createGain();
          harm.type = "triangle";
          harm.frequency.setValueAtTime(f * 2, now + t);
          harmGain.gain.setValueAtTime(0.0001, now + t);
          harmGain.gain.exponentialRampToValueAtTime(g * 0.22, now + t + 0.015);
          harmGain.gain.exponentialRampToValueAtTime(0.0001, now + t + (d * 0.7));

          osc.connect(gain);
          gain.connect(ctx.destination);
          harm.connect(harmGain);
          harmGain.connect(ctx.destination);

          osc.start(now + t);
          osc.stop(now + t + d);
          harm.start(now + t);
          harm.stop(now + t + d);
        });

        setTimeout(() => { try { ctx.close(); } catch {} }, 1000);
      } else if (kind === "error" || kind === "tool_error") {
        const vol = boost ? 0.32 : 0.22;
        const pulses = [
          { fStart: 440.00, fEnd: 311.13, t: 0.00, d: 0.12, type: "sawtooth" },
          { fStart: 369.99, fEnd: 261.63, t: 0.15, d: 0.18, type: "sawtooth" },
        ];
        pulses.forEach(({ fStart, fEnd, t, d, type }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1400, now + t);

          osc.type = type;
          osc.frequency.setValueAtTime(fStart, now + t);
          osc.frequency.exponentialRampToValueAtTime(fEnd, now + t + d);

          gain.gain.setValueAtTime(0.0001, now + t);
          gain.gain.exponentialRampToValueAtTime(vol, now + t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + t);
          osc.stop(now + t + d);
        });
        setTimeout(() => { try { ctx.close(); } catch {} }, 600);
      } else if (kind === "offline" || kind === "fatal") {
        const vol = boost ? 0.38 : 0.26;
        const buzzes = [
          { fStart: 160.00, fEnd: 100.00, t: 0.00, d: 0.14 },
          { fStart: 140.00, fEnd: 80.00,  t: 0.18, d: 0.24 },
        ];
        buzzes.forEach(({ fStart, fEnd, t, d }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(800, now + t);

          osc.type = "square";
          osc.frequency.setValueAtTime(fStart, now + t);
          osc.frequency.exponentialRampToValueAtTime(fEnd, now + t + d);

          gain.gain.setValueAtTime(0.0001, now + t);
          gain.gain.exponentialRampToValueAtTime(vol, now + t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + t);
          osc.stop(now + t + d);
        });
        setTimeout(() => { try { ctx.close(); } catch {} }, 750);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
        setTimeout(() => { try { ctx.close(); } catch {} }, 250);
      }
    } catch {}
  }

  function notifyTurnComplete(summaryText) {
    try {
      const isHidden = document.hidden || !document.hasFocus();
      playChime("done", isHidden);

      if (isHidden) {
        try {
          chrome.runtime.sendMessage({
            type: "show_notification",
            title: "ZXScript × Roblox Studio",
            message: summaryText || "AI ทำงานและรันคำสั่งเสร็จสิ้นแล้ว!",
          }, () => void chrome.runtime.lastError);
        } catch {}

        try {
          if (!window.__zsTitleFlashing) {
            window.__zsTitleFlashing = true;
            const origTitle = document.title;
            let isAlert = false;
            const flashTimer = setInterval(() => {
              if (!document.hidden && document.hasFocus()) {
                clearInterval(flashTimer);
                window.__zsTitleFlashing = false;
                document.title = origTitle;
                return;
              }
              isAlert = !isAlert;
              document.title = isAlert ? "[งานเสร็จแล้ว] ZXScript" : origTitle;
            }, 900);

            const stopFlash = () => {
              clearInterval(flashTimer);
              window.__zsTitleFlashing = false;
              document.title = origTitle;
              window.removeEventListener("focus", stopFlash);
              document.removeEventListener("visibilitychange", stopFlash);
            };
            window.addEventListener("focus", stopFlash);
            document.addEventListener("visibilitychange", stopFlash);
          }
        } catch {}
      }
    } catch {}
  }

  const ZSSound = (() => {
    let audioCtx = null;
    let enabled = true;
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({ soundEnabled: true }, (res) => {
          if (typeof res.soundEnabled === "boolean") enabled = res.soundEnabled;
        });
      }
    } catch {}

    function getAudioContext() {
      if (!audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) audioCtx = new AudioCtx();
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    }

    function play(type = "done") {
      if (!enabled) return;
      playChime(type);
    }

    return {
      play,
      setEnabled: (v) => { enabled = !!v; },
      isEnabled: () => enabled,
    };
  })();

  try {
    window.__ZS_PLAY_CHIME__ = playChime;
  } catch {}

  Object.assign(window.ZS, {
    playChime,
    notifyTurnComplete,
    ZSSound,
  });
  window.ZS.audio = window.ZS;

  window.playChime = playChime;
  window.notifyTurnComplete = notifyTurnComplete;
  window.ZSSound = ZSSound;
})();

