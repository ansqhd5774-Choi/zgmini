import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {MARKETPARQUET_REMOVED_CODE as code} from '../lib/marketparquet-retirement.mjs';
import {createQuotaFetch} from '../scripts/pc-writer/quota-fetch.mjs';
import {policyForProvider,providerForUrl} from '../scripts/pc-writer/quota-policy.mjs';
import {collectBreadthB1R3ToStore} from '../lib/market-score/breadth-b1-r3-collector.mjs';
import {fetchMarketParquetLatestPairs,fetchMarketParquetDateSnapshot,previousMarketSession} from '../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {readFullMarketPublicCurrent} from '../lib/market-breadth/us-marketparquet-confirmed-reader-r2.mjs';
import {readFullMarketPercentHistory} from '../lib/market-breadth/us-marketparquet-confirmed-history-percent-r32.mjs';
import {addVerifiedBiotechProvisionalR1} from '../worker/theme-biotech-provisional-r1.mjs';
import {addVerifiedDcPowerProvisionalR1} from '../worker/theme-data-center-power-provisional-r1.mjs';
import {addVerifiedSpaceProvisionalR1} from '../worker/theme-space-satellite-provisional-r1.mjs';
import {validConfiguredProvisional} from '../worker/theme-configured-r32-contract.mjs';
import {validThemeEtfProvisional} from '../lib/market-score/theme-etf-provisional.mjs';
import {projectV9PublicDomain,overlayV9PublicScore} from '../worker/breadth-v9-public-view.mjs';
import {projectV11PublicDomain,overlayV11PublicScore} from '../worker/breadth-v11-public-view.mjs';

for(const mode of ['observe','enforce'])test(`retired host denied before fetch and ledger writes in ${mode}`,async()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-retired-fetch-'));
 try{
  let calls=0;const guard=createQuotaFetch({base,mode,originalFetch:async()=>{calls++;return new Response('{}');}});
  for(const host of ['marketparquet.com','api.marketparquet.com','cdn.marketparquet.com']){
   assert.equal(providerForUrl(`https://${host}/data`),'MARKETPARQUET');
   await assert.rejects(()=>guard.fetch(`https://${host}/data`),{code});
  }
  assert.equal(calls,0);assert.deepEqual(fs.readdirSync(base),[]);
  assert.equal(policyForProvider('MARKETPARQUET'),null);
  await guard.fetch('https://getmarkethistory.com/example');assert.equal(calls,1);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

for(const [name,fn] of Object.entries({fetchMarketParquetLatestPairs,fetchMarketParquetDateSnapshot}))
 test(`${name} has no network implementation`,async()=>{
  let calls=0;await assert.rejects(()=>fn({fetchImpl:()=>{calls++;throw Error('NETWORK');}}),{code});assert.equal(calls,0);
 });
test('retired collector cannot acquire storage, fetch or silently use another source',async()=>{
 const forbidden=()=>{throw Error('UNAUTHORIZED_EFFECT');};
 const result=await collectBreadthB1R3ToStore({store:new Proxy({},{get:forbidden}),universeFetcher:forbidden,recoveryFetcher:forbidden,catalogueFetcher:forbidden,pairFetcher:forbidden});
 assert.equal(result.status,'UNAVAILABLE');assert.equal(result.code,code);assert.equal(result.providerRequests,0);assert.equal(result.dbWrites,0);
});

for(const [name,fn] of Object.entries({readFullMarketPublicCurrent,readFullMarketPercentHistory}))
 test(`${name} does not read or expose the retired snapshot`,async()=>{
  let reads=0;const result=await fn(()=>{reads++;throw Error('DB');});
  assert.equal(reads,0);assert.equal(result.ok,false);assert.equal(result.httpStatus,503);assert.equal(result.reason,code);
 });
for(const [name,fn] of Object.entries({addVerifiedBiotechProvisionalR1,addVerifiedDcPowerProvisionalR1,addVerifiedSpaceProvisionalR1}))
 test(`${name} preserves confirmed data without querying the retired sidecar`,async()=>{
  const base=Object.freeze({status:'READY',themes:Object.freeze([{theme:'CONFIRMED',score:50}])});
  const db={prepare(){throw Error('DB_READ_NOT_ALLOWED');}};
  assert.equal(await fn(db,base),base);
 });
test('retired breadth overlays do not replace independent domains',()=>{
 const base={status:'SUCCESS',domains:[{id:'breadth',score:41},{id:'other',score:72}]};
 assert.equal(projectV9PublicDomain({}),null);assert.equal(projectV11PublicDomain({}),null);
 assert.equal(overlayV9PublicScore(base,{}),base);assert.equal(overlayV11PublicScore(base,{}),base);
});
test('old public approval flags cannot restore MarketParquet provisional',()=>{
 const record={phase:'PROVISIONAL',sourceName:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED',
  publicationAuthorized:true,upstreamCommercialRightsVerified:true,derivedLicenseVerified:true};
 assert.equal(validConfiguredProvisional(record),false);
 assert.equal(validThemeEtfProvisional(record,'2026-11-13'),false);
});
for(const [file,names] of [
 ['theme-ai-marketparquet-provisional-r2.mjs',['buildAiProvisionalFromExistingSeven']],
 ['theme-biotech-provisional-r8.mjs',['readVerifiedMarketParquetBiotech','buildBiotechProvisionalFromStorageR8']],
 ['theme-data-center-power-provisional-r8.mjs',['readDcParquetR8','buildDcProvisionalFromStorageR8']],
 ['theme-space-satellite-provisional-r8.mjs',['readSpaceParquetR8','buildSpaceProvisionalFromStorageR8']],
])test(`${file} removed provisional implementation cannot read files or calculate`,async()=>{
 const module=await import(`../scripts/pc-writer/${file}`);
 for(const name of names)assert.throws(()=>module[name](),{code});
});
test('registry has no MarketParquet task or old mixed-source publisher requirement',()=>{
 const registry=JSON.parse(fs.readFileSync(new URL('../config/theme-data-registry.json',import.meta.url)));
 assert.deepEqual(registry.providerPolicy.removedProviders,['MARKETPARQUET']);
 for(const theme of registry.themes){
  assert.ok(!(theme.tasks??[]).some(x=>/marketparquet/i.test(x)));
  assert.ok(!theme.runtime?.publisher?.endsWith('/r171-publish.mjs'));
 }
});
test('calendar remains independently reusable',()=>{
 assert.equal(previousMarketSession('2026-11-16'),'2026-11-13');
});

for(const [file,name] of [
 ['../lib/market-score/breadth-b1-r3-history-r4.mjs','collectBreadthB1R3HistoricalBatchR4'],
 ['../lib/market-score/breadth-b1-r3-history-ingest-r1.mjs','ingestBreadthB1R3HistoricalPayloadR1'],
 ['../lib/market-score/breadth-b1-r3-history-score-r4.mjs','readBreadthB1R3StoredHistoricalScoreR4'],
 ['../lib/market-score/breadth-b1-r3-history-score-r4.mjs','materializeBreadthB1R3StoredHistoricalScoresR4'],
 ['../scripts/pc-writer/breadth-v11-publication.mjs','publishV11'],
 ['../scripts/pc-writer/breadth-r10-v9-publication.mjs','publishRecord'],
 ['../scripts/pc-writer/theme-biotech-auto-r8.mjs','runBiotechR8'],
 ['../scripts/pc-writer/theme-data-center-power-auto-r8.mjs','runDcPowerR8'],
 ['../scripts/pc-writer/theme-space-satellite-auto-r8.mjs','runSpaceR8'],
])test(`${name} cannot ingest, calculate stored outputs or publish retired inputs`,async()=>{
 const module=await import(file);let effects=0;
 const forbidden=new Proxy({},{get(){effects++;throw Error('IO');}});
 await assert.rejects(()=>module[name]({db:forbidden,remote:forbidden,store:forbidden}),{code});
 assert.equal(effects,0);
});
test('retired biotech D1 adapter cannot create an authenticated writer',async()=>{
 const {biotechProvisionalD1R8}=await import('../scripts/pc-writer/theme-biotech-provisional-d1-r8.mjs');
 let calls=0;assert.throws(()=>biotechProvisionalD1R8({tokenFn(){calls++;},fetchImpl(){calls++;}}),{code});
 assert.equal(calls,0);
});
test('mixed sector benchmark cannot reuse the retired repair price',async()=>{
 const {loadSectorFearGreedR3RollingInputs}=await import('../scripts/pc-writer/sector-fear-greed-r3-rolling-local.mjs');
 assert.throws(()=>loadSectorFearGreedR3RollingInputs('MUST_NOT_READ'),{code});
});


test('retired stored breadth cannot leak through market-score JSON or NDJSON',async()=>{
 const {maskRetiredMarketPublicSnapshot,storedMarketResponse}=await import('../worker/market-operational-store.mjs');
 const now=Date.parse('2026-11-18T06:00:00Z');
 const unaffected={id:'rates',name:'금리',weight:10,score:61,status:'READY',trend:[{label:'2026-11-17',value:60}],indicators:[{id:'rates-1',source:'FRED'}]};
 const retired={id:'breadth',name:'수급·폭',weight:8,score:42,status:'READY',trend:[{label:'2026-11-17',value:43}],indicators:[{id:'breadth-41',source:'MarketParquet Free Sample',value:29}],previousObservation:{score:40}};
 const stored={status:'SUCCESS',modelVersion:'CM-R1',asOfDate:'2026-11-18',
  domains:[unaffected,retired],
  overall:{score:45,status:'READY',trend:[{label:'2026-11-17',value:44}]},
  dataQuality:{readyDomains:2,totalDomains:2,missingDomains:[],partialDomains:[],coverageWeight:18,overallComputable:true,reweighted:false},
  diagnostics8:{liquidity:{status:'READY',score:55}},
 };
 const masked=maskRetiredMarketPublicSnapshot(stored);
 assert.equal(masked.domains[0],unaffected);
 assert.deepEqual(masked.domains[1].indicators,[]);
 assert.deepEqual(masked.domains[1].trend,[]);
 assert.equal(masked.domains[1].score,null);
 assert.equal(masked.domains[1].status,'UNAVAILABLE');
 assert.equal(masked.domains[1].state,code);
 assert.equal(masked.overall.score,null);
 assert.equal(masked.overall.status,'PARTIAL');
 assert.deepEqual(masked.overall.trend,[]);
 assert.equal(masked.dataQuality.coverageWeight,10);
 assert.equal(masked.dataQuality.overallComputable,false);
 assert.deepEqual(masked.dataQuality.missingDomains,['breadth']);
 assert.equal(JSON.stringify(masked).includes('MarketParquet Free Sample'),false);
 assert.equal(stored.domains[1].score,42); // no D1/body mutation
 const store={readScore:async()=>({body:stored,storedAt:now})};
 for(const accept of ['application/json','application/x-ndjson']){
  const response=await storedMarketResponse(new Request('https://zgmini.kr/api/market-score',{headers:{accept}}),{store,now});
  assert.equal(response.status,200);
  const payload=await response.text();
  assert.equal(payload.includes('MarketParquet Free Sample'),false);
  const json=JSON.parse(payload);
  const body=accept==='application/x-ndjson'?json.body:json;
  assert.equal(body.domains[0].score,61);
  assert.equal(body.domains[1].score,null);
  assert.equal(body.overall.score,null);
  assert.deepEqual(body.overall.trend,[]);
 }
});
test('clean market score is unchanged and unexpected retired source fails closed',async()=>{
 const {maskRetiredMarketPublicSnapshot,storedMarketResponse}=await import('../worker/market-operational-store.mjs');
 const clean={status:'SUCCESS',domains:[{id:'rates',status:'READY',score:51,source:'FRED'}],overall:{score:51,status:'READY',trend:[]}};
 assert.equal(maskRetiredMarketPublicSnapshot(clean),clean);
 const contaminated={...clean,source:'MarketParquet Free Sample'};
 assert.equal(maskRetiredMarketPublicSnapshot(contaminated),null);
 const now=Date.parse('2026-11-18T06:00:00Z');
 const response=await storedMarketResponse(new Request('https://zgmini.kr/api/market-score'),{store:{readScore:async()=>({body:contaminated,storedAt:now})},now});
 assert.equal(response.status,503);
 assert.equal((await response.json()).reason,code);
});

test('candidate production import boundary must mask retired breadth on JSON and NDJSON',async()=>{
 const {candidate2dbImportBoundary}=await import('../scripts/candidate-2db-import-boundary.mjs');
 const routePath=path.resolve('app/api/market-score/route.ts');
 const appRoute=fs.readFileSync(routePath,'utf8');
 const transformed=candidate2dbImportBoundary(process.cwd()).transform(appRoute,routePath);
 assert.match(transformed?.code??'',/candidate-market-operational-store\.mjs/);
 const ordinary=await import('../worker/market-operational-store.mjs');
 const candidate=await import('../worker/candidate-market-operational-store.mjs');
 const now=Date.parse('2026-11-18T06:00:00Z');
 const kept={id:'rates',name:'Rates',weight:10,score:61,status:'READY',
  trend:[{label:'2026-11-17',value:60}],indicators:[{id:'rates-1',source:'FRED'}]};
 const removed={id:'breadth',name:'Breadth',weight:8,score:42,status:'READY',
  trend:[{label:'2026-11-17',value:44}],
  indicators:[{id:'breadth-41',source:'MarketParquet Free Sample',value:29}]};
 const stored={status:'SUCCESS',domains:[kept,removed],
  overall:{score:45,status:'READY',trend:[{label:'2026-11-17',value:45}]},
  dataQuality:{readyDomains:2,totalDomains:2,coverageWeight:18,overallComputable:true,reweighted:false}};
 const original=JSON.stringify(stored);
 let reads=0;
 const store={readScore:async()=>{reads++;return {body:stored,storedAt:now}}};
 for(const reader of [ordinary,candidate]){
  for(const accept of ['application/json','application/x-ndjson']){
   const response=await reader.storedMarketResponse(
    new Request('https://zgmini.kr/api/market-score',{headers:{accept}}),{store,now});
   assert.equal(response.status,200);
   const raw=await response.text();
   assert.equal(raw.includes('MarketParquet'),false);
   const json=JSON.parse(raw);
   const body=accept==='application/x-ndjson'?json.body:json;
   assert.equal(body.domains[0].score,61);
   assert.equal(body.domains[1].score,null);
   assert.equal(body.domains[1].status,'UNAVAILABLE');
   assert.deepEqual(body.domains[1].trend,[]);
   assert.deepEqual(body.domains[1].indicators,[]);
   assert.equal(body.overall.score,null);
   assert.equal(body.overall.status,'PARTIAL');
   assert.deepEqual(body.overall.trend,[]);
   assert.equal(body.dataQuality.coverageWeight,10);
   assert.equal(body.dataQuality.overallComputable,false);
  }
  const other={...stored,source:'MarketParquet Free Sample'};
  const fail=await reader.storedMarketResponse(
   new Request('https://zgmini.kr/api/market-score'),
   {store:{readScore:async()=>({body:other,storedAt:now})},now});
  assert.equal(fail.status,503);
  const error=await fail.json();
  assert.equal(error.reason,code);
  assert.equal(JSON.stringify(error).includes('MarketParquet Free Sample'),false);
 }
 assert.equal(reads,4);
 assert.equal(JSON.stringify(stored),original,'no stored D1 body mutation');
});
