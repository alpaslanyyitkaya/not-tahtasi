import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = fileURLToPath(new URL('../app/', import.meta.url));
const sw = readFileSync(join(appDir, 'sw.js'), 'utf8');
const assets = JSON.parse(sw.match(/const ASSETS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [relative(appDir, p).split('\\').join('/')];
  });
}

test('every app file except sw.js is in the offline cache list', () => {
  const missing = walk(appDir).filter((f) => f !== 'sw.js' && !assets.includes(f));
  assert.deepEqual(missing, []);
});

test('every cache list entry exists', () => {
  const gone = assets.filter((a) => a !== './' && !existsSync(join(appDir, a)));
  assert.deepEqual(gone, []);
});
