import 'fake-indexeddb/auto';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as db from '../app/js/db.js';
import { planMerge, serializeAll, checkBackup, restoreFromFile, backupFileName, readLines } from '../app/js/backup.js';

let n = 0;
beforeEach(async () => { await db.openDb(`backup-${++n}`); });

const note = (id, updatedAt) => ({ id, name: id, createdAt: 1, updatedAt, thumb: null });
const NOT_BACKUP = 'Bu dosya bir Not Tahtası yedeği değil';
const BROKEN = 'Yedek dosyası eksik ya da bozuk';
const file = (lines) => new Blob([lines.map((l) => JSON.stringify(l)).join('\n') + '\n']);
const header = { app: 'not-tahtasi', version: 2, exportedAt: 1 };

test('planMerge writes new notes, newer notes, and skips older or equal ones', () => {
  const r = planMerge([note('a', 5), note('b', 5)], [note('a', 9), note('b', 5), note('c', 1)]);
  assert.deepEqual(r.write.sort(), ['a', 'c']);
  assert.deepEqual(r.skip, ['b']);
  assert.deepEqual(r.added, ['c']);
});

test('readLines yields lines across chunk boundaries', async () => {
  const lines = [];
  for await (const l of readLines(new Blob(['ab', 'c\nd', 'e\n', 'f']))) lines.push(l);
  assert.deepEqual(lines, ['abc', 'de', 'f']);
});

test('checkBackup rejects an empty file', async () => {
  assert.deepEqual(await checkBackup(new Blob([''])), { ok: false, reason: NOT_BACKUP });
});

test('checkBackup rejects a PNG', async () => {
  assert.deepEqual(await checkBackup(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10])])), { ok: false, reason: NOT_BACKUP });
});

test('checkBackup reports a truncated backup as broken', async () => {
  const text = JSON.stringify(header) + '\n' + JSON.stringify({ k: 'note', ...note('a', 1) }).slice(0, 20);
  assert.deepEqual(await checkBackup(new Blob([text])), { ok: false, reason: BROKEN });
});

test('checkBackup rejects an image whose blob is missing', async () => {
  const f = file([header, { k: 'note', ...note('a', 1) },
    { k: 'board', noteId: 'a', items: [{ id: 'i', type: 'image', blobId: 'missing', x: 0, y: 0, w: 1, h: 1 }] }]);
  assert.equal((await checkBackup(f)).ok, false);
});

test('checkBackup rejects a stroke without points', async () => {
  const f = file([header, { k: 'note', ...note('a', 1) },
    { k: 'board', noteId: 'a', items: [{ id: 's', type: 'stroke', tool: 'pen', color: '#000', size: 1, attachedTo: null }] }]);
  assert.deepEqual(await checkBackup(f), { ok: false, reason: BROKEN });
});

test('checkBackup accepts a small valid backup and counts notes', async () => {
  const f = file([header, { k: 'note', ...note('a', 1) },
    { k: 'board', noteId: 'a', items: [{ id: 'i', type: 'image', blobId: 'b1', x: 0, y: 0, w: 1, h: 1 }] },
    { k: 'blob', id: 'b1', noteId: 'a', type: 'image/jpeg', data: 'AAEC' }]);
  assert.deepEqual(await checkBackup(f), { ok: true, noteCount: 1 });
});

test('serialize then restore round-trips notes, boards, previews and image bytes', async () => {
  await db.saveBoardAndNote({ noteId: 'a', items: [{ id: 'i', type: 'image', blobId: 'b1', x: 0, y: 0, w: 1, h: 1 }] },
    { ...note('a', 3), thumb: new Blob([new Uint8Array([1, 2])], { type: 'image/jpeg' }) });
  await db.putBlob({ id: 'b1', noteId: 'a', blob: new Blob([new Uint8Array([7, 8, 9])], { type: 'image/jpeg' }) });
  const backup = await serializeAll(1000);
  assert.ok(backup instanceof Blob);
  await db.deleteNote('a');
  assert.deepEqual(await restoreFromFile(backup), { added: 1, updated: 0, skipped: 0 });
  assert.equal((await db.getNote('a')).updatedAt, 3);
  assert.equal((await db.getNote('a')).thumb.size, 2);
  assert.equal((await db.getBoard('a')).items.length, 1);
  const bytes = new Uint8Array(await (await db.getBlob('b1')).arrayBuffer());
  assert.deepEqual([...bytes], [7, 8, 9]);
});

test('restoring an invalid file changes nothing', async () => {
  await db.putNote(note('keep', 1));
  await assert.rejects(() => restoreFromFile(new Blob(['{"app":"baska"}\n'])), /Not Tahtası yedeği değil/);
  assert.deepEqual((await db.listNotes()).map((x) => x.id), ['keep']);
});

test('restore keeps a newer local note', async () => {
  await db.saveBoardAndNote({ noteId: 'a', items: [] }, note('a', 3));
  const backup = await serializeAll(1000);
  await db.saveBoardAndNote({ noteId: 'a', items: [{ id: 's', type: 'stroke', tool: 'pen', color: '#000', size: 1, pts: [], attachedTo: null }] }, note('a', 9));
  assert.deepEqual(await restoreFromFile(backup), { added: 0, updated: 0, skipped: 1 });
  assert.equal((await db.getBoard('a')).items.length, 1);
});

test('backupFileName uses the local date', () => {
  assert.equal(backupFileName(new Date(2026, 10, 7).getTime()), 'not-tahtasi-yedek-2026-11-07.ntyedek');
});
