/**
 * Live camera looks for Finger Garden.
 * raw — no GL. natural — restrained soft beauty. lcd — monochrome dot-matrix.
 */

import { FILTER_STORAGE_KEY, BEAUTY_STORAGE_KEY } from "./config.js";

export const FILTERS = [
  { id: "raw", label: "Off / Raw", short: "Raw" },
  { id: "natural", label: "Soft Natural", short: "Soft" },
  { id: "lcd", label: "LCD", short: "LCD" },
];

export const FILTER_IDS = FILTERS.map((f) => f.id);

export function filterLabel(id) {
  return FILTERS.find((f) => f.id === id)?.label || "Off / Raw";
}

export function filterShort(id) {
  return FILTERS.find((f) => f.id === id)?.short || "Raw";
}

export function readFilterPref() {
  try {
    const v = localStorage.getItem(FILTER_STORAGE_KEY);
    if (FILTER_IDS.includes(v)) return v;
    const old = localStorage.getItem(BEAUTY_STORAGE_KEY);
    if (old === "0") return "raw";
    if (old === "1") return "natural";
  } catch {
    /* private mode */
  }
  return "lcd";
}

export function writeFilterPref(id) {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, FILTER_IDS.includes(id) ? id : "raw");
  } catch {
    /* ignore */
  }
}

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

/** Restrained Soft Natural — not the old milky/orange pass. */
const NATURAL_FRAG = `
precision mediump float;
uniform sampler2D u_src;
uniform sampler2D u_blur;
varying vec2 v_uv;

void main() {
  vec3 src = texture2D(u_src, v_uv).rgb;
  vec3 bl = texture2D(u_blur, v_uv).rgb;
  float delta = length(src - bl);
  float edge = smoothstep(0.028, 0.14, delta);
  vec3 surface = mix(bl, src, edge);
  vec3 color = mix(src, surface, 0.16);
  color *= 1.03;
  color += vec3(0.012, 0.01, 0.006);
  color.r += 0.01;
  color.b -= 0.006;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

/**
 * Monochrome dot-matrix LCD: Bayer dither, visible pixel grid, gray-green phosphor.
 * Faces stay readable via 4 luminance steps rather than a single harsh cutoff.
 */
const LCD_FRAG = `
precision mediump float;
uniform sampler2D u_src;
uniform vec2 u_px;
uniform float u_cell;
varying vec2 v_uv;

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float bayer4(vec2 p) {
  vec2 i = mod(floor(p), 4.0);
  vec4 r0 = vec4(0.0, 8.0, 2.0, 10.0);
  vec4 r1 = vec4(12.0, 4.0, 14.0, 6.0);
  vec4 r2 = vec4(3.0, 11.0, 1.0, 9.0);
  vec4 r3 = vec4(15.0, 7.0, 13.0, 5.0);
  vec4 row = r0;
  if (i.y > 0.5) row = r1;
  if (i.y > 1.5) row = r2;
  if (i.y > 2.5) row = r3;
  float col = row.x;
  if (i.x > 0.5) col = row.y;
  if (i.x > 1.5) col = row.z;
  if (i.x > 2.5) col = row.w;
  return col / 16.0;
}

void main() {
  vec2 px = v_uv * u_px;
  float cell = max(u_cell, 3.0);
  vec2 id = floor(px / cell);
  vec2 local = fract(px / cell);
  vec2 uvCell = (id + 0.5) * cell / u_px;
  float g = luma(texture2D(u_src, uvCell).rgb);
  g = clamp((g - 0.08) * 1.22, 0.0, 1.0);
  float dith = bayer4(id);
  float q = clamp(g + (dith - 0.5) * 0.22, 0.0, 1.0);
  float stepped = floor(q * 3.0 + 0.5) / 3.0;

  vec3 phosphor = vec3(0.70, 0.80, 0.52);
  vec3 plate = vec3(0.10, 0.14, 0.09);
  vec3 color = mix(plate, phosphor, stepped);

  float gap = 0.14;
  float grid = 1.0;
  if (local.x < gap || local.y < gap) grid = 0.42;
  color *= grid;

  gl_FragColor = vec4(color, 1.0);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(log || "shader compile");
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
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(log || "program link");
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
  if (!ok) {
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(tex);
    throw new Error("framebuffer incomplete");
  }
  return { fbo, tex, w, h };
}

function processSize(vw, vh) {
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const maxW = mobile ? 480 : 640;
  const scale = Math.min(1, maxW / Math.max(vw, 1));
  return {
    w: Math.max(2, Math.round((vw * scale) / 2) * 2),
    h: Math.max(2, Math.round((vh * scale) / 2) * 2),
  };
}

export class CameraFilter {
  constructor(video, canvas) {
    this.video = video;
    this.canvas = canvas;
    this.gl = null;
    this.available = false;
    this.mode = "raw";
    this._copy = null;
    this._blur = null;
    this._natural = null;
    this._lcd = null;
    this._videoTex = null;
    this._fboA = null;
    this._fboB = null;
    this._buf = null;
    this._proc = { w: 0, h: 0 };
    this._view = { w: 0, h: 0 };
  }

  get enabled() {
    return this.usingFx();
  }

  usingFx() {
    return this.available && this.mode !== "raw";
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
        this._fail();
      });

      this._copy = this._build(COPY_FRAG, ["u_tex"]);
      this._blur = this._build(BLUR_FRAG, ["u_tex", "u_dir"]);
      this._natural = this._build(NATURAL_FRAG, ["u_src", "u_blur"]);
      this._lcd = this._build(LCD_FRAG, ["u_src", "u_px", "u_cell"]);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, -1, 1, 0, 1, 1, -1, 1, 0, 1, 1, 1, 1,
        ]),
        gl.STATIC_DRAW
      );
      this._buf = buf;
      this._videoTex = makeTexture(gl);
      this.available = true;
      this.canvas.hidden = true;
      return true;
    } catch (err) {
      console.warn("filter init", err);
      this._fail();
      return false;
    }
  }

  _build(frag, uniforms) {
    const gl = this.gl;
    const p = program(gl, VERT, frag);
    const loc = { program: p };
    for (const name of uniforms) loc[name] = gl.getUniformLocation(p, name);
    return loc;
  }

  _fail() {
    this.available = false;
    this.mode = "raw";
    this.canvas.hidden = true;
    this.video.classList.remove("has-beauty");
  }

  setMode(id) {
    const next = FILTER_IDS.includes(id) ? id : "raw";
    if (!this.available && next !== "raw") {
      this.mode = "raw";
      this._showRaw();
      return "raw";
    }
    this.mode = next;
    if (this.mode === "raw") this._showRaw();
    else this._showFx();
    return this.mode;
  }

  _showRaw() {
    this.canvas.hidden = true;
    this.video.classList.remove("has-beauty");
  }

  _showFx() {
    this.canvas.hidden = false;
    this.video.classList.add("has-beauty");
  }

  syncMirror(mirrored) {
    this.canvas.classList.toggle("is-front", !!mirrored);
    this.canvas.classList.toggle("is-back", !mirrored);
  }

  resize() {
    if (!this.available || !this.gl) return;
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
    const next = processSize(vw, vh);
    if (this._fboA && this._proc.w === next.w && this._proc.h === next.h) return;
    const gl = this.gl;
    if (this._fboA) {
      gl.deleteFramebuffer(this._fboA.fbo);
      gl.deleteTexture(this._fboA.tex);
      gl.deleteFramebuffer(this._fboB.fbo);
      gl.deleteTexture(this._fboB.tex);
    }
    this._fboA = makeFbo(gl, next.w, next.h);
    this._fboB = makeFbo(gl, next.w, next.h);
    this._proc = next;
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

  _letterbox() {
    const video = this.video;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.min(this._view.w / vw, this._view.h / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    return {
      dw,
      dh,
      dx: (this._view.w - dw) / 2,
      dy: (this._view.h - dh) / 2,
    };
  }

  _upload() {
    const gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, this._videoTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
  }

  _beginScreen(box) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this._view.w, this._view.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(box.dx, box.dy, box.dw, box.dh);
  }

  drawNatural() {
    const gl = this.gl;
    const video = this.video;
    this._ensureProcess(video.videoWidth, video.videoHeight);
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

    const box = this._letterbox();
    this._beginScreen(box);
    this._quad(this._natural);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._videoTex);
    gl.uniform1i(this._natural.u_src, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._fboA.tex);
    gl.uniform1i(this._natural.u_blur, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  drawLcd() {
    const gl = this.gl;
    const box = this._letterbox();
    this._beginScreen(box);
    this._quad(this._lcd);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._videoTex);
    gl.uniform1i(this._lcd.u_src, 0);
    gl.uniform2f(this._lcd.u_px, box.dw, box.dh);
    const cell = Math.max(4, Math.min(7, box.dw / 72));
    gl.uniform1f(this._lcd.u_cell, cell);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  draw() {
    if (!this.usingFx() || !this.gl) {
      this._showRaw();
      return;
    }
    const video = this.video;
    if (video.readyState < 2 || !video.videoWidth) return;

    this.resize();
    try {
      this._upload();
    } catch (err) {
      console.warn("filter tex", err);
      return;
    }

    this._showFx();
    if (this.mode === "lcd") this.drawLcd();
    else this.drawNatural();
  }
}
