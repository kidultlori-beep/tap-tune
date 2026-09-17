/** Pinch detection with hysteresis + one-shot debounce per finger. */

import {
  NON_THUMB_FINGERS,
  TIP_INDEX,
  dist,
  fingerKey,
} from "./config.js";

const ON_RATIO = 0.34;
const OFF_RATIO = 0.48;
const MIN_ON = 18;
const MAX_ON = 64;

export class PinchDetector {
  constructor() {
    /** @type {Map<string, {pinching: boolean, sowed: boolean}>} */
    this.state = new Map();
  }

  /**
   * @param {Array<{hand: string, tips: Record<string, {x:number,y:number}>, scale: number}>} hands
   * @returns {Array<{key: string, hand: string, finger: string, x: number, y: number}>}
   */
  update(hands) {
    const seen = new Set();
    const sowed = [];

    for (const hand of hands) {
      const thumb = hand.tips.thumb;
      if (!thumb) continue;
      const scale = hand.scale || 80;
      const onDist = Math.max(MIN_ON, Math.min(MAX_ON, scale * ON_RATIO));
      const offDist = Math.max(onDist + 8, Math.min(MAX_ON + 20, scale * OFF_RATIO));

      for (const finger of NON_THUMB_FINGERS) {
        const tip = hand.tips[finger];
        if (!tip) continue;
        const key = fingerKey(hand.hand, finger);
        seen.add(key);
        let st = this.state.get(key);
        if (!st) {
          st = { pinching: false, sowed: false };
          this.state.set(key, st);
        }

        const d = dist(thumb.x, thumb.y, tip.x, tip.y);
        if (!st.pinching && d <= onDist) {
          st.pinching = true;
          st.sowed = false;
        } else if (st.pinching && d >= offDist) {
          st.pinching = false;
          st.sowed = false;
        }

        if (st.pinching && !st.sowed) {
          st.sowed = true;
          sowed.push({
            key,
            hand: hand.hand,
            finger,
            x: (thumb.x + tip.x) / 2,
            y: (thumb.y + tip.y) / 2,
          });
        }
      }
    }

    for (const key of [...this.state.keys()]) {
      if (!seen.has(key)) this.state.delete(key);
    }

    return sowed;
  }

  reset() {
    this.state.clear();
  }
}

export function handScale(tips) {
  const wrist = tips.wrist;
  const middle = tips.middleMcp || tips.middle;
  if (!wrist || !middle) return 90;
  return Math.max(40, dist(wrist.x, wrist.y, middle.x, middle.y));
}

export function collectTips(landmarks, toScreen) {
  const tips = {
    wrist: toScreen(landmarks[0]),
    thumb: toScreen(landmarks[TIP_INDEX.thumb]),
    index: toScreen(landmarks[TIP_INDEX.index]),
    middle: toScreen(landmarks[TIP_INDEX.middle]),
    ring: toScreen(landmarks[TIP_INDEX.ring]),
    pinky: toScreen(landmarks[TIP_INDEX.pinky]),
    middleMcp: toScreen(landmarks[9]),
  };
  return tips;
}
