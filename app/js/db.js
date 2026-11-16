// IndexedDB erişimi. Depolar: notes (id), boards (noteId), blobs (id, index noteId), meta (key).
// Hatalar yutulmaz; çağırana reddedilen Promise olarak iletilir.
let db = null;

export function openDb(name = 'not-tahtasi') {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      d.createObjectStore('notes', { keyPath: 'id' });
      d.createObjectStore('boards', { keyPath: 'noteId' });
      d.createObjectStore('blobs', { keyPath: 'id' }).createIndex('noteId', 'noteId');
      d.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => { db = req.result; resolve(); };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Veritabanı başka bir sekmede açık'));
  });
}

function tx(stores, mode, fn) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Veritabanı açılmadı')); return; }
    const t = db.transaction(stores, mode);
    let result;
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('İşlem iptal edildi'));
    const req = fn(t);
    if (req) req.onsuccess = () => { result = req.result; };
  });
}

const one = (store, key) => tx([store], 'readonly', (t) => t.objectStore(store).get(key)).then((v) => v ?? null);
const all = (store) => tx([store], 'readonly', (t) => t.objectStore(store).getAll());
const put = (store, value) => tx([store], 'readwrite', (t) => { t.objectStore(store).put(value); });

export const listNotes = () => all('notes');
export const getNote = (id) => one('notes', id);
export const putNote = (note) => put('notes', note);
export const getBoard = (noteId) => one('boards', noteId);
export const putBoard = (board) => put('boards', board);
export const putBlob = (rec) => put('blobs', rec);
export const getBlob = (id) => one('blobs', id).then((r) => r?.blob ?? null);
export const getMeta = (key) => one('meta', key).then((r) => r?.value ?? null);
export const setMeta = (key, value) => put('meta', { key, value });

export function deleteNote(id) {
  return tx(['notes', 'boards', 'blobs'], 'readwrite', (t) => {
    t.objectStore('notes').delete(id);
    t.objectStore('boards').delete(id);
    const cur = t.objectStore('blobs').index('noteId').openKeyCursor(IDBKeyRange.only(id));
    cur.onsuccess = () => {
      const c = cur.result;
      if (c) { t.objectStore('blobs').delete(c.primaryKey); c.continue(); }
    };
  });
}

export function gcBlobs(noteId, keepIds) {
  let removed = 0;
  return tx(['blobs'], 'readwrite', (t) => {
    const store = t.objectStore('blobs');
    const cur = store.index('noteId').openKeyCursor(IDBKeyRange.only(noteId));
    cur.onsuccess = () => {
      const c = cur.result;
      if (!c) return;
      if (!keepIds.has(c.primaryKey)) { store.delete(c.primaryKey); removed++; }
      c.continue();
    };
  }).then(() => removed);
}

export function saveBoardAndNote(board, note) {
  return tx(['boards', 'notes'], 'readwrite', (t) => {
    t.objectStore('boards').put(board);
    t.objectStore('notes').put(note);
  });
}

// Yedek geri yüklemesi için: tüm kayıtları tek işlemde yazar.
export function writeMany({ notes = [], boards = [], blobs = [] }) {
  return tx(['notes', 'boards', 'blobs'], 'readwrite', (t) => {
    for (const n of notes) t.objectStore('notes').put(n);
    for (const b of boards) t.objectStore('boards').put(b);
    for (const b of blobs) t.objectStore('blobs').put(b);
  });
}

export async function dumpAll() {
  const [notes, boards, blobs, meta] = await Promise.all([all('notes'), all('boards'), all('blobs'), all('meta')]);
  return { notes, boards, blobs, meta };
}
