/** Geometry contracts protect particle identity and animation before GPU upload. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createParticleModel, getStoryState, getMotionTime, getParticleScale } from '../lib/particle-model.ts';

test('morph targets retain deterministic identities while human anatomy comes from the motion asset', () => {
  const model = createParticleModel(12000, 42);
  for (const attribute of [model.airplane, model.scatter]) {
    assert.equal(attribute.length, 36000);
    assert.ok(attribute.every(Number.isFinite));
  }
  assert.equal(model.seeds.length, 12000);
  assert.deepEqual(model.airplane, createParticleModel(12000, 42).airplane);
  assert.notDeepEqual(model.airplane, createParticleModel(12000, 43).airplane);
  assert.equal('human' in model, false, 'the old primitive anatomy must not remain as a fallback');
  assert.equal('joints' in model, false, 'the authored gait replaces procedural joint IDs');
});

test('invalid allocations and non-finite progress are rejected', () => {
  for (const count of [0, -10, 2.5, NaN, 200001]) assert.throws(() => createParticleModel(count));
  assert.throws(() => createParticleModel(100, NaN));
  assert.throws(() => getStoryState(NaN));
});

test('scroll has readable resting states, a continuous morph, and reversible progress', () => {
  assert.equal(getStoryState(0).morph, 0);
  assert.equal(getStoryState(0.15).morph, 0);
  assert.equal(getStoryState(0.5).morph, 0.5);
  assert.equal(getStoryState(0.85).morph, 1);
  assert.equal(getStoryState(1).chapter, 1);
  assert.equal(getStoryState(-1).progress, 0);
  assert.equal(getStoryState(2).progress, 1);
  const samples = Array.from({length:101}, (_, index) => getStoryState(index / 100).morph);
  assert.ok(samples.every((value, index) => index === 0 || value >= samples[index - 1]));
  assert.deepEqual(getStoryState(0.25), getStoryState(0.25));
});

test('paused and reduced motion freeze time without preventing chapter changes', () => {
  assert.equal(getMotionTime(12, 0.02, true, false), 12);
  assert.equal(getMotionTime(12, 0.02, false, true), 12);
  assert.equal(getMotionTime(12, 0.02, false, false), 12.02);
  assert.equal(getMotionTime(12, 5, false, false), 12.05);
  assert.equal(getStoryState(0.8, true).morph, 1);
  assert.equal(getStoryState(0.2, true).morph, 0);
});

test('phone framing reserves more width for airplane wings and scales down on short screens', () => {
  assert.ok(getParticleScale(390, 844, 1) < getParticleScale(390, 844, 0) * .8);
  assert.ok(getParticleScale(375, 667, 0) < getParticleScale(390, 844, 0));
  assert.equal(getParticleScale(1440, 900, 0), getParticleScale(1440, 900, 1));
  assert.throws(() => getParticleScale(0, 800, 0));
});
