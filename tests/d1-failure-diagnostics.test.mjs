import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {client,credential} from '../scripts/pc-writer/d1.mjs';
import {rememberCredential,appendD1Diagnostic,errorResponseDiagnostic} from '../scripts/pc-writer/d1-diagnostics.mjs';
import {safeTransportFailures} from '../scripts/pc-writer/d1-transient.mjs';
const cfg={account:'a'.repeat(32),core:'b'.repeat(36),history:'c'.repeat(36)},ray='0123456789abcdef-ICN';
test('403 preserves provider code, ray, expiry at failure and immediate immutable record without secrets',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'d1-diagnostic-'));let clock=1000;const token=rememberCredential('fixture-private-token',{authType:'OAUTH',authExpiresAt:new Date(2000).toISOString(),authRefresh:'NOT_NEEDED'});
 const c=client(cfg,token,{now:()=>clock,onDiagnostic:d=>appendD1Diagnostic(dir,{runAt:new Date(1000).toISOString(),source:'a'.repeat(40)},d),fetchImpl:async()=>{clock=3000;return Response.json({success:false,errors:[{code:10000,message:'fixture-private-token person@example.test SELECT secret'}]},{status:403,headers:{'cf-ray':ray}});}});
 try{await assert.rejects(c.query(cfg.history,'SELECT private_value FROM secret_table WHERE id=?',['private-parameter']),/D1_HTTP_403/);
  const p=path.join(dir,'d1-request-failures.jsonl'),before=fs.readFileSync(p,'utf8'),d=JSON.parse(before);assert.equal(d.databaseRole,'HISTORY');assert.equal(d.cfRay,ray);assert.deepEqual(d.providerCodes,[10000]);assert.equal(d.authType,'OAUTH');assert.equal(d.authExpiredAtFailure,true);assert.equal(d.elapsedMs,2000);assert.equal(d.phase,'HTTP');assert.match(d.statementId,/^[a-f0-9]{64}$/);assert.equal(c.stats.readRetries,0);assert(!/private|person@|SELECT|Bearer|secret_table/.test(before));
  fs.writeFileSync(path.join(dir,'local-writer-last-run.json'),JSON.stringify({status:'VERIFIED'}));assert.equal(fs.readFileSync(p,'utf8'),before);assert.deepEqual(safeTransportFailures(c.stats.transportFailures)[0].providerCodes,[10000]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('error body is bounded, HTML and malformed JSON remain distinguishable',async()=>{
 for(const [response,expected] of [[new Response('<html>private</html>',{status:403}),'NON_JSON'],[new Response('{',{headers:{'content-type':'application/json'}}),'INVALID_JSON'],[Response.json({errors:[{code:1,message:'x'.repeat(20000)}]}),'TOO_LARGE']])assert.equal((await errorResponseDiagnostic(response)).errorBody,expected);
});
test('HTTP200 rejected result keeps structured codes; diagnostic disk failure is reported',async()=>{
 const c=client(cfg,'fixture',{onDiagnostic:()=>{throw Error('private path');},fetchImpl:async()=>Response.json({success:false,errors:[{code:9109,message:'private'}]},{headers:{'cf-ray':ray}})});
 await assert.rejects(c.query(cfg.core,'SELECT 1'),/D1_HTTP_200/);assert.equal(c.stats.diagnosticWriteFailures,1);assert.equal(c.stats.transportFailures[0].phase,'RESULT');assert.deepEqual(c.stats.transportFailures[0].providerCodes,[9109]);assert(!JSON.stringify(c.stats).includes('private'));
});
test('untrusted extra fields and malformed identifiers are excluded from permanent records',()=>{
 const [d]=safeTransportFailures([{at:new Date(0).toISOString(),kind:'READ',phase:'HTTP',httpStatus:403,cfRay:'sensitive URL',providerCodes:[10000,'secret',-1,Infinity],authType:'OAUTH',authExpiresAt:'secret',token:'secret',sql:'SELECT private',rawBody:'secret'}]);assert.deepEqual(d.providerCodes,[10000]);assert.equal(d.cfRay,null);assert.equal(d.authExpiresAt,null);assert(!/secret|SELECT/.test(JSON.stringify(d)));
});
test('failed official credential refresh records expired OAuth without sending a request',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'d1-auth-failure-')),file=path.join(dir,'fixture.toml');fs.writeFileSync(file,'oauth_token = "private"\nexpiration_time = "1970-01-01T00:00:01.000Z"');
 const c=client(cfg,()=>credential('fixture',{file,apiToken:null,now:()=>2000,refresh:()=>({status:1})}),{now:()=>2000,fetchImpl:async()=>assert.fail()});
 try{await assert.rejects(c.query(cfg.core,'SELECT 1'),/WRANGLER_LOGIN_REQUIRED/);const [d]=c.stats.transportFailures;assert.equal(d.phase,'AUTH');assert.equal(d.authRefresh,'FAILED');assert.equal(d.authExpiredAtFailure,true);assert.equal(d.httpStatus,null);assert(!JSON.stringify(d).includes('private'));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('null or malformed successful JSON is recorded as a result-contract failure',async()=>{
 for(const body of [null,{success:true,result:{}},{success:true,result:[]}]){const c=client(cfg,'fixture',{fetchImpl:async()=>Response.json(body)});await assert.rejects(c.query(cfg.core,'SELECT 1'),/D1_BATCH_FAILED/);assert.equal(c.stats.transportFailures[0].phase,'RESULT');}
});
