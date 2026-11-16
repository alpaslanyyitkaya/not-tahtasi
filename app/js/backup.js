// Yedek dosyası: satır satır JSON. İlk satır başlık, sonra her not/tahta/resim kendi satırında.
// Büyük kütüphanelerde bellek taşmasın diye dosya parça parça yazılır ve okunur
// (hiçbir zaman tüm yedek tek bir metin olarak bellekte durmaz).
// Geri yükleme önce dosyanın tamamını doğrular; geçersizse hiçbir şey yazılmaz.
import * as db from './db.js';

const VERSION = 2;
const NOT_BACKUP = 'Bu dosya bir Not Tahtası yedeği değil';
const BROKEN = 'Yedek dosyası eksik ya da bozuk';

const pad = (n) => String(n).padStart(2, '0');
export function backupFileName(now) {
  const d = new Date(now);
  return `not-tahtasi-yedek-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.ntyedek`;
}

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function base64ToBlob(data, type) {
  const s = atob(data);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function* readLines(blob) {
  const reader = blob.stream().pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (line) yield line;
    }
  }
  if (buf) yield buf;
}

export async function serializeAll(now = Date.now()) {
  const all = await db.dumpAll();
  const line = (o) => JSON.stringify(o) + '\n';
  const head = [line({ app: 'not-tahtasi', version: VERSION, exportedAt: now })];
  for (const n of all.notes) {
    head.push(line({ k: 'note', ...n, thumb: n.thumb ? { type: n.thumb.type, data: await blobToBase64(n.thumb) } : null }));
  }
  for (const b of all.boards) head.push(line({ k: 'board', ...b }));
  let out = new Blob(head);
  // Resimler tek tek eklenir; her parça Blob'a katıldıktan sonra metin bellekten bırakılır.
  for (const b of all.blobs) {
    out = new Blob([out, line({ k: 'blob', id: b.id, noteId: b.noteId, type: b.blob.type, data: await blobToBase64(b.blob) })]);
  }
  return new Blob([out], { type: 'application/octet-stream' });
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
function validItem(it) {
  if (it?.type === 'image') return typeof it.blobId === 'string' && [it.x, it.y, it.w, it.h].every(isNum);
  if (it?.type === 'stroke') return Array.isArray(it.pts) && isNum(it.size) && it.pts.every((p) => isNum(p?.x) && isNum(p?.y));
  return false;
}

// 1. geçiş: resim verisini çözmeden tüm dosyayı doğrular; notları ve tahtaları toplar.
async function scan(file) {
  const notes = [], boards = [], blobIds = new Set();
  let first = true;
  try {
    for await (const text of readLines(file)) {
      let o;
      try { o = JSON.parse(text); } catch { return { ok: false, reason: first ? NOT_BACKUP : BROKEN }; }
      if (first) {
        if (o?.app !== 'not-tahtasi' || o.version !== VERSION) return { ok: false, reason: NOT_BACKUP };
        first = false;
        continue;
      }
      if (o?.k === 'note') {
        if (typeof o.id !== 'string' || typeof o.name !== 'string' || !isNum(o.updatedAt)) return { ok: false, reason: BROKEN };
        const { k, ...note } = o;
        notes.push(note);
      } else if (o?.k === 'board') {
        if (typeof o.noteId !== 'string' || !Array.isArray(o.items) || !o.items.every(validItem)) return { ok: false, reason: BROKEN };
        boards.push({ noteId: o.noteId, items: o.items });
      } else if (o?.k === 'blob') {
        if (typeof o.id !== 'string' || typeof o.noteId !== 'string' || typeof o.data !== 'string') return { ok: false, reason: BROKEN };
        blobIds.add(o.id);
      } else {
        return { ok: false, reason: BROKEN };
      }
    }
  } catch {
    return { ok: false, reason: first ? NOT_BACKUP : BROKEN };
  }
  if (first) return { ok: false, reason: NOT_BACKUP };
  const noteIds = new Set(notes.map((n) => n.id));
  for (const b of boards) {
    if (!noteIds.has(b.noteId)) return { ok: false, reason: BROKEN };
    for (const it of b.items) if (it.type === 'image' && !blobIds.has(it.blobId)) return { ok: false, reason: BROKEN };
  }
  return { ok: true, notes, boards };
}

export async function checkBackup(file) {
  const r = await scan(file);
  return r.ok ? { ok: true, noteCount: r.notes.length } : r;
}

export function planMerge(local, incoming) {
  const byId = new Map(local.map((n) => [n.id, n]));
  const write = [], skip = [], added = [];
  for (const n of incoming) {
    const mine = byId.get(n.id);
    if (!mine) { write.push(n.id); added.push(n.id); }
    else if (n.updatedAt > mine.updatedAt) write.push(n.id);
    else skip.push(n.id);
  }
  return { write, skip, added };
}

export async function restoreFromFile(file) {
  const s = await scan(file);
  if (!s.ok) throw new Error(s.reason);
  const plan = planMerge(await db.listNotes(), s.notes);
  const ids = new Set(plan.write);
  const records = { notes: [], boards: s.boards.filter((b) => ids.has(b.noteId)), blobs: [] };
  try {
    for (const n of s.notes) {
      if (ids.has(n.id)) records.notes.push({ ...n, thumb: n.thumb ? base64ToBlob(n.thumb.data, n.thumb.type) : null });
    }
    // 2. geçiş: yalnızca yazılacak notların resimleri, birer birer çözülür.
    let first = true;
    for await (const text of readLines(file)) {
      if (first) { first = false; continue; }
      if (!text.startsWith('{"k":"blob"')) continue;
      const o = JSON.parse(text);
      if (ids.has(o.noteId)) records.blobs.push({ id: o.id, noteId: o.noteId, blob: base64ToBlob(o.data, o.type) });
    }
  } catch {
    throw new Error(BROKEN);
  }
  await db.writeMany(records);
  for (const b of records.boards) {
    await db.gcBlobs(b.noteId, new Set(b.items.filter((i) => i.type === 'image').map((i) => i.blobId)));
  }
  return { added: plan.added.length, updated: plan.write.length - plan.added.length, skipped: plan.skip.length };
}
