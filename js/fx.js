/**
 * Sparkle / petal FX.
 * Prefers Three.js WebGL; falls back to 2D canvas so bursts still appear.
 */

const MAX_PARTICLES = 420;

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function makeDotTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,240,220,0.85)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

class ParticlePool {
  constructor() {
    this.items = [];
  }

  spawn(partial) {
    if (this.items.length >= MAX_PARTICLES) this.items.shift();
    this.items.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 1,
      maxLife: 1,
      size: 6,
      color: "#fff6d8",
      kind: "spark",
      rot: 0,
      vr: 0,
      ...partial,
    });
  }

  update(dt) {
    const next = [];
    for (const p of this.items) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.kind === "petal" ? 28 : 12) * dt;
      p.vx *= 0.99;
      p.rot += p.vr * dt;
      next.push(p);
    }
    this.items = next;
  }
}

function burstInto(pool, { x, y, color, kind, count }) {
  const n = count || (kind === "petal" ? 26 : 18);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = kind === "petal" ? 30 + Math.random() * 70 : 40 + Math.random() * 120;
    pool.spawn({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (kind === "sow" ? 40 : 10),
      life: kind === "petal" ? 1.2 + Math.random() * 0.8 : 0.55 + Math.random() * 0.5,
      maxLife: 1,
      size: kind === "petal" ? 5 + Math.random() * 7 : 3 + Math.random() * 5,
      color,
      kind,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 6,
    });
    pool.items[pool.items.length - 1].maxLife = pool.items[pool.items.length - 1].life;
  }
}

class CanvasFX {
  constructor(container) {
    this.mode = "canvas";
    this.canvas = document.createElement("canvas");
    this.canvas.className = "fx-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.pool = new ParticlePool();
    this.w = 1;
    this.h = 1;
    this._ambient = 0;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  sow(x, y, color) {
    burstInto(this.pool, { x, y, color, kind: "sow", count: 22 });
  }

  bloom(x, y, color) {
    burstInto(this.pool, { x, y, color, kind: "spark", count: 16 });
  }

  wind(x, y, color) {
    burstInto(this.pool, { x, y, color, kind: "petal", count: 28 });
  }

  update(dt) {
    this._ambient += dt;
    if (this._ambient > 0.35) {
      this._ambient = 0;
      if (this.pool.items.length < 80) {
        this.pool.spawn({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          vx: (Math.random() - 0.5) * 12,
          vy: -8 - Math.random() * 14,
          life: 2.2,
          maxLife: 2.2,
          size: 2 + Math.random() * 2.5,
          color: "#fff6d2",
          kind: "spark",
        });
      }
    }
    this.pool.update(dt);
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    for (const p of this.pool.items) {
      const t = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = t;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.kind === "petal") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        g.addColorStop(0, "#fff");
        g.addColorStop(0.4, p.color);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  dispose() {
    this.canvas.remove();
  }
}

class ThreeFX {
  constructor(THREE, container) {
    this.THREE = THREE;
    this.mode = "webgl";
    this.pool = new ParticlePool();
    this.w = 1;
    this.h = 1;
    this._ambient = 0;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "fx-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);

    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 18,
      map: makeDotTexture(THREE),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false,
    });
    this.points = new THREE.Points(this.geometry, mat);
    this.scene.add(this.points);
    this._pos = positions;
    this._col = colors;
    this._size = sizes;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    const dpr = Math.min(1.75, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${w}px`;
    this.renderer.domElement.style.height = `${h}px`;
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.inset = "0";
    this.renderer.domElement.style.pointerEvents = "none";
    this.camera.left = 0;
    this.camera.right = w;
    this.camera.top = 0;
    this.camera.bottom = h;
    this.camera.updateProjectionMatrix();
  }

  sow(x, y, color) {
    burstInto(this.pool, { x, y, color, kind: "sow", count: 24 });
  }
  bloom(x, y, color) {
    burstInto(this.pool, { x, y, color, kind: "spark", count: 18 });
  }
  wind(x, y, color) {
    burstInto(this.pool, { x, y, color, kind: "petal", count: 30 });
  }

  update(dt) {
    this._ambient += dt;
    if (this._ambient > 0.4) {
      this._ambient = 0;
      if (this.pool.items.length < 90) {
        this.pool.spawn({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          vx: (Math.random() - 0.5) * 10,
          vy: -6 - Math.random() * 12,
          life: 2.4,
          maxLife: 2.4,
          size: 4,
          color: "#fff3c4",
          kind: "spark",
        });
      }
    }
    this.pool.update(dt);

    const pos = this._pos;
    const col = this._col;
    const sz = this._size;
    pos.fill(0);
    col.fill(0);
    sz.fill(0);
    const n = Math.min(this.pool.items.length, MAX_PARTICLES);
    for (let i = 0; i < n; i++) {
      const p = this.pool.items[i];
      const t = Math.max(0, p.life / p.maxLife);
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = 0;
      const rgb = hexToRgb(p.color);
      col[i * 3] = (rgb.r / 255) * t;
      col[i * 3 + 1] = (rgb.g / 255) * t;
      col[i * 3 + 2] = (rgb.b / 255) * t;
      sz[i] = p.size * (p.kind === "petal" ? 2.2 : 1.6) * (0.5 + t);
    }
    this.geometry.setDrawRange(0, n);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.geometry.dispose();
    this.points.material.map?.dispose();
    this.points.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export async function createFX(container) {
  const canvasFallback = () => new CanvasFX(container);
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("webgl2");
    if (!gl) return canvasFallback();

    let THREE;
    try {
      THREE = await import("three");
    } catch {
      THREE = await import(
        "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"
      );
    }
    const fx = new ThreeFX(THREE, container);
    fx.resize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    return fx;
  } catch (err) {
    console.warn("Three.js FX unavailable, using canvas particles", err);
    return canvasFallback();
  }
}
