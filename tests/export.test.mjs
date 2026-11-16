import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileNameFor } from '../app/js/board/export.js';

test('fileNameFor replaces characters not allowed in file names', () => {
  assert.equal(fileNameFor('Fizik: dalga/ses?', 'png'), 'Fizik- dalga-ses-.png');
});

test('fileNameFor keeps Turkish letters', () => {
  assert.equal(fileNameFor('Işık ve gölge', 'png'), 'Işık ve gölge.png');
});

test('fileNameFor falls back when the name is empty after cleaning', () => {
  assert.equal(fileNameFor('   ', 'png'), 'not.png');
});
