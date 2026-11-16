import 'fake-indexeddb/auto';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as db from '../app/js/db.js';

let n = 0;
beforeEach(async () => { await db.openDb(`test-${++n}`); });

const note = (id, extra = {}) => ({ id, name: id, createdAt: 1, updatedAt: 1, thumb: null, ...extra });
const blob = (s) => new Blob([s]);

test('listNotes returns all notes', async () => {
  await db.putNote(note('a'));
  await db.putNote(note('b'));
  const ids = (await db.listNotes()).map((x) => x.id).sort();
  assert.deepEqual(ids, ['a', 'b']);
});

test('deleteNote removes note, board and its blobs but not other notes\' blobs', async () => {
  await db.putNote(note('a'));
  await db.putNote(note('b'));
  await db.putBoard({ noteId: 'a', items: [] });
  await db.putBlob({ id: 'a1', noteId: 'a', blob: blob('x') });
  await db.putBlob({ id: 'b1', noteId: 'b', blob: blob('y') });
  await db.deleteNote('a');
  assert.equal(await db.getNote('a'), null);
  assert.equal(await db.getBoard('a'), null);
  assert.equal(await db.getBlob('a1'), null);
  assert.ok(await db.getBlob('b1'));
  assert.ok(await db.getNote('b'));
});

test('gcBlobs keeps only ids in keepIds for that note', async () => {
  for (const id of ['x1', 'x2', 'x3']) await db.putBlob({ id, noteId: 'x', blob: blob(id) });
  await db.putBlob({ id: 'y1', noteId: 'y', blob: blob('y') });
  const removed = await db.gcBlobs('x', new Set(['x2']));
  assert.equal(removed, 2);
  assert.equal(await db.getBlob('x1'), null);
  assert.ok(await db.getBlob('x2'));
  assert.ok(await db.getBlob('y1'));
});

test('meta roundtrip', async () => {
  assert.equal(await db.getMeta('lastBackupAt'), null);
  await db.setMeta('lastBackupAt', 42);
  assert.equal(await db.getMeta('lastBackupAt'), 42);
});

test('saveBoardAndNote writes both', async () => {
  await db.saveBoardAndNote({ noteId: 'n', items: [{ id: 's' }] }, note('n', { updatedAt: 9 }));
  assert.equal((await db.getNote('n')).updatedAt, 9);
  assert.deepEqual((await db.getBoard('n')).items, [{ id: 's' }]);
});

test('dumpAll returns every store', async () => {
  await db.putNote(note('a'));
  await db.putBoard({ noteId: 'a', items: [] });
  await db.putBlob({ id: 'a1', noteId: 'a', blob: blob('x') });
  await db.setMeta('k', 1);
  const all = await db.dumpAll();
  assert.equal(all.notes.length, 1);
  assert.equal(all.boards.length, 1);
  assert.equal(all.blobs.length, 1);
  assert.equal(all.meta.length, 1);
});

test('newId returns unique strings', async () => {
  const { newId } = await import('../app/js/ids.js');
  assert.notEqual(newId(), newId());
  assert.equal(typeof newId(), 'string');
});

test('writeMany writes notes, boards and blobs together', async () => {
  await db.writeMany({ notes: [note('w')], boards: [{ noteId: 'w', items: [] }], blobs: [{ id: 'w1', noteId: 'w', blob: blob('z') }] });
  assert.ok(await db.getNote('w'));
  assert.ok(await db.getBoard('w'));
  assert.ok(await db.getBlob('w1'));
});
