/**
 * Emoji drop pile: gravity from the pinch, settle and stack on the floor.
 * Plain Unicode glyphs only — no stems, no custom flower art, no particle fog.
 */

import { FINGER_MAP, MAX_DROPS, clamp, pickDropEmoji, rand } from "./config.js";

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

  sow(fingerKey, x, y) {
    const spec = FINGER_MAP[fingerKey] || FINGER_MAP["Left-index"];
    const emoji = pickDropEmoji(spec);
    const size = rand(28, 40);
    const el = document.createElement("div");
    el.className = "drop-emoji";
    el.textContent = emoji;
    el.style.fontSize = `${Math.round(size)}px`;
    this.layer.appendChild(el);

    const item = {
      id: this._id++,
      el,
      key: spec.key,
      emoji,
      x: clamp(x, 18, this.width - 18),
      y,
      vx: rand(-70, 70),
      vy: rand(-40, 80),
      size,
      r: size * 0.4,
      rot: rand(-25, 25),
      vr: rand(-140, 140),
      settled: false,
      counted: false,
    };
    this.items.push(item);
    syncEl(item);

    while (this.items.length > MAX_DROPS) {
      const oldest = this.items.shift();
      oldest.el.remove();
    }
    return item;
  }

  update(dt) {
    const events = [];
    const floor = this.height - this.floorInset;
    const gdt = GRAVITY * dt;

    for (const p of this.items) {
      if (p.settled) continue;

      p.vy += gdt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.vr *= 0.992;
      p.vx *= 0.997;

      const minX = p.r + 6;
      const maxX = this.width - p.r - 6;
      if (p.x < minX) {
        p.x = minX;
        p.vx = Math.abs(p.vx) * 0.28;
      } else if (p.x > maxX) {
        p.x = maxX;
        p.vx = -Math.abs(p.vx) * 0.28;
      }

      const restY = stackRestY(this.items, p, floor);
      if (p.y >= restY) {
        p.y = restY;
        if (p.vy > REST_VY) {
          p.vy *= -0.16;
          p.vx *= 0.5;
        } else {
          p.vy = 0;
          p.vx *= 0.35;
          if (Math.abs(p.vx) < 18) {
            p.settled = true;
            p.vx = 0;
            p.vr *= 0.2;
            if (!p.counted) {
              p.counted = true;
              this.bloomCount += 1;
              events.push({ type: "land", item: p });
            }
          }
        }
      }
      syncEl(p);
    }

    return events;
  }
}

export function stackRestY(items, p, floor) {
  let y = floor - p.r;
  for (const o of items) {
    if (o === p || !o.settled) continue;
    const dx = Math.abs(p.x - o.x);
    const touch = p.r + o.r - 6;
    if (dx < touch) {
      const top = o.y - touch * 0.82;
      if (top < y) y = top;
    }
  }
  return y;
}

function syncEl(p) {
  p.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) rotate(${p.rot}deg)`;
}
