import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSectorFearGreedR3Public,SECTOR_FEAR_GREED_R3_SECTORS} from '../lib/market-score/sector-fear-greed-r3-public.mjs';
import {readSectorFearGreedR3,SECTOR_FEAR_GREED_R3_FEED_KEY} from '../worker/sector-fear-greed-r3-public.mjs';

function dates252(){
 const out=[];const start=Date.parse('2026-01-01T00:00:00Z');
 for(let i=0;i<252;i++)out.push(new Date(start+i*86400000).toISOString().slice(0,10));
 return out;
}
function sourceFixture(){
 const dates=dates252(),sectors={};
 for(const [index,meta] of SECTOR_FEAR_GREED_R3_SECTORS.entries()){
  sectors[meta.id]={fiveRaw:dates.map((date,i)=>({date,score:10+index+i/1000}))};
 }
 sectors.technology.fiveRaw.at(-1).score=63.5779;
 return {
  version:'R2.13.32-FULL-252-HISTORICAL-VALIDATION',
  generatedAt:'2026-09-09T12:00:00.000Z',
  status:'SHADOW_R21332_FULL_252_HISTORICAL_VALIDATION_COMPLETE',
  approvedR1ReferenceRequirement:756,
  summary:{allReady252:true},
  sectors,
 };
}

test('R3 public payload is exactly 11 sectors x 252 stored five-axis observations',()=>{
 const now=Date.parse('2026-09-10T12:00:00Z');
 const payload=buildSectorFearGreedR3Public(sourceFixture(),{now});
 assert.equal(payload.status,'READY');
 assert.equal(payload.referenceObservations,756);
 assert.equal(payload.sectors.length,11);
 assert.equal(payload.history.length,252);
 assert.equal(payload.observationDate,'2026-09-09');
 const tech=payload.sectors.find(x=>x.id==='technology');
 assert.equal(tech.score,74.7975);
 assert.equal(payload.history.at(-1).technology,74.7975);
});

test('R3 public builder rejects partial history instead of synthesizing scores',()=>{
 const source=sourceFixture();
 source.sectors.energy.fiveRaw.pop();
 assert.throws(()=>buildSectorFearGreedR3Public(source),/HISTORY_COUNT:energy:251/);
});

test('stored R3 reader serves only valid fresh output and never fetches providers',async()=>{
 const payload=buildSectorFearGreedR3Public(sourceFixture(),{now:Date.parse('2026-09-10T12:00:00Z')});
 const storedAt=Date.parse('2026-09-10T12:00:00Z');
 const store={readOutput:async key=>{assert.equal(key,SECTOR_FEAR_GREED_R3_FEED_KEY);return {body:payload,storedAt};}};
 const response=await readSectorFearGreedR3(null,{now:storedAt+3600000,store});
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.history.length,252);
 assert.equal(body.sectors.length,11);
});

test('stored R3 reader blocks stale observation even when storage timestamp is newer',async()=>{
 const payload=buildSectorFearGreedR3Public(sourceFixture(),{now:Date.parse('2026-09-20T12:00:00Z')});
 const now=Date.parse('2026-09-20T12:00:00Z');
 const store={readOutput:async()=>({body:payload,storedAt:now})};
 const response=await readSectorFearGreedR3(null,{now,store});
 assert.equal(response.status,503);
 const body=await response.json();
 assert.equal(body.reason,'STORED_DATA_STALE');
 assert.deepEqual(body.history,[]);
});
