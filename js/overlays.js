/** DOM overlays: fingertip glyphs, tiny ✨, milestone fly-by. */

import { FINGER_MAP, NON_THUMB_FINGERS, fingerKey, rand } from "./config.js";

const BUTTERFLIES = ["🦋", "🦋", "🦋", "🦋", "🦋"];
const BIRD = "🐦";

export class Overlays {
  constructor({ emojiLayer, notesLayer, crittersLayer }) {
    this.emojiLayer = emojiLayer;
    this.notesLayer = notesLayer;
    this.crittersLayer = crittersLayer;
    /** @type {Map<string, HTMLElement>} */
    this.tips = new Map();
    this._nodes = [];
  }

  syncFingertips(hands) {
    const seen = new Set();
    for (const hand of hands) {
      for (const finger of NON_THUMB_FINGERS) {
        const tip = hand.tips[finger];
        if (!tip) continue;
        const key = fingerKey(hand.hand, finger);
        seen.add(key);
        let el = this.tips.get(key);
        if (!el) {
          el = document.createElement("div");
          el.className = "fingertip";
          el.dataset.key = key;
          el.textContent = FINGER_MAP[key]?.emoji || "🌸";
          this.emojiLayer.appendChild(el);
          this.tips.set(key, el);
        }
        const pinching = hand.pinching?.[finger];
        el.classList.toggle("is-pinch", !!pinching);
        el.style.transform = `translate(${tip.x}px, ${tip.y}px) translate(-50%, -50%) scale(${pinching ? 1.2 : 1})`;
        el.style.opacity = "1";
      }
    }
    for (const [key, el] of this.tips) {
      if (!seen.has(key)) {
        el.style.opacity = "0";
      }
    }
  }

  /** Tiny rising sparkle — not a particle system. */
  spawnSparkle(x, y) {
    if (Math.random() > 0.55) return;
    const el = document.createElement("div");
    el.className = "float-sparkle";
    el.textContent = "✨";
    el.style.left = `${x + rand(-10, 10)}px`;
    el.style.top = `${y}px`;
    const dur = rand(0.7, 1.15);
    el.style.animationDuration = `${dur}s`;
    el.style.fontSize = `${rand(12, 18)}px`;
    this.notesLayer.appendChild(el);
    const rec = { el, born: performance.now(), life: dur * 1000 };
    this._nodes.push(rec);
    setTimeout(() => el.remove(), dur * 1000 + 40);
  }

  milestoneFlyby() {
    const h = window.innerHeight;
    const items = [
      ...BUTTERFLIES.map((emoji, i) => ({
        emoji,
        y: h * (0.12 + i * 0.13) + rand(-18, 18),
        delay: i * 0.18,
        dur: rand(3.4, 4.6),
        scale: rand(1.1, 1.6),
        wobble: rand(8, 18),
      })),
      {
        emoji: BIRD,
        y: h * 0.42 + rand(-30, 30),
        delay: 0.35,
        dur: rand(2.8, 3.6),
        scale: rand(1.5, 1.9),
        wobble: 10,
      },
    ];

    for (const item of items) {
      const el = document.createElement("div");
      el.className = "critter";
      el.textContent = item.emoji;
      el.style.top = `${item.y}px`;
      el.style.setProperty("--dur", `${item.dur}s`);
      el.style.setProperty("--delay", `${item.delay}s`);
      el.style.setProperty("--scale", String(item.scale));
      el.style.setProperty("--wobble", `${item.wobble}px`);
      this.crittersLayer.appendChild(el);
      const life = (item.dur + item.delay) * 1000 + 80;
      setTimeout(() => el.remove(), life);
    }
  }

  prune() {
    const now = performance.now();
    this._nodes = this._nodes.filter((n) => {
      if (now - n.born > n.life) {
        n.el.remove();
        return false;
      }
      return true;
    });
  }

  clearTips() {
    for (const el of this.tips.values()) el.remove();
    this.tips.clear();
  }
}
