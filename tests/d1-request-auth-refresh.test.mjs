import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {client,credential} from '../scripts/pc-writer/d1.mjs';
const config={account:'a'.repeat(32),core:'b'.repeat(36),history:'c'.repeat(36)};
const ok=()=>Response.json({success:true,result:[{success:true,results:[{score:0}],meta:{rows_read:1,rows_written:0}}]});
test('request-time credential resolves expiry during a run using the official refresher',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'d1-auth-')),file=path.join(dir,'fixture.toml');let clock=1000,refreshes=0;
 const write=(token,expiry)=>fs.writeFileSync(file,`oauth_token = "${token}"\nexpiration_time = "${new Date(expiry).toISOString()}"`);
 const options={apiToken:null,file,now:()=>clock,refresh:()=>{refreshes++;write('renewed',100000);return {status:0};}};
 try{write('original',10000);assert.equal(credential('fixture',options),'original');assert.equal(refreshes,0);clock=10000;assert.equal(credential('fixture',options),'renewed');assert.equal(refreshes,1);
  clock=100000;options.refresh=()=>({status:0});assert.throws(()=>credential('fixture',options),/WRANGLER_LOGIN_REQUIRED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('a token 400ms from expiry waits then refreshes before any write dispatch',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'d1-auth-boundary-')),file=path.join(dir,'fixture.toml');let clock=1000,refreshes=0;const waits=[];
 const write=(token,expiry)=>fs.writeFileSync(file,`oauth_token = "${token}"\nexpiration_time = "${new Date(expiry).toISOString()}"`);
 const options={apiToken:null,file,now:()=>clock,sleep:ms=>{waits.push(ms);clock+=ms;},refresh:()=>{refreshes++;write('renewed',100000);return{status:0};}};
 try{write('near-expiry',1400);let requests=0;const c=client(config,()=>credential('fixture',options),{fetchImpl:async(_url,init)=>{requests++;assert.equal(init.headers.Authorization,'Bearer renewed');return ok();}});
  await c.request(config.core,[{sql:'UPDATE x SET score=0',params:[]}]);assert.deepEqual(waits,[401]);assert.equal(refreshes,1);assert.equal(requests,1);
  write('still-near',clock+200);assert.throws(()=>credential('fixture',{...options,sleep:()=>{}}),/EXPIRY_BOUNDARY_NOT_PASSED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('a concurrent official renewal during the boundary wait is reused without another refresh',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'d1-auth-concurrent-')),file=path.join(dir,'fixture.toml');let clock=1000;
 const write=(token,expiry)=>fs.writeFileSync(file,`oauth_token = "${token}"\nexpiration_time = "${new Date(expiry).toISOString()}"`);
 try{write('old',1400);assert.equal(credential('fixture',{apiToken:null,file,now:()=>clock,sleep:ms=>{clock+=ms;write('other-renewed',100000);},refresh:()=>assert.fail('renewed file must be reused')}),'other-renewed');}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('timed-out CLI is reconciled against a valid renewed file; stale file still blocks',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'d1-auth-readback-')),file=path.join(dir,'fixture.toml');
 const write=(token,expiry)=>fs.writeFileSync(file,`oauth_token = "${token}"\nexpiration_time = "${new Date(expiry).toISOString()}"`);
 const timeout={status:null,error:{code:'ETIMEDOUT'}},options={apiToken:null,file,now:()=>2000,refresh:()=>{write('renewed',100000);return timeout;}};
 try{write('old',1000);assert.equal(credential('fixture',options),'renewed');write('old',1000);options.refresh=()=>timeout;assert.throws(()=>credential('fixture',options),e=>e.message==='WRANGLER_AUTH_REFRESH_TIMEOUT'&&e.diagnosticAuth.authRefresh==='FAILED');write('',100000);options.refresh=()=>({status:0});assert.throws(()=>credential('fixture',options),/WRANGLER_LOGIN_REQUIRED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('credentials are resolved for each request in a long publication',async()=>{
 let current='first';const seen=[];const c=client(config,()=>current,{fetchImpl:async(_url,init)=>{seen.push(init.headers.Authorization);return ok();}});
 await c.query(config.core,'SELECT 1');current='renewed';await c.query(config.core,'SELECT 2');assert.deepEqual(seen,['Bearer first','Bearer renewed']);
});
for(const status of [401,403])test('read rejection at expiry retries once with a changed credential: '+status,async()=>{
 let current='old',calls=0;const seen=[];const c=client(config,()=>current,{sleep:async()=>{},fetchImpl:async(_url,init)=>{seen.push(init.headers.Authorization);if(++calls===1){current='new';return new Response('',{status});}return ok();}});
 assert.equal((await c.query(config.core,'SELECT 0')).results[0].score,0);assert.deepEqual(seen,['Bearer old','Bearer new']);assert.equal(c.stats.authReadRetries,1);assert.equal(c.stats.readFailures,0);assert(!JSON.stringify(c.stats).includes('Bearer'));
});
test('unchanged rejected credentials are not retried; a mutation is never replayed',async()=>{
 for(const sql of ['SELECT 1','UPDATE x SET score=0']){let calls=0;const c=client(config,()=> 'same',{sleep:async()=>assert.fail(),fetchImpl:async()=>{calls++;return new Response('',{status:403});}});await assert.rejects(sql.startsWith('SELECT')?c.query(config.core,sql):c.request(config.core,[{sql,params:[]}]),/D1_HTTP_403/);assert.equal(calls,1);assert.equal(c.stats.authReadRetries,0);}
});
test('a second rejection after renewal stops without another request',async()=>{
 let current=0,calls=0;const c=client(config,()=>String(current),{sleep:async()=>{},fetchImpl:async()=>{calls++;current++;return new Response('',{status:403});}});await assert.rejects(c.query(config.core,'SELECT 1'),/D1_HTTP_403/);assert.equal(calls,2);assert.equal(c.stats.authReadRetries,1);
});
