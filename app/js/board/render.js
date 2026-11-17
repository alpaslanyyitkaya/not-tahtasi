// Canvas çizimi. Çizgi kodu kalem-deneme.html test sayfasından taşındı (davranış aynı).
import { bboxOf, intersects, toWorld, toScreen, centerOf, imageCorners, rotateHandlePos, arrowHead } from './geometry.js';

const HANDLE = 14;        // ekran px
const DEL_R = 16;         // silme düğmesi yarıçapı, ekran px

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
// Kalınlık: 'pen' basınca duyarlı; 'pencil' biraz; tükenmez ('ball'), düz çizgi ve ok sabit.
export const penW = (s, p) => {
  if (s.tool === 'pencil') return s.size * (0.55 + 0.7 * p);
  if (s.tool === 'ball' || s.tool === 'line' || s.tool === 'arrow') return s.size;
  return s.size * (0.3 + 1.4 * p);
};

// Kurşun kalem: rengin taneli, yarı saydam bir deseni (renk başına bir kez üretilir).
const grain = new Map();
function inkOf(x, s) {
  if (s.tool !== 'pencil' || typeof document === 'undefined') return s.color;
  let pat = grain.get(s.color);
  if (!pat) {
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const g = c.getContext('2d');
    g.fillStyle = s.color;
    for (let i = 0; i < 48 * 48; i++) {
      g.globalAlpha = 0.25 + Math.random() * 0.6;
      g.fillRect(i % 48, Math.floor(i / 48), 1, 1);
    }
    pat = g.createPattern(c, 'repeat');
    grain.set(s.color, pat);
  }
  return pat;
}

export function arrowHeadDraw(x, s) {
  const h = arrowHead(s);
  if (!h) return;
  x.fillStyle = s.color; x.strokeStyle = s.color; x.lineJoin = 'round'; x.lineWidth = s.size;
  x.beginPath(); x.moveTo(h.tip.x, h.tip.y); x.lineTo(h.left.x, h.left.y); x.lineTo(h.right.x, h.right.y); x.closePath();
  x.fill(); x.stroke();
}

// Düz çizgi ve ok önizlemesi / çizimi: tüm şekli bir seferde çizer.
export function shapeDraw(x, s) {
  const P = s.pts;
  x.strokeStyle = s.color; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = s.size;
  x.beginPath(); x.moveTo(P[0].x, P[0].y);
  if (P.length === 1) x.lineTo(P[0].x + 0.01, P[0].y);
  for (let i = 1; i < P.length; i++) x.lineTo(P[i].x, P[i].y);
  x.stroke();
  if (s.tool === 'arrow') arrowHeadDraw(x, s);
}

export function penSeg(x, s, i) {
  const P = s.pts;
  if (i === 0) {
    x.fillStyle = inkOf(x, s);
    x.beginPath(); x.arc(P[0].x, P[0].y, penW(s, P[0].p) / 2, 0, Math.PI * 2); x.fill();
    return;
  }
  const a = i >= 2 ? mid(P[i - 2], P[i - 1]) : P[i - 1];
  const b = mid(P[i - 1], P[i]);
  x.strokeStyle = inkOf(x, s); x.lineCap = 'round'; x.lineJoin = 'round';
  x.lineWidth = penW(s, (P[i - 1].p + P[i].p) / 2);
  x.beginPath(); x.moveTo(a.x, a.y); x.quadraticCurveTo(P[i - 1].x, P[i - 1].y, b.x, b.y); x.stroke();
}

export function penTail(x, s) {
  const P = s.pts, n = P.length;
  if (n < 2) return;
  const a = mid(P[n - 2], P[n - 1]);
  x.strokeStyle = inkOf(x, s); x.lineCap = 'round'; x.lineWidth = penW(s, P[n - 1].p);
  x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(P[n - 1].x, P[n - 1].y); x.stroke();
}

export function hlSeg(x, s, i) {
  const P = s.pts;
  x.strokeStyle = s.color; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = s.size * 5;
  x.beginPath();
  if (i === 0) { x.moveTo(P[0].x, P[0].y); x.lineTo(P[0].x + 0.01, P[0].y); }
  else { x.moveTo(P[i - 1].x, P[i - 1].y); x.lineTo(P[i].x, P[i].y); }
  x.stroke();
}

export function drawStroke(x, s) {
  if (s.tool === 'hl') {
    x.save(); x.globalAlpha = 0.35;
    x.strokeStyle = s.color; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = s.size * 5;
    x.beginPath(); x.moveTo(s.pts[0].x, s.pts[0].y);
    if (s.pts.length === 1) x.lineTo(s.pts[0].x + 0.01, s.pts[0].y);
    for (let i = 1; i < s.pts.length; i++) x.lineTo(s.pts[i].x, s.pts[i].y);
    x.stroke(); x.restore();
  } else if (s.tool === 'line') {
    shapeDraw(x, s);
  } else {
    for (let i = 0; i < s.pts.length; i++) penSeg(x, s, i);
    penTail(x, s);
    if (s.tool === 'arrow') arrowHeadDraw(x, s);
  }
}

export function applyView(x, v, dpr) { x.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.tx, dpr * v.ty); }
export function clearCtx(x) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, x.canvas.width, x.canvas.height); }

function drawImageItem(x, it, bitmaps) {
  const bm = bitmaps.get(it.blobId);
  if (it.rot) {
    const c = centerOf(it);
    x.save(); x.translate(c.x, c.y); x.rotate(it.rot); x.translate(-c.x, -c.y);
  }
  if (bm) x.drawImage(bm, it.x, it.y, it.w, it.h);
  else { x.fillStyle = '#d9dee5'; x.fillRect(it.x, it.y, it.w, it.h); }
  if (it.rot) x.restore();
}

function drawItems(x, items, bitmaps, visible) {
  for (const it of items) {
    if (it.type === 'image' && (!visible || intersects(bboxOf(it), visible))) drawImageItem(x, it, bitmaps);
  }
  for (const it of items) {
    if (it.type === 'stroke' && (!visible || intersects(bboxOf(it), visible))) drawStroke(x, it);
  }
}

export function deleteButtonCenter(view, im) {
  const ne = imageCorners(im).ne;
  const c = toScreen(view, ne.x, ne.y);
  const a = im.rot || 0, d = DEL_R * 0.4;   // köşeden dışarı, resimle birlikte döner
  return { x: c.x + d * Math.cos(a) + d * Math.sin(a), y: c.y + d * Math.sin(a) - d * Math.cos(a), r: DEL_R };
}

// Döndürme tutamacı (ekran px): üst kenarın ortasından ROT_GAP px yukarıda.
export const ROT_GAP = 34;
export const ROT_R = 13;
export function rotateHandleCenter(view, im) {
  const w = rotateHandlePos(im, ROT_GAP / view.s);
  return { ...toScreen(view, w.x, w.y), r: ROT_R };
}

export function renderScene(x, { items, view, dpr, W, H, bitmaps, selectedId = null, accent = '#2b62c9' }) {
  clearCtx(x);
  applyView(x, view, dpr);
  const a = toWorld(view, 0, 0), b = toWorld(view, W, H);
  drawItems(x, items, bitmaps, { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y });
  const sel = selectedId && items.find((i) => i.id === selectedId);
  if (sel) drawSelection(x, view, dpr, sel, accent);
}

function drawSelection(x, view, dpr, im, accent) {
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const C = imageCorners(im);
  const sc = ['nw', 'ne', 'se', 'sw'].map((k) => toScreen(view, C[k].x, C[k].y));
  x.strokeStyle = accent; x.lineWidth = 2; x.setLineDash([6, 4]);
  x.beginPath(); sc.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y))); x.closePath(); x.stroke();
  x.setLineDash([]);
  // Döndürme tutamacı: üst kenarın ortasına çizgiyle bağlı yuvarlak.
  const top = toScreen(view, ...Object.values(rotateHandlePos(im, 0)));
  const rh = rotateHandleCenter(view, im);
  x.beginPath(); x.moveTo(top.x, top.y); x.lineTo(rh.x, rh.y); x.stroke();
  x.fillStyle = '#ffffff';
  x.beginPath(); x.arc(rh.x, rh.y, rh.r, 0, Math.PI * 2); x.fill(); x.stroke();
  x.beginPath(); x.arc(rh.x, rh.y, rh.r * 0.5, -Math.PI * 0.9, Math.PI * 0.4); x.stroke();
  x.fillStyle = '#ffffff';
  for (const p of sc) {
    x.fillRect(p.x - HANDLE / 2, p.y - HANDLE / 2, HANDLE, HANDLE);
    x.strokeRect(p.x - HANDLE / 2, p.y - HANDLE / 2, HANDLE, HANDLE);
  }
  const d = deleteButtonCenter(view, im);
  x.fillStyle = '#c23a3a';
  x.beginPath(); x.arc(d.x, d.y, d.r, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#ffffff'; x.lineWidth = 2.5; x.lineCap = 'round';
  x.beginPath();
  x.moveTo(d.x - 5, d.y - 5); x.lineTo(d.x + 5, d.y + 5);
  x.moveTo(d.x + 5, d.y - 5); x.lineTo(d.x - 5, d.y + 5);
  x.stroke();
}

export const HANDLE_PX = HANDLE;

// Dışa aktarma ve önizleme için: bbox alanını verilen ölçekte yeni bir canvas'a çizer.
export function renderToCanvas(items, bitmaps, { scale, bbox, background = '#ffffff' }) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(bbox.w * scale));
  c.height = Math.max(1, Math.ceil(bbox.h * scale));
  const x = c.getContext('2d');
  x.fillStyle = background; x.fillRect(0, 0, c.width, c.height);
  x.setTransform(scale, 0, 0, scale, -bbox.x * scale, -bbox.y * scale);
  drawItems(x, items, bitmaps, null);
  return c;
}
