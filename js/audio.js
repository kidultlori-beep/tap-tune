/** Web Audio garden tones — one C major pitch per non-thumb finger. */

export class GardenAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.enabled = true;
    this._recentPinches = [];
  }

  async unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        this.enabled = false;
        return;
      }
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* iOS may still block until a later gesture */
      }
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.55, now + 0.08);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Short bell-like tone. Two partials + quick decay.
   * Returns whether pinches are currently "frequent" (for floating notes).
   */
  playFinger(freq) {
    const nowMs = performance.now();
    this._recentPinches.push(nowMs);
    this._recentPinches = this._recentPinches.filter((t) => nowMs - t < 1200);
    const frequent = this._recentPinches.length >= 3;

    if (!this.ctx || this.ctx.state !== "running" || !this.master) {
      return { frequent, recent: this._recentPinches.length };
    }

    const t = this.ctx.currentTime;
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const oscC = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    oscA.type = "sine";
    oscA.frequency.setValueAtTime(freq, t);
    oscB.type = "triangle";
    oscB.frequency.setValueAtTime(freq * 2.01, t);
    oscC.type = "sine";
    oscC.frequency.setValueAtTime(freq * 3.02, t);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2400, t);
    filter.Q.value = 0.7;

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.08, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.72);

    oscA.connect(filter);
    oscB.connect(filter);
    oscC.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    oscA.start(t);
    oscB.start(t);
    oscC.start(t);
    oscA.stop(t + 0.78);
    oscB.stop(t + 0.78);
    oscC.stop(t + 0.78);

    return { frequent, recent: this._recentPinches.length };
  }
}
