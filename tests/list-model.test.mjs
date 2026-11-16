import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortNotes, filterNotes, needsBackupReminder, defaultNoteName } from '../app/js/list/list-model.js';

const DAY = 86400000;
const now = new Date(2026, 10, 17, 15, 0).getTime();

test('filterNotes matches Turkish dotless i case-insensitively', () => {
  assert.equal(filterNotes([{ name: 'ILIK SU' }], 'ılık').length, 1);
});

test('filterNotes matches Turkish dotted capital I', () => {
  assert.equal(filterNotes([{ name: 'İstanbul gezisi' }], 'istanbul').length, 1);
});

test('filterNotes with blank query returns all notes', () => {
  const notes = [{ name: 'a' }, { name: 'b' }];
  assert.equal(filterNotes(notes, '   ').length, 2);
});

test('filterNotes excludes non-matching notes', () => {
  assert.deepEqual(filterNotes([{ name: 'fizik' }, { name: 'kimya' }], ' kim ').map((n) => n.name), ['kimya']);
});

test('sortNotes orders by updatedAt descending without mutating', () => {
  const input = [{ updatedAt: 1 }, { updatedAt: 3 }, { updatedAt: 2 }];
  assert.deepEqual(sortNotes(input).map((n) => n.updatedAt), [3, 2, 1]);
  assert.deepEqual(input.map((n) => n.updatedAt), [1, 3, 2]);
});

test('needsBackupReminder', () => {
  assert.equal(needsBackupReminder(null, 0, now), false);
  assert.equal(needsBackupReminder(null, 1, now), true);
  assert.equal(needsBackupReminder(now - 13 * DAY, 5, now), false);
  assert.equal(needsBackupReminder(now - 15 * DAY, 5, now), true);
});

test('defaultNoteName uses Turkish short month', () => {
  assert.equal(defaultNoteName(now), 'Adsız not 17 Kas');
});
