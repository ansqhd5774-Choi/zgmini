import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {marketOperationalStore,readStoredMarketInputs,storedMarketResponse} from '../worker/candidate-market-operational-store.mjs';
import {readOnlyDatabase} from '../worker/candidate-guard.mjs';
import {candidateImportBoundary} from './candidate-import-boundary.mjs';
const now=Date.UTC(2026,9,2,12),ttl=36*3600000,traces=[];
const body=(x,at=now,compressed=false)=>({body:compressed?'gzip:'+gzipSync(JSON.stringify(x)).toString('base64'):JSON.stringify(x),stored_at:at});
const snapshot={overall:{score:55,status:'AVAILABLE',trend:[1,2]},domains:[{id:'credit',score:60}],dataQuality:{overallComputable:true,reweighted:false}};
function fixture(score=body(snapshot)) {
 const rows={macro:body({series:{CPI:[{observationDate:'2026-10-01',value:1}]},seriesStoredAt:{CPI:now},providerSummary:{macro:'STORED'}},now,true),
 credit:body({external:{credit:3},providerSummary:{credit:'STORED'}}),supply:body({external:{expired:9}},now-ttl),
 fundFlows:body({external:{future:4}},now+1),rates:body({external:{rate:2}})};
 const prior=body({series:{PAYEMS:[{observationDate:'2026-09-01',value:2}],STALE:[{value:99}]},seriesStoredAt:{PAYEMS:now-1000,STALE:now-ttl}},now-1000,true);
 return marketOperationalStore(readOnlyDatabase({prepare(sql){
  assert.match(sql,/^SELECT\b/i);assert.doesNotMatch(sql,/\b(?:CREATE|INSERT|UPDATE|DELETE|REPLACE|ALTER|DROP|PRAGMA|VACUUM)\b/i);
  const trace={sql,args:[]};traces.push(trace);
  return {bind(...args){trace.args=args;return this},async first(){return sql.includes('market_public_snapshots_v1')?score:sql.includes('stored_at <')?prior:rows[String(trace.args[0]).split(':')[0]]??null},run(){throw Error('Fixture native write attempted')}};
 }}));
}
test('all actual reader contracts preserve compressed/prior macro and TTL using SELECT only',async()=>{
 const store=fixture(),start=traces.length;await store.initialize();assert.equal(traces.length,start);
 assert.deepEqual((await store.readScore()).body,snapshot);
 const macro=await store.readInput('macro');assert.equal(macro.body.series.CPI[0].value,1);assert.equal(macro.body.series.PAYEMS[0].value,2);assert.equal(macro.body.series.STALE,undefined);
 const inputs=await readStoredMarketInputs(store,now);assert.deepEqual(inputs.external,{credit:3,rate:2});assert.equal(inputs.series.PAYEMS[0].value,2);
 const r=await storedMarketResponse(new Request('https://candidate.invalid/api/market-score'),{store,now});assert.equal(r.status,200);assert.deepEqual(await r.json(),snapshot);assert.equal(r.headers.get('x-market-cache'),'STORED');
});
test('stored response preserves NDJSON, stale/missing/future and method contracts',async()=>{
 const r=await storedMarketResponse(new Request('https://candidate.invalid/api/market-score',{headers:{accept:'application/x-ndjson'}}),{store:fixture(),now});assert.equal(r.status,200);assert.deepEqual(JSON.parse(await r.text()).body,snapshot);
 for(const [row,reason] of [[null,'STORED_SCORE_PENDING'],[body(snapshot,now-30*60000),'STORED_SCORE_STALE'],[body(snapshot,now+1),'STORED_SCORE_STALE']]){const r=await storedMarketResponse(new Request('https://candidate.invalid/api/market-score'),{store:fixture(row),now});assert.equal(r.status,503);assert.equal((await r.json()).reason,reason);}
 const start=traces.length,r2=await storedMarketResponse(new Request('https://candidate.invalid/api/market-score',{method:'POST'}),{store:fixture(),now});assert.equal(r2.status,405);assert.equal(traces.length,start);
});
test('every candidate write method fails closed before SQL',()=>{
 const store=fixture(),start=traces.length;for(const method of ['writeInput','writeScore','claim','next','finish'])assert.throws(()=>store[method]('macro',{},now),/^Error: CANDIDATE_WRITE_DISABLED$/);assert.equal(traces.length,start);
});
test('actual public app imports use adapter; Production worker imports remain unchanged',()=>{
 const plugin=candidateImportBoundary(process.cwd()),files=[];
 const visit=dir=>{for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())visit(f);else if(/\.[cm]?[jt]sx?$/.test(f))files.push(f)}};visit('app');
 const imports=files.filter(f=>readFileSync(f,'utf8').includes('worker/market-operational-store.mjs'));assert.equal(imports.length,8);
 for(const f of imports){const transformed=plugin.transform(readFileSync(f,'utf8'),path.resolve(f));assert.ok(transformed);assert.match(transformed.code,/candidate-market-operational-store\.mjs/);assert.doesNotMatch(transformed.code,/from\s*['"](?:\.\.\/)+worker\/market-operational-store\.mjs/);}
 assert.equal(plugin.transform("import {marketOperationalStore} from './market-operational-store.mjs';",path.resolve('worker/market-operational-refresh.mjs')),null);
 const configs=['vite.config.ts'].filter(f=>{try{readFileSync(f);return true}catch{return false}});for(const f of configs)assert.doesNotMatch(readFileSync(f,'utf8'),/candidateImportBoundary|candidate-market-operational-store/);
});
test('persist sanitized mock SQL trace',()=>{
 assert.ok(traces.length>10);mkdirSync('docs/migration/r8',{recursive:true});writeFileSync('docs/migration/r8/sql-trace.json',JSON.stringify({fixture:true,real_D1:false,select_only:true,traces},null,2));
});
