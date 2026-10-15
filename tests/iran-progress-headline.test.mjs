import {test} from 'node:test';
import assert from 'node:assert/strict';
import {candidateHeadline} from '../scripts/iran-progress/ai.mjs';
test('structured GDELT rows do not invent an article headline for AI',()=>{
 assert.equal(candidateHeadline({id:'GDELT:1',actors:['IRN','ISR'],eventRoot:'19'}),null);
 assert.equal(candidateHeadline({title:'   '}),null);
 assert.equal(candidateHeadline({title:'Original source headline'}),'Original source headline');
});
