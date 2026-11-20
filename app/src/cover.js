// The cover renderer: multi-panel poster layouts, a Vice City colour grade and bold poster lettering,
// drawn entirely on canvas. No libraries, no network — the photos are the only images involved.

/** Panel layouts in normalised (0..1) coordinates. Each panel clips the photo to a polygon and crops it
 *  with its own zoom and focal point, so one photo reads as a collage of different shots. */
export const LAYOUTS = {
  classic: {
    label: 'Classic Collage',
    note: 'Five diagonal panels',
    panels: [
      { poly: [[0, 0], [0.60, 0], [0.50, 0.36], [0, 0.40]], zoom: 1.18, fx: 0.5, fy: 0.3 },
      { poly: [[0.60, 0], [1, 0], [1, 0.33], [0.50, 0.36]], zoom: 1.38, fx: 0.62, fy: 0.28 },
      { poly: [[0, 0.40], [0.50, 0.36], [0.44, 0.66], [0, 0.70]], zoom: 1.42, fx: 0.38, fy: 0.55 },
      { poly: [[0.50, 0.36], [1, 0.33], [1, 0.64], [0.44, 0.66]], zoom: 1.24, fx: 0.58, fy: 0.55 },
      { poly: [[0, 0.70], [0.44, 0.66], [1, 0.64], [1, 1], [0, 1]], zoom: 1.06, fx: 0.5, fy: 0.62 },
    ],
  },
  triptych: {
    label: 'Triptych',
    note: 'Three slanted strips',
    panels: [
      { poly: [[0, 0], [0.37, 0], [0.33, 1], [0, 1]], zoom: 1.3, fx: 0.28, fy: 0.45 },
      { poly: [[0.37, 0], [0.68, 0], [0.66, 1], [0.33, 1]], zoom: 1.12, fx: 0.5, fy: 0.4 },
      { poly: [[0.68, 0], [1, 0], [1, 1], [0.66, 1]], zoom: 1.3, fx: 0.72, fy: 0.45 },
    ],
  },
  grid: {
    label: 'Grid Story',
    note: 'Four framed panels',
    panels: [
      { poly: [[0, 0], [0.5, 0], [0.5, 0.52], [0, 0.52]], zoom: 1.22, fx: 0.4, fy: 0.35 },
      { poly: [[0.5, 0], [1, 0], [1, 0.52], [0.5, 0.52]], zoom: 1.22, fx: 0.6, fy: 0.35 },
      { poly: [[0, 0.52], [0.5, 0.52], [0.5, 1], [0, 1]], zoom: 1.22, fx: 0.42, fy: 0.65 },
      { poly: [[0.5, 0.52], [1, 0.52], [1, 1], [0.5, 1]], zoom: 1.22, fx: 0.58, fy: 0.65 },
    ],
  },
  showcase: {
    label: 'Hero + Strip',
    note: 'One hero, three details',
    panels: [
      { poly: [[0, 0], [1, 0], [1, 0.62], [0, 0.68]], zoom: 1.05, fx: 0.5, fy: 0.38 },
      { poly: [[0, 0.68], [0.34, 0.65], [0.34, 1], [0, 1]], zoom: 1.45, fx: 0.3, fy: 0.6 },
      { poly: [[0.34, 0.65], [0.67, 0.63], [0.67, 1], [0.34, 1]], zoom: 1.45, fx: 0.52, fy: 0.6 },
      { poly: [[0.67, 0.63], [1, 0.62], [1, 1], [0.67, 1]], zoom: 1.45, fx: 0.74, fy: 0.6 },
    ],
  },
};

/** Colour grades. Each is a set of overlay stops (top -> bottom) plus a sun-glow tint. */
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    stops: [
      [0, 'rgba(24, 224, 255, 0.20)'],
      [0.38, 'rgba(255, 170, 60, 0.05)'],
      [0.62, 'rgba(255, 94, 58, 0.28)'],
      [0.85, 'rgba(255, 0, 128, 0.38)'],
      [1, 'rgba(38, 0, 58, 0.50)'],
    ],
    glow: 'rgba(255, 140, 66, 0.35)',
  },
  neon: {
    label: 'Neon Nights',
    stops: [
      [0, 'rgba(0, 255, 213, 0.22)'],
      [0.45, 'rgba(20, 0, 60, 0.10)'],
      [0.75, 'rgba(120, 0, 255, 0.34)'],
      [1, 'rgba(255, 0, 170, 0.42)'],
    ],
    glow: 'rgba(0, 229, 255, 0.28)',
  },
  gold: {
    label: 'Golden Hour',
    stops: [
      [0, 'rgba(255, 214, 120, 0.16)'],
      [0.5, 'rgba(255, 150, 60, 0.14)'],
      [0.82, 'rgba(214, 72, 32, 0.32)'],
      [1, 'rgba(52, 14, 8, 0.48)'],
    ],
    glow: 'rgba(255, 180, 80, 0.4)',
  },
};

const DISPLAY_FONT = '"Arial Black", Impact, "Franklin Gothic Heavy", "Helvetica Neue", Arial, sans-serif';

function panelPath(ctx, poly, w, h) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * w, y * h) : ctx.lineTo(x * w, y * h)));
  ctx.closePath();
}

function bbox(poly) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** Draws one photo covering a panel's bounding box, honouring zoom + focal point. */
function drawPanelPhoto(ctx, img, panel, w, h, gradeI) {
  const b = bbox(panel.poly);
  const bw = (b.x1 - b.x0) * w;
  const bh = (b.y1 - b.y0) * h;
  const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * panel.zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = (b.x0 + b.x1) / 2 * w;
  const cy = (b.y0 + b.y1) / 2 * h;
  let dx = cx - panel.fx * pw;
  let dy = cy - panel.fy * ph;
  // Clamp so the photo always covers the panel's whole bounding box (scale guarantees pw >= bw, ph >= bh).
  dx = Math.max(b.x1 * w - pw, Math.min(b.x0 * w, dx));
  dy = Math.max(b.y1 * h - ph, Math.min(b.y0 * h, dy));
  ctx.save();
  try { ctx.filter = `saturate(${(1 + 0.55 * gradeI).toFixed(3)}) contrast(${(1 + 0.2 * gradeI).toFixed(3)}) brightness(${(1 + 0.04 * gradeI).toFixed(3)})`; } catch { /* overlays still grade */ }
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

/** A painted placeholder for a panel with no photo yet: a sunset gradient with a retro sun. */
function drawPlaceholder(ctx, panel, w, h, index) {
  const b = bbox(panel.poly);
  const g = ctx.createLinearGradient(b.x0 * w, b.y0 * h, b.x1 * w, b.y1 * h);
  const hues = [['#2b1055', '#7597de'], ['#451e3e', '#f06a8a'], ['#0f3443', '#34e0d0'], ['#3a1c5c', '#ff9a5a'], ['#1d2b64', '#f8cd30']];
  const [c1, c2] = hues[index % hues.length];
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(b.x0 * w, b.y0 * h, (b.x1 - b.x0) * w, (b.y1 - b.y0) * h);
  const cx = (b.x0 + b.x1) / 2 * w;
  const cy = (b.y0 + b.y1) / 2 * h;
  const r = Math.min((b.x1 - b.x0) * w, (b.y1 - b.y0) * h) * 0.22;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(43, 16, 85, 0.55)';
  for (let i = 0; i < 3; i++) ctx.fillRect(cx - r, cy + r * (0.1 + i * 0.3), r * 2, r * 0.1);
  ctx.restore();
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !line) line = trial;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/**
 * Draws the whole cover.
 * state = { photos, panelPhotos, layout, grade, gradeI (0..1), title, subtitle,
 *           titlePos: 'bottom'|'top'|'center', titleScale, accent }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.classic;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const gradeI = Math.min(1, Math.max(0, state.gradeI ?? 0.75));

  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((panel, i) => {
    panelPath(ctx, panel.poly, w, h);
    ctx.save();
    ctx.clip();
    const img = state.photos[state.panelPhotos?.[i] ?? 0] ?? null;
    if (img) drawPanelPhoto(ctx, img, panel, w, h, gradeI);
    else drawPlaceholder(ctx, panel, w, h, i);
    ctx.restore();
  });

  if (gradeI > 0.01) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    for (const [at, color] of grade.stops) g.addColorStop(at, color);
    ctx.save();
    ctx.globalAlpha = gradeI;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.92, 0, w * 0.5, h * 0.92, w * 0.75);
    glow.addColorStop(0, grade.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(5,0,12,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((panel) => {
    panelPath(ctx, panel.poly, w, h);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0a0612';
    ctx.lineWidth = Math.max(6, w * 0.009);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = Math.max(1.5, w * 0.0016);
    ctx.stroke();
  });
  ctx.strokeStyle = '#0a0612';
  ctx.lineWidth = Math.max(10, w * 0.014);
  ctx.strokeRect(0, 0, w, h);

  drawLettering(ctx, w, h, state);
}

function drawLettering(ctx, w, h, state) {
  const title = (state.title ?? '').trim().toUpperCase();
  const subtitle = (state.subtitle ?? '').trim().toUpperCase();
  const accent = state.accent || '#ff2e88';
  const scale = state.titleScale ?? 1;
  if (!title && !subtitle) return;

  const pos = state.titlePos ?? 'bottom';
  const scrimH = h * 0.46;
  let scrim;
  if (pos === 'top') {
    scrim = ctx.createLinearGradient(0, 0, 0, scrimH);
    scrim.addColorStop(0, 'rgba(8,2,16,0.62)');
    scrim.addColorStop(0.55, 'rgba(8,2,16,0.34)');
    scrim.addColorStop(1, 'rgba(8,2,16,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, scrimH);
  } else if (pos === 'center') {
    scrim = ctx.createLinearGradient(0, h / 2 - scrimH / 2, 0, h / 2 + scrimH / 2);
    scrim.addColorStop(0, 'rgba(8,2,16,0)');
    scrim.addColorStop(0.5, 'rgba(8,2,16,0.6)');
    scrim.addColorStop(1, 'rgba(8,2,16,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h / 2 - scrimH / 2, w, scrimH);
  } else {
    scrim = ctx.createLinearGradient(0, h - scrimH, 0, h);
    scrim.addColorStop(0, 'rgba(8,2,16,0)');
    scrim.addColorStop(0.55, 'rgba(8,2,16,0.34)');
    scrim.addColorStop(1, 'rgba(8,2,16,0.62)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h - scrimH, w, scrimH);
  }

  let size = h * 0.118 * scale;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = (s) => { ctx.font = `900 ${s}px ${DISPLAY_FONT}`; try { ctx.letterSpacing = `${Math.round(s * 0.015)}px`; } catch { /* ignore */ } };
  setFont(size);
  let lines = title ? wrapLines(ctx, title, w * 0.9) : [];
  while (lines.length && Math.max(...lines.map((l) => ctx.measureText(l).width)) > w * 0.92 && size > 14) {
    size -= 3;
    setFont(size);
    lines = wrapLines(ctx, title, w * 0.9);
  }
  const lineH = size * 1.04;
  const subSize = Math.max(13, size * 0.24);
  const blockH = h * 0.035 + size + lines.length * lineH + (subtitle ? subSize * 1.05 : 0);
  let top;
  if (pos === 'top') top = h * 0.055;
  else if (pos === 'center') top = h / 2 - blockH / 2;
  else top = h - h * 0.05 - blockH;

  ctx.fillStyle = accent;
  const ruleW = w * 0.16;
  ctx.fillRect(w / 2 - ruleW / 2, top, ruleW, Math.max(4, h * 0.011));
  let y = top + h * 0.035 + size;

  for (const line of lines) {
    ctx.fillStyle = accent;
    ctx.fillText(line, w / 2 + size * 0.055, y + size * 0.055);
    const fg = ctx.createLinearGradient(0, y - size, 0, y);
    fg.addColorStop(0, '#ffffff');
    fg.addColorStop(0.72, '#ffeef8');
    fg.addColorStop(1, '#ffc7e3');
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0a0612';
    ctx.lineWidth = size * 0.2;
    ctx.strokeText(line, w / 2, y);
    ctx.fillStyle = fg;
    ctx.fillText(line, w / 2, y);
    y += lineH;
  }

  if (subtitle) {
    y += subSize * 0.55;
    ctx.font = `700 ${subSize}px "Helvetica Neue", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`; } catch { /* ignore */ }
    const tw = ctx.measureText(subtitle).width + subSize * 1.6;
    const pillW = Math.min(tw, w * 0.92);
    const pillH = subSize * 1.75;
    const x0 = w / 2 - pillW / 2;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(x0, y - subSize * 1.28, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = '#14041f';
    ctx.fillText(subtitle, w / 2, y);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }
}
