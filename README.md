# Finger Garden · 手势花园

Product display name: **Finger Garden** (手势花园).  
Repository / code name stays **tap-tune**.

A camera-garden toy: show your hands, pinch a thumb to a fingertip, and a seed falls, grows, blooms, then blows away on the wind — with a unique flower emoji and musical pitch for each of the eight non-thumb fingers.

Pure static site. No React/Vue, no bundler, no build step.

## Run locally

Camera access needs a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (`https://` or `http://localhost`). Opening `index.html` as a `file://` URL will not get a camera.

From the repo root:

```bash
python3 -m http.server 8080
```

Then open:

- Live garden: http://localhost:8080/
- Demo mode (no camera): http://localhost:8080/?demo=1

Any static server is fine (`npx serve`, Caddy, nginx, GitHub Pages, etc.).

### Mobile (iOS Safari / Android Chrome)

- Serve over **HTTPS** (or use localhost via USB port-forward).
- Allow the camera permission prompt (copy is in Chinese).
- Keep the phone in portrait; the video uses `object-fit: contain` (letterboxing is OK, the image is never stretched) and is mirrored for selfie UX.
- Prefer the front camera (`facingMode: user`).
- If permission is denied, use **演示模式** or `/?demo=1` — there is no native `alert()`.

## CDN libraries

Loaded from jsDelivr, no npm install:

| Library | How | Global / import |
| --- | --- | --- |
| [MediaPipe Hands](https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/) `0.4.1675469240` | `<script>` tag | `window.Hands`, `window.HAND_CONNECTIONS` |
| MediaPipe `camera_utils` `0.3.1675466862` | `<script>` tag | `window.Camera` |
| MediaPipe `drawing_utils` `0.3.1675466124` | `<script>` tag | `window.drawConnectors` (unused at runtime; kept for the conventional Hands stack) |
| [Three.js](https://cdn.jsdelivr.net/npm/three@0.170.0/) `0.170.0` | import map + ES module | `import('three')` |

Hand tracking uses the **script-tag + globals** Hands solution (not `@mediapipe/tasks-vision` ESM). WASM / tflite files are resolved with `Hands({ locateFile })` on the same CDN.

If WebGL is missing, sparkle/petal bursts fall back to a 2D canvas so sow / bloom / wind effects still show. Hand tracking also needs WebGL (MediaPipe GPU graph); without it the live camera can still be the background and the demo seed dock stays available — no `alert()`.

## Finger → emoji → pitch

Eight **finger types** (person’s left/right × index/middle/ring/pinky). Thumbs have no plant overlay; they are only used for pinch.

MediaPipe handedness is the physical hand. The camera feed is mirrored in CSS for selfie UX, and landmark overlays are mirrored to match.

| Finger type | UI | Emoji | Note | Hz |
| --- | --- | --- | --- | --- |
| Left index | 左食指 | 🌸 | C5 | 523.25 |
| Left middle | 左中指 | 🌼 | D5 | 587.33 |
| Left ring | 左无名指 | 🌺 | E5 | 659.25 |
| Left pinky | 左小指 | 🌷 | G5 | 783.99 |
| Right index | 右食指 | 🌻 | A5 | 880.00 |
| Right middle | 右中指 | 🌹 | C6 | 1046.50 |
| Right ring | 右无名指 | 🪷 | D6 | 1174.66 |
| Right pinky | 右小指 | 💐 | E6 | 1318.51 |

Pinch = thumb tip close to that fingertip (distance scaled by hand size, with hysteresis). One pinch sows one seed; you must release before sowing again.

## Garden loop

1. Seed falls (~0.4–0.75s) with a sow particle burst.
2. Germinate → stem / leaves → bloom over a random **3–5s** (leaf count, angles, size, sway, and duration vary).
3. After bloom, wait a random **5–8s**, then wind: drift, fade, petal burst.
4. Each pinch plays a short Web Audio tone. Rapid pinches also float **3–5** music-note emojis.
5. Lifetime bloom counter in the HUD. Every **20** blooms, **5 butterflies + 1 bird** fly across (replays at 40, 60, …).

## Demo mode

- Start screen → **演示模式**, or `/?demo=1`.
- Soft painted background instead of camera.
- Simulated hands that occasionally pinch.
- Dock of 8 seed buttons, or tap the stage to sow a random flower.

Useful when there is no camera, permission is denied, or you are verifying particles / lifecycle / the 20-bloom fly-by.

Add `&fast=1` (example: `/?demo=1&fast=1`) to shorten grow / bloom / wind timings while testing the milestone fly-by.

## Project layout

```
index.html      SPA shell, MediaPipe <script> tags, Three.js import map
css/styles.css  Garden UI
js/app.js       Orchestration
js/config.js    Finger map + helpers
js/camera.js    getUserMedia + contain-fit mapping
js/hands-tracker.js  window.Hands loop
js/pinch.js     Debounced pinch → sow
js/garden.js    Plant canvas lifecycle
js/audio.js     Web Audio tones + mute
js/fx.js        Three.js particles + canvas fallback
js/overlays.js  Fingertip emojis, notes, critters
js/demo.js      Camera-free skeleton
```

## Verify

1. `python3 -m http.server 8080` and open http://localhost:8080/?demo=1
2. Confirm simulated fingertips, auto/manual sow, growing plants, wind-off, notes (unmute), particles.
3. Sow until the HUD hits 20 — butterflies and a bird should cross.
4. On a phone over HTTPS, tap **进入花园**, allow camera, pinch each visible fingertip.
