import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatWhen } from '../app/js/time.js';

const now = new Date(2026, 10, 17, 15, 0).getTime();

test('within the last hour is "az önce"', () => {
  assert.equal(formatWhen(now - 5 * 60e3, now), 'az önce');
});
test('earlier today shows time', () => {
  assert.equal(formatWhen(new Date(2026, 10, 17, 9, 30).getTime(), now), 'bugün, 09:30');
});
test('yesterday shows time', () => {
  assert.equal(formatWhen(new Date(2026, 10, 16, 14, 20).getTime(), now), 'dün, 14:20');
});
test('same year shows day and month', () => {
  assert.equal(formatWhen(new Date(2026, 10, 12, 10, 0).getTime(), now), '12 Kas');
});
test('other year shows year', () => {
  assert.equal(formatWhen(new Date(2025, 2, 2, 10, 0).getTime(), now), '2 Mar 2025');
});
test('yesterday across a month boundary', () => {
  const n = new Date(2026, 11, 1, 10, 0).getTime();
  assert.equal(formatWhen(new Date(2026, 10, 30, 23, 5).getTime(), n), 'dün, 23:05');
});
