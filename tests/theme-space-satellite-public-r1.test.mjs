import test from 'node:test';
import assert from 'node:assert/strict';
import {addVerifiedSpaceSatellite,eligibleSpaceSatellite,
 SPACE_SATELLITE_PUBLIC_KEY,SPACE_SATELLITE_PUBLIC_METHOD,
 SPACE_SATELLITE_PUBLIC_VERSION} from '../worker/theme-space-satellite-r1.mjs';

const now=Date.parse('2026-10-26T06:00:00Z');
const dates=Array.from({length:252},(_,i)=>{
 const t=Date.parse('2026-02-14T00:00:00Z')+i*86_400_000;
 return new Date(t).toISOString().slice(0,10);
});
// The reader merely validates alignment with existing 252 published dates.
const base={status:'READY',observationDate:dates.at(-1),
 themes:Array.from({length:7},(_,i)=>({theme:'core-'+i,
  etfs:['BOTZ','ROBO'],score:50,history:dates.map(date=>({date,score:50}))}))};
const sample={status:'READY',version:SPACE_SATELLITE_PUBLIC_VERSION,theme:'우주·위성',
 etfs:['UFO','NASA','WARP','ROKT'],referenceSymbol:'SPY',
 methodologyVersion:SPACE_SATELLITE_PUBLIC_METHOD,
 weighting:'APPROVED_NORMALIZED_CURRENT_ISSUER_AUM_FOR_THREE_PLUS',
 historicalWeightMode:'CURRENT_BASKET_FIXED_AUM_RETROSPECTIVE_NOT_HISTORICAL_AUM',
 sourcePriceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
 individualStocksUsed:0,publicationAuthorized:true,approvedBasket:true,
 derivedOnlyNoRaw:true,priceManifestShaVerified:true,
 phase:'CONFIRMED',provisional:{points:[]},
 sourceVersion:'GMH_MANIFEST_SHA256_'+ 'a'.repeat(64)+'_SPY_SHA256_'+'b'.repeat(64),
 candidateFileSha256:'c'.repeat(64),
 sourceStoredAt:'2026-10-25T15:00:00Z',publishedAt:'2026-10-26T05:00:00Z',
 observationDate:dates.at(-1),score:44.65075,
 history:dates.map(date=>({date,score:44.65075})),
 aumAsOf:{UFO:'2026-10-22',NASA:'2026-10-22',WARP:'2026-10-23',ROKT:'2026-10-22'}};

test('isolated D1 reader includes the approved space basket only when stored and valid',async()=>{
 let reads=0;const db={prepare(sql){
  assert.match(sql,/SELECT body,stored_at FROM public_feed_snapshots_v1/);
  return {bind(key){assert.equal(key,SPACE_SATELLITE_PUBLIC_KEY);return {async first(){
   reads++;return {body:JSON.stringify(sample),stored_at:now-60_000};}};}};}};
 assert.equal(eligibleSpaceSatellite(sample,base,{now,storedAt:now-60_000}),true);
 const out=await addVerifiedSpaceSatellite(db,base,{now});
 assert.equal(reads,1);
 assert.equal(base.themes.length,7);
 assert.equal(out.themes.length,8);
 assert.deepEqual(out.themes.at(-1).etfs,['UFO','NASA','WARP','ROKT']);
 assert.equal(out.themes.at(-1).score,44.65075);
 assert.deepEqual(Object.keys(out.themes.at(-1)).sort(),
  ['etfs','history','score','theme']);
});
test('absent or malformed new key preserves existing public themes unchanged',async()=>{
 for(const row of [null,{body:'bad-json',stored_at:now},
  {body:JSON.stringify({...sample,publicationAuthorized:false}),stored_at:now},
  {body:JSON.stringify({...sample,history:[]}),stored_at:now}]){
  const db={prepare(){return {bind(){return {first:async()=>row};}}}};
  assert.equal(await addVerifiedSpaceSatellite(db,base,{now}),base);
 }
});
test('future observations, false history, missing timestamp and raw leak shape fail',()=>{
 const future={...sample,aumAsOf:{...sample.aumAsOf,WARP:'2026-10-30'}};
 assert.equal(eligibleSpaceSatellite(future,base,{now}),false);
 assert.equal(eligibleSpaceSatellite({...sample,history:sample.history.map((p,i)=>
  i===3?{...p,score:null}:p)},base,{now}),false);
 assert.equal(eligibleSpaceSatellite({...sample,sourceStoredAt:null},base,{now}),false);
 assert.equal(eligibleSpaceSatellite({...sample,individualStocksUsed:1},base,{now}),false);
});
test('ETF count is not capped at four; validated dynamic roster remains eligible',()=>{
 const more={...sample,etfs:[...sample.etfs,'ORBX'],
  aumAsOf:{...sample.aumAsOf,ORBX:'2026-10-22'}};
 assert.equal(eligibleSpaceSatellite(more,base,{now}),true);
});
