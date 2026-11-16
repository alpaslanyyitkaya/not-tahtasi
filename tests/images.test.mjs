import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetSize, chooseOutputType, importMany } from '../app/js/board/images.js';

test('targetSize shrinks the longest side to 2600', () => {
  assert.deepEqual(targetSize(4000, 3000), { w: 2600, h: 1950 });
  assert.deepEqual(targetSize(3000, 4000), { w: 1950, h: 2600 });
});

test('targetSize keeps small images as they are', () => {
  assert.deepEqual(targetSize(800, 600), { w: 800, h: 600 });
});

test('chooseOutputType keeps PNG only when it has transparency', () => {
  assert.equal(chooseOutputType('image/png', true), 'image/png');
  assert.equal(chooseOutputType('image/png', false), 'image/jpeg');
  assert.equal(chooseOutputType('image/heic', false), 'image/jpeg');
  assert.equal(chooseOutputType('image/jpeg', true), 'image/jpeg');
});

test('importMany keeps going when one file fails and reports its name', async () => {
  const files = [{ name: 'a.jpg' }, { name: 'bozuk.heic' }, { name: 'c.jpg' }];
  const importer = async (f) => { if (f.name === 'bozuk.heic') throw new Error('decode'); return f.name.toUpperCase(); };
  const r = await importMany(files, importer);
  assert.deepEqual(r.ok, ['A.JPG', 'C.JPG']);
  assert.deepEqual(r.failed, ['bozuk.heic']);
});
