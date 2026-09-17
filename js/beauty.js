/**
 * Full-frame lightweight WebGL beauty pass (no face mesh, no paid SDKs).
 * ON: separable blur + edge-preserving mix, then soft-light / warmth.
 * OFF: no GL work — raw <video> is shown.
 */

import { BEAUTY_STORAGE_KEY } from "./config.js";

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
uniform float u_warm;
varying vec2 v_uv;

vec3 softLight(vec3 base, vec3 blend) {
  vec3 lo = 2.0 * base * blend + base * base * (1.0 - 2.0 * blend);
  vec3 hi = sqrt(max(base, 0.0)) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend);
  return mix(lo, hi, step(0.5, blend));
}

void main() {
  vec3 src = texture2D(u_src, v_uv).rgb;
  vec3 blur = texture2D(u_blur, v_uv).rgb;
  float edge = clamp(length(src - blur) * 4.0, 0.0, 1.0);
  vec3 surface = mix(blur, src, edge);
  vec3 color = mix(src, surface, u_smooth);
  color *= 1.0 + u_bright;
  color += u_bright * 0.08;
  color.r += u_warm * 0.55;
  color.g += u_warm * 0.18;
  color.b -= u_warm * 0.22;
  vec3 lift = vec3(0.64, 0.58, 0.52);
  color = mix(color, softLight(clamp(color, 0.0, 1.0), lift), 0.32);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export function readBeautyPref() {
  try {
    const v = localStorage.getItem(BEAUTY_STORAGE_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* private mode */
  }
  return true;
}

export function writeBeautyPref(on) {
  try {
    localStorage.setItem(BEAUTY_STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

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

export class BeautyFilter {
  constructor(video, canvas) {
    this.video = video;
    this.canvas = canvas;
    this.gl = null;
    this.available = false;
    this.enabled = false;
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
        this._fail();
      });

      this._copy = this._build(COPY_FRAG, ["u_tex"]);
      this._blur = this._build(BLUR_FRAG, ["u_tex", "u_dir"]);
      this._grade = this._build(GRADE_FRAG, ["u_src", "u_blur", "u_smooth", "u_bright", "u_warm"]);

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
      console.warn("beauty init", err);
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
    this.enabled = false;
    this.canvas.hidden = true;
    this.video.classList.remove("has-beauty");
  }

  setEnabled(on) {
    if (!this.available) {
      this.enabled = false;
      this.canvas.hidden = true;
      this.video.classList.remove("has-beauty");
      return false;
    }
    this.enabled = !!on;
    this.canvas.hidden = !this.enabled;
    this.video.classList.toggle("has-beauty", this.enabled);
    return this.enabled;
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

  draw() {
    if (!this.enabled || !this.available || !this.gl) return;
    const video = this.video;
    if (video.readyState < 2 || !video.videoWidth) return;

    const gl = this.gl;
    this.resize();
    this._ensureProcess(video.videoWidth, video.videoHeight);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, this._videoTex);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    } catch (err) {
      console.warn("beauty tex", err);
      return;
    }

    const { w: pw, h: ph } = this._proc;

    this._quad(this._copy);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._videoTex);
    gl.uniform1i(this._copy.u_tex, 0);
    this._drawTo(this._fboA.fbo, pw, ph);

    this._quad(this._blur);
    gl.bindTexture(gl.TEXTURE_2D, this._fboA.tex);
    gl.uniform1i(this._blur.u_tex, 0);
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

    this._quad(this._grade);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._videoTex);
    gl.uniform1i(this._grade.u_src, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._fboA.tex);
    gl.uniform1i(this._grade.u_blur, 1);
    gl.uniform1f(this._grade.u_smooth, 0.55);
    gl.uniform1f(this._grade.u_bright, 0.1);
    gl.uniform1f(this._grade.u_warm, 0.08);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
