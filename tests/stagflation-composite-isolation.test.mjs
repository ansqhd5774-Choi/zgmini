import test from 'node:test';import assert from 'node:assert/strict';
import {buildCompositeMarketScore,DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';
test('CM-R1 uses the unchanged twelve domains; changing the separate risk diagnostic cannot change overall',()=>{
 const domains=DOMAIN_WEIGHTS.map(d=>({id:d.id,status:'READY',score:50}));
 const a=buildCompositeMarketScore(domains),b=buildCompositeMarketScore([...domains,{id:'stagflationSafety',score:0,status:'READY'},{id:'liquidityCrisisDefense',score:0,status:'READY'}]);
 assert.equal(DOMAIN_WEIGHTS.length,12);assert.equal(DOMAIN_WEIGHTS.find(d=>d.id==='liquidity').weight,10);assert.equal(a.overall.score,50);assert.deepEqual(a,b);
});
