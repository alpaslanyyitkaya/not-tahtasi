import 'fake-indexeddb/auto';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as db from '../app/js/db.js';
import { planMerge, validateBackup, parseBackupText, serializeAll, restoreFromText, backupFileName } from '../app/js/backup.js';

let n = 0;
beforeEach(async () => { await db.openDb(`backup-${++n}`); });

const note = (id, updatedAt) => ({ id, name: id, createdAt: 1, updatedAt, thumb: null });

test('planMerge writes new notes, newer notes, and skips older or equal ones', () => {
  const local = [note('a', 5), note('b', 5)];
  const incoming = [note('a', 9), note('b', 5), note('c', 1)];
  const r = planMerge(local, incoming);
  assert.deepEqual(r.write.sort(), ['a', 'c']);
  assert.deepEqual(r.skip, ['b']);
  assert.deepEqual(r.added, ['c']);
});

test('validateBackup rejects an empty object', () => {
  assert.equal(validateBackup({}).ok, false);
});

test('parseBackupText rejects non-JSON such as a PNG', () => {
  const r = parseBackupText('\u0089PNG\r\n\u001a\n...');
  assert.deepEqual(r, { ok: false, reason: 'Bu dosya bir Not Tahtası yedeği değil' });
});

test('validateBackup rejects an image whose blob is missing', () => {
  const obj = {
    app: 'not-tahtasi', version: 1, exportedAt: 1,
    notes: [note('a', 1)],
    boards: [{ noteId: 'a', items: [{ id: 'i', type: 'image', blobId: 'missing', x: 0, y: 0, w: 1, h: 1 }] }],
    blobs: [],
  };
  assert.equal(validateBackup(obj).ok, false);
});

test('validateBackup accepts a small valid backup', () => {
  const obj = {
    app: 'not-tahtasi', version: 1, exportedAt: 1,
    notes: [note('a', 1)],
    boards: [{ noteId: 'a', items: [{ id: 'i', type: 'image', blobId: 'b1', x: 0, y: 0, w: 1, h: 1 }] }],
    blobs: [{ id: 'b1', noteId: 'a', type: 'image/jpeg', data: 'AAEC' }],
  };
  assert.deepEqual(validateBackup(obj), { ok: true });
});

test('serialize then restore round-trips notes, boards and image bytes', async () => {
  await db.saveBoardAndNote({ noteId: 'a', items: [{ id: 'i', type: 'image', blobId: 'b1', x: 0, y: 0, w: 1, h: 1 }] }, note('a', 3));
  await db.putBlob({ id: 'b1', noteId: 'a', blob: new Blob([new Uint8Array([7, 8, 9])], { type: 'image/jpeg' }) });
  const text = await serializeAll(1000);
  await db.deleteNote('a');
  const r = await restoreFromText(text);
  assert.deepEqual(r, { added: 1, updated: 0, skipped: 0 });
  assert.equal((await db.getNote('a')).updatedAt, 3);
  assert.equal((await db.getBoard('a')).items.length, 1);
  const bytes = new Uint8Array(await (await db.getBlob('b1')).arrayBuffer());
  assert.deepEqual([...bytes], [7, 8, 9]);
});

test('restoring an invalid file changes nothing', async () => {
  await db.putNote(note('keep', 1));
  await assert.rejects(() => restoreFromText('{"app":"baska"}'), /Not Tahtası yedeği değil/);
  assert.deepEqual((await db.listNotes()).map((x) => x.id), ['keep']);
});

test('restore keeps a newer local note', async () => {
  await db.saveBoardAndNote({ noteId: 'a', items: [] }, note('a', 3));
  const text = await serializeAll(1000);
  await db.saveBoardAndNote({ noteId: 'a', items: [{ id: 's', type: 'stroke', tool: 'pen', color: '#000', size: 1, pts: [], attachedTo: null }] }, note('a', 9));
  const r = await restoreFromText(text);
  assert.deepEqual(r, { added: 0, updated: 0, skipped: 1 });
  assert.equal((await db.getBoard('a')).items.length, 1);
});

test('backupFileName uses the local date', () => {
  assert.equal(backupFileName(new Date(2026, 10, 7).getTime()), 'not-tahtasi-yedek-2026-11-07.json');
});
