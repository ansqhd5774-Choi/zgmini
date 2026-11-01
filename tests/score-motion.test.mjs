import test from 'node:test';import assert from 'node:assert/strict';
import {scoreMotionChange} from '../lib/market-score/score-motion.mjs';
test('only visible score changes trigger a directional effect',()=>{
 assert.equal(scoreMotionChange(null,54.6),null);
 assert.equal(scoreMotionChange(54.61,54.64),null);
 assert.equal(scoreMotionChange(54.6,54.7),'up');
 assert.equal(scoreMotionChange(54.6,54.5),'down');
 assert.equal(scoreMotionChange(1,0),'down');
 assert.equal(scoreMotionChange(54.6,null),null);
 assert.equal(scoreMotionChange(NaN,54.6),null);
});
