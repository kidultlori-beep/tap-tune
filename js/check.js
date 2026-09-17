/**
 * Node-side sanity checks for mapping, pinch debounce, and plant pool.
 *   node js/check.js
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FINGER_MAP, FINGER_TYPES, PLANT_POOL, pickDropEmoji, FILTER_STORAGE_KEY, SCREEN_SCALE, pitchForPinch } from "./config.js";
import { PinchDetector } from "./pinch.js";
import { landmarkToScreen } from "./camera.js";
import { readFilterPref, FILTER_IDS } from "./beauty.js";
import { PRESETS } from "./beauty-lab.js";
import { SHARE_URL, SHARE_TITLE, SHARE_LINE, CARD_W, CARD_H, OG_W, OG_H, shareText, CARD_FILE } from "./share.js";

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
  FINGER_TYPES.every((k) => FINGER_MAP[k]?.emoji && FINGER_MAP[k].freq == null),
  "each type has emoji and no bound pitch"
);
assert(SCREEN_SCALE.length === 8, "eight screen-space pitches");
assert(SCREEN_SCALE.map((s) => s.note).join(" ") === "A4 C5 D5 E5 F5 G5 A5 B5", "A C D E F G A B notes");
assert(SCREEN_SCALE[0].freq === 440.0, "A4 440");
assert(SCREEN_SCALE[1].freq === 523.25, "C5");
assert(SCREEN_SCALE[2].freq === 587.33, "D5");
assert(SCREEN_SCALE[3].freq === 659.25, "E5");
assert(SCREEN_SCALE[4].freq === 698.46, "F5");
assert(SCREEN_SCALE[5].freq === 783.99, "G5");
assert(SCREEN_SCALE[6].freq === 880.0, "A5");
assert(SCREEN_SCALE[7].freq === 987.77, "B5");
assert(
  SCREEN_SCALE.every((s, i) => i === 0 || s.freq > SCREEN_SCALE[i - 1].freq),
  "screen scale rises left to right"
);

function handsFromTips(entries) {
  const byHand = new Map();
  for (const e of entries) {
    let hand = byHand.get(e.hand);
    if (!hand) {
      hand = { hand: e.hand, tips: {}, scale: 80 };
      byHand.set(e.hand, hand);
    }
    hand.tips[e.finger] = { x: e.x, y: e.y ?? 100 };
  }
  return [...byHand.values()];
}

const crossed = handsFromTips([
  { hand: "Right", finger: "pinky", x: 20 },
  { hand: "Right", finger: "ring", x: 40 },
  { hand: "Right", finger: "middle", x: 60 },
  { hand: "Right", finger: "index", x: 80 },
  { hand: "Left", finger: "index", x: 120 },
  { hand: "Left", finger: "middle", x: 140 },
  { hand: "Left", finger: "ring", x: 160 },
  { hand: "Left", finger: "pinky", x: 180 },
]);
assert(pitchForPinch(crossed, "Right-pinky").note === "A4", "leftmost on screen is A4 even if it is Right-pinky");
assert(pitchForPinch(crossed, "Left-pinky").note === "B5", "rightmost on screen is B5 even if it is Left-pinky");
assert(pitchForPinch(crossed, "Right-index").note === "E5", "fourth visible tip is E5");
assert(pitchForPinch(crossed, "Left-index").note === "F5", "fifth visible tip is F5");
assert(pitchForPinch(crossed, "Left-middle").note === "G5", "anatomy does not own G5");

const few = handsFromTips([
  { hand: "Left", finger: "index", x: 300 },
  { hand: "Left", finger: "middle", x: 100 },
  { hand: "Right", finger: "index", x: 200 },
]);
assert(pitchForPinch(few, "Left-middle").note === "A4", "few tips: leftmost A4");
assert(pitchForPinch(few, "Right-index").note === "C5", "few tips: second C5");
assert(pitchForPinch(few, "Left-index").note === "D5", "few tips: third D5");

const mirroredLeft = landmarkToScreen({ x: 1, y: 0.5 }, { x: 0, y: 0, w: 100, h: 100 }, true);
const backLeft = landmarkToScreen({ x: 0, y: 0.5 }, { x: 0, y: 0, w: 100, h: 100 }, false);
assert(mirroredLeft.x === 0, "front camera: picture left is screen x=0");
assert(backLeft.x === 0, "back camera: picture left is screen x=0");

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
assert(/pitchForPinch/.test(app), "pinch pitch uses screen rank");
assert(!/spec\.freq/.test(app), "app does not play anatomical freq");
assert(/A C D E F G A B/.test(html), "landing left-to-right scale hint");
assert(!/Do Re Mi Fa/.test(html) && !/Sol La Ti Do/.test(html), "old solfege copy gone");
assert(!/eight notes/i.test(html), "old eight-notes copy gone");
assert(/btn-filter/.test(html) && /id="beauty"/.test(html), "filter dropdown + canvas exist");
assert(/data-filter="lcd"/.test(html) && /data-filter="raw"/.test(html), "Raw and LCD options");
assert(/data-filter="natural"/.test(html), "Soft Natural option");
assert(/data-filter="film"/.test(html), "Film option");
assert(/data-filter="dream"/.test(html), "Dream option");
assert(!/lab-entry/.test(html) && !/Beauty lab/.test(html), "landing has no Beauty lab entry");
assert(FILTER_STORAGE_KEY === "finger-garden-filter", "filter storage key");
assert(readFilterPref() === "lcd", "filter defaults to LCD without stored pref");
assert(FILTER_IDS.join(",") === "raw,natural,lcd,film,dream", "five garden looks");
const beautySrc = readFileSync(join(root, "js/beauty.js"), "utf8");
assert(/bayer4/.test(beautySrc) && /LCD_FRAG/.test(beautySrc), "LCD Bayer dot-matrix shader");
assert(/FILM_FRAG/.test(beautySrc) && /filmCurve/.test(beautySrc), "Film analog grade shader");
assert(/DREAM_FRAG/.test(beautySrc) && /vec2 ca/.test(beautySrc), "Dream bloom + chromatic aberration");
assert(/setMode/.test(beautySrc), "looks can switch including raw");

assert(SHARE_TITLE === "Finger Garden", "share title");
assert(SHARE_LINE === "I planted a garden with my fingers", "share line");
assert(SHARE_URL === "https://fingergarden.annieway.world/", "share url");
assert(CARD_W === 1080 && CARD_H === 1080, "square 1080 share card");
assert(OG_W === 1200 && OG_H === 630, "og image size");
assert(CARD_FILE === "finger-garden.png", "share filename");
assert(shareText(0).includes(SHARE_URL) && shareText(0).includes(SHARE_LINE), "share text has line + url");
assert(shareText(12).includes("Bloom 12"), "share text includes bloom when set");
assert(/id="btn-share"/.test(html) && /Share garden card/.test(html), "in-garden Share control");
assert(/navigator\.share/.test(readFileSync(join(root, "js/share.js"), "utf8")), "uses Web Share API");
assert(/canShare/.test(readFileSync(join(root, "js/share.js"), "utf8")), "prefers share with files");
assert(!/MediaRecorder|getDisplayMedia|timeslice/.test(app), "no song recording in this pass");
assert(/og:image/.test(html) && /fingergarden\.annieway\.world\/og\.png/.test(html), "OG image absolute URL");
assert(/twitter:card/.test(html) && /summary_large_image/.test(html), "Twitter large image card");
assert(/og:url/.test(html) && /fingergarden\.annieway\.world/.test(html), "OG url is live domain");
assert(!/[\u4e00-\u9fff]/.test(html), "index copy has no Chinese");
assert(/share-btn/.test(css), "share button CSS");
assert(/right: calc\(10px \+ var\(--safe-r\)\)/.test(css), "share sits bottom-right with safe area");
const og = readFileSync(join(root, "og.png"));
assert(og[0] === 0x89 && og[1] === 0x50 && og[2] === 0x4e && og[3] === 0x47, "og.png is PNG");
assert(og.length > 8_000, "og.png has image payload");

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
