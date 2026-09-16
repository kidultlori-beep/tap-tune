/** Finger Garden — 手指 → 植物表情 → 音高 固定映射 */

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
 * Fixed mapping. MediaPipe handedness is the person's physical hand.
 * After selfie mirroring, the person's right hand appears on the right.
 */
export const FINGER_MAP = {
  "Left-index": {
    key: "Left-index",
    hand: "Left",
    finger: "index",
    label: "左食指",
    emoji: "🌸",
    note: "C5",
    freq: 523.25,
    petal: "#f4a7c3",
    petalHi: "#ffe4ef",
    center: "#ffe08a",
    stem: "#5d9b62",
  },
  "Left-middle": {
    key: "Left-middle",
    hand: "Left",
    finger: "middle",
    label: "左中指",
    emoji: "🌼",
    note: "D5",
    freq: 587.33,
    petal: "#ffe566",
    petalHi: "#fff6c2",
    center: "#e8a838",
    stem: "#6aa85f",
  },
  "Left-ring": {
    key: "Left-ring",
    hand: "Left",
    finger: "ring",
    label: "左无名指",
    emoji: "🌺",
    note: "E5",
    freq: 659.25,
    petal: "#e85d8c",
    petalHi: "#ffb3cc",
    center: "#ffd36b",
    stem: "#4f8f58",
  },
  "Left-pinky": {
    key: "Left-pinky",
    hand: "Left",
    finger: "pinky",
    label: "左小指",
    emoji: "🌷",
    note: "G5",
    freq: 783.99,
    petal: "#e07090",
    petalHi: "#ffd0dc",
    center: "#8fbf6a",
    stem: "#5b9a55",
  },
  "Right-index": {
    key: "Right-index",
    hand: "Right",
    finger: "index",
    label: "右食指",
    emoji: "🌻",
    note: "A5",
    freq: 880.0,
    petal: "#f5c842",
    petalHi: "#ffe9a0",
    center: "#6b3f12",
    stem: "#4e8a46",
  },
  "Right-middle": {
    key: "Right-middle",
    hand: "Right",
    finger: "middle",
    label: "右中指",
    emoji: "🌹",
    note: "C6",
    freq: 1046.5,
    petal: "#d9404a",
    petalHi: "#ff9aa2",
    center: "#ffd27a",
    stem: "#3f7a44",
  },
  "Right-ring": {
    key: "Right-ring",
    hand: "Right",
    finger: "ring",
    label: "右无名指",
    emoji: "🪷",
    note: "D6",
    freq: 1174.66,
    petal: "#f3b6d0",
    petalHi: "#ffe6f2",
    center: "#f0d36c",
    stem: "#5a9a6a",
  },
  "Right-pinky": {
    key: "Right-pinky",
    hand: "Right",
    finger: "pinky",
    label: "右小指",
    emoji: "💐",
    note: "E6",
    freq: 1318.51,
    petal: "#c9a0e8",
    petalHi: "#ead9ff",
    center: "#ffd56f",
    stem: "#5d8f63",
  },
};

export const MILESTONE_EVERY = 20;
export const MAX_PLANTS = 48;

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

export function easeInQuad(t) {
  return t * t;
}

export function fingerKey(hand, finger) {
  return `${hand}-${finger}`;
}
