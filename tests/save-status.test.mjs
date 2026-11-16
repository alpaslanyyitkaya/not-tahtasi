import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSaver } from '../app/js/board/save-status.js';

function fakeClock() {
  let now = 0, timers = [];
  return {
    setTimer: (fn, ms) => { const t = { fn, at: now + ms }; timers.push(t); return t; },
    clearTimer: (t) => { timers = timers.filter((x) => x !== t); },
    async advance(ms) {
      now += ms;
      const due = timers.filter((t) => t.at <= now);
      timers = timers.filter((t) => t.at > now);
      for (const t of due) await t.fn();
    },
  };
}
const flushMicro = () => new Promise((r) => setTimeout(r, 0));

test('schedule debounces to one save 1000ms after the last change', async () => {
  const clock = fakeClock();
  let saves = 0;
  const s = createSaver({ save: async () => { saves++; }, ...clock });
  s.schedule();
  await clock.advance(500);
  s.schedule();
  await clock.advance(999);
  assert.equal(saves, 0);
  assert.equal(s.state(), 'pending');
  await clock.advance(1);
  await flushMicro();
  assert.equal(saves, 1);
  assert.equal(s.state(), 'saved');
});

test('flush saves immediately and cancels the pending timer', async () => {
  const clock = fakeClock();
  let saves = 0;
  const s = createSaver({ save: async () => { saves++; }, ...clock });
  s.schedule();
  await s.flush();
  assert.equal(saves, 1);
  await clock.advance(2000);
  assert.equal(saves, 1);
});

test('flush with nothing pending does not save', async () => {
  const clock = fakeClock();
  let saves = 0;
  const s = createSaver({ save: async () => { saves++; }, ...clock });
  await s.flush();
  assert.equal(saves, 0);
});

test('a failing save sets error state and notifies', async () => {
  const clock = fakeClock();
  const seen = [];
  const s = createSaver({ save: async () => { throw new DOMException('dolu', 'QuotaExceededError'); }, ...clock });
  s.onChange((st) => seen.push(st));
  s.schedule();
  await s.flush();
  assert.equal(s.state(), 'error');
  assert.ok(seen.includes('error'));
});

test('after an error the next change retries and recovers', async () => {
  const clock = fakeClock();
  let fail = true, saves = 0;
  const s = createSaver({ save: async () => { if (fail) throw new Error('x'); saves++; }, ...clock });
  s.schedule();
  await s.flush();
  assert.equal(s.state(), 'error');
  fail = false;
  s.schedule();
  await clock.advance(1000);
  await flushMicro();
  assert.equal(saves, 1);
  assert.equal(s.state(), 'saved');
});

test('changes made while a save is running are saved afterwards', async () => {
  const clock = fakeClock();
  let release, saves = 0;
  const s = createSaver({ save: () => new Promise((r) => { saves++; release = r; }), ...clock });
  s.schedule();
  const p = s.flush();
  s.schedule();               // değişiklik kayıt sürerken
  release();
  await p;
  const p2 = s.flush();
  await flushMicro();
  release();
  await p2;
  assert.equal(saves, 2);
  assert.equal(s.state(), 'saved');
});
