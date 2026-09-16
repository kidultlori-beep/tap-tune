/** DOM overlays: fingertip plants, floating notes, milestone fly-by. */

import { FINGER_MAP, NON_THUMB_FINGERS, fingerKey, pick, rand } from "./config.js";

const NOTE_EMOJIS = ["🎵", "🎶", "♩", "♪", "♫"];
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
    this._critters = [];
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
        el.style.transform = `translate(${tip.x}px, ${tip.y}px) translate(-50%, -50%) scale(${pinching ? 1.25 : 1})`;
        el.style.opacity = "1";
      }
    }
    for (const [key, el] of this.tips) {
      if (!seen.has(key)) {
        el.style.opacity = "0";
        el.style.transform += " scale(0.6)";
      }
    }
  }

  spawnNotes(x, y, count = 1) {
    const n = Math.max(1, count);
    for (let i = 0; i < n; i++) {
      const el = document.createElement("div");
      el.className = "float-note";
      el.textContent = pick(NOTE_EMOJIS);
      const dx = rand(-36, 36);
      const dur = rand(1.1, 1.8);
      el.style.left = `${x + dx}px`;
      el.style.top = `${y}px`;
      el.style.animationDuration = `${dur}s`;
      el.style.fontSize = `${rand(18, 28)}px`;
      this.notesLayer.appendChild(el);
      const rec = { el, born: performance.now(), life: dur * 1000 };
      this._nodes.push(rec);
      setTimeout(() => el.remove(), dur * 1000 + 40);
    }
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
