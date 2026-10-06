import test from 'node:test';
import assert from 'node:assert/strict';
import {fearGreedStateColor} from '../lib/fear-greed-state-color.mjs';
test('display colors follow the supplied state, including missing state',()=>{
 for(const state of ['공포','극단적 공포'])assert.equal(fearGreedStateColor(state),'#ff7076');
 for(const state of ['탐욕','극단적 탐욕'])assert.equal(fearGreedStateColor(state),'#45d99f');
 for(const state of ['중립','확인 불가','확인 중',undefined])assert.equal(fearGreedStateColor(state),'#94a3b8');
});
