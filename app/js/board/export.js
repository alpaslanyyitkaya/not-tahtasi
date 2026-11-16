// Notu PNG olarak dışa aktarma ve tabletin paylaşım menüsüne (Discord) gönderme.
import * as db from '../db.js';
import { contentBBox, exportScale } from './geometry.js';
import { renderToCanvas } from './render.js';
import { loadBitmaps } from './images.js';
import { toast } from '../ui.js';

const MARGIN = 48;

export function fileNameFor(name, ext) {
  const clean = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').trim();
  return `${clean || 'not'}.${ext}`;
}

export async function boardToPngBlob(items, bitmaps) {
  const b = contentBBox(items);
  if (!b) return null;
  const box = { x: b.x - MARGIN, y: b.y - MARGIN, w: b.w + MARGIN * 2, h: b.h + MARGIN * 2 };
  const scale = exportScale(b, MARGIN);
  const c = renderToCanvas(items, bitmaps, { scale, bbox: box, background: '#ffffff' });
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

// Paylaşım menüsü varsa onu açar, yoksa dosyayı indirir.
export async function shareOrDownload(blob, fileName) {
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
      console.warn('Paylaşım başarısız, indiriliyor', e);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
}

export async function shareItems(name, items, bitmaps) {
  const blob = await boardToPngBlob(items, bitmaps);
  if (!blob) { toast('Bu not boş'); return; }
  const r = await shareOrDownload(blob, fileNameFor(name, 'png'));
  if (r === 'downloaded') toast("İndirildi — Discord'dan dosya olarak ekleyebilirsin", 5000);
}

// Listeden paylaşım: notun tahtasını ve resimlerini yükleyip paylaşır.
export async function shareNoteById(note) {
  const board = await db.getBoard(note.id);
  const items = board?.items ?? [];
  const bitmaps = await loadBitmaps(items);
  await shareItems(note.name, items, bitmaps);
}
