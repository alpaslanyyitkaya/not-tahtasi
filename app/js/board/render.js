// Canvas çizimi. Çizgi kodu kalem-deneme.html test sayfasından taşındı (davranış aynı).
import { bboxOf, intersects, toWorld, toScreen } from './geometry.js';

const HANDLE = 14;        // ekran px
const DEL_R = 16;         // silme düğmesi yarıçapı, ekran px

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const penW = (s, p) => s.size * (0.3 + 1.4 * p);

export function penSeg(x, s, i) {
  const P = s.pts;
  if (i === 0) {
    x.fillStyle = s.color;
    x.beginPath(); x.arc(P[0].x, P[0].y, penW(s, P[0].p) / 2, 0, Math.PI * 2); x.fill();
    return;
  }
  const a = i >= 2 ? mid(P[i - 2], P[i - 1]) : P[i - 1];
  const b = mid(P[i - 1], P[i]);
  x.strokeStyle = s.color; x.lineCap = 'round'; x.lineJoin = 'round';
  x.lineWidth = penW(s, (P[i - 1].p + P[i].p) / 2);
  x.beginPath(); x.moveTo(a.x, a.y); x.quadraticCurveTo(P[i - 1].x, P[i - 1].y, b.x, b.y); x.stroke();
}

export function penTail(x, s) {
  const P = s.pts, n = P.length;
  if (n < 2) return;
  const a = mid(P[n - 2], P[n - 1]);
  x.strokeStyle = s.color; x.lineCap = 'round'; x.lineWidth = penW(s, P[n - 1].p);
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
  } else {
    for (let i = 0; i < s.pts.length; i++) penSeg(x, s, i);
    penTail(x, s);
  }
}

export function applyView(x, v, dpr) { x.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.tx, dpr * v.ty); }
export function clearCtx(x) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, x.canvas.width, x.canvas.height); }

function drawImageItem(x, it, bitmaps) {
  const bm = bitmaps.get(it.blobId);
  if (bm) x.drawImage(bm, it.x, it.y, it.w, it.h);
  else { x.fillStyle = '#d9dee5'; x.fillRect(it.x, it.y, it.w, it.h); }
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
  const c = toScreen(view, im.x + im.w, im.y);
  return { x: c.x + DEL_R * 0.4, y: c.y - DEL_R * 0.4, r: DEL_R };
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
  const p = toScreen(view, im.x, im.y);
  const w = im.w * view.s, h = im.h * view.s;
  x.strokeStyle = accent; x.lineWidth = 2; x.setLineDash([6, 4]);
  x.strokeRect(p.x, p.y, w, h);
  x.setLineDash([]);
  x.fillStyle = '#ffffff';
  for (const [cx, cy] of [[p.x, p.y], [p.x + w, p.y], [p.x, p.y + h], [p.x + w, p.y + h]]) {
    x.fillRect(cx - HANDLE / 2, cy - HANDLE / 2, HANDLE, HANDLE);
    x.strokeRect(cx - HANDLE / 2, cy - HANDLE / 2, HANDLE, HANDLE);
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
