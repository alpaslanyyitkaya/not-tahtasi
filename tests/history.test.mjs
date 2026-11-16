import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from '../app/js/board/history.js';

test('undo returns the previous items', () => {
  const h = createHistory();
  const a = [], b = [{ id: 1 }];
  h.push(a);
  assert.equal(h.undo(b), a);
});

test('redo after undo restores the newer items', () => {
  const h = createHistory();
  const a = [], b = [{ id: 1 }];
  h.push(a);
  const back = h.undo(b);
  assert.equal(h.redo(back), b);
});

test('push clears the redo stack', () => {
  const h = createHistory();
  h.push([]);
  h.undo([{ id: 1 }]);
  h.push([]);
  assert.equal(h.canRedo(), false);
  assert.equal(h.redo([]), null);
});

test('history keeps at most limit steps', () => {
  const h = createHistory(100);
  for (let i = 0; i < 101; i++) h.push([{ id: i }]);
  let cur = [], n = 0;
  while ((cur = h.undo(cur)) !== null) n++;
  assert.equal(n, 100);
});

test('undo on empty history returns null', () => {
  const h = createHistory();
  assert.equal(h.canUndo(), false);
  assert.equal(h.undo([]), null);
});
