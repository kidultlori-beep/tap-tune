# Finger Garden

Product display name: **Finger Garden**.  
Repository / code name stays **tap-tune**.

Pinch a thumb to a fingertip. A plant emoji falls, grows a thin pastel stem of random height, then fades with ✨ after a few seconds. Each fingertip has a **fixed note**. In a usual two-hand pose they still read **left → right on screen** as **A C D E F G A B**.

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
- Front camera is mirrored; **🔄** flips to the back camera on phones. On desktop the flip button is a silent no-op. Pitch is bound to **finger identity** (same fingertip → same note for that camera). A usual two-hand pose still reads left → right as A C D E F G A B on both cameras.
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

## Pitch (fixed finger identity)

Thumbs have no plant overlay; they are only used for pinch. Pitch does **not** follow live screen-X rank (hands wobble, notes jumped). Each non-thumb fingertip is bound to one step of **A4 C5 D5 E5 F5 G5 A5 B5** for the current camera.

Usual two-hand pose, **left → right on screen**:

| Finger (physical) | Front camera (selfie, mirrored) | Back camera |
| --- | --- | --- |
| Right pinky | A4 (left of picture) | B5 |
| Right ring | C5 | A5 |
| Right middle | D5 | G5 |
| Right index | E5 | F5 |
| Left index | F5 | E5 |
| Left middle | G5 | D5 |
| Left ring | A5 | C5 |
| Left pinky | B5 (right of picture) | A4 (left of picture) |

A4 = 440 Hz equal temperament. A tiny **A / C / D / E / F / G / B** flash appears at the pinch so you can check the note.

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

One pinch = one plant; release before sowing again. The pitch is that fingertip’s fixed note for the current camera — pinch it again and it stays the same.

Butterflies and birds drift across at random (left, right, or a mild diagonal, about 2 seconds). They also show up around every **20** blooms, still randomized rather than a scripted parade.

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
