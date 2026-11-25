import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {providerForUrl,policyForProvider} from '../scripts/pc-writer/quota-policy.mjs';
import {QuotaLedger} from '../scripts/pc-writer/quota-ledger.mjs';

function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-quota-'));}

test('provider policy maps official hosts without exposing query values',()=>{
 assert.equal(providerForUrl('https://api.stlouisfed.org/fred/series/observations?api_key=secret'),'FRED');
 assert.equal(providerForUrl('https://api.bls.gov/publicAPI/v2/timeseries/data/'),'BLS');
 assert.equal(providerForUrl('https://production.dataviz.cnn.io/index/fearandgreed/graphdata'),'CNN');
 assert.equal(providerForUrl('https://example.invalid/data'),null);
 assert.equal(policyForProvider('BLS').perDay,500);
});

test('observe mode records requests and reports cooldown without blocking',()=>{
 const base=temp();const ledger=new QuotaLedger(base,{mode:'observe'});
 ledger.beforeRequest('FRED',1_000);
 const second=ledger.beforeRequest('FRED',1_100);
 assert.equal(second.allowed,true);
 assert.equal(second.warning.blocked,true);
 assert.equal(second.warning.reason,'QUOTA_COOLDOWN');
 assert.equal(ledger.summary().guarded,0);
 assert.equal(ledger.summary().warnings,1);
 const saved=JSON.parse(fs.readFileSync(path.join(base,'quota-ledger.json'),'utf8'));
 assert.equal(saved.providers.FRED.requestTimes.length,2);
 assert.equal(JSON.stringify(saved).includes('secret'),false);
});

test('enforce mode blocks a request inside the minimum interval',()=>{
 const base=temp();const ledger=new QuotaLedger(base,{mode:'enforce'});
 ledger.beforeRequest('FRED',1_000);
 assert.throws(()=>ledger.beforeRequest('FRED',1_100),error=>error.code==='PROVIDER_QUOTA_GUARD');
 assert.equal(ledger.summary().guarded,1);
});

test('daily provider limit is enforced from the request ledger',()=>{
 const base=temp();const ledger=new QuotaLedger(base,{mode:'enforce'});
 for(let i=0;i<500;i++)ledger.beforeRequest('BLS',i*250);
 assert.throws(()=>ledger.beforeRequest('BLS',500*250),error=>error.code==='PROVIDER_QUOTA_GUARD');
});

test('independent ledger instances cannot erase another provider or reservation',()=>{
 const base=temp();
 try{
  const first=new QuotaLedger(base,{mode:'observe'});
  const second=new QuotaLedger(base,{mode:'observe'});
  const now=Date.now();
  first.beforeRequest('FRED',now);
  second.beforeRequest('CNN',now+1);
  first.afterResponse('FRED',{status:200,ok:true,at:now+2});
  second.beforeRequest('FRED',now+3);
  first.afterResponse('CNN',{status:429,ok:false,at:now+4});
  const saved=JSON.parse(fs.readFileSync(path.join(base,'quota-ledger.json'),'utf8'));
  assert.deepEqual(saved.providers.FRED.requestTimes,[now,now+3]);
  assert.deepEqual(saved.providers.CNN.requestTimes,[now+1]);
  assert.equal(saved.providers.FRED.lastSuccessAt,now+2);
  assert.equal(saved.providers.CNN.lastStatus,429);
  assert.equal(first.summary().providers.FRED.requests,2);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('common quota ledger preserves concurrent reservations across Node processes',async()=>{
 const base=temp();
 const moduleUrl=new URL('../scripts/pc-writer/quota-ledger.mjs',import.meta.url).href;
 const worker=(provider)=>new Promise((resolve,reject)=>{
  const code='import {QuotaLedger} from '+JSON.stringify(moduleUrl)+'; const ledger=new QuotaLedger(process.argv[1],{mode:"observe"}); for(let i=0;i<20;i++){ledger.beforeRequest(process.argv[2]);ledger.afterResponse(process.argv[2],{status:200,ok:true});}';
  const child=spawn(process.execPath,['--input-type=module','-e',code,base,provider],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  let err='';child.stderr.on('data',d=>{err+=d;});
  child.once('error',reject);
  child.once('exit',status=>status===0?resolve():reject(Error('quota child failed: '+err)));
 });
 try{
  const outcomes=await Promise.allSettled([worker('CNN'),worker('FRED'),worker('CNN')]);
  for(const outcome of outcomes)if(outcome.status==='rejected')throw outcome.reason;
  const saved=JSON.parse(fs.readFileSync(path.join(base,'quota-ledger.json'),'utf8'));
  assert.equal(saved.providers.CNN.requestTimes.length,40);
  assert.equal(saved.providers.FRED.requestTimes.length,20);
  assert.equal(saved.providers.CNN.lastStatus,200);
  assert.equal(saved.providers.FRED.lastStatus,200);
  assert.equal(fs.existsSync(path.join(base,'quota-ledger-reservation.lock')),false);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
