// Not ekranının kaydı: otomatik kayıt, arka plana geçerken anında kayıt, önizleme, kullanılmayan resimlerin temizliği.
import * as db from '../db.js';
import { boardHooks } from './board-screen.js';
import { createSaver } from './save-status.js';
import { contentBBox, fitView } from './geometry.js';
import { renderToCanvas } from './render.js';
import { confirmDialog } from '../ui.js';

const THUMB_SIDE = 320;
const LABELS = { saved: 'Kaydedildi', pending: 'Kaydediliyor…', error: 'Kaydedilemedi' };

function chain(name, fn) {
  const prev = boardHooks[name];
  boardHooks[name] = async (...a) => { await prev?.(...a); return fn(...a); };
}

chain('afterLoad', (S) => {
  S.changed = false;
  S.saver = createSaver({
    save: async () => {
      const note = { ...S.note, updatedAt: Date.now() };
      await db.saveBoardAndNote({ noteId: note.id, items: S.items }, note);
      S.note = note;
    },
  });
  const show = (st) => {
    if (!S.dom) return;
    S.dom.saveState.textContent = LABELS[st];
    S.dom.errorBar.hidden = st !== 'error';
    S.dom.errorBar.textContent = 'Kaydedilemedi — depolama dolu olabilir. Yedek alıp bazı notları silin.';
  };
  S.saver.onChange(show);
  show('saved');
  const onHide = () => {
    if (document.visibilityState !== 'hidden') return;
    S.input?.finishActive();          // yarım çizgiyi bitir
    S.saver.flush();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onHide);
  S.cleanup.push(() => {
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', onHide);
  });
});

const prevCommit = boardHooks.afterCommit;
boardHooks.afterCommit = (S) => {
  prevCommit?.(S);
  S.changed = true;
  S.saver?.schedule();
};

boardHooks.initialView = (S) => {
  const b = contentBBox(S.items);
  if (!b) { S.view = { s: 1, tx: S.W / 2, ty: S.H / 2 }; return; }
  const v = fitView(b, S.W, S.H);
  // Az içerik büyütülmesin: en fazla %100, içerik ortada.
  S.view = v.s <= 1 ? v : { s: 1, tx: S.W / 2 - (b.x + b.w / 2), ty: S.H / 2 - (b.y + b.h / 2) };
};

// Geri düğmesi: kayıt başarısızsa kullanıcıya sorar.
boardHooks.canLeave = async (S) => {
  S.input?.finishActive();
  await S.saver?.flush();
  if (S.saver?.state() !== 'error') return true;
  return confirmDialog({
    title: 'Son değişiklikler kaydedilemedi',
    text: 'Çıkarsan bu nottaki son değişiklikler kaybolabilir. Önce yedek almayı ya da yer açmayı dene.',
    ok: 'Yine de çık', danger: true, cancel: 'Notta kal',
  });
};

chain('beforeLeave', async (S) => {
  await S.saver?.flush();
  if (!S.changed || S.saver?.state() === 'error') return;
  try {
    const thumb = await makeThumb(S);
    const fresh = (await db.getNote(S.note.id)) ?? S.note;
    await db.putNote({ ...fresh, thumb });
    const used = new Set(S.items.filter((i) => i.type === 'image').map((i) => i.blobId));
    await db.gcBlobs(S.note.id, used);
  } catch (e) {
    console.warn('Önizleme/temizlik yapılamadı', e);
  }
});

export async function makeThumb(S) {
  const b = contentBBox(S.items);
  if (!b) return null;
  const pad = 16;
  const box = { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
  const scale = THUMB_SIDE / Math.max(box.w, box.h);
  const c = renderToCanvas(S.items, S.bitmaps, { scale, bbox: box, background: '#ffffff' });
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
}
