import test from 'node:test';
import assert from 'node:assert/strict';
import {validDcPowerProvisionalR1,addVerifiedDcPowerProvisionalR1,
 DC_POWER_PROVISIONAL_KEY,DC_POWER_PROVISIONAL_VERSION,
 DC_POWER_PROVISIONAL_PRICE_MODE} from '../worker/theme-data-center-power-provisional-r1.mjs';
import {runDcPowerR8} from '../scripts/pc-writer/theme-data-center-power-auto-r8.mjs';
import {DC_POWER_PUBLIC_KEY,DC_POWER_PUBLIC_VERSION} from '../worker/theme-data-center-power-r1.mjs';

const NOW=Date.parse('2026-10-27T11:00:00Z');
const SHA='a'.repeat(64);
const confirmed={status:'READY',phase:'CONFIRMED',version:DC_POWER_PUBLIC_VERSION,
 theme:'데이터센터·전력',observationDate:'2026-10-23',score:12.32143,
 etfs:['DTCR','GRID'],referenceSymbol:'SPY',history:Array.from({length:252},(_,i)=>({
 date:new Date(Date.parse('2025-11-06T00:00:00Z')+i*86400000).toISOString().slice(0,10),score:50}))};
confirmed.history[251]={date:'2026-10-23',score:confirmed.score};
const record={status:'READY',version:DC_POWER_PROVISIONAL_VERSION,phase:'PROVISIONAL',
 theme:'데이터센터·전력',etfs:['DTCR','GRID'],referenceSymbol:'SPY',
 methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',individualStocksUsed:0,
 publicationAuthorized:true,derivedOnlyNoRaw:true,licensingRiskAcceptedByPublisher:true,
 upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,
 sourcePriceReconciled:false,sourcePriceMode:DC_POWER_PROVISIONAL_PRICE_MODE,
 sourceName:'MARKETPARQUET_ALREADY_STORED_SEVEN_THEME_ARCHIVE',
 sourceVersion:'DC_POWER_R8_'+SHA,sourceStoredAt:'2026-10-27T10:00:00Z',
 asOf:'2026-10-27T10:00:00Z',confirmedObservationDate:'2026-10-23',
 confirmedScore:12.32143,observationDate:'2026-10-26',
 points:[{date:'2026-10-26',score:14.38294,etfs:['DTCR','GRID']}],
 sourceFiles:[{date:'2026-10-23',sha256:SHA},{date:'2026-10-26',sha256:SHA}],
 overlapPriceDifferences:{DTCR:0.0005902,GRID:0.00092291,SPY:0.00007896}};

test('R8 DC provisional valid, only provisional points appended, confirmed unchanged',async()=>{
 assert.equal(validDcPowerProvisionalR1(record,confirmed,{now:NOW,storedAt:NOW-100}),true);
 const other={date:'2026-10-26',scores:{'우주·위성':47.35703}};
 const base={status:'READY',phase:'PROVISIONAL',themes:[confirmed,{theme:'우주·위성',score:44}],
  provisional:{asOf:'2026-10-27T10:00:00Z',points:[other]}};
 const snapshot=JSON.stringify(base);
 const db={prepare:()=>({bind:()=>({first:async()=>({body:JSON.stringify(record),stored_at:NOW-100})})})};
 const after=await addVerifiedDcPowerProvisionalR1(db,base,{now:NOW});
 assert.equal(JSON.stringify(base),snapshot);
 assert.equal(after.themes[0],confirmed);
 assert.deepEqual(after.provisional.points[0].scores,
  {'우주·위성':47.35703,'데이터센터·전력':14.38294});
});

test('R8 DC reader fails closed for stale, wrong rights, drift, bridge and date',()=>{
 const check=(change)=>validDcPowerProvisionalR1({...record,...change},confirmed,
  {now:NOW,storedAt:NOW-100});
 assert.equal(check({confirmedScore:44}),false);
 assert.equal(check({upstreamCommercialRightsVerified:true}),false);
 assert.equal(check({sourcePriceReconciled:true}),false);
 assert.equal(check({sourceVersion:'not-a-real-sha'}),false);
 assert.equal(check({overlapPriceDifferences:{DTCR:0.06,GRID:0,SPY:0}}),false);
 assert.equal(check({sourceStoredAt:'2026-10-01T00:00:00Z'}),false);
 assert.equal(check({points:[{date:'2026-10-24',score:14.3,etfs:['GRID','DTCR']}],
  observationDate:'2026-10-24',sourceFiles:[{date:'2026-10-23',sha256:SHA},
   {date:'2026-10-24',sha256:SHA}]}),false);
});

test('R8 publisher writes DC key only, and readback checks full content',async()=>{
 const requests=[],rows=new Map([[DC_POWER_PUBLIC_KEY,{body:confirmed,storedAt:NOW-300}]]);
 const db={read:async key=>rows.get(key)??null,
  writeVersioned:async(key,payload,stamp)=>{
   requests.push({key,stamp});rows.set(key,{body:payload,storedAt:NOW-50});
   return {status:'WRITTEN',changes:1};
  }};
 const result=await runDcPowerR8({dataRoot:'fake',db,allowPublish:true,now:()=>NOW,
  build:async()=>({status:'PRIVATE_PROVISIONAL_CANDIDATE',record})});
 assert.equal(result.status,'D1_READBACK_VERIFIED_API_PENDING');
 assert.equal(result.provisionalScore,14.38294);
 assert.equal(result.d1Writes,1);
 assert.deepEqual(requests,[{key:DC_POWER_PROVISIONAL_KEY,stamp:null}]);
 assert.equal(rows.get(DC_POWER_PUBLIC_KEY).body,confirmed);
});
