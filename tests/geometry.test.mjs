import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../app/js/board/geometry.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
const img = (id, x, y, w, h) => ({ id, type: 'image', blobId: id, x, y, w, h });
const stroke = (pts, extra = {}) => ({ id: 's', type: 'stroke', tool: 'pen', color: '#000', size: 2, pts: pts.map(([x, y]) => ({ x, y, p: 0.5 })), attachedTo: null, ...extra });

test('toWorld and toScreen are inverses', () => {
  const v = { s: 2, tx: 10, ty: -5 };
  const w = g.toWorld(v, 50, 60);
  const s = g.toScreen(v, w.x, w.y);
  near(s.x, 50); near(s.y, 60);
});

test('zoomAt keeps the point under the cursor fixed', () => {
  const v = g.zoomAt({ s: 1, tx: 0, ty: 0 }, 100, 50, 2);
  assert.equal(v.s, 2);
  const w = g.toWorld(v, 100, 50);
  near(w.x, 100); near(w.y, 50);
});

test('zoomAt clamps scale to 0.1..8', () => {
  assert.equal(g.zoomAt({ s: 7, tx: 0, ty: 0 }, 0, 0, 2).s, 8);
  assert.equal(g.zoomAt({ s: 0.12, tx: 0, ty: 0 }, 0, 0, 0.5).s, 0.1);
});

test('findAttachTarget attaches at 90% inside', () => {
  const pts = [...Array(9)].map((_, i) => [10 + i, 10]).concat([[500, 500]]);
  assert.equal(g.findAttachTarget(stroke(pts), [img('a', 0, 0, 100, 100)]), 'a');
});

test('findAttachTarget does not attach at 70% inside', () => {
  const pts = [...Array(7)].map((_, i) => [10 + i, 10]).concat([[500, 500], [501, 500], [502, 500]]);
  assert.equal(g.findAttachTarget(stroke(pts), [img('a', 0, 0, 100, 100)]), null);
});

test('findAttachTarget picks topmost image when both qualify', () => {
  const pts = [[60, 60], [70, 70], [80, 80]];
  assert.equal(g.findAttachTarget(stroke(pts), [img('a', 0, 0, 100, 100), img('b', 50, 50, 100, 100)]), 'b');
});

test('transformAttached moves and scales attached strokes', () => {
  const s = { ...stroke([[50, 50]]), attachedTo: 'a' };
  const [out] = g.transformAttached([s], { x: 0, y: 0, w: 100, h: 100 }, { x: 200, y: 0, w: 200, h: 200 }, 'a');
  assert.deepEqual(out.pts[0], { x: 300, y: 100, p: 0.5 });
  assert.equal(out.size, 4);
});

test('transformAttached returns unattached strokes unchanged', () => {
  const s = stroke([[50, 50]]);
  const [out] = g.transformAttached([s], { x: 0, y: 0, w: 100, h: 100 }, { x: 200, y: 0, w: 200, h: 200 }, 'a');
  assert.equal(out, s);
});

test('resizeFromHandle keeps aspect ratio from se handle', () => {
  assert.deepEqual(g.resizeFromHandle(img('a', 0, 0, 200, 100), 'se', 400, 0), { x: 0, y: 0, w: 400, h: 200 });
});

test('resizeFromHandle clamps to minSize and keeps opposite corner fixed', () => {
  const r = g.resizeFromHandle(img('a', 0, 0, 200, 100), 'nw', 190, 95);
  assert.equal(r.w, 80);
  assert.equal(r.h, 40);
  assert.equal(r.x + r.w, 200);
  assert.equal(r.y + r.h, 100);
});

test('hitImage returns topmost image', () => {
  assert.equal(g.hitImage([img('a', 0, 0, 100, 100), img('b', 50, 50, 100, 100)], 75, 75).id, 'b');
  assert.equal(g.hitImage([img('a', 0, 0, 100, 100)], 500, 500), null);
});

test('hitHandle finds corner within tolerance', () => {
  const a = img('a', 0, 0, 100, 100);
  assert.equal(g.hitHandle(a, 98, 103, 10), 'se');
  assert.equal(g.hitHandle(a, -4, 2, 10), 'nw');
  assert.equal(g.hitHandle(a, 50, 50, 10), null);
});

test('contentBBox of nothing is null; of items is their union', () => {
  assert.equal(g.contentBBox([]), null);
  const b = g.contentBBox([img('a', 0, 0, 10, 10), img('b', 20, 30, 10, 10)]);
  assert.deepEqual(b, { x: 0, y: 0, w: 30, h: 40 });
});

test('itemBBox pads strokes by their width', () => {
  const b = g.itemBBox(stroke([[10, 10], [20, 30]], { size: 2 }));
  near(b.x, 10 - 1.7); near(b.w, 10 + 3.4);
});

test('strokesHitByEraser returns ids of touched strokes only', () => {
  const s1 = { ...stroke([[0, 0], [10, 0]]), id: 's1' };
  const s2 = { ...stroke([[100, 100]]), id: 's2' };
  assert.deepEqual([...g.strokesHitByEraser([s1, s2], 5, 3, 5)], ['s1']);
});

test('strokesHitByEraser hits the segment between distant points', () => {
  const s1 = { ...stroke([[0, 0], [100, 0]]), id: 's1' };
  assert.deepEqual([...g.strokesHitByEraser([s1], 50, 2, 4)], ['s1']);
});

test('fitView centers content within padding', () => {
  const v = g.fitView({ x: 0, y: 0, w: 100, h: 50 }, 248, 248, 24);
  assert.equal(v.s, 2);
  const c = g.toScreen(v, 50, 25);
  near(c.x, 124); near(c.y, 124);
});

test('placeImages fits each to 60% of the screen and centers the row', () => {
  const v = { s: 1, tx: 0, ty: 0 };
  const [r] = g.placeImages([{ w: 2000, h: 1000 }], v, 1000, 800);
  near(r.w, 600); near(r.h, 300);
  near(r.x + r.w / 2, 500); near(r.y + r.h / 2, 400);
});

test('placeImages lays several images side by side without overlap', () => {
  const rs = g.placeImages([{ w: 100, h: 100 }, { w: 100, h: 100 }], { s: 1, tx: 0, ty: 0 }, 1000, 800);
  assert.ok(rs[1].x >= rs[0].x + rs[0].w + 24 - 1e-9);
});

test('exportScale caps the longest side at 4000 including margin', () => {
  near(g.exportScale({ x: 0, y: 0, w: 8000, h: 2000 }), 4000 / 8096);
  assert.equal(g.exportScale({ x: 0, y: 0, w: 500, h: 500 }), 1);
});
