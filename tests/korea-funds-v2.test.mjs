import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSnapshot,PUBLIC_CACHE_KEY} from '../worker/korea-funds.mjs';
import {REV7_VERSION,REV7_FACTORS,REV7_INDEX_ID} from '../worker/korea-rev7-engine.mjs';

const weights=Object.fromEntries(REV7_FACTORS.map(id=>[id,1/7]));
const factors=Object.fromEntries(REV7_FACTORS.map((id,index)=>[id,{id,raw:index,score:45+index}]));
const score=REV7_FACTORS.reduce((sum,id)=>sum+factors[id].score,0)/7;
const rows=[{
 date:'20260915',methodology_version:REV7_VERSION,
 factors_json:JSON.stringify(factors),
 composite_json:JSON.stringify({id:REV7_INDEX_ID,score,status:'READY',observationDate:'20260915',weights}),
 history_mode:'RECONSTRUCTED_CURRENT_VINTAGE',point_in_time_verified:0,calculated_at:'2026-09-18T00:00:00Z',
}];

test('legacy V2 secrets cannot reactivate an old public methodology',async()=>{
 const result=await publicSnapshot(
  {FSC_API_KEY:'fixture-key',FSC_DISCLOSURE_API_KEY:'fixture-disc-key'},
  {
   loadProgress:async()=>({status:'COMPLETE',successfulTradingDates:1030}),
   loadRows:async()=>rows,
   clock:()=>new Date('2026-09-15T12:00:00Z'),
  },
 );
 assert.equal(result.composite.methodologyVersion,REV7_VERSION);
 assert.equal(result.composite.fallbackApplied,false);
 assert.equal(result.composite.status,'READY');
 assert.equal(result.composite.components.length,7);
 assert.ok(result.composite.components.every(component=>REV7_FACTORS.includes(component.id)));
 assert.ok(!result.composite.components.some(component=>component.id==='KR_CORPORATE_STRESS_PENALTY'));
 assert.equal(Object.hasOwn(result,'legacyComposite'),false);
 assert.ok(PUBLIC_CACHE_KEY.includes(REV7_VERSION));
});
