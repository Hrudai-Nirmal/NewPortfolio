/** Validate the binary/GPU boundary so malformed motion cannot become corrupted WebGL coordinates. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DataUtils } from 'three';
import { encodeHumanAtlas, parseHumanAtlas } from '../lib/human-atlas.ts';

test('the packed atlas preserves stable particle IDs and sub-millimetre geometry', () => {
  const frames = [new Float32Array([.125, -1.7, .2, .8, 1.4, -.2]), new Float32Array([.2, -1.6, .3, .7, 1.5, -.3])];
  const atlas = parseHumanAtlas(encodeHumanAtlas(frames, 1.15));
  assert.equal(atlas.count, 2);
  assert.equal(atlas.frameCount, 2);
  assert.ok(Math.abs(atlas.duration - 1.15) < .00001);
  for (let frame = 0; frame < 2; frame++) for (let particle = 0; particle < 2; particle++) for (let axis = 0; axis < 3; axis++) {
    const offset = (frame * atlas.rowsPerFrame * atlas.width + particle) * 4 + axis;
    assert.ok(Math.abs(DataUtils.fromHalfFloat(atlas.texels[offset]) - frames[frame][particle * 3 + axis]) < .001);
  }
  const broken = encodeHumanAtlas(frames, 1.15);
  new Uint32Array(broken)[0] = 0;
  assert.throws(() => parseHumanAtlas(broken), /header/);
  assert.throws(() => parseHumanAtlas(broken.slice(0, 10)), /header/);
  assert.throws(() => encodeHumanAtlas([frames[0], new Float32Array(3)], 1), /same/);
  assert.throws(() => encodeHumanAtlas(frames, 0), /duration/);
});

test('surface lighting survives packing so front and back faces retain depth', () => {
  const frame = new Float32Array([0, 1, 0, 0, -1, 0]);
  const lighting = new Float32Array([.25, .9]);
  const atlas = parseHumanAtlas(encodeHumanAtlas([frame, frame], 1, [lighting, lighting]));
  assert.ok(Math.abs(DataUtils.fromHalfFloat(atlas.texels[3]) - .25) < .001);
  assert.ok(Math.abs(DataUtils.fromHalfFloat(atlas.texels[7]) - .9) < .001);
});
