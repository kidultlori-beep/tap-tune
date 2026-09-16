/** Demo skeleton that feeds the same pinch pipeline without a camera. */

import { NON_THUMB_FINGERS, TIP_INDEX, rand } from "./config.js";
import { collectTips, handScale } from "./pinch.js";

const TIP_BY_NAME = {
  index: TIP_INDEX.index,
  middle: TIP_INDEX.middle,
  ring: TIP_INDEX.ring,
  pinky: TIP_INDEX.pinky,
};

export class DemoHands {
  constructor() {
    this.t = 0;
    this.forceUntil = 0;
    this.forceKey = null;
    this.auto = {
      "Left-index": rand(3, 7),
      "Left-middle": rand(5, 9),
      "Left-ring": rand(6, 11),
      "Left-pinky": rand(4, 10),
      "Right-index": rand(3.5, 8),
      "Right-middle": rand(4, 9),
      "Right-ring": rand(7, 12),
      "Right-pinky": rand(5, 10),
    };
  }

  /** Ask the skeleton to pinch a finger type for a short burst. */
  requestPinch(key) {
    this.forceKey = key;
    this.forceUntil = this.t + 0.45;
  }

  update(dt, w, h) {
    this.t += dt;
    for (const key of Object.keys(this.auto)) {
      this.auto[key] -= dt;
      if (this.auto[key] < -0.55) this.auto[key] = rand(5, 12);
    }

    const leftPinch = this._activeFinger("Left");
    const rightPinch = this._activeFinger("Right");

    return [
      this._hand("Left", w * 0.33, h * 0.6, w, h, leftPinch),
      this._hand("Right", w * 0.67, h * 0.58, w, h, rightPinch),
    ];
  }

  _activeFinger(hand) {
    if (this.forceKey && this.t < this.forceUntil && this.forceKey.startsWith(hand)) {
      return this.forceKey.split("-")[1];
    }
    for (const finger of NON_THUMB_FINGERS) {
      const key = `${hand}-${finger}`;
      if (this.auto[key] < 0.28 && this.auto[key] > 0) return finger;
    }
    return null;
  }

  _hand(label, cx, cy, w, h, pinchFinger) {
    const dir = label === "Left" ? 1 : -1;
    const bob = Math.sin(this.t * 1.25 + dir) * 16;
    const drift = Math.cos(this.t * 0.55 + dir) * 20;
    const origin = { x: cx + drift, y: cy + bob };
    const span = Math.min(w, h) * 0.048;

    const lm = new Array(21);
    lm[0] = { x: origin.x, y: origin.y, z: 0 };

    const cols = [
      { name: "thumb", from: 1, ang: (-75 * Math.PI) / 180, len: span * 1.45 },
      { name: "index", from: 5, ang: (-18 * Math.PI) / 180, len: span * 2.1 },
      { name: "middle", from: 9, ang: (4 * Math.PI) / 180, len: span * 2.3 },
      { name: "ring", from: 13, ang: (22 * Math.PI) / 180, len: span * 2.05 },
      { name: "pinky", from: 17, ang: (40 * Math.PI) / 180, len: span * 1.7 },
    ];

    for (const col of cols) {
      const ang = col.ang * dir;
      const curling = pinchFinger && col.name === pinchFinger ? 0.2 : 1;
      for (let i = 0; i < 4; i++) {
        const u = (i + 1) / 4;
        lm[col.from + i] = {
          x: origin.x + Math.sin(ang) * col.len * u,
          y: origin.y - Math.cos(ang) * col.len * u * curling,
          z: 0,
        };
      }
    }

    if (pinchFinger) {
      const tip = lm[TIP_BY_NAME[pinchFinger]];
      if (tip) {
        lm[4] = { x: tip.x + 2 * dir, y: tip.y + 2, z: 0 };
        lm[3] = {
          x: (lm[2].x + lm[4].x) / 2,
          y: (lm[2].y + lm[4].y) / 2,
          z: 0,
        };
      }
    }

    const tips = collectTips(lm, (pt) => ({ x: pt.x, y: pt.y }));
    return {
      hand: label,
      landmarks: lm,
      tips,
      scale: handScale(tips),
    };
  }
}
