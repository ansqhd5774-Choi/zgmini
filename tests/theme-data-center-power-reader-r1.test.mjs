import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleDcPower,addVerifiedDcPower,DC_POWER_PUBLIC_KEY,DC_POWER_PUBLIC_VERSION}
 from '../worker/theme-data-center-power-r1.mjs';

const days=[];
for(let ms=Date.parse('2025-11-03T00:00:00Z');days.length<252;ms+=86400000){
 const date=new Date(ms),day=date.getUTCDay();
 if(day!==0&&day!==6)days.push(date.toISOString().slice(0,10));
}
const end=days.at(-1),now=Date.parse(end+'T23:00:00Z')+86400000;
const hist=score=>days.map(date=>({date,score}));
const base={status:'READY',methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',
 observationDate:end,phase:'CONFIRMED',themes:Array.from({length:9},(_,i)=>({
  theme:'existing '+i,history:hist(55),score:55}))};
function record(){const iso=new Date(now-10000).toISOString();return {
 status:'READY',version:DC_POWER_PUBLIC_VERSION,theme:'데이터센터·전력',etfs:['DTCR','GRID'],
 referenceSymbol:'SPY',methodologyVersion:base.methodologyVersion,scoreMethod:'ETF_ONLY_PROXY',
 individualStocksUsed:0,sourcePriceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
 phase:'CONFIRMED',provisional:{points:[]},publicationAuthorized:true,
 accountGoodStandingVerified:true,upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,
 derivedOnlyNoRaw:true,localBarsVerified:true,sourceTermsUrl:'https://getmarkethistory.com/docs/terms',
 sourceStoredAtKind:'VERIFIED_LOCAL_MARKET_BARS',sourceTimestampBasis:'MANIFEST_GET_REQUEST_AT',
 sourceVersion:'GMH_MANIFEST_SHA256_'+'a'.repeat(64),candidateFileSha256:'b'.repeat(64),
 sourceStoredAt:iso,publishedAt:iso,asOf:iso,observationDate:end,score:14.75794,
 history:hist(14.75794)};}
test('isolated reader accepts only verified rights, source lineage and 252 matching sessions',async()=>{
 const valid=record();
 assert.equal(eligibleDcPower(valid,base,{now,storedAt:now-10000}),true);
 const db={prepare(sql){assert.match(sql,/public_feed_snapshots_v1/);
  return {bind(key){assert.equal(key,DC_POWER_PUBLIC_KEY);
   return {first:async()=>({body:JSON.stringify(valid),stored_at:now-10000})};}};}};
 const next=await addVerifiedDcPower(db,base,{now});
 assert.equal(next.themes.length,10);
 assert.equal(next.themes.at(-1).score,14.75794);
 assert.equal(base.themes.length,9);
});
test('no theme is appended without account and redistribution evidence',async()=>{
 const denied=record();denied.accountGoodStandingVerified=false;
 assert.equal(eligibleDcPower(denied,base,{now,storedAt:now-10000}),false);
 const db={prepare(){return {bind(){return {first:async()=>({body:JSON.stringify(denied),stored_at:now-10000})};}};}};
 assert.equal((await addVerifiedDcPower(db,base,{now})).themes.length,9);
 const noRow={prepare(){return {bind(){return {first:async()=>null};}};}};
 assert.equal((await addVerifiedDcPower(noRow,base,{now})).themes.length,9);
});
