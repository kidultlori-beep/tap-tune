/** DOM overlays: fingertip glyphs, tiny ✨, ambient 🦋/🐦. */

import { FINGER_MAP, NON_THUMB_FINGERS, fingerKey, pick, rand, randInt } from "./config.js";

const CRITTER_GLYPHS = ["🦋", "🦋", "🦋", "🐦"];
const CRITTER_DIRS = ["ltr", "rtl", "diag-ltr", "diag-rtl"];

export class Overlays {
  constructor({ emojiLayer, notesLayer, crittersLayer }) {
    this.emojiLayer = emojiLayer;
    this.notesLayer = notesLayer;
    this.crittersLayer = crittersLayer;
    /** @type {Map<string, HTMLElement>} */
    this.tips = new Map();
    this._nodes = [];
    this._lastDir = null;
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

  /** Tiny rising sparkle — emoji only, not a particle system. */
  spawnSparkle(x, y) {
    this._sparkleAt(x, y, rand(12, 18));
  }

  /** Burst of ✨ when a plant dissipates. */
  spawnSparkleBurst(x, y, count = 5) {
    const n = Math.max(3, count);
    for (let i = 0; i < n; i++) {
      this._sparkleAt(x + rand(-28, 28), y + rand(-40, 24), rand(14, 22));
    }
  }

  _sparkleAt(x, y, size) {
    const el = document.createElement("div");
    el.className = "float-sparkle";
    el.textContent = "✨";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    const dur = rand(0.65, 1.2);
    el.style.animationDuration = `${dur}s`;
    el.style.fontSize = `${size}px`;
    this.notesLayer.appendChild(el);
    const rec = { el, born: performance.now(), life: dur * 1000 };
    this._nodes.push(rec);
    setTimeout(() => el.remove(), dur * 1000 + 40);
  }

  /** Brief note letter at the pinch (A C D E F G A B). */
  flashNote(x, y, letter) {
    if (!letter) return;
    const el = document.createElement("div");
    el.className = "note-flash";
    el.textContent = letter;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.notesLayer.appendChild(el);
    const life = 720;
    const rec = { el, born: performance.now(), life };
    this._nodes.push(rec);
    setTimeout(() => el.remove(), life + 40);
  }

  _pickDir() {
    const choices = CRITTER_DIRS.filter((d) => d !== this._lastDir);
    const dir = pick(choices.length ? choices : CRITTER_DIRS);
    this._lastDir = dir;
    return dir;
  }

  /** One butterfly or bird, random direction, ~2s then gone. */
  spawnCritter() {
    const dir = this._pickDir();
    const el = document.createElement("div");
    el.className = `critter critter-${dir}`;
    el.textContent = pick(CRITTER_GLYPHS);
    const h = window.innerHeight || 800;
    el.style.top = `${h * rand(0.12, 0.7)}px`;
    const dur = rand(1.85, 2.15);
    const dy = dir.startsWith("diag") ? rand(-90, 90) : rand(-22, 22);
    el.style.setProperty("--dur", `${dur}s`);
    el.style.setProperty("--dy", `${dy}px`);
    el.style.setProperty("--scale", String(rand(1.05, 1.55)));
    this.crittersLayer.appendChild(el);
    setTimeout(() => el.remove(), dur * 1000 + 80);
    return dir;
  }

  /** Bloom milestone: a few randomized critters, not a scripted parade. */
  milestoneFlyby() {
    const n = randInt(1, 3);
    for (let i = 0; i < n; i++) {
      setTimeout(() => this.spawnCritter(), i * 260);
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
