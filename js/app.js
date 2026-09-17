/**
 * Finger Garden
 * Static SPA: camera + MediaPipe Hands globals + emoji drop pile.
 */

import { FINGER_MAP, FINGER_TYPES, MILESTONE_EVERY } from "./config.js";
import { GardenAudio } from "./audio.js";
import { CameraFeed, canSwitchCamera, isDemoQuery, isFastQuery } from "./camera.js";
import { PinchDetector } from "./pinch.js";
import { Garden } from "./garden.js";
import { Overlays } from "./overlays.js";
import { HandsTracker, hasWebGL } from "./hands-tracker.js";
import { DemoHands } from "./demo.js";

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
  btnDemo: $("btn-demo"),
  btnRetry: $("btn-retry"),
  status: $("start-status"),
  fallback: $("fallback-copy"),
  hud: $("hud"),
  bloomCount: $("bloom-count"),
  btnMute: $("btn-mute"),
  btnFlip: $("btn-flip"),
  demoDock: $("demo-dock"),
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
let demo = null;
let mode = "idle"; // idle | live | demo | hybrid
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
    ui.fallback.innerHTML =
      "Camera permission is off. Allow the camera in browser settings, or use Demo mode.<br /><span class='hint'>You can also open <code>/?demo=1</code></span>";
  } else if (reason === "unsupported") {
    ui.fallback.innerHTML =
      "This browser cannot use the camera. Try Demo mode, or open the page over HTTPS / localhost.";
  } else {
    ui.fallback.innerHTML =
      "No camera found. You can still enter the demo garden and tap to plant.";
  }
  setStatus("");
}

function floorInset() {
  const dock = !ui.demoDock.hidden ? 58 : 22;
  const twitter = 32;
  return dock + twitter;
}

function layout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  garden.resize(w, h, floorInset());
}

function setHudBloom() {
  ui.bloomCount.textContent = String(garden.bloomCount);
}

function enterGardenChrome({ demoMode = false, keepCamera = false } = {}) {
  ui.start.classList.add("is-hidden");
  ui.hud.hidden = false;
  ui.app.classList.toggle("is-demo", demoMode && !keepCamera);
  ui.app.classList.toggle("has-demo-dock", demoMode);
  ui.demoDock.hidden = !demoMode;
  ui.video.classList.toggle("is-off", !keepCamera);
  ui.stage.classList.toggle("demo-stage", !keepCamera);
  layout();
}

function sowFromPinch(event) {
  const spec = FINGER_MAP[event.key];
  if (!spec) return;
  const plant = garden.sow(event.key, event.x, event.y, { fast: isFastQuery() });
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

  let hands = lastHands;
  if (mode === "demo" && demo) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    hands = demo.update(dt, w, h);
    lastHands = hands;
  }

  const sowed = pinch.update(hands);
  for (const s of sowed) sowFromPinch(s);

  const pinching = {};
  for (const [key, st] of pinch.state) {
    const finger = key.split("-")[1];
    const hand = key.split("-")[0];
    if (!pinching[hand]) pinching[hand] = {};
    pinching[hand][finger] = st.pinching;
  }
  const overlayHands = hands.map((h) => ({
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
  } catch (err) {
    console.warn(err);
    mode = "hybrid";
    enterGardenChrome({ demoMode: true, keepCamera: true });
    beginLoop();
    toast("Hand tracking is unavailable. Camera stays on — tap a seed to plant.");
    return;
  }

  mode = "live";
  enterGardenChrome({ demoMode: false, keepCamera: true });
  tracker.start();
  beginLoop();
  toast("Pinch thumb and finger to plant");
}

function beginLoop() {
  if (running) return;
  running = true;
  lastT = performance.now();
  requestAnimationFrame(frame);
}

async function startDemo(fromQuery = false) {
  if (!fromQuery) await audio.unlock();
  if (camera) camera.stop();
  if (tracker) tracker.stop();
  pinch.reset();
  demo = new DemoHands();
  mode = "demo";
  enterGardenChrome({ demoMode: true, keepCamera: false });
  beginLoop();
  toast(fromQuery ? "Demo mode /?demo=1" : "Demo mode: tap a seed or wait for a pinch");
}

function buildDemoDock() {
  ui.demoDock.innerHTML = "";
  const label = document.createElement("span");
  label.className = "dock-label";
  label.textContent = "Demo sow";
  ui.demoDock.appendChild(label);
  for (const key of FINGER_TYPES) {
    const spec = FINGER_MAP[key];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "seed-btn";
    btn.title = `${spec.label} · ${spec.note}`;
    btn.textContent = spec.emoji;
    btn.addEventListener("click", async () => {
      await audio.unlock();
      const x = window.innerWidth * (spec.hand === "Left" ? 0.33 : 0.67);
      const y = window.innerHeight * 0.38;
      sowFromPinch({
        key,
        x,
        y,
        hand: spec.hand,
        finger: spec.finger,
      });
    });
    ui.demoDock.appendChild(btn);
  }
}

function bind() {
  window.alert = (msg) => {
    console.warn("[alert]", msg);
  };
  ui.btnStart.addEventListener("click", () => startLive());
  ui.btnDemo.addEventListener("click", () => startDemo(false));
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
    if (result.flipped) syncTrackerMirror();
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

  ui.stage.addEventListener("pointerdown", async (e) => {
    if (mode === "live") return;
    if (e.target.closest("button, a")) return;
    await audio.unlock();
    const keys = FINGER_TYPES;
    const key = keys[(Math.random() * keys.length) | 0];
    sowFromPinch({
      key,
      x: e.clientX,
      y: e.clientY,
      hand: key.split("-")[0],
      finger: key.split("-")[1],
    });
  });

  buildDemoDock();
  layout();

  window.FingerGarden = {
    get mode() {
      return mode;
    },
    get bloomCount() {
      return garden.bloomCount;
    },
    sow(key, x, y) {
      return sowFromPinch({
        key,
        x: x ?? window.innerWidth * 0.5,
        y: y ?? window.innerHeight * 0.35,
        hand: key.split("-")[0],
        finger: key.split("-")[1],
      });
    },
  };

  if (isDemoQuery()) {
    startDemo(true);
  }
}

bind();
