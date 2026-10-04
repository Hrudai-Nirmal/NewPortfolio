/** Server-rendered contracts keep navigation and story content available before WebGL starts. */
import React from 'react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ParticleStory, createStoryTween } from '../components/particle-story.tsx';

test('story exposes two chapters and keyboard-operable motion controls', () => {
  const markup = renderToStaticMarkup(<ParticleStory />);
  assert.match(markup, /Ideas in/);
  assert.match(markup, /motion\./);
  assert.match(markup, /Made to/);
  assert.match(markup, /take flight\./);
  assert.match(markup, /aria-label="Go to human chapter"/);
  assert.match(markup, /aria-label="Go to flight chapter"/);
  assert.match(markup, /aria-label="Pause ambient motion"/);
  assert.match(markup, /aria-pressed="false"/);
  assert.match(markup, /aria-label="Story progress"/);
  assert.match(markup, /type="range"/);
  assert.match(markup, /Preparing the particle field/);
  assert.doesNotMatch(markup, /href="#"/);
});

test('the scroll tween has absolute endpoints after refresh or restored scroll', () => {
  const clock = { progress: .8 };
  const tween = createStoryTween(clock, () => {});
  tween.pause().progress(0);
  assert.equal(clock.progress, 0);
  tween.progress(1);
  assert.equal(clock.progress, 1);
  tween.invalidate().progress(.25);
  assert.equal(clock.progress, .25);
  tween.kill();
});
