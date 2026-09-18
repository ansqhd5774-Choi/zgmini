import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSnapshot,PUBLIC_CACHE_KEY} from '../worker/korea-funds.mjs';
import {__resetV2CacheForTests,V2_COMPOSITE_VERSION} from '../worker/korea-composite-v2.mjs';

const date=i=>new Date(Date.UTC(2024,0,1)+i*86400000).toISOString().slice(0,10).replaceAll('-','');
const rows=Array.from({length:700},(_,i)=>({
 basDt:date(i),
 crdTrFingWhl:100000+i*15,
 invrDpsgAmt:1000000+i*100,
 brkTrdUcolMnyVsOppsTrdAmt:5000+(i%17)*100,
}));
const page=(items,total=items.length)=>({response:{header:{resultCode:'00',resultMsg:'NORMAL SERVICE.'},body:{totalCount:total,pageNo:1,items:{item:items}}}});
test('public snapshot activates approved V2 when disclosure key is present',async()=>{
 __resetV2CacheForTests();
 const seen=[];
 const context={
  clock:()=>new Date(`${date(699).slice(0,4)}-${date(699).slice(4,6)}-${date(699).slice(6,8)}T00:00:00Z`),
  fetch:async url=>{
   seen.push(url.pathname);
   if(url.pathname.includes('GetDiscInfoService_V2'))return Response.json(page([],0));
   return Response.json(page(rows));
  },
 };
 const result=await publicSnapshot({FSC_API_KEY:'fixture-key',FSC_DISCLOSURE_API_KEY:'fixture-disc-key'},context);
 assert.equal(result.composite.methodologyVersion,V2_COMPOSITE_VERSION);
 assert.equal(result.composite.fallbackApplied,false);
 assert.equal(result.composite.status,'READY');
 assert.equal(result.composite.components.length,3);
 assert.equal(result.composite.components.at(-1).id,'KR_CORPORATE_STRESS_PENALTY');
 assert.equal(result.composite.corporateStressPenalty,0);
 assert.equal(result.legacyComposite.methodologyVersion,'kr-fg-2f-1.0.0');
 assert.ok(PUBLIC_CACHE_KEY.includes(V2_COMPOSITE_VERSION));
 assert.equal(seen.filter(p=>p.includes('GetDiscInfoService_V2')).length,5);
});
