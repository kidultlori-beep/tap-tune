# Finger Garden

Product display name: **Finger Garden**.  
Repository / code name stays **tap-tune**.

Pinch a thumb to a fingertip. A plant emoji falls, grows a thin pastel stem of random height, then fades with ✨ after a few seconds. Each of the eight non-thumb fingers plays its own pitch.

Pure static site. No React/Vue, no bundler, no build step.

## HTTPS preview (phone)

GitHub Pages is enabled on this repo:

**https://kidultlori-beep.github.io/tap-tune/**

Pages currently publishes the PR branch `cursor/finger-garden-8e3d`. After this PR is merged to `main`, point Pages at `main` (or keep the branch) so the same URL stays current.

Camera access requires HTTPS (or localhost). The Pages URL above is the phone preview.

## Run locally

Camera access needs a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (`https://` or `http://localhost`). Opening `index.html` as a `file://` URL will not get a camera.

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080/

### Mobile

- Use **HTTPS** (GitHub Pages above, or localhost via USB port-forward).
- Tap **Enter garden**, allow the camera, pinch thumb to each fingertip.
- Front camera is mirrored; **🔄** flips to the back camera on phones. On desktop the flip button is a silent no-op.
- Camera look dropdown (next to Bloom): **Off / Raw**, **Soft Natural**, **LCD** (monochrome dot-matrix). Default **LCD**. Preference is saved. If WebGL is missing, the raw camera is shown.
- If permission is denied, allow the camera in browser settings and tap **Retry camera**. No native `alert()`.

## CDN libraries

| Library | How | Global |
| --- | --- | --- |
| [MediaPipe Hands](https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/) `0.4.1675469240` | `<script>` tag | `window.Hands` |
| MediaPipe `camera_utils` `0.3.1675466862` | `<script>` tag | `window.Camera` |
| MediaPipe `drawing_utils` `0.3.1675466124` | `<script>` tag | `window.drawConnectors` |

Hand tracking uses script-tag + globals. There is **no** Three.js particle layer. Occasional ✨ is a tiny Unicode glyph, not a WebGL fog.

## Finger → emoji → pitch

Thumbs have no plant overlay; they are only used for pinch.

| Finger type | Emoji (fingertip) | Note | Hz |
| --- | --- | --- | --- |
| Left index | 🌸 | C5 | 523.25 |
| Left middle | 🌼 | D5 | 587.33 |
| Left ring | 🌺 | E5 | 659.25 |
| Left pinky | 🌷 | G5 | 783.99 |
| Right index | 🌻 | A5 | 880.00 |
| Right middle | 🌹 | C6 | 1046.50 |
| Right ring | 🪻 | D6 | 1174.66 |
| Right pinky | 🍀 | E6 | 1318.51 |

Sowable pool (mixed, not flowers-only): 🌺🌸🌼🌻🌹🪻🌷🍄‍🟫🍄🍁🍂🍀☘️🌿🎄🌟🫧

Lifecycle: pinch → gravity drop to the floor → grow a **thin pastel stem** of random height with optional 🌿 leaves and one pool emoji on top → stay visible **3–5s** → fade out with ✨ sparkles. No grainy particle fog.

One pinch = one plant; release before sowing again. Each pinch still plays that finger’s pitch.

Every **20** landed emojis, 5 🦋 + 1 🐦 fly across.

## Project layout

```
index.html      SPA shell, MediaPipe <script> tags
css/styles.css  Garden UI
js/app.js       Camera-garden orchestration
js/config.js    Finger map + plant glyph pool
js/camera.js    getUserMedia, contain-fit, front/back flip
js/beauty.js    Camera looks: raw, Soft Natural, LCD
js/beauty-lab.js  Hidden/dev look picker (not linked from landing)
beauty-lab.html Beauty lab preview page
css/beauty-lab.css  Lab UI
js/hands-tracker.js  window.Hands loop
js/pinch.js     Debounced pinch → sow
js/garden.js    Gravity drop, pastel stem grow, fade
js/audio.js     Web Audio tones + mute
js/overlays.js  Fingertip glyphs, ✨, critters
```
