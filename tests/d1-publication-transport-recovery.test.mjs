import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {client,save} from '../scripts/pc-writer/d1.mjs';
import {claimMarket,releaseMarket} from '../scripts/pc-writer/publish.mjs';
import {appendPublicationEvent} from '../scripts/pc-writer/publication-guard.mjs';
const config={account:'a'.repeat(32),core:'b'.repeat(36),history:'c'.repeat(36)};
const success=()=>Response.json({success:true,result:[{success:true,results:[{score:0}],meta:{rows_read:1,rows_written:0}}]});
for(const kind of ['network','body','503'])test('bounded SELECT recovery: '+kind,async()=>{
 let n=0;const waits=[];const c=client(config,'fixture-secret',{sleep:async ms=>waits.push(ms),fetchImpl:async()=>{if(++n===1){if(kind==='network')throw Object.assign(Error('sensitive URL'),{cause:{code:'ECONNRESET'}});if(kind==='body')return new Response('{');return new Response('',{status:503});}return success();}});
 const r=await c.query(config.core,'SELECT score FROM x');assert.equal(r.results[0].score,0);assert.equal(n,2);assert.deepEqual(waits,[1000]);assert.equal(c.stats.readRetries,1);assert.equal(c.stats.readFailures,0);assert(!JSON.stringify(c.stats).includes('sensitive'));assert(!JSON.stringify(c.stats).includes('fixture-secret'));
});
test('persistent SELECT failure stops at two; 403, semantic batch failure and long Retry-After are not retried',async()=>{
 for(const kind of ['persistent','403','batch','retry-after']){let n=0;const c=client(config,'fixture',{sleep:async()=>{},fetchImpl:async()=>{n++;if(kind==='persistent')throw Error('private');if(kind==='403')return new Response('',{status:403});if(kind==='retry-after')return new Response('',{status:429,headers:{'retry-after':'60'}});return Response.json({success:true,result:[{success:false}]});}});await assert.rejects(c.query(config.core,'SELECT 1'));assert.equal(n,kind==='persistent'?2:1);assert.equal(c.stats.readFailures,1);}
});
test('a mutation with lost acknowledgement is never blindly replayed',async()=>{
 let n=0;const c=client(config,'fixture',{sleep:async()=>assert.fail(),fetchImpl:async()=>{n++;throw Error('private');}});await assert.rejects(c.request(config.core,[{sql:'UPDATE x SET score=0',params:[]}]),/D1_OUTCOME_UNKNOWN/);assert.equal(n,1);assert.equal(c.stats.transportFailures[0].kind,'WRITE');await assert.rejects(c.query(config.core,'UPDATE x SET score=0'),/READ_ONLY_SQL_REQUIRED/);assert.equal(n,1);
});
for(const outcome of ['applied','not-applied','other-owner','expired'])test('claim lost acknowledgement is reconciled by its unique lease: '+outcome,async()=>{
 let writes=0,reads=0,id;const c={stats:{},async request(_db,batch){writes++;id=batch[0].params[0];throw Error('D1_OUTCOME_UNKNOWN');},async query(){reads++;return {results:outcome==='not-applied'?[]:[{lease_id:outcome==='other-owner'?'other':id,lease_until:outcome==='expired'?Date.now()-1:Date.now()+150000}]};}};
 if(outcome==='applied'){assert.equal(await claimMarket(c,'db'),id);assert.equal(c.stats.leaseClaimRecovered,1);}else await assert.rejects(claimMarket(c,'db'),/D1_OUTCOME_UNKNOWN/);assert.equal(writes,1);assert.equal(reads,1);
});
for(const outcome of ['released','still-held','new-owner'])test('release lost acknowledgement checks ownership, never writes again: '+outcome,async()=>{
 let writes=0;const c={stats:{},async request(){writes++;throw Error('D1_OUTCOME_UNKNOWN');},async query(){return {results:[{lease_id:outcome==='still-held'?'ours':outcome==='new-owner'?'other':null}]};}};
 if(outcome==='still-held')await assert.rejects(releaseMarket(c,'db','ours'),/D1_OUTCOME_UNKNOWN/);else{await releaseMarket(c,'db','ours');assert.equal(c.stats.leaseReleaseRecovered,1);}assert.equal(writes,1);
});
test('failure details survive the next successful report, without raw errors or credentials',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'d1-recovery-'));
 try{save(path.join(dir,'local-writer-last-run.json'),{at:'failed',failures:[{id:'market-publication',reason:'D1_OUTCOME_UNKNOWN'}],remote:{transportFailures:[{kind:'WRITE',phase:'FETCH',httpStatus:null,code:'ECONNRESET',url:'private',token:'secret'}]}});appendPublicationEvent(dir,{at:'failed',status:'VERIFIED_WITH_GAPS'});save(path.join(dir,'local-writer-last-run.json'),{at:'success'});appendPublicationEvent(dir,{at:'success',status:'VERIFIED'});const text=fs.readFileSync(path.join(dir,'publication-events.jsonl'),'utf8'),events=text.trim().split('\n').map(JSON.parse);assert.equal(events[0].failures[0].reason,'D1_OUTCOME_UNKNOWN');assert.equal(events[0].transportFailures[0].code,'ECONNRESET');assert.equal(events[1].failures,undefined);assert(!/private|secret|token/.test(text));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('transport evidence is attached before initial publication recovery can fail',()=>{
 const source=fs.readFileSync(new URL('../scripts/pc-writer/run-local.mjs',import.meta.url),'utf8');
 assert.match(source,/const remote=client\(config,credential\(root\)\);\s*report\.remote=remote\.stats;\s*report\.recovery=await recoverPublication/);
});
