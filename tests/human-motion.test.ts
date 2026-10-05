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

test('torso stays upright and the face looks slightly down throughout the stride', async () => {
  try {
    const human = await createHumanMotion(100);
    try {
      for (let frame = 0; frame < 16; frame++) {
        const posture = human.samplePosture(frame / 16 * human.duration);
        assert.ok(Math.abs(posture.torsoLean) < .025, `torso leans ${posture.torsoLean} radians`);
        assert.ok(posture.facePitch < -.07 && posture.facePitch > -.15, `face pitch ${posture.facePitch} radians`);
      }
    } finally { human.dispose(); }
  } catch (error) { throw error; }
});

test('footfall markers alternate and stay attached to the grounded feet', async () => {
  try {
    const human = await createHumanMotion(100);
    try {
      const contacts = human.getFootContacts();
      assert.equal(contacts.length, 2);
      const separation = Math.abs(contacts[0].phase - contacts[1].phase);
      assert.ok(separation > .35 && separation < .65);
      for (const contact of contacts) {
        assert.ok(contact.position.every(Number.isFinite));
        assert.ok(contact.position[1] < -1.3 && contact.position[1] > -1.9);
      }
    } finally { human.dispose(); }
  } catch (error) { throw error; }
});

test('the bald silhouette excludes hair while retaining the anatomical scalp and foot motion', async () => {
  try {
    const human = await createHumanMotion(100);
    try {
      assert.ok(human.surfaceNames.some((name) => /Body/.test(name)));
      assert.ok(human.surfaceNames.every((name) => !/Hair/i.test(name)));
      const first = human.sampleFeet(0);
      assert.equal(first.length, 6);
      assert.ok(first.every(Number.isFinite));
      assert.notDeepEqual(first, human.sampleFeet(human.duration / 2));
      assert.deepEqual(first, human.sampleFeet(human.duration));
    } finally { human.dispose(); }
  } catch (error) { throw error; }
});
