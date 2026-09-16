/** Canvas garden: seed fall → sprout → bloom → wind. */

import {
  FINGER_MAP,
  MAX_PLANTS,
  clamp,
  easeInQuad,
  easeOutCubic,
  lerp,
  pick,
  rand,
  randInt,
} from "./config.js";

export class Garden {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.plants = [];
    this.bloomCount = 0;
    this._id = 1;
    this.wind = 0;
    this._gust = 0;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  sow(fingerKey, x, y, opts = {}) {
    const spec = FINGER_MAP[fingerKey] || FINGER_MAP["Left-index"];
    const fast = !!opts.fast;
    if (this.plants.length >= MAX_PLANTS) {
      const oldest = this.plants.find((p) => p.phase === "blooming");
      if (oldest) oldest.phaseT = oldest.bloomWait;
      else this.plants.shift();
    }

    const landY = clamp(y + rand(70, 150), y + 40, this.height - 36);
    const plant = {
      id: this._id++,
      key: spec.key,
      spec,
      x: clamp(x + rand(-10, 10), 24, this.width - 24),
      originY: y,
      landY,
      y,
      seedX: x,
      phase: "falling",
      phaseT: 0,
      fallDur: fast ? 0.18 : rand(0.42, 0.75),
      growDur: fast ? 0.45 : rand(3.0, 5.0),
      bloomWait: fast ? 0.55 : rand(5.0, 8.0),
      windDur: fast ? 0.6 : rand(1.5, 2.4),
      size: rand(16, 28),
      height: rand(52, 92),
      swayPhase: rand(0, Math.PI * 2),
      swayAmp: rand(5, 13),
      leafCount: randInt(2, 5),
      leafAngles: [],
      leafLens: [],
      petalCount: randInt(5, 8),
      bloomed: false,
      fade: 1,
      drift: 0,
      spin: 0,
      windDir: pick([-1, 1]),
      seedSpin: rand(-2, 2),
    };
    for (let i = 0; i < plant.leafCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      plant.leafAngles.push(side * rand(0.55, 1.15) + rand(-0.15, 0.15));
      plant.leafLens.push(rand(10, 18));
    }
    this.plants.push(plant);
    return plant;
  }

  update(dt) {
    this._gust += (Math.random() - 0.5) * dt * 2;
    this._gust *= 0.96;
    this.wind = Math.sin(performance.now() / 2800) * 0.55 + this._gust;

    const gone = [];
    const events = [];

    for (const p of this.plants) {
      p.phaseT += dt;
      if (p.phase === "falling") {
        const t = Math.min(1, p.phaseT / p.fallDur);
        const e = easeInQuad(t);
        p.y = lerp(p.originY, p.landY, e);
        p.x += Math.sin(p.phaseT * 8) * 6 * dt;
        if (t >= 1) {
          p.phase = "growing";
          p.phaseT = 0;
          events.push({ type: "germinate", plant: p });
        }
      } else if (p.phase === "growing") {
        if (p.phaseT >= p.growDur) {
          p.phase = "blooming";
          p.phaseT = 0;
          if (!p.bloomed) {
            p.bloomed = true;
            this.bloomCount += 1;
            events.push({ type: "bloom", plant: p });
          }
        }
      } else if (p.phase === "blooming") {
        if (p.phaseT >= p.bloomWait) {
          p.phase = "wind";
          p.phaseT = 0;
          events.push({ type: "wind", plant: p });
        }
      } else if (p.phase === "wind") {
        const t = Math.min(1, p.phaseT / p.windDur);
        p.drift = p.windDir * easeOutCubic(t) * rand(80, 160);
        p.spin = p.windDir * t * 0.8;
        p.fade = 1 - t;
        p.y -= 18 * dt;
        if (t >= 1) gone.push(p.id);
      }
    }

    if (gone.length) {
      this.plants = this.plants.filter((p) => !gone.includes(p.id));
    }
    return events;
  }

  draw(now) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    for (const p of this.plants) {
      const grow =
        p.phase === "falling"
          ? 0
          : p.phase === "growing"
            ? easeOutCubic(Math.min(1, p.phaseT / p.growDur))
            : 1;
      const sway =
        Math.sin(now / 900 + p.swayPhase) * p.swayAmp * grow + this.wind * 8 * grow;
      const baseX = p.x + (p.phase === "wind" ? p.drift : 0);
      const baseY = p.y;

      ctx.save();
      ctx.globalAlpha = p.fade;
      ctx.translate(baseX, baseY);
      if (p.spin) ctx.rotate(p.spin);

      if (p.phase === "falling" || (p.phase === "growing" && grow < 0.12)) {
        drawSeed(ctx, 0, 0, p);
      }

      if (grow > 0.02) {
        drawStemAndLeaves(ctx, p, grow, sway);
        const bloomT =
          p.phase === "growing" ? clamp((grow - 0.62) / 0.38, 0, 1) : 1;
        if (bloomT > 0) {
          const topX = sway * 0.85;
          const topY = -p.height * grow;
          drawBloom(ctx, topX, topY, p, easeOutCubic(bloomT));
        }
      }

      ctx.restore();
    }
  }
}

function drawSeed(ctx, x, y, plant) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(plant.seedSpin * plant.phaseT);
  ctx.fillStyle = "#8a6230";
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.2, 6.2, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,220,150,0.55)";
  ctx.beginPath();
  ctx.ellipse(-1.2, -1.4, 1.6, 2.4, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStemAndLeaves(ctx, p, grow, sway) {
  const h = p.height * grow;
  const topX = sway * 0.85;
  const topY = -h;

  ctx.strokeStyle = p.spec.stem;
  ctx.lineWidth = lerp(2.2, 3.4, p.size / 28);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(sway * 0.35, -h * 0.45, topX, topY);
  ctx.stroke();

  const leafAppear = clamp((grow - 0.22) / 0.45, 0, 1);
  if (leafAppear <= 0) return;

  for (let i = 0; i < p.leafCount; i++) {
    const along = 0.28 + (i / Math.max(1, p.leafCount - 1)) * 0.5;
    if (grow < along) continue;
    const t = along;
    const lx = quadPoint(0, sway * 0.35, topX, t);
    const ly = quadPoint(0, -h * 0.45, topY, t);
    const ang = p.leafAngles[i] + sway * 0.012;
    const len = p.leafLens[i] * leafAppear * grow;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(ang);
    ctx.fillStyle = i % 2 ? "#7fbf6e" : "#68a85d";
    ctx.beginPath();
    ctx.ellipse(len * 0.45, 0, len * 0.5, len * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function quadPoint(a, b, c, t) {
  const u = 1 - t;
  return u * u * a + 2 * u * t * b + t * t * c;
}

function drawBloom(ctx, x, y, p, scale) {
  const r = p.size * scale;
  const petals = p.petalCount;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2 + p.swayPhase * 0.15;
    const px = x + Math.cos(a) * r * 0.52;
    const py = y + Math.sin(a) * r * 0.52;
    const grd = ctx.createRadialGradient(px, py, 1, px, py, r * 0.6);
    grd.addColorStop(0, p.spec.petalHi);
    grd.addColorStop(1, p.spec.petal);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(px, py, r * 0.5, r * 0.28, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.fillStyle = p.spec.center;
  ctx.arc(x, y, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(x - r * 0.08, y - r * 0.08, r * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `${Math.round(r * 1.15)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.spec.emoji, x, y - r * 0.05);
}
