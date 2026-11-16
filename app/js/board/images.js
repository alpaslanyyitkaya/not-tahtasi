// Resim dosyası → küçültülmüş blob (IndexedDB) + ekranda çizmek için bitmap.
import * as db from '../db.js';
import { newId } from '../ids.js';

export const MAX_SIDE = 2600;
const JPEG_QUALITY = 0.85;

export function targetSize(w, h, max = MAX_SIDE) {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

export function chooseOutputType(mime, hasAlpha) {
  return mime === 'image/png' && hasAlpha ? 'image/png' : 'image/jpeg';
}

export async function importMany(files, importer) {
  const ok = [], failed = [];
  for (const f of files) {
    try { ok.push(await importer(f)); } catch { failed.push(f.name); }
  }
  return { ok, failed };
}

function hasTransparency(bitmap) {
  const c = document.createElement('canvas');
  c.width = Math.min(64, bitmap.width); c.height = Math.min(64, bitmap.height);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(bitmap, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
}

export async function importImageFile(file, noteId) {
  let src;
  try {
    src = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('decode');
  }
  const { w, h } = targetSize(src.width, src.height);
  const type = chooseOutputType(file.type, file.type === 'image/png' && hasTransparency(src));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (type === 'image/jpeg') { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); }
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, w, h);
  src.close?.();
  const blob = await new Promise((r) => c.toBlob(r, type, JPEG_QUALITY));
  if (!blob) throw new Error('decode');
  const blobId = newId();
  await db.putBlob({ id: blobId, noteId, blob });
  const bitmap = await createImageBitmap(c);
  return { blobId, w, h, bitmap };
}

// Haritada olmayan resimlerin bitmap'lerini yükler; açılamayanlar yer tutucu olarak kalır.
export async function loadBitmaps(items, map = new Map()) {
  const need = items.filter((i) => i.type === 'image' && !map.has(i.blobId));
  await Promise.all(need.map(async (it) => {
    try {
      const blob = await db.getBlob(it.blobId);
      if (blob) map.set(it.blobId, await createImageBitmap(blob));
    } catch { /* yer tutucu çizilir */ }
  }));
  return map;
}
