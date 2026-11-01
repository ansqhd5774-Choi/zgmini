import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clampedAnimationProgress} from '../lib/animation-progress.mjs';

test('animation progress clamps to the valid zero-to-one range',()=>{
  assert.equal(clampedAnimationProgress(900,1000,950),0);
  assert.equal(clampedAnimationProgress(-100,1000,950),0);
  assert.equal(clampedAnimationProgress(3000,1000,950),1);
  assert.equal(clampedAnimationProgress(1000,1000,0),1);
});

test('animation progress remains proportional inside the interval',()=>{
  assert.equal(clampedAnimationProgress(1475,1000,950),0.5);
});

test('score animation anchors its start to the first RAF timestamp',()=>{
  const source=readFileSync('app/market-score-orb.tsx','utf8');
  assert.match(source,/let startedAt: number \| null = null;/);
  assert.match(source,/if \(startedAt === null\) startedAt = now;/);
  assert.match(source,/clampedAnimationProgress\(now,startedAt,duration\)/);
  assert.doesNotMatch(source,/const startedAt = performance\.now\(\)/);
});
