/** Cursor mapping and temporal easing must remain correct across viewport sizes and motion preferences. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getHoverTarget, advanceHoverState } from '../lib/particle-hover.ts';

test('hover maps canvas-local coordinates and ignores touch or off-canvas pointers', () => {
  const bounds = { left: 20, top: 40, width: 400, height: 800 };
  assert.deepEqual(getHoverTarget(220, 440, bounds, 'mouse'), { horizontal: 0, vertical: 0, strength: 1 });
  assert.deepEqual(getHoverTarget(420, 40, bounds, 'pen'), { horizontal: 1, vertical: 1, strength: 1 });
  assert.equal(getHoverTarget(220, 440, bounds, 'touch').strength, 0);
  assert.equal(getHoverTarget(0, 440, bounds, 'mouse').strength, 0);
  assert.throws(() => getHoverTarget(NaN, 0, bounds, 'mouse'));
  assert.throws(() => getHoverTarget(0, 0, { ...bounds, width: 0 }, 'mouse'));
});

test('hover eases in and out consistently and respects pause and reduced motion', () => {
  const idle = { horizontal: 0, vertical: 0, strength: 0 };
  const target = { horizontal: .8, vertical: -.5, strength: 1 };
  const halfway = advanceHoverState(idle, target, .05, false, false);
  assert.ok(halfway.strength > 0 && halfway.strength < 1);
  const twice = advanceHoverState(halfway, target, .05, false, false);
  const once = advanceHoverState(idle, target, .1, false, false);
  assert.ok(Math.abs(twice.strength - once.strength) < 1e-10);
  assert.deepEqual(advanceHoverState(halfway, target, .05, true, false), halfway);
  assert.equal(advanceHoverState(halfway, target, .05, false, true).strength, 0);
  assert.ok(advanceHoverState(halfway, idle, .05, false, false).strength < halfway.strength);
});
