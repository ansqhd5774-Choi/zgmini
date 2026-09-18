import test from 'node:test';
import assert from 'node:assert/strict';
import {createKoreaFundsHandler,CACHE_MS,DEGRADED_CACHE_MS} from '../worker/korea-funds.mjs';
import {__resetV2CacheForTests,V2_COMPOSITE_VERSION} from '../worker/korea-composite-v2.mjs';

const date=i=>new Date(Date.UTC(2024,0,1)+i*86400000).toISOString().slice(0,10).replaceAll('-','');
const rows=Array.from({length:700},(_,i)=>({
 basDt:date(i),
 crdTrFingWhl:100000+i*20,
 invrDpsgAmt:1000000+i*100,
 brkTrdUcolMnyVsOppsTrdAmt:5000+(i%23)*75,
}));
const page=(items,total=items.length)=>({response:{header:{resultCode:'00',resultMsg:'NORMAL SERVICE.'},body:{pageNo:1,totalCount:total,items:{item:items}}}});
const req=()=>new Request('https://local.test/api/indicators/korea-funds');
const env={FSC_API_KEY:'fixture-fsc',FSC_DISCLOSURE_API_KEY:'fixture-disc'};

test('initial degraded snapshot retries before normal cache TTL',async()=>{
 __resetV2CacheForTests();
 const oldNow=Date.now;
 let now=Date.parse('2025-12-01T00:00:00Z');
 let creditFails=true;
 let creditCalls=0;
 Date.now=()=>now;
 try{
  const context={
   clock:()=>new Date(`${date(699).slice(0,4)}-${date(699).slice(4,6)}-${date(699).slice(6,8)}T00:00:00Z`),
   fetch:async url=>{
    if(url.pathname.includes('getGrantingOfCreditBalanceInfo')){
     creditCalls++;
     if(creditFails)return new Response('',{status:503});
     return Response.json(page(rows));
    }
    if(url.pathname.includes('GetDiscInfoService_V2'))return Response.json(page([],0));
    return Response.json(page(rows));
   },
  };
  const handler=createKoreaFundsHandler(context);

  const first=await (await handler(req(),env)).json();
  assert.equal(first.indicators.find(x=>x.id==='LEV_BLEND20_60')?.score,null);
  assert.equal(first.composite?.status,'UNAVAILABLE');
  const callsAfterFailure=creditCalls;

  now+=DEGRADED_CACHE_MS-1;
  await handler(req(),env);
  assert.equal(creditCalls,callsAfterFailure);

  assert.ok(DEGRADED_CACHE_MS<CACHE_MS);
  creditFails=false;
  now+=2;
  const second=await (await handler(req(),env)).json();
  assert.ok(creditCalls>callsAfterFailure);
  assert.equal(second.composite?.methodologyVersion,V2_COMPOSITE_VERSION);
  assert.equal(second.composite?.fallbackApplied,false);
  assert.equal(second.composite?.status,'READY');
  assert.equal(typeof second.indicators.find(x=>x.id==='LEV_BLEND20_60')?.score,'number');
  assert.equal(typeof second.composite?.score,'number');
 }finally{
  Date.now=oldNow;
  __resetV2CacheForTests();
 }
});

test('healthy V2 snapshot keeps normal cache TTL',async()=>{
 __resetV2CacheForTests();
 const oldNow=Date.now;
 let now=Date.parse('2025-12-01T00:00:00Z');
 let calls=0;
 Date.now=()=>now;
 try{
  const context={
   clock:()=>new Date(`${date(699).slice(0,4)}-${date(699).slice(4,6)}-${date(699).slice(6,8)}T00:00:00Z`),
   fetch:async url=>{
    calls++;
    if(url.pathname.includes('GetDiscInfoService_V2'))return Response.json(page([],0));
    return Response.json(page(rows));
   },
  };
  const handler=createKoreaFundsHandler(context);
  const first=await (await handler(req(),env)).json();
  assert.equal(first.composite?.methodologyVersion,V2_COMPOSITE_VERSION);
  assert.equal(first.composite?.status,'READY');
  const callsAfterFirst=calls;
  now+=DEGRADED_CACHE_MS+1000;
  await handler(req(),env);
  assert.equal(calls,callsAfterFirst);
 }finally{
  Date.now=oldNow;
  __resetV2CacheForTests();
 }
});
