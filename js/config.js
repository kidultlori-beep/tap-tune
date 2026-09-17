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
 * Pitch is a fixed finger-identity map — see FRONT_FINGER_PITCH / BACK_FINGER_PITCH.
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
 * Equal-temperament scale A4…B5. Index 0 is screen-left in a usual two-hand pose.
 * A4 = 440 Hz.
 */
export const SCREEN_SCALE = [
  { note: "A4", freq: 440.0, letter: "A" },
  { note: "C5", freq: 523.25, letter: "C" },
  { note: "D5", freq: 587.33, letter: "D" },
  { note: "E5", freq: 659.25, letter: "E" },
  { note: "F5", freq: 698.46, letter: "F" },
  { note: "G5", freq: 783.99, letter: "G" },
  { note: "A5", freq: 880.0, letter: "A" },
  { note: "B5", freq: 987.77, letter: "B" },
];

/**
 * Front camera (mirrored selfie). User's right hand is on the left of the picture.
 * Usual pose left → right on screen: A C D E F G A B.
 */
export const FRONT_FINGER_PITCH = {
  "Right-pinky": 0,
  "Right-ring": 1,
  "Right-middle": 2,
  "Right-index": 3,
  "Left-index": 4,
  "Left-middle": 5,
  "Left-ring": 6,
  "Left-pinky": 7,
};

/**
 * Back camera (not mirrored). User's left hand is on the left of the picture.
 */
export const BACK_FINGER_PITCH = {
  "Left-pinky": 0,
  "Left-ring": 1,
  "Left-middle": 2,
  "Left-index": 3,
  "Right-index": 4,
  "Right-middle": 5,
  "Right-ring": 6,
  "Right-pinky": 7,
};

export function pitchTable(mirrored = true) {
  return mirrored ? FRONT_FINGER_PITCH : BACK_FINGER_PITCH;
}

/**
 * Stable pitch for a physical fingertip. Same finger → same note for a given camera facing.
 * `mirrored` is true for the front/selfie camera.
 */
export function pitchForPinch(key, { mirrored = true } = {}) {
  const table = pitchTable(mirrored);
  let i = table[key];
  if (!Number.isInteger(i) || i < 0) i = 0;
  i = Math.min(i, SCREEN_SCALE.length - 1);
  const step = SCREEN_SCALE[i];
  return { note: step.note, freq: step.freq, index: i, letter: step.letter };
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
