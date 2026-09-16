/** MediaPipe Hands via window.Hands (script-tag CDN global). */

import { MEDIAPIPE } from "./config.js";
import { getContainedRect, landmarkToScreen } from "./camera.js";
import { collectTips, handScale } from "./pinch.js";

export class HandsTracker {
  constructor({ video, onHands, onStatus }) {
    this.video = video;
    this.onHands = onHands;
    this.onStatus = onStatus;
    this.hands = null;
    this.running = false;
    this.sending = false;
    this.mirrored = true;
    this._raf = 0;
  }

  async init() {
    const Hands = window.Hands;
    if (typeof Hands !== "function") {
      throw new Error("MediaPipe Hands global missing");
    }
    this.hands = new Hands({ locateFile: MEDIAPIPE.locateFile });
    const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: mobile ? 0 : 1,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.5,
      selfieMode: false,
    });
    this.hands.onResults((results) => this._onResults(results));
    this.onStatus?.("正在加载手势模型…");
    await this.hands.initialize();
    this.onStatus?.("手势模型已就绪");
  }

  start() {
    this.running = true;
    const loop = async () => {
      if (!this.running) return;
      if (!this.sending && this.video.readyState >= 2) {
        this.sending = true;
        try {
          await this.hands.send({ image: this.video });
        } catch (err) {
          console.warn("hands.send", err);
        } finally {
          this.sending = false;
        }
      }
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  _onResults(results) {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const rect = getContainedRect(
      this.video.videoWidth,
      this.video.videoHeight,
      viewW,
      viewH
    );
    const list = [];
    const landmarksList = results.multiHandLandmarks || [];
    const handedness = results.multiHandedness || [];

    for (let i = 0; i < landmarksList.length; i++) {
      const lm = landmarksList[i];
      const label = handedness[i]?.label || (i === 0 ? "Right" : "Left");
      const toScreen = (pt) => landmarkToScreen(pt, rect, this.mirrored);
      const tips = collectTips(lm, toScreen);
      list.push({
        hand: label,
        landmarks: lm,
        tips,
        scale: handScale(tips),
      });
    }
    this.onHands?.({ hands: list, rect });
  }
}
