/**
 * Pinch drop → floor land → thin pastel stem + top emoji → live 3–5s → fade with ✨.
 * No grainy particle fog. Plain Unicode glyphs only.
 */

import {
  FINGER_MAP,
  MAX_PLANTS,
  STEM_COLORS,
  clamp,
  easeOutCubic,
  pick,
  pickDropEmoji,
  rand,
  randInt,
} from "./config.js";

const GRAVITY = 1650;
const REST_VY = 90;

export class Garden {
  constructor(layer) {
    this.layer = layer;
    this.items = [];
    this.bloomCount = 0;
    this.width = 1;
    this.height = 1;
    this.floorInset = 36;
    this._id = 1;
  }

  resize(w, h, floorInset = 36) {
    this.width = w;
    this.height = h;
    this.floorInset = floorInset;
  }

  sow(fingerKey, x, y, opts = {}) {
    const spec = FINGER_MAP[fingerKey] || FINGER_MAP["Left-index"];
    const emoji = pickDropEmoji();
    const fast = !!opts.fast;
    const wrap = document.createElement("div");
    wrap.className = "plant";
    const stem = document.createElement("div");
    stem.className = "plant-stem";
    const head = document.createElement("div");
    head.className = "plant-head";
    head.textContent = emoji;
    wrap.append(stem, head);
    this.layer.appendChild(wrap);

    const leafCount = Math.random() < 0.72 ? randInt(1, 3) : 0;
    const leaves = [];
    for (let i = 0; i < leafCount; i++) {
      const leaf = document.createElement("div");
      leaf.className = "plant-leaf";
      leaf.textContent = "🌿";
      wrap.appendChild(leaf);
      leaves.push({
        el: leaf,
        along: 0.22 + i * 0.22 + rand(-0.04, 0.06),
        side: i % 2 === 0 ? -1 : 1,
        dx: rand(10, 16),
      });
    }

    const viewH = this.height > 40 ? this.height : window.innerHeight || 800;
    const viewW = this.width > 40 ? this.width : window.innerWidth || 400;
    const floor = viewH - this.floorInset;
    const maxH = Math.max(90, Math.min(viewH * 0.5, floor - 80));
    const minH = Math.max(64, maxH * 0.32);

    const item = {
      id: this._id++,
      wrap,
      stem,
      head,
      leaves,
      key: spec.key,
      emoji,
      x: clamp(x + rand(-14, 14), 22, viewW - 22),
      y,
      vx: rand(-55, 55),
      vy: rand(-30, 70),
      r: 14,
      rot: rand(-18, 18),
      vr: rand(-120, 120),
      phase: "falling",
      phaseT: 0,
      floorY: floor,
      stemH: rand(minH, maxH),
      stemColor: pick(STEM_COLORS),
      growDur: fast ? 0.22 : rand(0.55, 1.05),
      liveDur: fast ? 0.45 : rand(3.0, 5.0),
      fadeDur: fast ? 0.28 : rand(0.55, 0.9),
      sway: rand(0, Math.PI * 2),
      counted: false,
      faded: false,
    };
    stem.style.background = item.stemColor;
    this.items.push(item);
    syncPlant(item, 0);

    if (this.items.length > MAX_PLANTS) {
      const oldest = this.items.find((p) => p.phase === "living");
      if (oldest) {
        oldest.phase = "fading";
        oldest.phaseT = 0;
      } else {
        const gone = this.items.shift();
        gone.wrap.remove();
      }
    }
    return item;
  }

  update(dt) {
    const events = [];
    const floor = this.height - this.floorInset;
    const gdt = GRAVITY * dt;
    const gone = [];

    for (const p of this.items) {
      p.floorY = floor;
      p.phaseT += dt;

      if (p.phase === "falling") {
        p.vy += gdt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.vr *= 0.992;
        p.vx *= 0.997;
        p.x = clamp(p.x, 22, this.width - 22);
        const restY = floor - 8;
        if (p.y >= restY) {
          p.y = restY;
          if (p.vy > REST_VY) {
            p.vy *= -0.14;
            p.vx *= 0.45;
          } else {
            p.y = floor;
            p.vx = 0;
            p.vy = 0;
            p.rot = 0;
            p.phase = "growing";
            p.phaseT = 0;
            events.push({ type: "land", item: p });
          }
        }
        syncPlant(p, 0);
      } else if (p.phase === "growing") {
        const t = Math.min(1, p.phaseT / p.growDur);
        const grow = easeOutCubic(t);
        p.y = floor;
        syncPlant(p, grow);
        if (t >= 1) {
          p.phase = "living";
          p.phaseT = 0;
          if (!p.counted) {
            p.counted = true;
            this.bloomCount += 1;
            events.push({ type: "bloom", item: p });
          }
        }
      } else if (p.phase === "living") {
        p.y = floor;
        p.sway += dt;
        syncPlant(p, 1);
        if (p.phaseT >= p.liveDur) {
          p.phase = "fading";
          p.phaseT = 0;
          events.push({
            type: "fade",
            item: p,
            x: p.x,
            y: p.y - p.stemH * 0.55,
          });
        }
      } else if (p.phase === "fading") {
        const t = Math.min(1, p.phaseT / p.fadeDur);
        p.y = floor;
        syncPlant(p, 1, 1 - t);
        if (t >= 1) gone.push(p.id);
      }
    }

    if (gone.length) {
      this.items = this.items.filter((p) => {
        if (!gone.includes(p.id)) return true;
        p.wrap.remove();
        return false;
      });
    }
    return events;
  }
}

function syncPlant(p, grow, opacity = 1) {
  const sway =
    p.phase === "living" || p.phase === "fading"
      ? Math.sin(p.sway * 1.4) * 2.2
      : 0;
  p.wrap.style.left = `${p.x}px`;
  p.wrap.style.top = `${p.y}px`;
  p.wrap.style.opacity = String(opacity);
  p.wrap.style.transform = `translate(-50%, 0) rotate(${p.phase === "falling" ? p.rot : sway}deg)`;
  p.wrap.style.transformOrigin = "50% 0";

  if (p.phase === "falling") {
    p.stem.style.height = "0px";
    p.head.style.bottom = "0px";
    p.head.style.opacity = "1";
    for (const leaf of p.leaves) leaf.el.style.opacity = "0";
    return;
  }

  const h = p.stemH * grow;
  p.stem.style.height = `${h}px`;
  p.head.style.bottom = `${h}px`;
  p.head.style.opacity = String(Math.min(1, grow * 1.4));
  for (const leaf of p.leaves) {
    const show = grow > leaf.along * 0.85;
    leaf.el.style.opacity = show ? String(Math.min(1, (grow - leaf.along * 0.5) * 2)) : "0";
    leaf.el.style.bottom = `${h * leaf.along}px`;
    leaf.el.style.left = `calc(50% + ${leaf.side * leaf.dx}px)`;
    leaf.el.style.transform = `translate(-50%, 50%) rotate(${leaf.side * 18}deg)`;
  }
}
