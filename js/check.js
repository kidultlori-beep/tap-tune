/**
 * Node-side sanity checks for mapping + pinch debounce + stacking rest.
 *   node js/check.js
 */
import { FINGER_MAP, FINGER_TYPES } from "./config.js";
import { PinchDetector } from "./pinch.js";
import { stackRestY } from "./garden.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", msg);
  } else {
    console.log("ok ", msg);
  }
}

assert(FINGER_TYPES.length === 8, "8 finger types");
assert(
  FINGER_TYPES.every((k) => FINGER_MAP[k]?.emoji && FINGER_MAP[k]?.freq),
  "each type has emoji + freq"
);
const freqs = new Set(FINGER_TYPES.map((k) => FINGER_MAP[k].freq));
assert(freqs.size === 8, "unique pitches");
assert(FINGER_MAP["Left-index"].freq === 523.25, "Left index C5");
assert(FINGER_MAP["Left-middle"].freq === 587.33, "Left middle D5");
assert(FINGER_MAP["Left-ring"].freq === 659.25, "Left ring E5");
assert(FINGER_MAP["Left-pinky"].freq === 783.99, "Left pinky G5");
assert(FINGER_MAP["Right-index"].freq === 880.0, "Right index A5");
assert(FINGER_MAP["Right-middle"].freq === 1046.5, "Right middle C6");
assert(FINGER_MAP["Right-ring"].freq === 1174.66, "Right ring D6");
assert(FINGER_MAP["Right-pinky"].freq === 1318.51, "Right pinky E6");

const d = new PinchDetector();
const mk = (indexDist) => [
  {
    hand: "Left",
    scale: 80,
    tips: {
      wrist: { x: 100, y: 220 },
      middleMcp: { x: 100, y: 140 },
      thumb: { x: 100, y: 100 },
      index: { x: 100 + indexDist, y: 100 },
      middle: { x: 220, y: 90 },
      ring: { x: 250, y: 95 },
      pinky: { x: 280, y: 110 },
    },
  },
];

const first = d.update(mk(8));
assert(first.length === 1 && first[0].key === "Left-index", "pinch sows once");
const held = d.update(mk(8));
assert(held.length === 0, "held pinch does not re-sow");
const released = d.update(mk(80));
assert(released.length === 0, "release does not sow");
const again = d.update(mk(8));
assert(again.length === 1, "new pinch sows again");

const floor = 800;
const settled = {
  x: 200,
  y: 780,
  r: 16,
  settled: true,
};
const falling = { x: 200, y: 100, r: 16 };
const rest = stackRestY([settled, falling], falling, floor);
assert(rest < floor - falling.r, "stack rest is above the floor when a glyph is already there");

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
