import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../app/js/board/geometry.js';
import { penW } from '../app/js/board/render.js';

const st = (tool, pts, size = 2) => ({ id: 's', type: 'stroke', tool, color: '#000', size, pts: pts.map(([x, y]) => ({ x, y, p: 0.5 })), attachedTo: null });

test('ballpoint (ball), line and arrow ignore pressure; pen and pencil follow it', () => {
  for (const tool of ['ball', 'line', 'arrow']) assert.equal(penW({ tool, size: 3 }, 0.1), penW({ tool, size: 3 }, 0.9));
  for (const tool of ['pen', 'pencil']) assert.ok(penW({ tool, size: 3 }, 0.9) > penW({ tool, size: 3 }, 0.1));
});

test('arrowHead points along the end of the stroke', () => {
  const h = g.arrowHead(st('arrow', [[0, 0], [100, 0]]));
  assert.deepEqual(h.tip, { x: 100, y: 0 });
  assert.ok(h.left.x < 100 && h.right.x < 100);
  assert.ok(Math.abs(h.left.y + h.right.y) < 1e-9);
  assert.ok(Math.hypot(h.left.x - 100, h.left.y) >= 10);
});

test('arrowHead ignores a tiny hook at the very end of the stroke', () => {
  const h = g.arrowHead(st('arrow', [[0, 0], [100, 0], [100.5, 3]]));
  const mid = { x: (h.left.x + h.right.x) / 2, y: (h.left.y + h.right.y) / 2 };
  const ang = Math.atan2(h.tip.y - mid.y, h.tip.x - mid.x);
  assert.ok(Math.abs(ang) < 0.1, `açı ${ang}`);
});

test('arrowHead of a single point is null', () => {
  assert.equal(g.arrowHead(st('arrow', [[5, 5]])), null);
});

test('the bounding box of an arrow includes its head', () => {
  const s = st('arrow', [[0, 0], [100, 0]]);
  const h = g.arrowHead(s);
  const b = g.itemBBox(s);
  for (const p of [h.left, h.right]) assert.ok(p.y >= b.y && p.y <= b.y + b.h);
});

test('straightLine keeps only the first and last point', () => {
  const pts = [[0, 0], [5, 9], [20, 3], [50, 50]].map(([x, y]) => ({ x, y, p: 0.5 }));
  assert.deepEqual(g.straightLine(pts), [pts[0], pts[3]]);
  assert.deepEqual(g.straightLine(pts.slice(0, 1)), [pts[0]]);
});
