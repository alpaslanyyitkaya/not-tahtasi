import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachInput } from '../app/js/board/input.js';

class FakeStage extends EventTarget {
  contains() { return false; }
  setPointerCapture() {}
}
function pe(stage, type, props) {
  const e = new Event(type);
  Object.assign(e, { button: 0, clientX: 0, clientY: 0, ...props });
  stage.dispatchEvent(e);
}
function setup(opts = { tool: 'pen', penOnly: true }) {
  const stage = new FakeStage();
  const calls = [];
  const h = {
    local: () => ({ x: 0, y: 0 }),
    strokeStart: () => calls.push('start'),
    strokeMove: () => calls.push('move'),
    strokeEnd: (ok) => calls.push(ok ? 'end:commit' : 'end:discard'),
    eraseStart() {}, eraseAt() {}, eraseEnd() {},
    selectDown: () => false, selectMove() {}, selectUp() {},
    pan() {}, pinch() {},
  };
  attachInput(stage, h, () => opts);
  return { stage, calls };
}

test('a pen stroke cancelled by the system (e.g. home gesture) is kept', () => {
  const { stage, calls } = setup();
  pe(stage, 'pointerdown', { pointerType: 'pen', pointerId: 1 });
  pe(stage, 'pointermove', { pointerType: 'pen', pointerId: 1 });
  pe(stage, 'pointercancel', { pointerType: 'pen', pointerId: 1 });
  assert.equal(calls.at(-1), 'end:commit');
});

test('a finger stroke is discarded when a second finger lands', () => {
  const { stage, calls } = setup({ tool: 'pen', penOnly: false });
  pe(stage, 'pointerdown', { pointerType: 'touch', pointerId: 5 });
  pe(stage, 'pointerdown', { pointerType: 'touch', pointerId: 6 });
  assert.equal(calls.at(-1), 'end:discard');
});

test('touches are ignored while the pen is down (palm)', () => {
  const { stage, calls } = setup({ tool: 'pen', penOnly: false });
  pe(stage, 'pointerdown', { pointerType: 'pen', pointerId: 1 });
  pe(stage, 'pointerdown', { pointerType: 'touch', pointerId: 7 });
  pe(stage, 'pointerup', { pointerType: 'pen', pointerId: 1 });
  assert.deepEqual(calls, ['start', 'end:commit']);
});
