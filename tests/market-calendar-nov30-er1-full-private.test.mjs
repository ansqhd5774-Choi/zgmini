import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runNovemberFullPrivate} from '../scripts/pc-writer/market-calendar-nov30-er1-full-private.mjs';
import {selectFutureNovemberSymbols} from '../scripts/pc-writer/market-calendar-nov30-er1-probe-publish.mjs';
import {validateER1PublicDisplay} from '../lib/market-calendar-er1-public-display.mjs';

const NOW=Date.parse('2026-11-04T20:00:00Z');
const digest=value=>createHash('sha256').update(value).digest('hex');
const symbols=n=>Array.from({length:n},(_,i)=>'F'+String(i+1).padStart(4,'0'));
const events=syms=>syms.map(ticker=>({date:'2026-11-06',ticker}));
function history(symbol){
 const number=Number(symbol.slice(1));
 return ['2026-10-20','2026-07-20','2026-04-20','2026-01-20']
  .map((date,i)=>({symbol,date,eps:1+number/400+i/100,
   revenue:10000000+number*1000-i*1000}));
}
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-er1-full-'));
 fs.mkdirSync(path.join(root,'er1-input'),{recursive:true});
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 return root;
}
function cache(root,folder,tickers){
 const dir=path.join(root,'er1-input',folder);fs.mkdirSync(dir,{recursive:true});
 for(const symbol of tickers){
  fs.writeFileSync(path.join(dir,symbol+'.json'),JSON.stringify({
   storedAt:'2026-11-04T12:00:00Z',body:history(symbol)})+'\n',{flag:'wx'});
 }
}
function output(root){
 const dir=path.join(root,'er1-input','nov30-er1-full-derived');
 const body=fs.readFileSync(path.join(dir,'current.json'),'utf8');
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'complete-manifest.json'),'utf8'));
 return {body,manifest,display:JSON.parse(body)};
}

test('all future November symbols, 17 bounded GETs, then checkpoint resume to complete',async t=>{
 const root=fixture(t),syms=symbols(25),calendar=events(syms);
 cache(root,'nov30-er1-batch20',syms.slice(0,3));
 let calls=0;
 const opts={pcHome:root,requireWindows:false,clock:()=>NOW,
  calendarLoader:async()=>calendar,env:{EARNINGS_API_KEY:'fixture_key_only'},
  fetcher:async url=>{
   calls++;return {ok:true,status:200,text:async()=>JSON.stringify(
    history(new URL(url).searchParams.get('symbol')))};
  }};
 assert.equal(selectFutureNovemberSymbols(calendar,'2026-11-04',null).length,25);
 const partial=await runNovemberFullPrivate(opts);
 assert.equal(partial.status,'PARTIAL');
 assert.equal(partial.code,'NOV30_ER1_PROVIDER_BUDGET_STOP');
 assert.equal(partial.schema,'ZGMINI_NOV30_ER1_FULL_PRIVATE_V1');
 assert.equal(partial.selectedSymbols,25);
 assert.equal(partial.providerCalls,17);
 assert.equal(partial.reusedActualSymbols,3);
 assert.equal(partial.stagedActualSymbols,17);
 assert.equal(partial.missingActualSymbols,5);
 assert.equal(partial.d1Writes,0);
 assert.ok(!fs.existsSync(path.join(root,'er1-input',
  'nov30-er1-full-derived','complete-manifest.json')));
 const done=await runNovemberFullPrivate(opts);
 assert.equal(done.status,'PASS',done.code);
 assert.equal(done.providerCalls,5);
 assert.equal(done.reusedActualSymbols,20);
 assert.equal(done.stagedActualSymbols,5);
 assert.equal(done.missingActualSymbols,0);
 assert.equal(done.scoreableIssuers,25);
 assert.equal(done.d1Writes,0);
 assert.equal(calls,22);
 const {body,manifest,display}=output(root);
 assert.ok(validateER1PublicDisplay(display,{now:NOW}));
 assert.equal(display.coverage.inputSymbols,25);
 assert.equal(manifest.schema,'ZGMINI_NOV30_ER1_FULL_PRIVATE_V1');
 assert.equal(manifest.status,'PASS');
 assert.equal(manifest.pilotOnly,true);
 assert.equal(manifest.selectedSymbols,25);
 assert.equal(manifest.localScoreSha256,digest(body));
 assert.equal(manifest.candidateSetSha256,digest(JSON.stringify(syms)));
 assert.equal(manifest.missingActualSymbols,0);
 const again=await runNovemberFullPrivate(opts);
 assert.equal(again.status,'PASS',again.code);
 assert.equal(again.providerCalls,0);
 assert.equal(again.reusedActualSymbols,25);
 assert.equal(calls,22);
});

test('429 does not block cached twenty or create false complete manifest',async t=>{
 const root=fixture(t),syms=symbols(30);
 cache(root,'nov30-er1-batch20',syms.slice(0,20));
 const result=await runNovemberFullPrivate({pcHome:root,
  requireWindows:false,clock:()=>NOW,
  calendarLoader:async()=>events(syms),env:{EARNINGS_API_KEY:'fixture_key_only'},
  fetcher:async()=>({ok:false,status:429})});
 assert.equal(result.code,'NOV30_ER1_PROVIDER_QUOTA_STOP');
 assert.equal(result.status,'PARTIAL');
 assert.equal(result.providerCalls,1);
 assert.equal(result.reusedActualSymbols,20);
 assert.equal(result.missingActualSymbols,10);
 assert.equal(result.d1Writes,0);
 assert.ok(!fs.existsSync(path.join(root,'er1-input',
  'nov30-er1-full-derived','complete-manifest.json')));
});

test('share-class aliases form one issuer without changing ER1 scorer',async t=>{
 const root=fixture(t),syms=['GOOG','GOOGL','BRK.A','BRK.B','ACME'];
 const dir=path.join(root,'er1-input','nov30-er1-full');fs.mkdirSync(dir,{recursive:true});
 for(let i=0;i<syms.length;i++){
  const symbol=syms[i];
  fs.writeFileSync(path.join(dir,symbol+'.json'),JSON.stringify({
   storedAt:'2026-11-04T12:00:00Z',body:
    ['2026-10-20','2026-07-20','2026-04-20','2026-01-20']
     .map(date=>({date,symbol,eps:1+i/10,revenue:10000000+i*1000000}))
  })+'\n',{flag:'wx'});
 }
 const result=await runNovemberFullPrivate({pcHome:root,requireWindows:false,
  clock:()=>NOW,calendarLoader:async()=>events(syms),
  fetcher:async()=>{throw Error('unexpected API GET')}});
 assert.equal(result.status,'PASS',result.code);
 assert.equal(result.selectedSymbols,5);
 assert.equal(result.scoreableIssuers,3);
 const {display,manifest}=output(root);
 assert.equal(display.coverage.inputSymbols,5);
 assert.equal(display.coverage.observedIssuers,3);
 assert.deepEqual(display.scores.flatMap(row=>row.tickers).sort(),syms.slice().sort());
 assert.ok(display.scores.find(row=>row.issuerId==='ALPHABET')
  ?.tickers.includes('GOOGL'));
 assert.ok(display.scores.find(row=>row.issuerId==='BERKSHIRE')
  ?.tickers.includes('BRK.B'));
 assert.equal(manifest.selectedSymbols,5);
});

test('good issuer and valid empty history: publishable coverage keeps missing unscored',async t=>{
 const root=fixture(t),syms=symbols(2);
 cache(root,'nov30-er1-full',syms.slice(0,1));
 const dir=path.join(root,'er1-input','nov30-er1-full');
 fs.writeFileSync(path.join(dir,syms[1]+'.json'),JSON.stringify({
  storedAt:'2026-11-04T12:00:00Z',body:[]})+'\n',{flag:'wx'});
 const report=await runNovemberFullPrivate({pcHome:root,
  requireWindows:false,clock:()=>NOW,calendarLoader:async()=>events(syms),
  fetcher:async()=>{throw Error('unexpected network')}});
 assert.equal(report.status,'PASS',report.code);
 assert.equal(report.scoreableIssuers,1);
 const {display,manifest}=output(root);
 assert.equal(display.coverage.inputSymbols,2);
 assert.equal(display.coverage.observedIssuers,2);
 assert.equal(display.coverage.scoreableIssuers,1);
 assert.equal(display.coverage.unscoreableReasons.ER1_RELEASE_HISTORY_INSUFFICIENT,1);
 assert.equal(manifest.missingActualSymbols,0);
});

test('bad vendor shape isolates one issuer, preserves good private preview, no completion marker',async t=>{
 const root=fixture(t),syms=symbols(2);
 cache(root,'nov30-er1-full',syms.slice(0,1));
 const report=await runNovemberFullPrivate({pcHome:root,
  requireWindows:false,clock:()=>NOW,calendarLoader:async()=>events(syms),
  env:{EARNINGS_API_KEY:'fixture_key_only'},
  fetcher:async()=>({ok:true,status:200,
   text:async()=>JSON.stringify({malformed:true})})});
 assert.equal(report.status,'PARTIAL',report.code);
 assert.equal(report.code,'NOV30_ER1_PARTIAL_PREVIEW_VERIFIED');
 assert.equal(report.scoreableIssuers,1);
 assert.equal(report.isolatedSymbols,1);
 assert.equal(report.missingActualSymbols,1);
 assert.equal(report.d1Writes,0);
 const dir=path.join(root,'er1-input','nov30-er1-full-derived');
 assert.ok(fs.existsSync(path.join(dir,'current.json')));
 assert.ok(!fs.existsSync(path.join(dir,'complete-manifest.json')));
});

test('full cohort score body over pilot 100KB remains valid under D1-safe cap',async t=>{
 const root=fixture(t),syms=symbols(2000);
 cache(root,'nov30-er1-full',syms);
 const result=await runNovemberFullPrivate({pcHome:root,
  requireWindows:false,clock:()=>NOW,
  calendarLoader:async()=>events(syms),
  fetcher:async()=>{throw Error('no provider GET for cached cohort')}});
 assert.equal(result.status,'PASS',result.code);
 assert.equal(result.selectedSymbols,2000);
 assert.equal(result.reusedActualSymbols,2000);
 assert.equal(result.providerCalls,0);
 const {body,manifest,display}=output(root);
 assert.ok(Buffer.byteLength(body,'utf8')>100000);
 assert.ok(Buffer.byteLength(body,'utf8')<1000000);
 assert.equal(display.recordCount,2000);
 assert.equal(manifest.localScoreSha256,digest(body));
});
