// Tahtada resimler: ekleme (+Resim), Seç aracıyla seçme, taşıma, boyutlandırma, silme.
// Resmin üstüne yazılmış (bağlı) çizgiler resimle birlikte taşınır ve silinir.
import { boardHooks, commit, redraw } from './board-screen.js';
import { importImageFile, importMany, loadBitmaps } from './images.js';
import { placeImages, hitImage, hitHandle, resizeFromHandle, transformAttached } from './geometry.js';
import { deleteButtonCenter, HANDLE_PX } from './render.js';
import { newId } from '../ids.js';
import { el, toast } from '../ui.js';

let drag = null;   // { kind: 'move'|'resize', id, start, orig, handle, base, moved }

const images = (S) => S.items.filter((i) => i.type === 'image');
const strokes = (S) => S.items.filter((i) => i.type === 'stroke');

function localOf(S, e) {
  const r = S.dom.stage.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

boardHooks.toolbarExtras.push((S) => {
  const input = el('input', { type: 'file', accept: 'image/*', multiple: '', hidden: '' });
  input.addEventListener('change', async () => {
    const files = [...input.files];
    input.value = '';
    if (!files.length) return;
    toast(files.length > 1 ? `${files.length} resim ekleniyor…` : 'Resim ekleniyor…', 2000);
    const { ok, failed } = await importMany(files, (f) => importImageFile(f, S.note.id));
    if (failed.length) toast(`Bu resim açılamadı: ${failed.join(', ')}`, 6000);
    if (!ok.length) return;
    for (const r of ok) S.bitmaps.set(r.blobId, r.bitmap);
    const rects = placeImages(ok.map((r) => ({ w: r.w, h: r.h })), S.view, S.W, S.H);
    const added = ok.map((r, i) => ({ id: newId(), type: 'image', blobId: r.blobId, ...rects[i] }));
    commit([...S.items, ...added]);
  });
  const btn = el('button', { title: 'Resim ekle (galeri veya kamera)' }, '+ Resim');
  btn.addEventListener('click', () => input.click());
  return el('span', { class: 'tgroup' }, btn, input);
});

const prevAfterLoad = boardHooks.afterLoad;
boardHooks.afterLoad = async (S) => {
  await prevAfterLoad?.(S);
  await loadBitmaps(S.items, S.bitmaps);
  redraw();
};

boardHooks.selectDown = (S, w, e) => {
  const sel = S.selectedId && S.items.find((i) => i.id === S.selectedId);
  if (sel) {
    const p = localOf(S, e);
    const d = deleteButtonCenter(S.view, sel);
    if (Math.hypot(p.x - d.x, p.y - d.y) <= d.r + 6) {
      deleteImage(S, sel);
      return true;
    }
    const handle = hitHandle(sel, w.x, w.y, (HANDLE_PX * 1.2) / S.view.s);
    if (handle) {
      drag = { kind: 'resize', id: sel.id, start: w, orig: sel, handle, base: S.items, moved: false };
      return true;
    }
  }
  const hit = hitImage(images(S), w.x, w.y);
  if (!hit) {
    if (S.selectedId) { S.selectedId = null; redraw(); }
    return false;
  }
  S.selectedId = hit.id;
  drag = { kind: 'move', id: hit.id, start: w, orig: hit, base: S.items, moved: false };
  redraw();
  return true;
};

boardHooks.selectMove = (S, w) => {
  if (!drag) return;
  const o = drag.orig;
  const rect = drag.kind === 'move'
    ? { x: o.x + (w.x - drag.start.x), y: o.y + (w.y - drag.start.y), w: o.w, h: o.h }
    : resizeFromHandle(o, drag.handle, w.x, w.y);
  drag.moved = true;
  const moved = transformAttached(drag.base, o, rect, o.id);
  S.items = moved.map((it) => (it.id === o.id ? { ...it, ...rect } : it));
  redraw();
};

boardHooks.selectUp = (S, ok) => {
  const d = drag;
  drag = null;
  if (!d || !d.moved) return;
  const final = S.items;
  S.items = d.base;
  if (ok) commit(final);
  else redraw();
};

function deleteImage(S, im) {
  S.selectedId = null;
  commit(S.items.filter((it) => it.id !== im.id && it.attachedTo !== im.id));
  toast('Resim silindi — geri almak için ↶');
}

export { images, strokes };
