import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  collectRateR2Inputs,
  parseNyFedEffr,
  parseH15DdpCsv,
  RATE_R2_PROVIDER_CONTRACT,
} from '../lib/market-score/rate-r2-provider.mjs';

const asOf='2026-09-23';

test('provider contract uses approved official publication transports and no secrets',()=>{
  assert.equal(RATE_R2_PROVIDER_CONTRACT.sourcePolicy,'OFFICIAL_PUBLICATION_DIRECT');
  assert.equal(RATE_R2_PROVIDER_CONTRACT.nyFedTransport,'NYFED_MARKETS_API');
  assert.equal(RATE_R2_PROVIDER_CONTRACT.treasuryTransport,'FED_BOARD_H15_DDP_CSV');
  assert.equal(RATE_R2_PROVIDER_CONTRACT.secretsRequired,false);
});

test('H15 DDP parser locates Time Period row and exact series IDs',()=>{
  const csv=`Series Description,Three-month,Two-year,Ten-year
Unit:,Percent:_Per_Year,Percent:_Per_Year,Percent:_Per_Year
Multiplier:,1,1,1
Currency:,NA,NA,NA
Unique Identifier:,H15/H15/RIFLGFCM03_N.B,H15/H15/RIFLGFCY02_N.B,H15/H15/RIFLGFCY10_N.B
Time Period,RIFLGFCM03_N.B,RIFLGFCY02_N.B,RIFLGFCY10_N.B
2026-09-18,4.14,4.76,5.01
2026-09-21,4.17,4.76,4.96
`;
  const out=parseH15DdpCsv(csv,asOf,{
    DGS3MO:'RIFLGFCM03_N.B',
    DGS2:'RIFLGFCY02_N.B',
    DGS10:'RIFLGFCY10_N.B',
  });
  assert.deepEqual(out.DGS3MO.at(-1),{observationDate:'2026-09-21',value:4.17});
  assert.deepEqual(out.DGS2.at(-1),{observationDate:'2026-09-21',value:4.76});
  assert.deepEqual(out.DGS10.at(-1),{observationDate:'2026-09-21',value:4.96});
});

test('H15 DDP parser handles inflation-indexed real 10Y and ND',()=>{
  const csv=`Series Description,10Y nominal,10Y real
Unit:,Percent:_Per_Year,Percent:_Per_Year
Unique Identifier:,H15/H15/RIFLGFCY10_N.B,H15/H15/RIFLGFCY10_XII_N.B
Time Period,RIFLGFCY10_N.B,RIFLGFCY10_XII_N.B
2026-09-18,5.01,2.68
2026-09-21,4.96,2.62
2026-09-22,ND,ND
`;
  const out=parseH15DdpCsv(csv,asOf,{DFII10:'RIFLGFCY10_XII_N.B'});
  assert.deepEqual(out.DFII10.at(-1),{observationDate:'2026-09-21',value:2.62});
});

test('NY Fed EFFR parser preserves target range endpoints',()=>{
  const out=parseNyFedEffr({refRates:[
    {effectiveDate:'2026-09-21',type:'EFFR',percentRate:3.88,targetRateFrom:3.75,targetRateTo:4.00},
    {effectiveDate:'2026-09-22',type:'OBFR',percentRate:3.89},
  ]},asOf);
  assert.deepEqual(out.EFFR,[{observationDate:'2026-09-21',value:3.88}]);
  assert.deepEqual(out.DFEDTARL,[{observationDate:'2026-09-21',value:3.75}]);
  assert.deepEqual(out.DFEDTARU,[{observationDate:'2026-09-21',value:4}]);
});

test('collector isolates RATE_R2 official-publication series from shared diagnostic base',async()=>{
  const nominal=`Series Description,3M,2Y,10Y
Unit:,Percent:_Per_Year,Percent:_Per_Year,Percent:_Per_Year
Unique Identifier:,H15/H15/RIFLGFCM03_N.B,H15/H15/RIFLGFCY02_N.B,H15/H15/RIFLGFCY10_N.B
Time Period,RIFLGFCM03_N.B,RIFLGFCY02_N.B,RIFLGFCY10_N.B
2026-09-18,4.14,4.76,5.01
2026-09-21,4.17,4.76,4.96
`;
  const real=`Series Description,10Y real
Unit:,Percent:_Per_Year
Unique Identifier:,H15/H15/RIFLGFCY10_XII_N.B
Time Period,RIFLGFCY10_XII_N.B
2026-09-18,2.68
2026-09-21,2.62
`;
  const effr=JSON.stringify({refRates:[
    {effectiveDate:'2026-09-21',type:'EFFR',percentRate:3.88,targetRateFrom:3.75,targetRateTo:4.00}
  ]});
  const fetchImpl=async input=>{
    const u=String(input);
    if(u.includes('markets.newyorkfed.org'))return new Response(effr,{status:200});
    if(u.includes('series=0b98a66d3ff5e1ea0fbf88adc59b387f'))return new Response(real,{status:200});
    return new Response(nominal,{status:200});
  };
  const base={series:{DGS2:[{observationDate:'1900-01-01',value:99}]},providerSummary:{base:true}};
  const out=await collectRateR2Inputs({base,asOf,fetchImpl});
  assert.equal(out.rateR2.status,'READY');
  assert.deepEqual(out.series,base.series);
  assert.equal(out.rateR2.series.DGS2.at(-1).value,4.76);
  assert.equal(out.rateR2.series.DFII10.at(-1).value,2.62);
  assert.equal(out.rateR2.series.EFFR.at(-1).value,3.88);
  assert.equal(out.rateR2.series.DFEDTARL.at(-1).value,3.75);
  assert.equal(out.providerSummary.rateR2.sourcePolicy,'OFFICIAL_PUBLICATION_DIRECT');
});

test('provider failure is partial and never falls back to shared rate series',async()=>{
  const fetchImpl=async()=>new Response('fail',{status:503});
  const base={series:{DGS2:[{observationDate:'2026-09-21',value:99}],DGS10:[{observationDate:'2026-09-21',value:99}]}};
  const out=await collectRateR2Inputs({base,asOf,fetchImpl});
  assert.equal(out.rateR2.status,'PARTIAL');
  assert.equal(out.rateR2.series.DGS2,undefined);
  assert.ok(out.rateR2.missing.includes('DGS2'));
  assert.equal(out.rateR2.failures.length,3);
});

test('NY Fed missing endpoints never become zero; true zero remains available',()=>{
  const parsed=parseNyFedEffr({refRates:[
    {effectiveDate:'2026-09-21',type:'EFFR',percentRate:0,targetRateFrom:0,targetRateTo:0.25},
    {effectiveDate:'2026-09-22',type:'EFFR',percentRate:null,targetRateFrom:'',targetRateTo:null},
  ]},asOf);
  assert.deepEqual(parsed.EFFR,[{observationDate:'2026-09-21',value:0}]);
  assert.deepEqual(parsed.DFEDTARL,[{observationDate:'2026-09-21',value:0}]);
  assert.deepEqual(parsed.DFEDTARU,[{observationDate:'2026-09-21',value:0.25}]);
});

test('a successful EFFR transport without target endpoints is not complete rate input',async()=>{
 const nominal='Time Period,RIFLGFCM03_N.B,RIFLGFCY02_N.B,RIFLGFCY10_N.B\n2026-09-21,4,4,4';
 const real='Time Period,RIFLGFCY10_XII_N.B\n2026-09-21,2';
 const fetchImpl=async input=>String(input).includes('markets.newyorkfed.org')
  ?Response.json({refRates:[{effectiveDate:'2026-09-21',type:'EFFR',percentRate:4}]})
  :new Response(String(input).includes('series=0b98')?real:nominal);
 const out=await collectRateR2Inputs({asOf,fetchImpl});
 assert.equal(out.rateR2.status,'PARTIAL');assert.deepEqual(out.rateR2.missing,['DFEDTARL','DFEDTARU']);
});

test('scheduled RATE_R2 collector preserves the official provider and stored-only score path',async()=>{
  const route=await readFile(new URL('../app/api/market-score/route.ts',import.meta.url),'utf8');
  const scheduled=await readFile(new URL('../worker/market-operational-refresh.mjs',import.meta.url),'utf8');
  assert.match(route,/storedMarketResponse/);
  assert.doesNotMatch(route,/collectRateR2Inputs|collectDiagnosticLiveInputs/);
  assert.match(scheduled,/rates:.*collectRateR2Inputs/);
  assert.match(scheduled,/collectDiagnosticLiveInputs/);
  assert.match(scheduled,/collectInputs:.*readStoredMarketInputs/);
  assert.doesNotMatch(scheduled,/collectMarketScoreRateDetails/);
});
