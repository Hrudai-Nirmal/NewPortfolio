/** Footfall rings follow measured contact events, share the walk clock and vanish outside the human chapter. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getFootstepRipple } from '../lib/footsteps.ts';

test('a contact expands and fades once per stride, with a quiet interval before the next impact', () => {
  const contact = { phase: .2, position: [0, -1.6, .2] };
  const impact = getFootstepRipple(.23, 1.15, contact, 0, false);
  const expanding = getFootstepRipple(.4, 1.15, contact, 0, false);
  assert.ok(expanding.radius > impact.radius);
  assert.ok(expanding.opacity > 0 && expanding.opacity <= .2);
  assert.equal(getFootstepRipple(.9, 1.15, contact, 0, false).opacity, 0);
  assert.equal(getFootstepRipple(.4, 1.15, contact, .5, false).opacity, 0);
  assert.equal(getFootstepRipple(.4, 1.15, contact, 0, true).opacity, 0);
  const loop = getFootstepRipple(1.55, 1.15, contact, 0, false);
  assert.ok(Math.abs(expanding.radius - loop.radius) < 1e-9);
  assert.throws(() => getFootstepRipple(NaN, 1.15, contact, 0, false));
});
