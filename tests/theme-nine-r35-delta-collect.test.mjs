import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {collectNineR35Delta,collectNineR35Auto} from '../scripts/pc-writer/theme-nine-r35-delta-collect.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bar=(symbol,timestamp)=>JSON.stringify({symbol,timestamp,
  open:10,high:11,low:9,close:10.5,volume:100,is_gap:false});
function setup(t){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'theme-nine-r35-test-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const dataRoot=path.join(temp,'data');
  const home=path.join(dataRoot,'themes','legacy-nine-r23');
  fs.mkdirSync(path.join(home,'state'),{recursive:true});
  fs.mkdirSync(path.join(home,'raw'),{recursive:true});
  const tickers=Array.from({length:63},(_,i)=>'T'+String(i+1).padStart(3,'0'));
  const groups=Array.from({length:9},(_,i)=>({theme:'test'+i,
    tickers:tickers.slice(i*7,i*7+7).map(ticker=>({ticker,approvedCandidate:true}))}));
  groups[0].tickers.push({ticker:'T001',approvedCandidate:true});
  const roster={schema:'zgmini.theme-nine.r20-approved-three-gate-candidates.v1',
    counts:{themes:9,positions:64,uniqueTickers:63},groups};
  const rosterPath=path.join(temp,'roster.json');
  fs.writeFileSync(rosterPath,JSON.stringify(roster));
  const rosterSha=sha(fs.readFileSync(rosterPath));
  const symbols=['SPY',...tickers];
  const baseRaw=Buffer.from(bar('SPY','2026-10-23T19:00:00Z')+'\n');
  const digest=sha(baseRaw),rel=`raw/SPY_${digest}.jsonl`;
  fs.writeFileSync(path.join(home,...rel.split('/')),baseRaw);
  const manifest={version:1,project:'legacy-nine-r23',rosterSha256:rosterSha,
    source:'https://getmarkethistory.com',
    licenseStatus:'PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED',
    files:[{symbol:'SPY',path:rel,sha256:digest,source:'https://getmarkethistory.com',
      requestedUrl:'https://getmarkethistory.com/api/v1/bars/stocks/SPY/1h?start=2023-01-01&end=2026-10-26&format=jsonl',
      priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
      schemaVersion:'GMH_1H_OHLCV_NDJSON_R23',lastTimestampUTC:'2026-10-23T19:00:00Z'}]};
  const cp={version:1,project:'legacy-nine-r23',rosterSha256:rosterSha,
    start:'2023-01-01',end:'2026-10-26',
    symbols:Object.fromEntries(symbols.map(symbol=>[symbol,{
      complete:true,files:symbol==='SPY'?[{path:rel,sha256:digest}]:[],
      lastTimestamp:symbol==='SPY'?'2026-10-23T19:00:00Z':null,
      noBars:symbol!=='SPY'}]))};
  const key=sha(JSON.stringify({roster:rosterSha,start:cp.start,end:cp.end})).slice(0,20);
  const baseManifestFile=path.join(home,'raw-manifest.json');
  const baseStateFile=path.join(home,'state',`collection-${key}.json`);
  fs.writeFileSync(baseManifestFile,JSON.stringify(manifest));
  fs.writeFileSync(baseStateFile,JSON.stringify(cp));
  const before=sha(fs.readFileSync(baseManifestFile));
  const api=async (url)=>{
    const name=url.pathname.split('/').at(-2);
    assert.equal(url.pathname,`/api/v1/bars/stocks/${name}/1h`);
    assert.equal(url.searchParams.get('start'),'2026-10-23');
    assert.equal(url.searchParams.get('end'),'2026-10-27');
    assert.equal(url.searchParams.get('limit'),'5000');
    const text=[bar(name,'2026-10-23T19:00:00Z'),bar(name,'2026-10-26T19:00:00Z')].join('\n')+'\n';
    return new Response(text,{status:200,headers:{'content-type':'text/plain'}});
  };
  return {dataRoot,rosterPath,start:'2026-10-23',end:'2026-10-27',
    api,baseManifestFile,before,deltaHome:path.join(dataRoot,'themes','legacy-nine-r35-delta')};
}

test('SPY old observation leaves E: delta folder untouched',async t=>{
  const f=setup(t);
  let calls=0;
  const r=await collectNineR35Delta({...f,fetchImpl:async url=>{
    calls++;return new Response(bar('SPY','2026-10-23T19:00:00Z')+'\n');}});
  assert.equal(r.status,'WAIT_SOURCE_NO_NEW_VERIFIED_SPY_SESSION');
  assert.equal(calls,1);
  assert.equal(r.providerCalls,1);
  assert.equal(fs.existsSync(f.deltaHome),false);
  assert.equal(sha(fs.readFileSync(f.baseManifestFile)),f.before);
});

test('four GETs maximum then resume without repeating completed pages',async t=>{
  const f=setup(t);let calls=[];
  const fetchImpl=async url=>{calls.push(url.pathname);return f.api(url);};
  const a=await collectNineR35Delta({...f,fetchImpl,maxRequests:4});
  assert.equal(a.status,'R35_DELTA_CHECKPOINT_READY_TO_RESUME');
  assert.equal(a.providerCalls,4);
  assert.equal(a.completedSymbols,4);
  const b=await collectNineR35Delta({...f,fetchImpl,maxRequests:4});
  assert.equal(b.providerCalls,4);
  assert.equal(b.completedSymbols,8);
  assert.equal(calls[0],'/api/v1/bars/stocks/SPY/1h');
  assert.notEqual(calls[4],'/api/v1/bars/stocks/SPY/1h');
  assert.equal(sha(fs.readFileSync(f.baseManifestFile)),f.before);
});

test('complete 64 symbols with bounded auto run and zero repeated GETs',async t=>{
  const f=setup(t);let calls=0,sleeps=0;
  const fetchImpl=async url=>{calls++;return f.api(url);};
  const a=await collectNineR35Auto({...f,fetchImpl,
    sleep:async ms=>{assert.equal(ms,60000);sleeps++;},maxBatches:64});
  assert.equal(a.status,'R35_DELTA_PRIVATE_COLLECTION_COMPLETE');
  assert.equal(a.completedSymbols,64);
  assert.equal(a.rawFilesStored,4); // final batch only; total manifest verifies all 64 below
  assert.equal(a.totalProviderCalls,64);
  assert.equal(a.totalRawFilesStored,64);
  assert.equal(calls,64);
  assert.equal(sleeps,15);
  const manifest=JSON.parse(fs.readFileSync(path.join(f.deltaHome,'raw-manifest.json')));
  assert.equal(manifest.files.length,64);
  const again=await collectNineR35Delta({...f,fetchImpl});
  assert.equal(again.status,'R35_DELTA_ALREADY_COLLECTED');
  assert.equal(again.providerCalls,0);
  assert.equal(calls,64);
  assert.equal(sha(fs.readFileSync(f.baseManifestFile)),f.before);
});

test('HTTP 429 stops without retries or new data root',async t=>{
  const f=setup(t);let calls=0;
  const r=await collectNineR35Auto({...f,fetchImpl:async()=>{
    calls++;return new Response('limited',{status:429});},sleep:async()=>{throw Error('UNEXPECTED_SLEEP');}});
  assert.equal(r.status,'STOP_HTTP_429');
  assert.equal(calls,1);
  assert.equal(fs.existsSync(f.deltaHome),false);
});

test('invalid raw bar halts before storing',async t=>{
  const f=setup(t);
  const r=await collectNineR35Delta({...f,fetchImpl:async()=>new Response(
    JSON.stringify({symbol:'SPY',timestamp:'2026-10-26T19:00:00Z',open:-1})+'\n')});
  assert.equal(r.status,'STOP_RESPONSE_OR_INVALID_BARS');
  assert.equal(fs.existsSync(f.deltaHome),false);
});
