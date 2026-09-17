# Finger Garden

Product display name: **Finger Garden**.  
Repository / code name stays **tap-tune**.

Pinch a thumb to a fingertip. A plant emoji falls, grows a thin pastel stem of random height, then fades with ✨ after a few seconds. Pitch follows **on-screen left → right** among visible non-thumb fingertips: **A C D E F G A B**.

Pure static site. No React/Vue, no bundler, no build step.

## HTTPS preview (phone)

Live site (GitHub Pages + custom domain):

**https://fingergarden.annieway.world/**

Camera access requires HTTPS (or localhost). Use the live URL on a phone.

Also published at https://kidultlori-beep.github.io/tap-tune/ if Pages still serves the project URL.

## Run locally

Camera access needs a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (`https://` or `http://localhost`). Opening `index.html` as a `file://` URL will not get a camera.

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080/

### Mobile

- Use **HTTPS** (GitHub Pages above, or localhost via USB port-forward).
- Tap **Enter garden**, allow the camera, pinch thumb to each fingertip.
- Front camera is mirrored; **🔄** flips to the back camera on phones. On desktop the flip button is a silent no-op. Pitch always follows the **picture**: left edge of the video is A, right edge is B, on both cameras.
- Camera look dropdown (next to Bloom): **Off / Raw**, **Soft Natural**, **LCD** (monochrome dot-matrix), **Film** (90s analog), **Dream** (hazy digicam). Default **LCD**. Preference is saved. If WebGL is missing, the raw camera is shown.
- **Share** (bottom-right, clear of Bloom / filter / flip / mute / @annieway2026) builds a 1080×1080 garden card and prefers the Web Share sheet with the PNG (iPhone Safari). If files cannot be shared, it downloads the PNG, copies https://fingergarden.annieway.world/ , and toasts.
- If permission is denied, allow the camera in browser settings and tap **Retry camera**. No native `alert()`.

## CDN libraries

| Library | How | Global |
| --- | --- | --- |
| [MediaPipe Hands](https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/) `0.4.1675469240` | `<script>` tag | `window.Hands` |
| MediaPipe `camera_utils` `0.3.1675466862` | `<script>` tag | `window.Camera` |
| MediaPipe `drawing_utils` `0.3.1675466124` | `<script>` tag | `window.drawConnectors` |

Hand tracking uses script-tag + globals. There is **no** Three.js particle layer. Occasional ✨ is a tiny Unicode glyph, not a WebGL fog.

## Pitch (screen left → right)

Thumbs have no plant overlay; they are only used for pinch. Pitch is **not** bound to Left-index / Right-pinky. Visible non-thumb tips are sorted by on-screen X (selfie-mirrored so it matches what you see). Rank `i` plays `SCREEN_SCALE[i]`. With 8 tips: full **A C D E F G A B**. With fewer tips, the leftmost still plays A4, then C5, D5, … in order.

A4 = 440 Hz equal temperament.

| Rank on screen | Note | Hz |
| --- | --- | --- |
| 1 leftmost | A4 | 440.00 |
| 2 | C5 | 523.25 |
| 3 | D5 | 587.33 |
| 4 | E5 | 659.25 |
| 5 | F5 | 698.46 |
| 6 | G5 | 783.99 |
| 7 | A5 | 880.00 |
| 8 rightmost | B5 | 987.77 |

Fingertip plant glyphs (emoji only — not pitches):

| Finger type | Emoji |
| --- | --- |
| Left index | 🌸 |
| Left middle | 🌼 |
| Left ring | 🌺 |
| Left pinky | 🌷 |
| Right index | 🌻 |
| Right middle | 🌹 |
| Right ring | 🪻 |
| Right pinky | 🍀 |

Sowable pool (mixed, not flowers-only): 🌺🌸🌼🌻🌹🪻🌷🍄‍🟫🍄🍁🍂🍀☘️🌿🎄🌟🫧

Lifecycle: pinch → gravity drop to the floor → grow a **thin pastel stem** of random height with optional 🌿 leaves and one pool emoji on top → stay visible **3–5s** → fade out with ✨ sparkles. No grainy particle fog.

One pinch = one plant; release before sowing again. The pitch is that fingertip’s current left-to-right rank on screen.

Every **20** landed emojis, 5 🦋 + 1 🐦 fly across.

## Project layout

```
index.html      SPA shell, MediaPipe <script> tags
css/styles.css  Garden UI
js/app.js       Camera-garden orchestration
js/config.js    Finger emojis + screen-space pitch scale
js/camera.js    getUserMedia, contain-fit, front/back flip
js/beauty.js    Camera looks: raw, Soft Natural, LCD, Film, Dream
js/beauty-lab.js  Hidden/dev look picker (not linked from landing)
beauty-lab.html Beauty lab preview page
css/beauty-lab.css  Lab UI
js/hands-tracker.js  window.Hands loop
js/pinch.js     Debounced pinch → sow
js/garden.js    Gravity drop, pastel stem grow, fade
js/audio.js     Web Audio tones + mute
js/overlays.js  Fingertip glyphs, ✨, critters
js/share.js     Share card canvas + Web Share / download fallback
og.png          Open Graph / Twitter unfurl image (1200×630)
```
