// Tahtanın saf geometrisi: görünüm dönüşümleri, sınır kutuları, isabet testleri, resme bağlama.
// Görünüm: ekran = dünya * s + t.
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 8;
const ATTACH_RATIO = 0.8;

export const toWorld = (v, sx, sy) => ({ x: (sx - v.tx) / v.s, y: (sy - v.ty) / v.s });
export const toScreen = (v, x, y) => ({ x: x * v.s + v.tx, y: y * v.s + v.ty });

export function zoomAt(v, cx, cy, k) {
  const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.s * k));
  const r = s / v.s;
  return { s, tx: cx - (cx - v.tx) * r, ty: cy - (cy - v.ty) * r };
}

export const strokePad = (st) => (st.tool === 'hl' ? st.size * 2.5 : st.size * 0.85);

export function itemBBox(item) {
  if (item.type === 'image') return { x: item.x, y: item.y, w: item.w, h: item.h };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of item.pts) {
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  const pad = strokePad(item);
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

export function contentBBox(items) {
  if (!items.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const it of items) {
    const b = it._bbox || itemBBox(it);
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export const intersects = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function findAttachTarget(stroke, images) {
  const n = stroke.pts.length;
  if (!n) return null;
  for (let i = images.length - 1; i >= 0; i--) {
    const im = images[i];
    let c = 0;
    for (const p of stroke.pts) if (inside(im, p.x, p.y)) c++;
    if (c / n >= ATTACH_RATIO) return im.id;
  }
  return null;
}

export function hitImage(images, x, y) {
  for (let i = images.length - 1; i >= 0; i--) if (inside(images[i], x, y)) return images[i];
  return null;
}

export function hitHandle(im, x, y, tol) {
  const corners = { nw: [im.x, im.y], ne: [im.x + im.w, im.y], sw: [im.x, im.y + im.h], se: [im.x + im.w, im.y + im.h] };
  for (const [name, [cx, cy]] of Object.entries(corners)) {
    if (Math.abs(x - cx) <= tol && Math.abs(y - cy) <= tol) return name;
  }
  return null;
}

export function resizeFromHandle(im, handle, x, y, minSize = 40) {
  // Karşı köşe sabit kalır; en-boy oranı korunur.
  const ax = handle.includes('w') ? im.x + im.w : im.x;
  const ay = handle.includes('n') ? im.y + im.h : im.y;
  const dx = handle.includes('w') ? ax - x : x - ax;
  const dy = handle.includes('n') ? ay - y : y - ay;
  let k = Math.max(dx / im.w, dy / im.h);
  k = Math.max(k, minSize / Math.min(im.w, im.h));
  const w = im.w * k, h = im.h * k;
  return { x: handle.includes('w') ? ax - w : ax, y: handle.includes('n') ? ay - h : ay, w, h };
}

export function transformAttached(strokes, oldRect, newRect, imageId) {
  const k = newRect.w / oldRect.w;
  return strokes.map((st) => {
    if (st.attachedTo !== imageId) return st;
    return {
      ...st,
      size: st.size * k,
      pts: st.pts.map((p) => ({ x: newRect.x + (p.x - oldRect.x) * k, y: newRect.y + (p.y - oldRect.y) * k, p: p.p })),
    };
  });
}

function segDist2(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / L)) : 0;
  const ex = px - (a.x + t * dx), ey = py - (a.y + t * dy);
  return ex * ex + ey * ey;
}

export function strokesHitByEraser(strokes, x, y, r) {
  const hit = new Set();
  const probe = { x: x - r, y: y - r, w: r * 2, h: r * 2 };
  for (const st of strokes) {
    const b = st._bbox || itemBBox(st);
    if (!intersects(b, probe)) continue;
    const lim = (r + strokePad(st)) ** 2;
    const P = st.pts;
    if (P.length === 1) { if (segDist2(x, y, P[0], P[0]) <= lim) hit.add(st.id); continue; }
    for (let i = 1; i < P.length; i++) {
      if (segDist2(x, y, P[i - 1], P[i]) <= lim) { hit.add(st.id); break; }
    }
  }
  return hit;
}

export function fitView(bbox, W, H, pad = 24) {
  const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min((W - pad * 2) / bbox.w, (H - pad * 2) / bbox.h)));
  return { s, tx: W / 2 - (bbox.x + bbox.w / 2) * s, ty: H / 2 - (bbox.y + bbox.h / 2) * s };
}

export function placeImages(sizes, view, W, H) {
  const gap = 24;
  const maxW = (W * 0.6) / view.s, maxH = (H * 0.6) / view.s;
  const scaled = sizes.map(({ w, h }) => {
    const k = Math.min(1, maxW / w, maxH / h);
    return { w: w * k, h: h * k };
  });
  const total = scaled.reduce((a, r) => a + r.w, 0) + gap * (scaled.length - 1);
  const c = toWorld(view, W / 2, H / 2);
  let x = c.x - total / 2;
  return scaled.map((r) => {
    const out = { x, y: c.y - r.h / 2, w: r.w, h: r.h };
    x += r.w + gap;
    return out;
  });
}

export function exportScale(bbox, margin = 48, maxSide = 4000) {
  return Math.min(1, maxSide / (Math.max(bbox.w, bbox.h) + margin * 2));
}
