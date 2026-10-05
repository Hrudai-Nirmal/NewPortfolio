/** A bounded disk must follow the baked feet without introducing a page-wide ground plane. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFloorParticles, sampleFloorFeet } from '../lib/particle-floor.ts';

test('a dense, deterministic floor stays inside a small circular footprint', () => {
  const floor = createFloorParticles(2400, 1.05, -1.75);
  assert.equal(floor.positions.length, 7200);
  assert.deepEqual(floor.positions, createFloorParticles(2400, 1.05, -1.75).positions);
  let innerCount = 0;
  for (let index = 0; index < 2400; index++) {
    const distance = Math.hypot(floor.positions[index * 3], floor.positions[index * 3 + 2]);
    assert.ok(distance <= 1.050001);
    assert.equal(floor.positions[index * 3 + 1], -1.75);
    if (distance < .525) innerCount++;
  }
  assert.ok(innerCount > 500 && innerCount < 700, 'surface density must be evenly distributed');
  assert.throws(() => createFloorParticles(0, 1, -1.75));
});

test('the floor follows both foot positions continuously and loops with the humanoid', () => {
  const frames = [[0, .1, 0, 1, .5, 0], [.5, .4, .2, .6, .1, .3]];
  assert.deepEqual(sampleFloorFeet(frames, .25, 1), [.25, .25, .1, .8, .3, .15]);
  assert.deepEqual(sampleFloorFeet(frames, 1.25, 1), sampleFloorFeet(frames, .25, 1));
  assert.deepEqual(sampleFloorFeet(frames, .75, 1), sampleFloorFeet(frames, .25, 1));
  assert.throws(() => sampleFloorFeet(frames, NaN, 1));
});
