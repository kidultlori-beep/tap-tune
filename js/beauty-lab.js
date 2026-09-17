/**
 * Temporary Beauty lab — live camera presets, not the garden default.
 * Restrained Instagram-natural looks. No Demo mode.
 */

import { CameraFeed, canSwitchCamera } from "./camera.js";

const VERT = `
attribute vec2 a_pos;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const COPY_FRAG = `
precision mediump float;
uniform sampler2D u_tex;
varying vec2 v_uv;
void main() {
  gl_FragColor = texture2D(u_tex, v_uv);
}
`;

const BLUR_FRAG = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_dir;
varying vec2 v_uv;
void main() {
  vec4 sum = texture2D(u_tex, v_uv) * 0.227027;
  sum += texture2D(u_tex, v_uv + u_dir * 1.384615) * 0.316216;
  sum += texture2D(u_tex, v_uv - u_dir * 1.384615) * 0.316216;
  sum += texture2D(u_tex, v_uv + u_dir * 3.230769) * 0.070270;
  sum += texture2D(u_tex, v_uv - u_dir * 3.230769) * 0.070270;
  gl_FragColor = sum;
}
`;

const GRADE_FRAG = `
precision mediump float;
uniform sampler2D u_src;
uniform sampler2D u_blur;
uniform float u_smooth;
uniform float u_bright;
uniform float u_contrast;
uniform float u_sat;
uniform float u_temp;
uniform float u_vignette;
uniform float u_grain;
uniform float u_soft;
uniform float u_lift;
uniform float u_clarity;
uniform float u_intensity;
uniform float u_time;
varying vec2 v_uv;

vec3 softLight(vec3 base, vec3 blend) {
  vec3 lo = 2.0 * base * blend + base * base * (1.0 - 2.0 * blend);
  vec3 hi = sqrt(max(base, 0.0)) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend);
  return mix(lo, hi, step(0.5, blend));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec3 src = texture2D(u_src, v_uv).rgb;
  vec3 bl = texture2D(u_blur, v_uv).rgb;
  float delta = length(src - bl);
  float edge = smoothstep(0.028, 0.13, delta);
  vec3 surface = mix(bl, src, edge);
  vec3 color = mix(src, surface, u_smooth);
  color += (src - bl) * u_clarity;
  color += u_lift * (1.0 - color) * 0.65;
  color *= 1.0 + u_bright;
  color = (color - 0.5) * u_contrast + 0.5;
  color.r += u_temp * 0.028;
  color.g += u_temp * 0.006;
  color.b -= u_temp * 0.024;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, u_sat);
  vec3 peach = vec3(0.62, 0.56, 0.52);
  color = mix(color, softLight(clamp(color, 0.0, 1.0), peach), u_soft);
  float d = distance(v_uv, vec2(0.5, 0.48));
  float vig = smoothstep(0.32, 1.05, d);
  color *= 1.0 - u_vignette * vig * 0.42;
  color = mix(color, color * vec3(1.025, 1.0, 0.96), u_vignette * vig * 0.35);
  float n = hash(gl_FragCoord.xy + vec2(u_time * 13.0, u_time * 7.0)) - 0.5;
  color += n * u_grain * 0.055;
  color = mix(src, clamp(color, 0.0, 1.0), clamp(u_intensity, 0.0, 1.0));
  gl_FragColor = vec4(color, 1.0);
}
`;

/** Distinct, restrained looks. Values stay far from the muddy orange garden pass. */
export const PRESETS = [
  {
    id: "raw",
    name: "Raw / Off",
    hint: "Unfiltered camera",
    raw: true,
  },
  {
    id: "natural",
    name: "Soft Natural",
    hint: "Almost invisible",
    smooth: 0.14,
    bright: 0.02,
    contrast: 1.02,
    sat: 1.03,
    temp: 0.12,
    vignette: 0,
    grain: 0,
    soft: 0.06,
    lift: 0.012,
    clarity: 0.05,
  },
  {
    id: "warm",
    name: "Warm Glow",
    hint: "Gentle gold, not orange",
    smooth: 0.2,
    bright: 0.04,
    contrast: 1.05,
    sat: 1.07,
    temp: 0.48,
    vignette: 0.16,
    grain: 0,
    soft: 0.2,
    lift: 0.02,
    clarity: 0,
  },
  {
    id: "cool",
    name: "Cool Clean",
    hint: "Crisp, cooler, little blur",
    smooth: 0.05,
    bright: 0.018,
    contrast: 1.12,
    sat: 0.95,
    temp: -0.62,
    vignette: 0.05,
    grain: 0,
    soft: 0,
    lift: 0,
    clarity: 0.32,
  },
  {
    id: "cream",
    name: "Cream Soft",
    hint: "Porcelain, edges kept",
    smooth: 0.34,
    bright: 0.045,
    contrast: 0.99,
    sat: 0.94,
    temp: 0.16,
    vignette: 0.07,
    grain: 0,
    soft: 0.14,
    lift: 0.04,
    clarity: 0.08,
  },
  {
    id: "film",
    name: "Film Soft",
    hint: "Mild contrast + vignette",
    smooth: 0.12,
    bright: 0.008,
    contrast: 1.16,
    sat: 0.86,
    temp: 0.26,
    vignette: 0.46,
    grain: 0.7,
    soft: 0.1,
    lift: 0.02,
    clarity: 0.06,
  },
];

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(log || "shader");
  }
  return sh;
}

function program(gl, vsSrc, fsSrc) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, "a_pos");
  gl.bindAttribLocation(p, 1, "a_uv");
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p) || "link");
  }
  return p;
}

function makeTexture(gl) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

function makeFbo(gl, w, h) {
  const tex = makeTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!ok) throw new Error("fbo");
  return { fbo, tex, w, h };
}

class LabFilter {
  constructor(video, canvas) {
    this.video = video;
    this.canvas = canvas;
    this.gl = null;
    this.available = false;
    this.preset = PRESETS[0];
    this.intensity = 1;
    this.holdRaw = false;
    this._copy = null;
    this._blur = null;
    this._grade = null;
    this._videoTex = null;
    this._fboA = null;
    this._fboB = null;
    this._buf = null;
    this._proc = { w: 0, h: 0 };
    this._view = { w: 0, h: 0 };
  }

  init() {
    try {
      const gl = this.canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "low-power",
      });
      if (!gl) return false;
      this.gl = gl;
      this.canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        this.available = false;
        this._showRaw();
      });
      this._copy = this._build(COPY_FRAG, ["u_tex"]);
      this._blur = this._build(BLUR_FRAG, ["u_tex", "u_dir"]);
      this._grade = this._build(GRADE_FRAG, [
        "u_src",
        "u_blur",
        "u_smooth",
        "u_bright",
        "u_contrast",
        "u_sat",
        "u_temp",
        "u_vignette",
        "u_grain",
        "u_soft",
        "u_lift",
        "u_clarity",
        "u_intensity",
        "u_time",
      ]);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, -1, 1, 0, 1, 1, -1, 1, 0, 1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
      this._buf = buf;
      this._videoTex = makeTexture(gl);
      this.available = true;
      return true;
    } catch (err) {
      console.warn("lab gl", err);
      this.available = false;
      return false;
    }
  }

  _build(frag, names) {
    const gl = this.gl;
    const p = program(gl, VERT, frag);
    const loc = { program: p };
    for (const n of names) loc[n] = gl.getUniformLocation(p, n);
    return loc;
  }

  _showRaw() {
    this.canvas.hidden = true;
    this.video.classList.remove("has-beauty");
  }

  _showFx() {
    this.canvas.hidden = false;
    this.video.classList.add("has-beauty");
  }

  usingFx() {
    return this.available && !this.preset.raw && !this.holdRaw && this.intensity > 0.004;
  }

  syncMirror(mirrored) {
    this.canvas.classList.toggle("is-front", !!mirrored);
    this.canvas.classList.toggle("is-back", !mirrored);
  }

  resize() {
    if (!this.gl) return;
    const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    const w = Math.max(2, Math.round(window.innerWidth * dpr));
    const h = Math.max(2, Math.round(window.innerHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this._view = { w, h };
  }

  _ensureProcess(vw, vh) {
    const maxW = 640;
    const scale = Math.min(1, maxW / Math.max(vw, 1));
    const w = Math.max(2, Math.round((vw * scale) / 2) * 2);
    const h = Math.max(2, Math.round((vh * scale) / 2) * 2);
    if (this._fboA && this._proc.w === w && this._proc.h === h) return;
    const gl = this.gl;
    if (this._fboA) {
      gl.deleteFramebuffer(this._fboA.fbo);
      gl.deleteTexture(this._fboA.tex);
      gl.deleteFramebuffer(this._fboB.fbo);
      gl.deleteTexture(this._fboB.tex);
    }
    this._fboA = makeFbo(gl, w, h);
    this._fboB = makeFbo(gl, w, h);
    this._proc = { w, h };
  }

  _quad(prog) {
    const gl = this.gl;
    gl.useProgram(prog.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buf);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
  }

  _drawTo(fbo, w, h) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, w, h);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  draw(now) {
    if (!this.usingFx()) {
      this._showRaw();
      return;
    }
    const video = this.video;
    if (video.readyState < 2 || !video.videoWidth) return;
    const gl = this.gl;
    this.resize();
    this._ensureProcess(video.videoWidth, video.videoHeight);
    this._showFx();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, this._videoTex);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    } catch {
      this._showRaw();
      return;
    }

    const { w: pw, h: ph } = this._proc;
    this._quad(this._copy);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._videoTex);
    gl.uniform1i(this._copy.u_tex, 0);
    this._drawTo(this._fboA.fbo, pw, ph);

    this._quad(this._blur);
    gl.uniform1i(this._blur.u_tex, 0);
    gl.bindTexture(gl.TEXTURE_2D, this._fboA.tex);
    gl.uniform2f(this._blur.u_dir, 1 / pw, 0);
    this._drawTo(this._fboB.fbo, pw, ph);
    gl.bindTexture(gl.TEXTURE_2D, this._fboB.tex);
    gl.uniform2f(this._blur.u_dir, 0, 1 / ph);
    this._drawTo(this._fboA.fbo, pw, ph);

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.min(this._view.w / vw, this._view.h / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const dx = (this._view.w - dw) / 2;
    const dy = (this._view.h - dh) / 2;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this._view.w, this._view.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(dx, dy, dw, dh);

    const p = this.preset;
    this._quad(this._grade);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._videoTex);
    gl.uniform1i(this._grade.u_src, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._fboA.tex);
    gl.uniform1i(this._grade.u_blur, 1);
    gl.uniform1f(this._grade.u_smooth, p.smooth);
    gl.uniform1f(this._grade.u_bright, p.bright);
    gl.uniform1f(this._grade.u_contrast, p.contrast);
    gl.uniform1f(this._grade.u_sat, p.sat);
    gl.uniform1f(this._grade.u_temp, p.temp);
    gl.uniform1f(this._grade.u_vignette, p.vignette);
    gl.uniform1f(this._grade.u_grain, p.grain);
    gl.uniform1f(this._grade.u_soft, p.soft);
    gl.uniform1f(this._grade.u_lift, p.lift);
    gl.uniform1f(this._grade.u_clarity, p.clarity);
    gl.uniform1f(this._grade.u_intensity, this.intensity);
    gl.uniform1f(this._grade.u_time, (now || 0) * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

const $ = (id) => document.getElementById(id);

let ui = null;
let camera = null;
let filter = null;
let running = false;

function collectUi() {
  ui = {
    video: $("camera"),
    canvas: $("beauty"),
    gate: $("gate"),
    btnStart: $("btn-start"),
    btnRetry: $("btn-retry"),
    fallback: $("fallback"),
    status: $("status"),
    presets: $("presets"),
    name: $("preset-name"),
    hint: $("preset-hint"),
    intensity: $("intensity"),
    intensityVal: $("intensity-val"),
    holdRaw: $("hold-raw"),
    btnFlip: $("btn-flip"),
  };
}

function setStatus(text) {
  ui.status.textContent = text || "";
}

function showFallback(code) {
  ui.fallback.hidden = false;
  ui.btnRetry.hidden = false;
  ui.btnStart.hidden = true;
  if (code === "denied") {
    ui.fallback.textContent =
      "Camera permission is off. Allow the camera in your browser settings, then tap Retry.";
  } else if (code === "unsupported") {
    ui.fallback.textContent =
      "This browser cannot use the camera. Open this page over HTTPS on a phone.";
  } else {
    ui.fallback.textContent =
      "No camera found. Try again on a phone over HTTPS.";
  }
}

function applyPreset(id) {
  const preset = PRESETS.find((p) => p.id === id) || PRESETS[0];
  filter.preset = preset;
  ui.name.textContent = preset.name;
  ui.hint.textContent = preset.hint;
  for (const btn of ui.presets.querySelectorAll(".preset")) {
    const on = btn.dataset.id === preset.id;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
}

function buildPresetButtons() {
  ui.presets.innerHTML = "";
  for (const p of PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset";
    btn.dataset.id = p.id;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML = `<strong>${p.name}</strong><em>${p.hint}</em>`;
    btn.addEventListener("click", () => applyPreset(p.id));
    ui.presets.appendChild(btn);
  }
}

function loop(now) {
  if (!running) return;
  filter?.draw(now);
  requestAnimationFrame(loop);
}

async function start() {
  setStatus("Asking for the camera…");
  ui.btnStart.disabled = true;
  camera = new CameraFeed(ui.video);
  try {
    await camera.start("user");
  } catch (err) {
    ui.btnStart.disabled = false;
    showFallback(err.code || "unavailable");
    return;
  }

  filter = new LabFilter(ui.video, ui.canvas);
  const ok = filter.init();
  if (!ok) {
    setStatus("WebGL unavailable — showing the raw camera.");
  }
  filter.syncMirror(camera.mirrored);
  applyPreset("natural");
  ui.gate.classList.add("is-hidden");
  running = true;
  requestAnimationFrame(loop);
}

function bindHold(el) {
  const down = (e) => {
    e.preventDefault();
    if (!filter) return;
    filter.holdRaw = true;
    el.classList.add("is-held");
    ui.name.textContent = "Raw / Off";
    ui.hint.textContent = "Holding for before / after";
  };
  const up = () => {
    if (!filter) return;
    filter.holdRaw = false;
    el.classList.remove("is-held");
    ui.name.textContent = filter.preset.name;
    ui.hint.textContent = filter.preset.hint;
  };
  el.addEventListener("pointerdown", down);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}

function bind() {
  collectUi();
  window.alert = (msg) => console.warn("[alert]", msg);
  buildPresetButtons();
  ui.btnStart.addEventListener("click", () => start());
  ui.btnRetry.addEventListener("click", () => {
    ui.fallback.hidden = true;
    ui.btnRetry.hidden = true;
    ui.btnStart.hidden = false;
    ui.btnStart.disabled = false;
    setStatus("");
    start();
  });
  ui.intensity.addEventListener("input", () => {
    const v = Number(ui.intensity.value);
    ui.intensityVal.textContent = String(v);
    if (filter) filter.intensity = v / 100;
  });
  bindHold(ui.holdRaw);
  ui.btnFlip.addEventListener("click", async () => {
    if (!camera || !camera.stream || !canSwitchCamera()) return;
    const result = await camera.flip();
    if (result.flipped) filter?.syncMirror(camera.mirrored);
  });
  window.addEventListener("resize", () => filter?.resize());
}

if (typeof document !== "undefined" && document.getElementById("btn-start")) {
  bind();
}
