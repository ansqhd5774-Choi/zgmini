import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {planNineR47Recurring,runNineR47Recurring} from
  '../scripts/pc-writer/theme-nine-r47-recurring-private-refresh.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const bar=(symbol,timestamp)=>JSON.stringify({symbol,timestamp,
  open:10,high:11,low:9,close:10.5,volume:100,is_gap:false});
function fixture(t){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'theme-nine-r47-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const dataRoot=path.join(temp,'data');
  const home=path.join(dataRoot,'themes','legacy-nine-r23');
  fs.mkdirSync(path.join(home,'raw'),{recursive:true});
  fs.mkdirSync(path.join(home,'state'),{recursive:true});
  const tickers=Array.from({length:63},(_,i)=>'T'+String(i+1).padStart(3,'0'));
  const groups=Array.from({length:9},(_,i)=>({theme:'test'+i,
    tickers:tickers.slice(i*7,i*7+7)
      .map(ticker=>({ticker,approvedCandidate:true}))}));
  groups[0].tickers.push({ticker:'T001',approvedCandidate:true});
  const roster={schema:'zgmini.theme-nine.r20-approved-three-gate-candidates.v1',
    counts:{themes:9,positions:64,uniqueTickers:63},groups};
  const rosterPath=path.join(temp,'roster.json');
  fs.writeFileSync(rosterPath,JSON.stringify(roster));
  const rosterSha=sha(fs.readFileSync(rosterPath));
  const raw=Buffer.from(bar('SPY','2026-10-23T19:00:00Z')+'\n');
  const rawSha=sha(raw),rel=`raw/SPY_${rawSha}.jsonl`;
  fs.writeFileSync(path.join(home,rel),raw);
  const manifest={version:1,project:'legacy-nine-r23',rosterSha256:rosterSha,
    source:'https://getmarkethistory.com',
    licenseStatus:'PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED',files:[{
      symbol:'SPY',path:rel,sha256:rawSha,source:'https://getmarkethistory.com',
      requestedUrl:'https://getmarkethistory.com/api/v1/bars/stocks/SPY/1h?start=2023-01-01&end=2026-10-26&format=jsonl',
      priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
      schemaVersion:'GMH_1H_OHLCV_NDJSON_R23',lastTimestampUTC:'2026-10-23T19:00:00Z'}]};
  const manifestFile=path.join(home,'raw-manifest.json');
  fs.writeFileSync(manifestFile,JSON.stringify(manifest));
  const symbols=['SPY',...tickers];
  const cp={version:1,project:'legacy-nine-r23',rosterSha256:rosterSha,
    start:'2023-01-01',end:'2026-10-26',
    symbols:Object.fromEntries(symbols.map(symbol=>[symbol,{
      complete:true,files:symbol==='SPY'?[{path:rel,sha256:rawSha}]:[],
      lastTimestamp:symbol==='SPY'?'2026-10-23T19:00:00Z':null,
      noBars:symbol!=='SPY'}]))};
  const key=sha(JSON.stringify({roster:rosterSha,start:cp.start,end:cp.end})).slice(0,20);
  fs.writeFileSync(path.join(home,'state',`collection-${key}.json`),JSON.stringify(cp));
  const before=sha(fs.readFileSync(manifestFile));
  const deltaHome=path.join(dataRoot,'themes','legacy-nine-r35-delta');
  const firstTime=new Date('2026-10-28T17:00:00Z');
  const secondTime=new Date('2026-10-29T17:00:00Z');
  const thirdTime=new Date('2026-10-30T17:00:00Z');
  let calls=[];
  const fetchImpl=async url=>{
    const symbol=url.pathname.split('/').at(-2),start=url.searchParams.get('start');
    const end=url.searchParams.get('end');
    calls.push({symbol,start,end});
    const dates=start==='2026-10-23'?['2026-10-23','2026-10-26']:
      start==='2026-10-26'?['2026-10-26','2026-10-27']:
      ['2026-10-27']; // no *new* observation for third cycle
    return new Response(dates.map(date=>bar(symbol,date+'T19:00:00Z')).join('\n')+'\n');
  };
  return {dataRoot,rosterPath,manifestFile,before,deltaHome,firstTime,secondTime,
    thirdTime,fetchImpl,getCalls:()=>calls};
}

test('R47 complete first 64-symbol window; repeat on same NY date performs no GET',async t=>{
  const f=fixture(t);
  const first=planNineR47Recurring({...f,now:f.firstTime});
  assert.deepEqual(first.window,{start:'2026-10-23',end:'2026-10-27'});
  const result=await runNineR47Recurring({...f,now:f.firstTime,sleep:async()=>{}});
  assert.equal(result.status,'R35_DELTA_PRIVATE_COLLECTION_COMPLETE');
  assert.equal(result.providerCalls,64);
  const repeat=await runNineR47Recurring({...f,now:f.firstTime,sleep:async()=>{}});
  assert.equal(repeat.status,'WAIT_WINDOW_ALREADY_CHECKED');
  assert.equal(f.getCalls().length,64);
  assert.equal(sha(fs.readFileSync(f.manifestFile)),f.before);
});

test('R47 11:30 KST run sees the already-closed NY session on the same NY date',async t=>{
  const f=fixture(t);
  await runNineR47Recurring({...f,now:f.firstTime,sleep:async()=>{}});
  // 23:30 UTC on Oct 28 is 19:30 New York EDT, or 08:30 KST Oct 29.
  // The closed Oct 28 day can safely open the next bounded collection window.
  const afterClose=new Date('2026-10-28T23:30:00Z');
  const plan=planNineR47Recurring({...f,now:afterClose});
  assert.equal(plan.cutoffNYDay,'2026-10-28');
  assert.equal(plan.status,'READY_NEW_WINDOW');
  assert.deepEqual(plan.window,{start:'2026-10-26',end:'2026-10-28'});
  const result=await runNineR47Recurring({...f,now:afterClose,sleep:async()=>{}});
  assert.equal(result.status,'R35_DELTA_PRIVATE_COLLECTION_COMPLETE');
  assert.equal(result.providerCalls,64);
  assert.equal(f.getCalls().length,128);
  assert.equal(sha(fs.readFileSync(f.manifestFile)),f.before);
});

test('R47 never opens same NY day while the regular session is still trading',async t=>{
  const f=fixture(t);
  await runNineR47Recurring({...f,now:f.firstTime,sleep:async()=>{}});
  const beforeClose=new Date('2026-10-28T19:30:00Z');
  const plan=planNineR47Recurring({...f,now:beforeClose});
  assert.equal(plan.cutoffNYDay,'2026-10-27');
  assert.equal(plan.status,'WAIT_WINDOW_ALREADY_CHECKED');
  assert.equal(plan.window,null);
  assert.equal(f.getCalls().length,64);
});

test('R47 next window overlaps last real SPY day; future stale SPY is a one-call WAIT',async t=>{
  const f=fixture(t);
  await runNineR47Recurring({...f,now:f.firstTime,sleep:async()=>{}});
  const planned=planNineR47Recurring({...f,now:f.secondTime});
  assert.deepEqual(planned.window,{start:'2026-10-26',end:'2026-10-28'});
  assert.deepEqual(planned.previousWindow,{start:'2026-10-23',end:'2026-10-27'});
  const second=await runNineR47Recurring({...f,now:f.secondTime,sleep:async()=>{}});
  assert.equal(second.status,'R35_DELTA_PRIVATE_COLLECTION_COMPLETE');
  assert.equal(second.providerCalls,64);
  assert.equal(f.getCalls().length,128);
  const plannedThird=planNineR47Recurring({...f,now:f.thirdTime});
  assert.deepEqual(plannedThird.window,{start:'2026-10-27',end:'2026-10-29'});
  const third=await runNineR47Recurring({...f,now:f.thirdTime,sleep:async()=>{}});
  assert.equal(third.status,'WAIT_SOURCE_NO_NEW_VERIFIED_SPY_SESSION');
  assert.equal(third.providerCalls,1);
  assert.equal(f.getCalls().length,129);
  const states=fs.readdirSync(path.join(f.deltaHome,'state')).filter(n=>n.endsWith('.json'));
  assert.equal(states.length,2); // stale provider never creates an extra checkpoint
  assert.equal(sha(fs.readFileSync(f.manifestFile)),f.before);
});

test('R47 unfinished window is resumed with its frozen end, not rekeyed by date',async t=>{
  const f=fixture(t);
  const first=await runNineR47Recurring({...f,now:f.firstTime,auto:false});
  assert.equal(first.providerCalls,4);
  const plan=planNineR47Recurring({...f,now:f.thirdTime});
  assert.equal(plan.status,'RESUME_FROZEN_WINDOW');
  assert.deepEqual(plan.window,{start:'2026-10-23',end:'2026-10-27'});
  const second=await runNineR47Recurring({...f,now:f.thirdTime,auto:false});
  assert.equal(second.providerCalls,4);
  assert.equal(f.getCalls().length,8);
  assert.equal(f.getCalls().filter(x=>x.symbol==='SPY').length,1);
});

test('R47 date before baseline waits and never invokes provider',async t=>{
  const f=fixture(t);
  const result=await runNineR47Recurring({...f,now:new Date('2026-10-23T12:00:00Z')});
  assert.equal(result.status,'WAIT_CLOSED_NY_DATE');
  assert.equal(f.getCalls().length,0);
  assert.equal(fs.existsSync(f.deltaHome),false);
});

test('R47 existing chain with tampered bytes fails before any provider calls',async t=>{
  const f=fixture(t);
  await runNineR47Recurring({...f,now:f.firstTime,sleep:async()=>{}});
  const mf=JSON.parse(fs.readFileSync(path.join(f.deltaHome,'raw-manifest.json')));
  const victim=path.join(f.deltaHome,mf.files[0].path);
  fs.appendFileSync(victim,'tampered');
  assert.throws(()=>planNineR47Recurring({...f,now:f.secondTime}),
    {code:'THEME_NINE_R47_DELTA_PAGE_SHA'});
  assert.equal(f.getCalls().length,64);
});
