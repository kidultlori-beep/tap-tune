/** Finger Garden — finger type → plant emoji. Pitch is screen-space, not anatomy. */

export const TIP_INDEX = {
  thumb: 4,
  index: 8,
  middle: 12,
  ring: 16,
  pinky: 20,
};

export const NON_THUMB_FINGERS = ["index", "middle", "ring", "pinky"];

export const HANDS = ["Left", "Right"];

/** 8 finger types: handedness × non-thumb finger */
export const FINGER_TYPES = HANDS.flatMap((hand) =>
  NON_THUMB_FINGERS.map((finger) => `${hand}-${finger}`)
);

/**
 * Sowable plant glyphs (plain Unicode only). Mix — not flowers-only.
 * 🌺🌸🌼🌻🌹🪻🌷🍄‍🟫🍄🍁🍂🍀☘️🌿🎄🌟🫧
 */
export const PLANT_POOL = [
  "🌺",
  "🌸",
  "🌼",
  "🌻",
  "🌹",
  "🪻",
  "🌷",
  "🍄‍🟫",
  "🍄",
  "🍁",
  "🍂",
  "🍀",
  "☘️",
  "🌿",
  "🎄",
  "🌟",
  "🫧",
];

/** Thin pastel stems — not neon, not particle fog. */
export const STEM_COLORS = [
  "#f4b4c8",
  "#f7d58a",
  "#9ed4b0",
  "#b7d8f2",
  "#d7c2f0",
  "#f3c4a4",
  "#c5e6a8",
  "#e8b8d4",
  "#a8dcd4",
  "#f0d0a8",
];

/**
 * Plant overlays only. MediaPipe handedness is the person's physical hand.
 * Pitch is NOT stored here — see SCREEN_SCALE / pitchForPinch.
 */
export const FINGER_MAP = {
  "Left-index": {
    key: "Left-index",
    hand: "Left",
    finger: "index",
    label: "Left index",
    emoji: "🌸",
  },
  "Left-middle": {
    key: "Left-middle",
    hand: "Left",
    finger: "middle",
    label: "Left middle",
    emoji: "🌼",
  },
  "Left-ring": {
    key: "Left-ring",
    hand: "Left",
    finger: "ring",
    label: "Left ring",
    emoji: "🌺",
  },
  "Left-pinky": {
    key: "Left-pinky",
    hand: "Left",
    finger: "pinky",
    label: "Left pinky",
    emoji: "🌷",
  },
  "Right-index": {
    key: "Right-index",
    hand: "Right",
    finger: "index",
    label: "Right index",
    emoji: "🌻",
  },
  "Right-middle": {
    key: "Right-middle",
    hand: "Right",
    finger: "middle",
    label: "Right middle",
    emoji: "🌹",
  },
  "Right-ring": {
    key: "Right-ring",
    hand: "Right",
    finger: "ring",
    label: "Right ring",
    emoji: "🪻",
  },
  "Right-pinky": {
    key: "Right-pinky",
    hand: "Right",
    finger: "pinky",
    label: "Right pinky",
    emoji: "🍀",
  },
};

/**
 * On-screen left → right among visible non-thumb tips.
 * Rank 0 is the left edge of the picture (after selfie mirroring).
 * A4 = 440 Hz equal temperament.
 */
export const SCREEN_SCALE = [
  { note: "A4", freq: 440.0 },
  { note: "C5", freq: 523.25 },
  { note: "D5", freq: 587.33 },
  { note: "E5", freq: 659.25 },
  { note: "F5", freq: 698.46 },
  { note: "G5", freq: 783.99 },
  { note: "A5", freq: 880.0 },
  { note: "B5", freq: 987.77 },
];

export function listVisibleNonThumbTips(hands) {
  const tips = [];
  if (!hands) return tips;
  for (const hand of hands) {
    for (const finger of NON_THUMB_FINGERS) {
      const tip = hand.tips?.[finger];
      if (!tip || !Number.isFinite(tip.x)) continue;
      tips.push({
        key: fingerKey(hand.hand, finger),
        x: tip.x,
        y: Number.isFinite(tip.y) ? tip.y : 0,
      });
    }
  }
  return tips;
}

export function rankTipsLeftToRight(hands) {
  return listVisibleNonThumbTips(hands).sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    if (a.y !== b.y) return a.y - b.y;
    return a.key.localeCompare(b.key);
  });
}

/** Pitch for a pinched non-thumb tip from its current screen-X rank. */
export function pitchForPinch(hands, key) {
  const ranked = rankTipsLeftToRight(hands);
  let i = ranked.findIndex((t) => t.key === key);
  if (i < 0) i = 0;
  i = Math.min(i, SCREEN_SCALE.length - 1);
  const step = SCREEN_SCALE[i];
  return { note: step.note, freq: step.freq, index: i };
}

export const MILESTONE_EVERY = 20;
export const MAX_PLANTS = 28;

/** localStorage key for the garden camera look. */
export const FILTER_STORAGE_KEY = "finger-garden-filter";
/** Legacy on/off key — migrated into FILTER_STORAGE_KEY. */
export const BEAUTY_STORAGE_KEY = "finger-garden-beauty";

export const MEDIAPIPE = {
  handsVersion: "0.4.1675469240",
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
};

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

export function pick(list) {
  return list[(Math.random() * list.length) | 0];
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

export function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

export function fingerKey(hand, finger) {
  return `${hand}-${finger}`;
}

/** Mix from the sowable pool (not flowers-only). */
export function pickDropEmoji() {
  return pick(PLANT_POOL);
}
