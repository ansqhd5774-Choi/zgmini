import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {client,credential} from '../scripts/pc-writer/d1.mjs';
const config={account:'a'.repeat(32),core:'b'.repeat(36),history:'c'.repeat(36)};
const ok=()=>Response.json({success:true,result:[{success:true,results:[{score:0}],meta:{rows_read:1,rows_written:0}}]});
test('request-time credential resolves expiry during a run using the official refresher',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'d1-auth-')),file=path.join(dir,'fixture.toml');let clock=1000,refreshes=0;
 const write=(token,expiry)=>fs.writeFileSync(file,`oauth_token = "${token}"\nexpiration_time = "${new Date(expiry).toISOString()}"`);
 const options={apiToken:null,file,now:()=>clock,refresh:()=>{refreshes++;write('renewed',100000);return {status:0};}};
 try{write('original',2000);assert.equal(credential('fixture',options),'original');assert.equal(refreshes,0);clock=2000;assert.equal(credential('fixture',options),'renewed');assert.equal(refreshes,1);
  clock=100000;options.refresh=()=>({status:0});assert.throws(()=>credential('fixture',options),/WRANGLER_LOGIN_REQUIRED/);
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
