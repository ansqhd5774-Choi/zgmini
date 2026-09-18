import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCompositeV2,__resetV2CacheForTests,V2_COMPOSITE_VERSION} from '../worker/korea-composite-v2.mjs';

const date=i=>new Date(Date.UTC(2024,0,1)+i*86400000).toISOString().slice(0,10).replaceAll('-','');
const rows=Array.from({length:700},(_,i)=>({
 basDt:date(i),
 crdTrFingWhl:100000+i*20,
 invrDpsgAmt:1000000+i*100,
 brkTrdUcolMnyVsOppsTrdAmt:5000+(i%23)*75,
}));
const page=(items,total=items.length)=>({response:{header:{resultCode:'00',resultMsg:'NORMAL SERVICE.'},body:{pageNo:1,totalCount:total,items:{item:items}}}});

test('all disclosure V2 transport requests use HTTPS',async()=>{
 __resetV2CacheForTests();
 const seen=[];
 const env={FSC_API_KEY:'fixture-fsc',FSC_DISCLOSURE_API_KEY:'fixture-disc'};
 const context={
  fetch:async url=>{
   seen.push(String(url));
   if(url.pathname.includes('GetDiscInfoService_V2'))return Response.json(page([],0));
   return Response.json(page(rows));
  },
  clock:()=>new Date(`${date(699).slice(0,4)}-${date(699).slice(4,6)}-${date(699).slice(6,8)}T00:00:00Z`)
 };
 const result=await buildCompositeV2(env,context,context.clock());
 assert.equal(result.methodologyVersion,V2_COMPOSITE_VERSION);
 assert.equal(result.status,'READY');
 const disclosureUrls=seen.filter(u=>u.includes('GetDiscInfoService_V2'));
 assert.equal(disclosureUrls.length,5);
 assert.ok(disclosureUrls.every(u=>u.startsWith('https://')));
 __resetV2CacheForTests();
});
