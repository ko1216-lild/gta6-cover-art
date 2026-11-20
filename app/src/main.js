// Neon Coast Cover Maker — wires the page: load photos (picker, drag & drop, bundled samples), arrange them
// across multi-panel poster layouts, grade them, set the lettering and export a PNG. A `?shot=` query sets up
// a fixed scene for a screenshot instead (./shots.js).
import { drawCover, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const state = {
  photos: [],        // HTMLImageElement[]
  photoNames: [],    // display names, parallel to photos
  panelPhotos: [],   // photo index per panel of the current layout
  layout: 'classic',
  grade: 'sunset',
  gradeI: 0.8,
  title: 'Sunset Heist',
  subtitle: 'Vice City Nights',
  titlePos: 'bottom',
  titleScale: 1,
  accent: '#ff2e88',
  size: '1080x1080',
};

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  drawCover(canvas, state);
}

function applySize() {
  const [w, h] = SIZES[state.size] ?? SIZES['1080x1080'];
  canvas.width = w;
  canvas.height = h;
  canvas.style.aspectRatio = `${w} / ${h}`;
}

/** Keeps panelPhotos the right length for the current layout, defaulting new panels to the newest photo. */
function syncPanels() {
  const n = LAYOUTS[state.layout].panels.length;
  const fallback = Math.max(0, state.photos.length - 1);
  while (state.panelPhotos.length < n) state.panelPhotos.push(fallback);
  state.panelPhotos.length = n;
  state.panelPhotos = state.panelPhotos.map((p) => Math.min(p, Math.max(0, state.photos.length - 1)));
  renderPanelAssign();
}

function renderPanelAssign() {
  const box = $('panelAssign');
  box.innerHTML = '';
  if (!state.photos.length) {
    box.innerHTML = '<p class="hint">Add a photo and each panel can use a different one.</p>';
    return;
  }
  LAYOUTS[state.layout].panels.forEach((_, i) => {
    const row = document.createElement('label');
    row.className = 'panel-row';
    const name = document.createElement('span');
    name.textContent = `Panel ${i + 1}`;
    const sel = document.createElement('select');
    state.photos.forEach((_, pi) => {
      const opt = document.createElement('option');
      opt.value = pi;
      opt.textContent = state.photoNames[pi] ?? `Photo ${pi + 1}`;
      sel.appendChild(opt);
    });
    sel.value = state.panelPhotos[i] ?? 0;
    sel.addEventListener('change', () => { state.panelPhotos[i] = Number(sel.value); redraw(); });
    row.append(name, sel);
    box.appendChild(row);
  });
}

function renderStrip() {
  const strip = $('strip');
  strip.innerHTML = '';
  state.photos.forEach((img, i) => {
    const fig = document.createElement('figure');
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = state.photoNames[i] ?? '';
    const cap = document.createElement('figcaption');
    cap.textContent = state.photoNames[i] ?? `Photo ${i + 1}`;
    fig.append(thumb, cap);
    strip.appendChild(fig);
  });
  $('photoCount').textContent = state.photos.length
    ? `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded — assign them per panel below.`
    : 'No photos yet. Drop a photo onto the cover, pick a file, or start with a sample.';
}

async function addPhoto(url, name) {
  const img = await loadImage(url);
  state.photos.push(img);
  state.photoNames.push(name);
  // A freshly added photo takes over every panel when it is the first, else just the hero (last) panel.
  if (state.photos.length === 1) state.panelPhotos = state.panelPhotos.map(() => 0);
  renderStrip();
  syncPanels();
  redraw();
  return img;
}

// ---- Photo loading: file picker (multiple), drag & drop, samples ----
$('photo').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    await addPhoto(URL.createObjectURL(file), file.name.replace(/\.[^.]+$/, ''));
  }
  e.target.value = '';
  setStatus(state.photos.length ? 'Photos loaded. Assign them per panel, or export.' : '');
});

const stage = $('stage');
['dragenter', 'dragover'].forEach((ev) => stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.add('dragging'); }));
['dragleave', 'drop'].forEach((ev) => stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.remove('dragging'); }));
stage.addEventListener('drop', async (e) => {
  for (const file of e.dataTransfer.files) {
    if (file.type.startsWith('image/')) await addPhoto(URL.createObjectURL(file), file.name.replace(/\.[^.]+$/, ''));
  }
});

document.querySelectorAll('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const name = btn.dataset.sample;
    if (state.photoNames.includes(name)) { setStatus(`Sample “${name}” is already loaded.`); return; }
    await addPhoto(`samples/${name}.jpg`, name);
    setStatus(`Sample “${name}” loaded.`);
  });
});

// ---- Layout picker ----
const layoutBox = $('layouts');
Object.entries(LAYOUTS).forEach(([key, def]) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'layout-btn' + (key === state.layout ? ' active' : '');
  btn.dataset.layout = key;
  btn.innerHTML = `<strong>${def.label}</strong><span>${def.note}</span>`;
  btn.addEventListener('click', () => {
    state.layout = key;
    layoutBox.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b.dataset.layout === key));
    syncPanels();
    redraw();
  });
  layoutBox.appendChild(btn);
});
$('shuffle').addEventListener('click', () => {
  if (!state.photos.length) return;
  state.panelPhotos = state.panelPhotos.map(() => Math.floor(Math.random() * state.photos.length));
  renderPanelAssign();
  redraw();
});

// ---- Grade ----
$('grade').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
$('gradeI').addEventListener('input', (e) => { state.gradeI = Number(e.target.value) / 100; redraw(); });

// ---- Lettering ----
$('caption').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; redraw(); });
$('titleSize').addEventListener('input', (e) => { state.titleScale = Number(e.target.value) / 100; redraw(); });
document.querySelectorAll('[data-accent]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.accent = btn.dataset.accent;
    document.querySelectorAll('[data-accent]').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
  });
});

// ---- Export ----
$('size').addEventListener('change', (e) => { state.size = e.target.value; applySize(); redraw(); });
$('export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${state.size}.png`;
    a.click();
    setStatus(`Saved neon-coast-cover-${state.size}.png`);
  }, 'image/png');
});

function setStatus(text) { $('status').textContent = text; }

// ---- Boot / screenshot scenes ----
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (opts) => {
    if (opts.size && SIZES[opts.size]) { state.size = opts.size; $('size').value = opts.size; }
    if (opts.layout && LAYOUTS[opts.layout]) {
      state.layout = opts.layout;
      layoutBox.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b.dataset.layout === opts.layout));
    }
    if (opts.pos) { state.titlePos = opts.pos; $('titlePos').value = opts.pos; }
    state.title = opts.caption;
    $('caption').value = opts.caption;
    state.subtitle = opts.subtitle;
    $('subtitle').value = opts.subtitle;
    applySize();
    await addPhoto(`samples/${opts.photo}.jpg`, opts.photo);
    // In editor scenes, load the other sample too so per-panel assignment is visibly in use.
    if (shot === 'editor') {
      const other = opts.photo === 'pier' ? 'boulevard' : 'pier';
      await addPhoto(`samples/${other}.jpg`, other);
      state.panelPhotos = state.panelPhotos.map((_, i) => i % 2);
      renderPanelAssign();
      redraw();
    }
  });
} else {
  applySize();
  renderStrip();
  syncPanels();
  redraw();
}
