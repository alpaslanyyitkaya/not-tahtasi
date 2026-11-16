// Yedek: tüm notlar, tahtalar ve resimler tek bir JSON dosyasında (resimler base64).
// Geri yükleme önce dosyanın tamamını doğrular; geçersizse hiçbir şey yazılmaz.
import * as db from './db.js';

const NOT_BACKUP = 'Bu dosya bir Not Tahtası yedeği değil';
const BROKEN = 'Yedek dosyası eksik ya da bozuk';

const pad = (n) => String(n).padStart(2, '0');
export function backupFileName(now) {
  const d = new Date(now);
  return `not-tahtasi-yedek-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
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

export async function serializeAll(now = Date.now()) {
  const all = await db.dumpAll();
  const notes = await Promise.all(all.notes.map(async (n) => ({
    ...n,
    thumb: n.thumb ? { type: n.thumb.type, data: await blobToBase64(n.thumb) } : null,
  })));
  const blobs = await Promise.all(all.blobs.map(async (b) => ({
    id: b.id, noteId: b.noteId, type: b.blob.type, data: await blobToBase64(b.blob),
  })));
  return JSON.stringify({ app: 'not-tahtasi', version: 1, exportedAt: now, notes, boards: all.boards, blobs });
}

export function validateBackup(o) {
  if (!o || typeof o !== 'object' || o.app !== 'not-tahtasi' || o.version !== 1) return { ok: false, reason: NOT_BACKUP };
  if (![o.notes, o.boards, o.blobs].every(Array.isArray)) return { ok: false, reason: BROKEN };
  const noteIds = new Set();
  for (const n of o.notes) {
    if (typeof n?.id !== 'string' || typeof n.name !== 'string' || typeof n.updatedAt !== 'number') return { ok: false, reason: BROKEN };
    noteIds.add(n.id);
  }
  const blobIds = new Set();
  for (const b of o.blobs) {
    if (typeof b?.id !== 'string' || typeof b.data !== 'string') return { ok: false, reason: BROKEN };
    blobIds.add(b.id);
  }
  for (const bd of o.boards) {
    if (!noteIds.has(bd?.noteId) || !Array.isArray(bd.items)) return { ok: false, reason: BROKEN };
    for (const it of bd.items) {
      if (it?.type === 'image' && !blobIds.has(it.blobId)) return { ok: false, reason: BROKEN };
    }
  }
  return { ok: true };
}

export function parseBackupText(text) {
  let o;
  try { o = JSON.parse(text); } catch { return { ok: false, reason: NOT_BACKUP }; }
  const v = validateBackup(o);
  return v.ok ? { ok: true, data: o } : v;
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

export async function restoreFromText(text) {
  const parsed = parseBackupText(text);
  if (!parsed.ok) throw new Error(parsed.reason);
  const data = parsed.data;
  let plan, records;
  try {
    plan = planMerge(await db.listNotes(), data.notes);
    const ids = new Set(plan.write);
    records = {
      notes: data.notes.filter((n) => ids.has(n.id)).map((n) => ({
        ...n, thumb: n.thumb ? base64ToBlob(n.thumb.data, n.thumb.type) : null,
      })),
      boards: data.boards.filter((b) => ids.has(b.noteId)),
      blobs: data.blobs.filter((b) => ids.has(b.noteId)).map((b) => ({ id: b.id, noteId: b.noteId, blob: base64ToBlob(b.data, b.type) })),
    };
  } catch {
    throw new Error(BROKEN);
  }
  await db.writeMany(records);
  for (const b of records.boards) {
    await db.gcBlobs(b.noteId, new Set(b.items.filter((i) => i.type === 'image').map((i) => i.blobId)));
  }
  return { added: plan.added.length, updated: plan.write.length - plan.added.length, skipped: plan.skip.length };
}
