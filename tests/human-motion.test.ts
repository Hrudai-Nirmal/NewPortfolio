/** Real mesh deformation must stay continuous, grounded, and repeatable across a full stride. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHumanMotion } from '../scripts/human-motion.ts';

test('a detailed skinned human walks through a seamless, grounded cycle', async () => {
  try {
    const human = await createHumanMotion(1800);
    assert.ok(human.vertexCount > 10000, 'use detailed anatomy rather than primitive body parts');
    assert.ok(human.boneCount >= 50);
    const surface = human.sampleSurface(0);
    assert.equal(surface.lighting.length, 1800);
    assert.ok(surface.lighting.every((value) => value >= .17 && value <= 1));
    assert.ok(Math.max(...surface.lighting) - Math.min(...surface.lighting) > .5);
    const first = human.sampleFrame(0);
    const middle = human.sampleFrame(human.duration / 2);
    const loop = human.sampleFrame(human.duration);
    assert.equal(first.length, 5400);
    assert.ok(first.every(Number.isFinite));
    assert.deepEqual(first, loop, 'the exact loop boundary must preserve particle identity');
    let totalMovement = 0;
    for (let index = 0; index < first.length; index++) totalMovement += (first[index] - middle[index]) ** 2;
    assert.ok(Math.sqrt(totalMovement / first.length) > .1, 'the walk must deform the mesh');
    const floorHeights: number[] = [];
    for (let frame = 0; frame < 20; frame++) {
      const positions = human.sampleFrame(frame / 20 * human.duration);
      let minimumHeight = Infinity;
      let maximumHeight = -Infinity;
      for (let index = 1; index < positions.length; index += 3) {
        minimumHeight = Math.min(minimumHeight, positions[index]);
        maximumHeight = Math.max(maximumHeight, positions[index]);
      }
      assert.ok(maximumHeight - minimumHeight > 3 && maximumHeight - minimumHeight < 3.7);
      floorHeights.push(minimumHeight);
    }
    assert.ok(Math.max(...floorHeights) - Math.min(...floorHeights) < .14, 'stance feet should stay near the same floor');
    assert.throws(() => human.sampleFrame(NaN));
    human.dispose();
  } catch (error) { throw error; }
});
