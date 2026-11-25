import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
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

// The real collector CLI must stop before creating a database or touching
// Core checkpoint files when the minute lane is not source-approved.
test('CNN minute collector refuses unapproved source and mixed lanes before storage',()=>{
 const base=temp();
 const script=fileURLToPath(new URL('../scripts/pc-writer/collect-local.mjs',import.meta.url));
 try{
  const checkpoint=path.join(base,'local-collection-last-run.json');
  fs.writeFileSync(checkpoint,'core sentinel');
  const invoke=args=>{
   const child=spawnSync(process.execPath,[script,'--cnn-minute',...args],{env:{...process.env,ZGMINI_PC_HOME:base},encoding:'utf8',windowsHide:true,timeout:30000});
   assert.equal(child.status,1,child.stderr||String(child.error??''));
   return JSON.parse(child.stdout.trim());
  };
  assert.equal(invoke([]).reason,'CNN_MINUTE_SOURCE_NOT_APPROVED');
  assert.equal(invoke(['--korea']).reason,'CNN_MINUTE_SCOPE_STOP');
  assert.equal(invoke(['--job=earnings']).reason,'CNN_MINUTE_SCOPE_STOP');
  assert.equal(invoke(['--import-only']).reason,'CNN_MINUTE_SCOPE_STOP');
  assert.equal(fs.readFileSync(checkpoint,'utf8'),'core sentinel');
  assert.deepEqual(fs.readdirSync(base),['local-collection-last-run.json']);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('approved CNN minute entry stores exact mock observation and receipt without touching Core checkpoint',()=>{
 const base=temp();
 const script=new URL('../scripts/pc-writer/collect-local.mjs',import.meta.url);
 const root=fileURLToPath(new URL('../',import.meta.url));
 const head=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true});
 assert.equal(head.status,0,head.stderr);
 const source=head.stdout.trim();
 assert.match(source,/^[0-9a-f]{40}$/);
 try{
  fs.writeFileSync(path.join(base,'config.json'),JSON.stringify({enabled:true,collectionTarget:'pc',source}));
  fs.writeFileSync(path.join(base,'providers.env'),'');
  const checkpoint=path.join(base,'local-collection-last-run.json');
  fs.writeFileSync(checkpoint,'core sentinel');
  // Child-local mock transport: any non-CNN request is counted and refused.
  // No provider credentials, production storage, or live network are used.
  const code=`
   import {collectLocal} from ${JSON.stringify(script.href)};
   import {DatabaseSync} from 'node:sqlite';
   import path from 'node:path';
   const base=process.argv[1], observedAt=new Date().toISOString(), score=15.831;
   const urls=[];
   globalThis.fetch=async input=>{
    const url=typeof input==='string'?input:input.url??String(input);
    urls.push(url);
    if(url!=='https://production.dataviz.cnn.io/index/fearandgreed/graphdata')throw Error('UNEXPECTED_NETWORK');
    return Response.json({fear_and_greed:{score,rating:'extreme fear',timestamp:observedAt},fear_and_greed_historical:{data:[]}});
   };
   const first=await collectLocal(base,{lane:'cnn-minute'});
   const second=await collectLocal(base,{lane:'cnn-minute'});
   const db=new DatabaseSync(path.join(base,'storage','core.sqlite'),{readOnly:true});
   const rows=db.prepare('SELECT kind,feed_key,snapshot_key,body FROM public_feed_snapshots_v1').all();
   const output=rows.find(r=>r.kind==='output'&&r.feed_key==='fear-greed'&&r.snapshot_key==='current');
   const archive=rows.find(r=>r.kind==='output'&&r.feed_key==='fear-greed-observed'&&r.snapshot_key===observedAt.slice(0,10));
   const receipt=rows.find(r=>r.kind==='input'&&r.feed_key==='fear-greed-http-checks');
   db.close();
   console.log(JSON.stringify({first,second,urls,observedAt,score,output:output?JSON.parse(output.body):null,archive:archive?JSON.parse(archive.body):null,receipt:receipt?JSON.parse(receipt.body):null,keys:[...new Set(rows.map(r=>r.feed_key))]}));
  `;
  const child=spawnSync(process.execPath,['--input-type=module','-e',code,base],{cwd:root,env:{...process.env,ZGMINI_PC_HOME:base,ZGMINI_QUOTA_MODE:'enforce',ZGMINI_SEC_SHARED_GUARD_ENABLED:'false'},encoding:'utf8',windowsHide:true,timeout:30000});
  assert.equal(child.status,0,child.stderr||String(child.error??''));
  const actual=JSON.parse(child.stdout.trim());
  assert.equal(actual.first.status,'COMPLETE');
  assert.equal(actual.first.attempted,1);
  assert.deepEqual(actual.first.feeds,[{key:'fear-greed',status:'COMPLETE'}]);
  assert.equal(actual.second.attempted,0);
  assert.deepEqual(actual.urls,['https://production.dataviz.cnn.io/index/fearandgreed/graphdata']);
  assert.equal(actual.output.score,actual.score);
  assert.equal(actual.output.observedAt,actual.observedAt);
  assert.deepEqual(actual.archive.observations,[{observedAt:actual.observedAt,score:actual.score}]);
  assert.equal(actual.receipt.checks.length,1);
  assert.equal(actual.receipt.checks[0].httpStatus,200);
  assert.equal(actual.receipt.checks[0].outcome,'VERIFIED');
  assert.equal(actual.receipt.checks[0].sourceObservedAt,actual.observedAt);
  assert.equal(actual.receipt.checks[0].score,actual.score);
  assert.ok(actual.receipt.checks[0].checkedAt>=actual.receipt.checks[0].requestedAt);
  assert.ok(actual.keys.every(key=>['fear-greed','fear-greed-observed','fear-greed-http-checks'].includes(key)));
  assert.equal(fs.readFileSync(checkpoint,'utf8'),'core sentinel');
  assert.equal(fs.existsSync(path.join(base,'storage','history.sqlite')),false);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
