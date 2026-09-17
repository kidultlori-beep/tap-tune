/** Front/back camera with contain-fit mapping helpers. */

import { clamp } from "./config.js";

/** True when a facingMode switch is meaningful (phone/tablet). Desktop is a silent no-op. */
export function canSwitchCamera() {
  const ua = navigator.userAgent || "";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return true;
  if (/iPad/i.test(ua)) return true;
  if (navigator.maxTouchPoints > 1 && /Mac/i.test(ua)) return true;
  return false;
}

export function getContainedRect(videoW, videoH, viewW, viewH) {
  if (!videoW || !videoH) {
    return { x: 0, y: 0, w: viewW, h: viewH };
  }
  const scale = Math.min(viewW / videoW, viewH / videoH);
  const w = videoW * scale;
  const h = videoH * scale;
  return {
    x: (viewW - w) / 2,
    y: (viewH - h) / 2,
    w,
    h,
  };
}

/** Map a MediaPipe landmark (0–1 in video space) onto the letterboxed viewport. */
export function landmarkToScreen(lm, rect, mirrored = true) {
  const nx = mirrored ? 1 - lm.x : lm.x;
  return {
    x: rect.x + nx * rect.w,
    y: rect.y + lm.y * rect.h,
  };
}

export class CameraFeed {
  constructor(videoEl) {
    this.video = videoEl;
    this.stream = null;
    this.facing = "user";
  }

  get mirrored() {
    return this.facing !== "environment";
  }

  applyMirror() {
    this.video.classList.toggle("is-front", this.mirrored);
    this.video.classList.toggle("is-back", !this.mirrored);
  }

  async start(facing = "user") {
    if (!navigator.mediaDevices?.getUserMedia) {
      const err = new Error("no-media-devices");
      err.code = "unsupported";
      throw err;
    }

    this.facing = facing === "environment" ? "environment" : "user";

    const attempts = [
      {
        audio: false,
        video: {
          facingMode: { ideal: this.facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      {
        audio: false,
        video: { facingMode: this.facing },
      },
      {
        audio: false,
        video: true,
      },
    ];

    let lastErr = null;
    for (const constraints of attempts) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!this.stream) {
      const err = lastErr || new Error("camera-failed");
      err.code = lastErr?.name === "NotAllowedError" ? "denied" : "unavailable";
      throw err;
    }

    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.setAttribute("playsinline", "");
    this.video.setAttribute("webkit-playsinline", "true");
    this.applyMirror();

    await this.video.play();
    await waitForVideo(this.video);
    return this.stream;
  }

  /**
   * Switch user ↔ environment. Desktop / unsupported devices return quietly.
   * Never throws; never alerts.
   */
  async flip() {
    if (!canSwitchCamera() || !this.stream) {
      return { flipped: false };
    }
    const next = this.facing === "user" ? "environment" : "user";
    const prev = this.facing;
    this.stop();
    try {
      await this.start(next);
      return { flipped: true, facing: this.facing };
    } catch {
      try {
        await this.start(prev);
      } catch {
        /* leave stopped */
      }
      return { flipped: false };
    }
  }

  stop() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    this.video.srcObject = null;
  }
}

function waitForVideo(video) {
  if (video.readyState >= 2 && video.videoWidth) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("loadeddata", done);
      resolve();
    };
    video.addEventListener("loadeddata", done);
    setTimeout(resolve, 2500);
  });
}

export function clampToView(x, y, pad, w, h) {
  return {
    x: clamp(x, pad, w - pad),
    y: clamp(y, pad, h - pad),
  };
}
