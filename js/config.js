/** Finger Garden — finger type → plant emoji → pitch */

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

/** Extra plant glyphs that can drop into the floor pile (plain Unicode only). */
export const PLANT_POOL = [
  "🌸",
  "🌼",
  "🌺",
  "🌷",
  "🌻",
  "🌹",
  "🪷",
  "🌱",
  "🌿",
  "🍀",
  "🍃",
  "🌵",
  "🌾",
  "🍄",
  "🪴",
  "🌲",
  "🌳",
  "🌴",
  "🎋",
  "💮",
];

/**
 * Fixed mapping. MediaPipe handedness is the person's physical hand.
 * After selfie mirroring, the person's right hand appears on the right.
 */
export const FINGER_MAP = {
  "Left-index": {
    key: "Left-index",
    hand: "Left",
    finger: "index",
    label: "Left index",
    emoji: "🌸",
    extras: ["🌸", "🌱", "🍀"],
    note: "C5",
    freq: 523.25,
  },
  "Left-middle": {
    key: "Left-middle",
    hand: "Left",
    finger: "middle",
    label: "Left middle",
    emoji: "🌼",
    extras: ["🌼", "🌿", "🌾"],
    note: "D5",
    freq: 587.33,
  },
  "Left-ring": {
    key: "Left-ring",
    hand: "Left",
    finger: "ring",
    label: "Left ring",
    emoji: "🌺",
    extras: ["🌺", "🍄", "🍃"],
    note: "E5",
    freq: 659.25,
  },
  "Left-pinky": {
    key: "Left-pinky",
    hand: "Left",
    finger: "pinky",
    label: "Left pinky",
    emoji: "🌷",
    extras: ["🌷", "🌵", "🌱"],
    note: "G5",
    freq: 783.99,
  },
  "Right-index": {
    key: "Right-index",
    hand: "Right",
    finger: "index",
    label: "Right index",
    emoji: "🌻",
    extras: ["🌻", "🌳", "🌿"],
    note: "A5",
    freq: 880.0,
  },
  "Right-middle": {
    key: "Right-middle",
    hand: "Right",
    finger: "middle",
    label: "Right middle",
    emoji: "🌹",
    extras: ["🌹", "🪴", "🍀"],
    note: "C6",
    freq: 1046.5,
  },
  "Right-ring": {
    key: "Right-ring",
    hand: "Right",
    finger: "ring",
    label: "Right ring",
    emoji: "🪷",
    extras: ["🪷", "🌲", "🍃"],
    note: "D6",
    freq: 1174.66,
  },
  "Right-pinky": {
    key: "Right-pinky",
    hand: "Right",
    finger: "pinky",
    label: "Right pinky",
    emoji: "💮",
    extras: ["💮", "🌴", "🎋"],
    note: "E6",
    freq: 1318.51,
  },
};

export const MILESTONE_EVERY = 20;
export const MAX_DROPS = 90;

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

export function fingerKey(hand, finger) {
  return `${hand}-${finger}`;
}

/** Primary mapped glyph, a plant cousin, or occasional ✨. */
export function pickDropEmoji(spec) {
  if (Math.random() < 0.12) return "✨";
  if (Math.random() < 0.55) return spec?.emoji || pick(PLANT_POOL);
  if (spec?.extras?.length) return pick(spec.extras);
  return pick(PLANT_POOL);
}
