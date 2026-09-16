/**
 * Node-side sanity checks for mapping + pinch debounce.
 *   node js/check.js
 */
import { FINGER_MAP, FINGER_TYPES } from "./config.js";
import { PinchDetector } from "./pinch.js";

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
const emojis = new Set(FINGER_TYPES.map((k) => FINGER_MAP[k].emoji));
const freqs = new Set(FINGER_TYPES.map((k) => FINGER_MAP[k].freq));
assert(emojis.size === 8, "unique emojis");
assert(freqs.size === 8, "unique pitches");

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

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
