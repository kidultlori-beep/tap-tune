/**
 * Node-side sanity checks for mapping, pinch debounce, and plant pool.
 *   node js/check.js
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FINGER_MAP, FINGER_TYPES, PLANT_POOL, pickDropEmoji, FILTER_STORAGE_KEY } from "./config.js";
import { PinchDetector } from "./pinch.js";
import { readFilterPref, FILTER_IDS } from "./beauty.js";
import { PRESETS } from "./beauty-lab.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", msg);
  } else {
    console.log("ok ", msg);
  }
}

const REQUIRED = [
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

for (const g of REQUIRED) {
  assert(PLANT_POOL.includes(g), `pool includes ${g}`);
}
assert(
  FINGER_TYPES.every((k) => PLANT_POOL.includes(FINGER_MAP[k].emoji)),
  "fingertip glyphs are in the sowable pool"
);

const seen = new Set();
for (let i = 0; i < 80; i++) seen.add(pickDropEmoji());
assert(seen.size >= 6, "drop picker mixes several pool glyphs");

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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const css = readFileSync(join(root, "css/styles.css"), "utf8");
const app = readFileSync(join(root, "js/app.js"), "utf8");
assert(!/demo-dock|btn-demo|Demo mode|Demo sow/i.test(html), "HTML has no demo UI");
assert(!/#demo-dock|has-demo-dock|demo-stage/.test(css), "CSS has no demo chrome");
assert(!/btn-demo|DemoHands|startDemo|isDemoQuery/.test(app), "app.js has no demo entry");
assert(!/demo\.js/.test(html), "demo.js is not loaded");
assert(/btn-filter/.test(html) && /id="beauty"/.test(html), "filter dropdown + canvas exist");
assert(/data-filter="lcd"/.test(html) && /data-filter="raw"/.test(html), "Raw and LCD options");
assert(/data-filter="natural"/.test(html), "Soft Natural option");
assert(!/lab-entry/.test(html) && !/Beauty lab/.test(html), "landing has no Beauty lab entry");
assert(FILTER_STORAGE_KEY === "finger-garden-filter", "filter storage key");
assert(readFilterPref() === "lcd", "filter defaults to LCD without stored pref");
assert(FILTER_IDS.join(",") === "raw,natural,lcd", "three garden looks");
const beautySrc = readFileSync(join(root, "js/beauty.js"), "utf8");
assert(/bayer4/.test(beautySrc) && /LCD_FRAG/.test(beautySrc), "LCD Bayer dot-matrix shader");
assert(/setMode/.test(beautySrc), "looks can switch including raw");

const labHtml = readFileSync(join(root, "beauty-lab.html"), "utf8");
assert(!/Demo mode|Demo sow|btn-demo/i.test(labHtml), "lab has no demo UI");
assert(/Beauty lab/.test(labHtml), "lab page titled Beauty lab");
const names = PRESETS.map((p) => p.name);
assert(names.includes("Raw / Off"), "raw preset");
assert(names.includes("Soft Natural"), "Soft Natural");
assert(names.includes("Warm Glow"), "Warm Glow");
assert(names.includes("Cool Clean"), "Cool Clean");
assert(names.includes("Cream Soft"), "Cream Soft");
assert(names.includes("Film Soft"), "Film Soft");
assert(PRESETS.length === 6, "six lab looks including raw");

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
