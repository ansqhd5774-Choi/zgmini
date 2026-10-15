import test from 'node:test';
import assert from 'node:assert/strict';
import {clampedAnimationProgress} from '../lib/animation-progress.mjs';

test('animation progress never drops below zero when RAF timestamp trails performance.now',()=>{
  assert.equal(clampedAnimationProgress(900,1000,950),0);
  assert.equal(clampedAnimationProgress(-100,1000,950),0);
});

test('animation progress remains proportional inside the interval',()=>{
  assert.equal(clampedAnimationProgress(1475,1000,950),0.5);
});

test('animation progress never exceeds one and handles invalid duration safely',()=>{
  assert.equal(clampedAnimationProgress(3000,1000,950),1);
  assert.equal(clampedAnimationProgress(1000,1000,0),1);
});
