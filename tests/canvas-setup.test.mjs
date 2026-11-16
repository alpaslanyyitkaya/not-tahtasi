import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Huawei/Android Chrome'da saydam "desynchronized" katmanlar kalem değince siyah görünüp
// tahtanın tamamını kapatıyor (tablette görüldü). Bu ayar bir daha eklenmesin.
test('board canvases do not request desynchronized (black overlay on Android)', () => {
  const src = readFileSync(new URL('../app/js/board/board-screen.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('desynchronized'));
});
