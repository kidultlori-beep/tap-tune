/**
 * Finger Garden — 手势花园
 * Static SPA: camera + MediaPipe Hands globals + Three.js particles.
 */

import { FINGER_MAP, FINGER_TYPES, MILESTONE_EVERY } from "./config.js";
import { GardenAudio } from "./audio.js";
import { CameraFeed, isDemoQuery, isFastQuery } from "./camera.js";
import { PinchDetector } from "./pinch.js";
import { Garden } from "./garden.js";
import { Overlays } from "./overlays.js";
import { HandsTracker, hasWebGL } from "./hands-tracker.js";
import { DemoHands } from "./demo.js";
import { createFX } from "./fx.js";

const $ = (id) => document.getElementById(id);

const ui = {
  app: $("app"),
  stage: $("stage"),
  video: $("camera"),
  gardenCanvas: $("garden-canvas"),
  emojiLayer: $("emoji-layer"),
  notesLayer: $("notes-layer"),
  crittersLayer: $("critters-layer"),
  start: $("start-screen"),
  startCard: $("start-card"),
  startActions: $("start-actions"),
  btnStart: $("btn-start"),
  btnDemo: $("btn-demo"),
  btnRetry: $("btn-retry"),
  status: $("start-status"),
  fallback: $("fallback-copy"),
  hud: $("hud"),
  bloomCount: $("bloom-count"),
  btnMute: $("btn-mute"),
  demoDock: $("demo-dock"),
  toast: $("toast"),
  fxRoot: $("fx-root"),
};

const audio = new GardenAudio();
const garden = new Garden(ui.gardenCanvas);
const overlays = new Overlays({
  emojiLayer: ui.emojiLayer,
  notesLayer: ui.notesLayer,
  crittersLayer: ui.crittersLayer,
});
const pinch = new PinchDetector();

let fx = null;
let camera = null;
let tracker = null;
let demo = null;
let mode = "idle"; // idle | live | demo
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
      "没有摄像头权限。请在浏览器设置中允许摄像头，或改用演示模式。<br /><span class='hint'>也可打开 <code>/?demo=1</code></span>";
  } else if (reason === "unsupported") {
    ui.fallback.innerHTML =
      "此浏览器无法使用摄像头。请改用演示模式，或在 HTTPS / localhost 下打开页面。";
  } else {
    ui.fallback.innerHTML =
      "没有找到可用摄像头。仍可进入演示花园，点击下方花种播种。";
  }
  setStatus("");
}

function layout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  garden.resize(w, h);
  fx?.resize(w, h);
}

function setHudBloom() {
  ui.bloomCount.textContent = String(garden.bloomCount);
}

function enterGardenChrome({ demo = false, keepCamera = false } = {}) {
  ui.start.classList.add("is-hidden");
  ui.hud.hidden = false;
  ui.app.classList.toggle("is-demo", demo && !keepCamera);
  ui.demoDock.hidden = !demo;
  ui.video.classList.toggle("is-off", !keepCamera);
  ui.stage.classList.toggle("demo-stage", !keepCamera);
}

function sowFromPinch(event) {
  const spec = FINGER_MAP[event.key];
  if (!spec) return;
    const plant = garden.sow(event.key, event.x, event.y, { fast: isFastQuery() });
  fx?.sow(event.x, event.y, spec.petalHi);
  const { frequent } = audio.playFinger(spec.freq);
  overlays.spawnNotes(event.x, event.y, frequent ? (3 + Math.floor(Math.random() * 3)) : 1);
  return plant;
}

function handleGardenEvents(events) {
  for (const ev of events) {
    const p = ev.plant;
    const color = p.spec.petal;
    if (ev.type === "germinate") {
      fx?.sow(p.x, p.y, p.spec.center);
    } else if (ev.type === "bloom") {
      const topY = p.y - p.height;
      fx?.bloom(p.x, topY, color);
      setHudBloom();
      const reached = Math.floor(garden.bloomCount / MILESTONE_EVERY);
      if (reached > lastMilestone) {
        lastMilestone = reached;
        overlays.milestoneFlyby();
        toast(`绽放 ${garden.bloomCount} 朵 · 蝶鸟飞过`);
      }
    } else if (ev.type === "wind") {
      fx?.wind(p.x, p.y - p.height, color);
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
  garden.draw(now);
  fx?.update(dt);

  requestAnimationFrame(frame);
}

async function bootFX() {
  if (fx) return;
  fx = await createFX(ui.fxRoot);
  layout();
}

async function startLive() {
  setStatus("正在请求摄像头…");
  ui.btnStart.disabled = true;
  await audio.unlock();
  await bootFX();

  camera = new CameraFeed(ui.video);
  try {
    await camera.start();
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
    await tracker.init();
  } catch (err) {
    console.warn(err);
    mode = "hybrid";
    enterGardenChrome({ demo: true, keepCamera: true });
    beginLoop();
    toast("手势追踪不可用，摄像头仍可作为花园背景；点击花种播种");
    return;
  }

  mode = "live";
  enterGardenChrome({ demo: false, keepCamera: true });
  tracker.start();
  beginLoop();
  toast("对着镜头，捏合拇指与手指播种");
}

function beginLoop() {
  if (running) return;
  running = true;
  lastT = performance.now();
  requestAnimationFrame(frame);
}

async function startDemo(fromQuery = false) {
  if (!fromQuery) await audio.unlock();
  await bootFX();
  if (camera) camera.stop();
  if (tracker) tracker.stop();
  pinch.reset();
  demo = new DemoHands();
  mode = "demo";
  enterGardenChrome({ demo: true, keepCamera: false });
  beginLoop();
  toast(fromQuery ? "演示模式 /?demo=1" : "演示模式：点击花种或等待自动捏合");
}

function buildDemoDock() {
  ui.demoDock.innerHTML = "";
  const label = document.createElement("span");
  label.className = "dock-label";
  label.textContent = "演示播种";
  ui.demoDock.appendChild(label);
  for (const key of FINGER_TYPES) {
    const spec = FINGER_MAP[key];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "seed-btn";
    btn.title = `${spec.label} · ${spec.note}`;
    btn.innerHTML = `<span>${spec.emoji}</span>`;
    btn.addEventListener("click", async () => {
      await audio.unlock();
      const x = window.innerWidth * (spec.hand === "Left" ? 0.33 : 0.67);
      const y = window.innerHeight * 0.52;
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
    ui.btnMute.setAttribute("aria-label", muted ? "打开声音" : "静音");
    ui.btnMute.classList.toggle("is-muted", muted);
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
    if (e.target.closest("button")) return;
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
    get fxMode() {
      return fx?.mode || null;
    },
    sow(key, x, y) {
      return sowFromPinch({
        key,
        x: x ?? window.innerWidth * 0.5,
        y: y ?? window.innerHeight * 0.5,
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
