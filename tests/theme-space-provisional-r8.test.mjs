import test from 'node:test';
import assert from 'node:assert/strict';
import {addVerifiedSpaceProvisionalR1,validSpaceProvisionalR1,
 SPACE_PROVISIONAL_VERSION,SPACE_PROVISIONAL_METHOD,
 SPACE_PROVISIONAL_PRICE_MODE} from '../worker/theme-space-satellite-provisional-r1.mjs';

const now=Date.parse('2026-10-27T10:30:00Z');
const hash='a'.repeat(64);
const spaceHistory=Array.from({length:252},(_,i)=>({
 date:new Date(Date.parse('2026-02-14T00:00:00Z')+i*86400000).toISOString().slice(0,10),
 score:i===251?44.65075:45}));
spaceHistory[251].date='2026-10-23';
const space={theme:'우주·위성',etfs:['UFO','NASA','WARP','ROKT'],score:44.65075,history:spaceHistory};
const base={status:'READY',phase:'PROVISIONAL',observationDate:'2026-10-23',
 themes:[{theme:'로봇·자동화',score:20,history:[{date:'2026-10-23',score:20}]},space],
 provisional:{asOf:'2026-10-27T08:00:00Z',points:[{date:'2026-10-26',scores:{'로봇·자동화':21}}]}};
const record={status:'READY',version:SPACE_PROVISIONAL_VERSION,
 phase:'PROVISIONAL',theme:'우주·위성',referenceSymbol:'SPY',
 methodologyVersion:SPACE_PROVISIONAL_METHOD,sourcePriceMode:SPACE_PROVISIONAL_PRICE_MODE,
 sourceName:'MARKETPARQUET_ALREADY_STORED_SEVEN_THEME_ARCHIVE',
 individualStocksUsed:0,approvedBasket:true,publicationAuthorized:true,derivedOnlyNoRaw:true,
 sourcePriceReconciled:false,upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,
 sourceVersion:'SPACE_R8_'+hash,confirmedObservationDate:'2026-10-23',confirmedScore:44.65075,
 asOf:'2026-10-27T09:55:00Z',sourceStoredAt:'2026-10-27T09:55:00Z',
 observationDate:'2026-10-26',
 points:[{date:'2026-10-26',score:47.35703,etfs:['UFO','NASA','ROKT'],weightsPercent:{UFO:29.8037,NASA:60.7166,ROKT:9.4797}}],
 sourceFiles:[{date:'2026-10-23',sha256:hash},{date:'2026-10-26',sha256:hash}],
 aumAsOf:{UFO:'2026-10-22',NASA:'2026-10-22',WARP:'2026-10-23',ROKT:'2026-10-22'},
 overlapPriceDifferences:{UFO:.005,NASA:.004,ROKT:.002,SPY:.003}};
const db=({body=record,stamp=now-1000}={})=>({prepare:()=>({bind:()=>({first:async()=>({
 body:JSON.stringify(body),stored_at:stamp})})})});

test('R8 merges only space provisional score, retaining other scores and confirmed history',async()=>{
 assert.equal(validSpaceProvisionalR1(record,space,{now,storedAt:now-1000}),true);
 const result=await addVerifiedSpaceProvisionalR1(db(),base,{now});
 assert.equal(result.provisional.points[0].scores['로봇·자동화'],21);
 assert.equal(result.provisional.points[0].scores['우주·위성'],47.35703);
 assert.deepEqual(result.themes,base.themes);
 assert.equal(result.themes[1].history.at(-1).score,44.65075);
 assert.deepEqual(base.provisional.points,[{date:'2026-10-26',scores:{'로봇·자동화':21}}]);
});
test('wrong confirmed baseline, stale source, fabricated WARP and changed rights are rejected',async()=>{
 const invalid=[
  {...record,confirmedScore:40},
  {...record,sourceStoredAt:'2026-08-01T00:00:00Z'},
  {...record,points:[{...record.points[0],etfs:['UFO','NASA','WARP','ROKT']}]},
  {...record,upstreamCommercialRightsVerified:true},
  {...record,sourceFiles:[record.sourceFiles[0]]}
 ];
 for(const c of invalid){
  assert.equal(validSpaceProvisionalR1(c,space,{now,storedAt:now-1000}),false);
  assert.strictEqual(await addVerifiedSpaceProvisionalR1(db({body:c}),base,{now}),base);
 }
});
test('missing space remains unchanged',async()=>{
 const without={...base,themes:[base.themes[0]]};
 assert.strictEqual(await addVerifiedSpaceProvisionalR1(db(),without,{now}),without);
});
