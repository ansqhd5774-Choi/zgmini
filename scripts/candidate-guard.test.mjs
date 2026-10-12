import test from 'node:test';
import assert from 'node:assert/strict';
import {readOnlyDatabase,candidateWorker} from '../worker/candidate-guard.mjs';
import {candidateImportBoundary} from './candidate-import-boundary.mjs';
import {readPublicFeed} from '../worker/public-feed-store.mjs';
import {marketOperationalStore as candidateMarketStore,readStoredMarketInputs as candidateReadStoredMarketInputs} from '../worker/candidate-market-operational-store.mjs';
test('real stored public feed reader works through SELECT-only boundary',async()=>{
 let reads=0;const now=Date.now();
 const db=readOnlyDatabase({prepare(sql){assert.match(sql,/^SELECT /);return {bind(){return this;},async first(){reads++;return {body:JSON.stringify({score:51}),stored_at:now};}};}});
 const r=await readPublicFeed(db,'core-pce',{now});
 assert.equal(r.status,200);assert.equal(r.headers.get('x-data-source'),'STORED');assert.equal((await r.json()).score,51);assert.equal(reads,1);
});
test('mutation and internal GET fail closed before handler',async()=>{
 let calls=0;const w=candidateWorker({fetch(){calls++;return new Response('ok');}});
 for(const method of ['POST','PUT','PATCH','DELETE']) assert.equal((await w.fetch(new Request('https://candidate/api/market-score',{method}),{},{})).status,403);
 for(const p of ['/api/internal/market-refresh','/api/%69nternal/market-refresh','/api/favorites','/signin-with-chatgpt']) assert.equal((await w.fetch(new Request('https://candidate'+p),{},{})).status,403);
 assert.equal(calls,0);assert.equal(w.scheduled,undefined);
});
test('public GET maintained and spoofed identity removed',async()=>{
 const w=candidateWorker({fetch(r,e){assert.equal(r.headers.get('oai-authenticated-user-id'),null);assert.equal(e.SECRET,undefined);return new Response('public');}});
 for(const p of ['/','/api/market-score','/api/recession-detail','/recession-detail','/flags/us.svg']) assert.equal((await w.fetch(new Request('https://candidate'+p,{headers:{'oai-authenticated-user-id':'spoof'}}),{SECRET:'fixture'},{})).status,200);
});
test('no native DB write call can escape wrapper',async()=>{
 let writes=0;const stmt={bind(){return this},first(){return {score:50}},all(){return []},raw(){return []},run(){writes++}};
 const db=readOnlyDatabase({prepare(){return stmt},exec(){writes++},batch(){writes++}});
 assert.deepEqual(db.prepare('SELECT score FROM snapshot WHERE id=?').bind(1).first(),{score:50});
 for(const sql of ['INSERT INTO x VALUES(1)','CREATE TABLE x(id)','PRAGMA user_version=1','WITH x AS(SELECT 1) DELETE FROM x','SELECT 1; DELETE FROM x','SELECT load_extension(?)','SELECT 1 /* comment */']) assert.throws(()=>db.prepare(sql),/WRITE_DISABLED/);
 for(const f of [()=>db.exec('SELECT 1'),()=>db.batch([]),()=>db.prepare('SELECT 1').run()]) assert.throws(f,/WRITE_DISABLED/);
 assert.equal(writes,0);
});
test('application native env imports mediated; unknown forms stop build',()=>{
 const p=candidateImportBoundary(process.cwd());
 assert.match(p.transform('import {env as e} from "cloudflare:workers";',process.cwd()+'/app/api/x.ts').code,/candidate-env.ts/);
 assert.throws(()=>p.transform('const x=await import("cloudflare:workers")',process.cwd()+'/app/x.ts'),/Unmediated/);
});

test('candidate operational store reads with SELECT only and never initializes schema',async()=>{
 const sqls=[];const now=Date.now();
 const rows={
  score:{body:JSON.stringify({overall:{score:55}}),stored_at:now},
  macro:{body:JSON.stringify({series:{CPI:[{observationDate:'2026-10-01',value:1}]},seriesStoredAt:{CPI:now}}),stored_at:now},
 };
 const db={prepare(sql){
  sqls.push(sql);assert.match(sql,/^SELECT\b/i);
  return {bind(...args){this.args=args;return this;},async all(){return {results:[]};},async first(){
   if(sql.includes('market_public_snapshots_v1'))return rows.score;
   if(sql.includes('market_input_batches_v1')){
    const key=String(this.args?.[0]??'');
    if(key.startsWith('macro:'))return rows.macro;
    return null;
   }
   return null;
  }};
 }};
 const store=candidateMarketStore(db);
 assert.equal((await store.readScore()).body.overall.score,55);
 const inputs=await candidateReadStoredMarketInputs(store,now);
 assert.equal(inputs.series.CPI[0].value,1);
 assert.equal(sqls.some(sql=>/CREATE|INSERT|UPDATE|DELETE|PRAGMA/i.test(sql)),false);
 assert.throws(()=>store.writeScore({},now),/WRITE_DISABLED/);
});
test('candidate import boundary rewrites app operational-store imports only',()=>{
 const p=candidateImportBoundary(process.cwd());
 const source='import {marketOperationalStore} from "../../../worker/market-operational-store.mjs";';
 const out=p.transform(source,process.cwd()+'/app/api/x/route.ts').code;
 assert.match(out,/candidate-market-operational-store\.mjs/);
 assert.doesNotMatch(out,/from ["']\.\.\/\.\.\/\.\.\/worker\/market-operational-store\.mjs["']/);
});
