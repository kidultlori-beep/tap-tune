/**
 * Finger Garden share card + Web Share (files) with download fallback.
 * Canvas PNG only — no song recording.
 */

export const SHARE_URL = "https://fingergarden.annieway.world/";
export const SHARE_TITLE = "Finger Garden";
export const SHARE_LINE = "I planted a garden with my fingers";
export const CARD_W = 1080;
export const CARD_H = 1080;
export const OG_W = 1200;
export const OG_H = 630;
export const CARD_FILE = "finger-garden.png";

const SERIF = '"Cormorant Garamond", "Palatino Linotype", Palatino, Georgia, serif';
const SANS = 'Nunito, "Segoe UI", system-ui, sans-serif';
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export function shareText(bloomCount = 0) {
  const bloom =
    Number(bloomCount) > 0 ? ` · Bloom ${Number(bloomCount)}` : "";
  return `${SHARE_LINE}${bloom}\n${SHARE_URL}`;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, fill) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function paintBackdrop(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#bfd7ea");
  sky.addColorStop(0.42, "#e3efd2");
  sky.addColorStop(1, "#f3e4c2");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const blob = (cx, cy, r, color) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  };
  blob(w * 0.18, h * 0.16, w * 0.38, "rgba(255, 220, 180, 0.5)");
  blob(w * 0.86, h * 0.1, w * 0.32, "rgba(244, 184, 200, 0.38)");
  blob(w * 0.7, h * 0.92, w * 0.4, "rgba(158, 212, 176, 0.28)");
}

function drawEmoji(ctx, glyph, x, y, size, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, 0, 0);
  ctx.restore();
}

function drawBloomPill(ctx, cx, cy, bloomCount, scale) {
  const label = `Bloom ${bloomCount}`;
  ctx.font = `700 ${Math.round(28 * scale)}px ${SANS}`;
  const tw = ctx.measureText(label).width;
  const padX = 28 * scale;
  const padY = 14 * scale;
  const pw = tw + padX * 2;
  const ph = 28 * scale + padY * 2;
  fillRoundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2, "rgba(255, 247, 234, 0.92)");
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = Math.max(1, 2 * scale);
  roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
  ctx.stroke();
  ctx.fillStyle = "#243026";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 1 * scale);
}

/**
 * Paint a share / OG card onto an existing 2D context.
 * Square (~1:1) is the Messages card; wide is the link-unfurl OG layout.
 */
export function drawShareCard(ctx, { width, height, bloomCount = 0 } = {}) {
  const w = width;
  const h = height;
  const scale = Math.min(w, h) / 1080;
  const landscape = w / h > 1.25;
  const bloom = Math.max(0, Number(bloomCount) || 0);

  paintBackdrop(ctx, w, h);

  const inset = landscape ? Math.round(36 * scale * 1.4) : Math.round(72 * scale);
  const cardX = inset;
  const cardY = inset;
  const cardW = w - inset * 2;
  const cardH = h - inset * 2;
  const radius = landscape ? 36 : Math.round(56 * scale);

  ctx.save();
  ctx.shadowColor = "rgba(28, 42, 28, 0.18)";
  ctx.shadowBlur = 40 * scale;
  ctx.shadowOffsetY = 14 * scale;
  fillRoundRect(ctx, cardX, cardY, cardW, cardH, radius, "rgba(255, 247, 234, 0.86)");
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = Math.max(1, 2 * scale);
  roundRect(ctx, cardX, cardY, cardW, cardH, radius);
  ctx.stroke();

  const cx = w / 2;
  ctx.fillStyle = "#2c3d2e";
  ctx.textAlign = "center";

  if (landscape) {
    const left = cardX + cardW * 0.08;
    const textW = cardW * 0.54;
    ctx.textAlign = "left";
    ctx.font = `500 ${Math.round(72 * (h / 630))}px ${SERIF}`;
    ctx.fillText(SHARE_TITLE, left, cardY + cardH * 0.38);
    ctx.fillStyle = "#3d5240";
    ctx.font = `italic 500 ${Math.round(26 * (h / 630))}px ${SERIF}`;
    wrapLine(ctx, SHARE_LINE, left, cardY + cardH * 0.55, textW, 32);
    if (bloom > 0) {
      ctx.textAlign = "left";
      drawBloomPill(ctx, left + 90, cardY + cardH * 0.72, bloom, h / 630);
    }
    ctx.textAlign = "left";
    ctx.fillStyle = "#4b5d4e";
    ctx.font = `600 ${Math.round(18 * (h / 630))}px ${SANS}`;
    ctx.fillText(SHARE_URL.replace(/\/$/, ""), left, cardY + cardH * 0.88);

    const clusterX = cardX + cardW * 0.78;
    const clusterY = cardY + cardH * 0.5;
    const spots = [
      ["🌸", -70, -40, 64, -0.2],
      ["🌿", 40, -70, 52, 0.4],
      ["🌼", 20, 10, 70, 0.1],
      ["🍀", -50, 50, 48, -0.15],
      ["🌻", 70, 55, 58, 0.25],
      ["🌺", -10, -90, 42, 0.3],
    ];
    for (const [g, dx, dy, sz, rot] of spots) {
      drawEmoji(ctx, g, clusterX + dx, clusterY + dy, sz, rot);
    }
    return;
  }

  const titleSize = Math.round(96 * scale);
  ctx.font = `500 ${titleSize}px ${SERIF}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(SHARE_TITLE, cx, cardY + cardH * 0.38);

  const rowY = cardY + cardH * 0.2;
  const row = ["🌸", "🌿", "🌼", "🍀", "🌻"];
  const gap = 92 * scale;
  const startX = cx - ((row.length - 1) * gap) / 2;
  row.forEach((g, i) => {
    drawEmoji(ctx, g, startX + i * gap, rowY, 54 * scale, (i - 2) * 0.08);
  });

  ctx.fillStyle = "#3d5240";
  ctx.font = `italic 500 ${Math.round(36 * scale)}px ${SERIF}`;
  ctx.fillText(SHARE_LINE, cx, cardY + cardH * 0.5);

  if (bloom > 0) {
    drawBloomPill(ctx, cx, cardY + cardH * 0.62, bloom, scale);
  } else {
    ctx.fillStyle = "#5a6d5c";
    ctx.font = `600 ${Math.round(26 * scale)}px ${SANS}`;
    ctx.fillText("Pinch to plant · A C D E F G A B", cx, cardY + cardH * 0.62);
  }

  drawEmoji(ctx, "🌷", cardX + 86 * scale, cardY + cardH * 0.82, 40 * scale, -0.3);
  drawEmoji(ctx, "🍄", cardX + cardW - 90 * scale, cardY + cardH * 0.8, 38 * scale, 0.25);

  ctx.fillStyle = "#4b5d4e";
  ctx.font = `700 ${Math.round(28 * scale)}px ${SANS}`;
  ctx.fillText(SHARE_URL.replace(/\/$/, ""), cx, cardY + cardH * 0.88);
}

function wrapLine(ctx, text, x, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

export function renderShareCanvas(bloomCount = 0, width = CARD_W, height = CARD_H) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  drawShareCard(ctx, { width, height, bloomCount });
  return canvas;
}

function dataUrlToFile(dataUrl, name) {
  const comma = dataUrl.indexOf(",");
  const header = dataUrl.slice(0, comma);
  const mime = /data:(.*?);/.exec(header)?.[1] || "image/png";
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

export function canvasToFile(canvas, name = CARD_FILE) {
  return dataUrlToFile(canvas.toDataURL("image/png"), name);
}

function canShareFiles(file) {
  try {
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function canSharePayload(payload) {
  try {
    if (typeof navigator.canShare !== "function") return true;
    return navigator.canShare(payload);
  } catch {
    return false;
  }
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* execCommand fallback below */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

/**
 * Tap handler. Keep file encode synchronous so iOS still has a user gesture
 * when navigator.share() runs.
 */
export async function shareGarden({ bloomCount = 0, toast } = {}) {
  const canvas = renderShareCanvas(bloomCount);
  const file = canvasToFile(canvas);
  const text = shareText(bloomCount);

  if (canShareFiles(file) && typeof navigator.share === "function") {
    const payloads = [
      { files: [file], title: SHARE_TITLE, text, url: SHARE_URL },
      { files: [file], title: SHARE_TITLE, text },
      { files: [file] },
    ];
    for (const payload of payloads) {
      if (!canSharePayload(payload)) continue;
      try {
        await navigator.share(payload);
        return "shared";
      } catch (err) {
        if (err?.name === "AbortError") return "aborted";
      }
    }
  }

  downloadFile(file);
  const copied = await copyText(SHARE_URL);
  toast?.(copied ? "Saved card · link copied" : "Saved card");
  return "fallback";
}
