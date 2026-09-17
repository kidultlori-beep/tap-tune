/**
 * Finger Garden
 * Static SPA: camera + MediaPipe Hands globals + pinch-to-plant garden.
 * Camera garden only — query flags such as ?demo=1 are ignored.
 */

import { FINGER_MAP, MILESTONE_EVERY } from "./config.js";
import { GardenAudio } from "./audio.js";
import { CameraFeed, canSwitchCamera } from "./camera.js";
import { PinchDetector } from "./pinch.js";
import { Garden } from "./garden.js";
import { Overlays } from "./overlays.js";
import { HandsTracker, hasWebGL } from "./hands-tracker.js";
import { BeautyFilter, readBeautyPref, writeBeautyPref } from "./beauty.js";

const $ = (id) => document.getElementById(id);

const ui = {
  app: $("app"),
  stage: $("stage"),
  video: $("camera"),
  pileLayer: $("pile-layer"),
  emojiLayer: $("emoji-layer"),
  notesLayer: $("notes-layer"),
  crittersLayer: $("critters-layer"),
  start: $("start-screen"),
  btnStart: $("btn-start"),
  btnRetry: $("btn-retry"),
  status: $("start-status"),
  fallback: $("fallback-copy"),
  hud: $("hud"),
  bloomCount: $("bloom-count"),
  btnBeauty: $("btn-beauty"),
  beautyCanvas: $("beauty"),
  btnMute: $("btn-mute"),
  btnFlip: $("btn-flip"),
  toast: $("toast"),
};

const audio = new GardenAudio();
const garden = new Garden(ui.pileLayer);
const overlays = new Overlays({
  emojiLayer: ui.emojiLayer,
  notesLayer: ui.notesLayer,
  crittersLayer: ui.crittersLayer,
});
const pinch = new PinchDetector();

let camera = null;
let tracker = null;
let beauty = null;
let mode = "idle"; // idle | live
let lastHands = [];
let lastT = performance.now();
let lastMilestone = 0;
let running = false;

function toast(msg) {
  ui.toast.textContent = msg;
  ui.toast.classList.add("is-on");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => ui.toast.classList.remove("is-on"), 2800);
}

function setStatus(text) {
  ui.status.textContent = text || "";
}

function showFallback(reason) {
  ui.fallback.hidden = false;
  ui.btnRetry.hidden = false;
  ui.btnStart.hidden = true;
  if (reason === "denied") {
    ui.fallback.textContent =
      "Camera permission is off. Allow the camera in your browser settings, then tap Retry.";
  } else if (reason === "unsupported") {
    ui.fallback.textContent =
      "This browser cannot use the camera. Open this page over HTTPS on a phone, or localhost on a computer.";
  } else {
    ui.fallback.textContent =
      "No camera found. Connect a camera or try again on a phone over HTTPS.";
  }
  setStatus("");
}

function layout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  garden.resize(w, h, 52);
  beauty?.resize();
}

function setBeautyUi(on) {
  ui.btnBeauty.classList.toggle("is-on", on);
  ui.btnBeauty.classList.toggle("is-off", !on);
  ui.btnBeauty.setAttribute("aria-pressed", on ? "true" : "false");
  ui.btnBeauty.setAttribute("aria-label", on ? "Beauty filter on" : "Beauty filter off");
}

function setHudBloom() {
  ui.bloomCount.textContent = String(garden.bloomCount);
}

function enterGardenChrome() {
  ui.start.classList.add("is-hidden");
  ui.hud.hidden = false;
  ui.app.classList.add("in-garden");
  ui.video.classList.remove("is-off");
  layout();
}

function sowFromPinch(event) {
  const spec = FINGER_MAP[event.key];
  if (!spec) return;
  const plant = garden.sow(event.key, event.x, event.y);
  audio.playFinger(spec.freq);
  return plant;
}

function handleGardenEvents(events) {
  for (const ev of events) {
    if (ev.type === "bloom") {
      setHudBloom();
      const reached = Math.floor(garden.bloomCount / MILESTONE_EVERY);
      if (reached > lastMilestone) {
        lastMilestone = reached;
        overlays.milestoneFlyby();
        toast(`Bloom ${garden.bloomCount} · butterflies pass by`);
      }
    } else if (ev.type === "fade") {
      overlays.spawnSparkleBurst(ev.x, ev.y, 5 + Math.floor(Math.random() * 3));
    }
  }
}

function frame(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  beauty?.draw();

  const sowed = pinch.update(lastHands);
  for (const s of sowed) sowFromPinch(s);

  const pinching = {};
  for (const [key, st] of pinch.state) {
    const finger = key.split("-")[1];
    const hand = key.split("-")[0];
    if (!pinching[hand]) pinching[hand] = {};
    pinching[hand][finger] = st.pinching;
  }
  const overlayHands = lastHands.map((h) => ({
    ...h,
    pinching: pinching[h.hand] || {},
  }));
  overlays.syncFingertips(overlayHands);
  overlays.prune();

  const events = garden.update(dt);
  handleGardenEvents(events);

  requestAnimationFrame(frame);
}

function syncTrackerMirror() {
  if (tracker && camera) tracker.mirrored = camera.mirrored;
}

async function startLive() {
  setStatus("Asking for the camera…");
  ui.btnStart.disabled = true;
  await audio.unlock();

  camera = new CameraFeed(ui.video);
  try {
    await camera.start("user");
  } catch (err) {
    ui.btnStart.disabled = false;
    showFallback(err.code || "unavailable");
    return;
  }

  mode = "live";
  beauty = new BeautyFilter(ui.video, ui.beautyCanvas);
  const glOk = beauty.init();
  if (!glOk) {
    ui.btnBeauty.hidden = true;
    toast("Beauty filter unavailable — showing the raw camera.");
  } else {
    ui.btnBeauty.hidden = false;
    const on = readBeautyPref();
    beauty.setEnabled(on);
    beauty.syncMirror(camera.mirrored);
    setBeautyUi(on);
  }

  enterGardenChrome();
  beginLoop();

  try {
    if (!hasWebGL() || typeof window.Hands !== "function") {
      throw new Error("hands-unavailable");
    }
    tracker = new HandsTracker({
      video: ui.video,
      onHands: ({ hands }) => {
        lastHands = hands;
      },
      onStatus: setStatus,
    });
    tracker.mirrored = camera.mirrored;
    await tracker.init();
    tracker.start();
    toast("Pinch thumb and finger to plant");
  } catch (err) {
    console.warn(err);
    toast("Camera is on, but hand tracking could not start.");
  }
}

function beginLoop() {
  if (running) return;
  running = true;
  lastT = performance.now();
  requestAnimationFrame(frame);
}

function bind() {
  window.alert = (msg) => {
    console.warn("[alert]", msg);
  };
  ui.btnStart.addEventListener("click", () => startLive());
  ui.btnRetry.addEventListener("click", () => {
    ui.fallback.hidden = true;
    ui.btnRetry.hidden = true;
    ui.btnStart.hidden = false;
    ui.btnStart.disabled = false;
    setStatus("");
    startLive();
  });

  ui.btnMute.addEventListener("click", async () => {
    await audio.unlock();
    const muted = audio.toggleMute();
    ui.btnMute.textContent = muted ? "🔇" : "🔊";
    ui.btnMute.setAttribute("aria-label", muted ? "Unmute" : "Mute");
    ui.btnMute.classList.toggle("is-muted", muted);
  });

  ui.btnFlip.addEventListener("click", async () => {
    if (!camera || !camera.stream || !canSwitchCamera()) return;
    const result = await camera.flip();
    if (result.flipped) {
      syncTrackerMirror();
      beauty?.syncMirror(camera.mirrored);
    }
  });

  ui.btnBeauty.addEventListener("click", () => {
    if (!beauty?.available) return;
    const next = !beauty.enabled;
    beauty.setEnabled(next);
    writeBeautyPref(next);
    setBeautyUi(next);
    toast(next ? "Beauty on" : "Beauty off · raw camera");
  });

  window.addEventListener("resize", layout);
  window.addEventListener("orientationchange", () => setTimeout(layout, 250));

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!e.target.closest("button, a, .start-card")) e.preventDefault();
    },
    { passive: false }
  );

  layout();

  window.FingerGarden = {
    get mode() {
      return mode;
    },
    get bloomCount() {
      return garden.bloomCount;
    },
    get beautyOn() {
      return !!beauty?.enabled;
    },
  };
}

bind();
