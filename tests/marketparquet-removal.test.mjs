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
