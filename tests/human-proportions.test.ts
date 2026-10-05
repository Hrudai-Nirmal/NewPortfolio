/** Proportion edits preserve authored waist landmarks and volume without stretching the head or moving the floor. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3, Vector3 } from 'three';
import { reshapeHumanPoint } from '../scripts/human-proportions.ts';

const BOUNDS = new Box3(new Vector3(-.8, 0, -.2), new Vector3(.8, 2, .2));
test('natural proportions preserve the source waist height and volume with only modest chest definition', () => {
  const waist = reshapeHumanPoint(new Vector3(.2, 1.06, .14), BOUNDS);
  const chest = reshapeHumanPoint(new Vector3(.25, 1.44, .14), BOUNDS);
  assert.equal(waist.x, .2, 'preserve the source waist volume');
  assert.equal(waist.z, .14);
  assert.equal(waist.y, 1.06, 'do not raise the pelvis/waist above the source anatomy');
  assert.ok(chest.x >= .25 && chest.x <= .2575);
  assert.ok(chest.x / waist.x <= 1.30, 'avoid an exaggerated torso-to-waist taper');
  assert.deepEqual(reshapeHumanPoint(new Vector3(.1, 0, .1), BOUNDS), new Vector3(.1, 0, .1));
  assert.deepEqual(reshapeHumanPoint(new Vector3(.1, 1.9, .1), BOUNDS), new Vector3(.1, 1.9, .1));
});

test('height remapping is smooth and monotonic with symmetric body proportions', () => {
  let previousHeight = -Infinity;
  for (let step = 0; step <= 200; step++) {
    const height = step / 100;
    const right = reshapeHumanPoint(new Vector3(.2, height, .1), BOUNDS);
    const left = reshapeHumanPoint(new Vector3(-.2, height, .1), BOUNDS);
    assert.ok(right.y > previousHeight);
    assert.equal(right.y, height);
    assert.equal(right.x, -left.x);
    previousHeight = right.y;
  }
  assert.throws(() => reshapeHumanPoint(new Vector3(NaN, 1, 0), BOUNDS));
});

test('feet shrink ten percent around the ankle and floor without narrowing the lower leg', async () => {
  try {
    const { resizeHumanFoot } = await import('../scripts/human-proportions.ts');
    const ankle = new Vector3(.12, .12, 0);
    const toe = resizeHumanFoot(new Vector3(.22, .04, .3), ankle, 0);
    assert.ok(Math.abs(toe.x - .21) < 1e-10);
    assert.ok(Math.abs(toe.y - .036) < 1e-10);
    assert.ok(Math.abs(toe.z - .27) < 1e-10);
    assert.equal(resizeHumanFoot(new Vector3(.2, 0, .3), ankle, 0).y, 0);
    assert.deepEqual(resizeHumanFoot(new Vector3(.12, .4, 0), ankle, 0), new Vector3(.12, .4, 0));
  } catch (error) { throw error; }
});
