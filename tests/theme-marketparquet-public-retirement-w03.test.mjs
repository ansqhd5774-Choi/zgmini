import test from 'node:test';
import assert from 'node:assert/strict';
import {MARKETPARQUET_REMOVED_CODE,hasMarketParquetProvenance}
 from '../lib/marketparquet-retirement.mjs';
import {R88_PUBLIC_ROSTER,R88_VERSION,validNineR88,addVerifiedNineR88}
 from '../worker/theme-nine-r88-provisional.mjs';
import {THEME_NINE_R37_VERSION} from '../worker/theme-nine-r37-public.mjs';
import {validDcPowerProvisionalR1,addVerifiedDcPowerProvisionalR1}
 from '../worker/theme-data-center-power-provisional-r1.mjs';
import {validSpaceProvisionalR1,addVerifiedSpaceProvisionalR1}
 from '../worker/theme-space-satellite-provisional-r1.mjs';
import {validBiotechProvisionalR1,addVerifiedBiotechProvisionalR1}
 from '../worker/theme-biotech-provisional-r1.mjs';
import {validConfiguredProvisional} from '../worker/theme-configured-r32-contract.mjs';
import {validThemeEtfProvisional} from '../lib/market-score/theme-etf-provisional.mjs';

// These fixtures model previously published derived rows, not new provider data.
const legacy={status:'READY',phase:'PROVISIONAL',
 sourceName:'MARKETPARQUET_ALREADY_STORED_SEVEN_THEME_ARCHIVE',
 publicationAuthorized:true,upstreamCommercialRightsVerified:true,
 derivedLicenseVerified:true,sourcePriceReconciled:true};
const deniedDb=()=>{let reads=0;return {
 get reads(){return reads;},
 prepare(){reads++;throw Error('RETIRED_D1_READ_NOT_ALLOWED');}
};};
test('previous publisher consent never revives retired provisional sources',()=>{
 assert.equal(MARKETPARQUET_REMOVED_CODE,
  'PROVIDER_REMOVED_MARKETPARQUET_PUBLICATION_DENIED');
 assert.equal(hasMarketParquetProvenance(legacy),true);
 assert.equal(hasMarketParquetProvenance({lineage:{
  secondarySource:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED'}}),true);
 assert.equal(validThemeEtfProvisional({...legacy,individualStocksUsed:0},
  '2026-11-13'),false);
 assert.equal(validConfiguredProvisional(legacy),false);
 for(const validate of [validBiotechProvisionalR1,validDcPowerProvisionalR1,
  validSpaceProvisionalR1,validNineR88])
  assert.equal(validate(legacy),false);
});
test('removed 8-theme R88 sidecar cannot query D1 or replace confirmed history',async()=>{
 const approved=R88_PUBLIC_ROSTER.map(t=>({theme:t.theme,score:45}));
 const base={status:'READY',modelRevision:THEME_NINE_R37_VERSION,
  themes:approved,provisional:{points:[{date:'2026-11-16',
   scores:{...Object.fromEntries(approved.map(t=>[t.theme,71])),
    '우주·위성':31,'데이터센터·전력':62}}]}};
 const baseline=structuredClone(base);
 const db=deniedDb();
 const result=await addVerifiedNineR88(db,base);
 assert.equal(db.reads,0);
 assert.deepEqual(base,baseline);
 assert.strictEqual(result.themes,base.themes);
 assert.equal(result.r32ProvisionalReaderVersion,R88_VERSION);
 assert.equal(result.r32ProvisionalStatus,'UNAVAILABLE');
 assert.equal(result.r32ProvisionalReason,MARKETPARQUET_REMOVED_CODE);
 for(const t of approved)
  assert.equal(Object.hasOwn(result.provisional.points[0].scores,t.theme),false);
 assert.equal(result.provisional.points[0].scores['우주·위성'],31);
 assert.equal(result.provisional.points[0].scores['데이터센터·전력'],62);
});
test('removed optional provisional overlays return identical confirmed base without D1 read',async()=>{
 const base=Object.freeze({status:'READY',themes:Object.freeze([
  {theme:'바이오·신약',score:50},{theme:'데이터센터·전력',score:40},
  {theme:'우주·위성',score:30}])});
 for(const attach of [addVerifiedBiotechProvisionalR1,
  addVerifiedDcPowerProvisionalR1,addVerifiedSpaceProvisionalR1]){
  const db=deniedDb();
  assert.strictEqual(await attach(db,base),base);
  assert.equal(db.reads,0);
 }
});
