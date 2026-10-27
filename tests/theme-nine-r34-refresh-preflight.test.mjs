import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditNineR34RefreshPreflight} from '../scripts/pc-writer/theme-nine-r34-refresh-preflight.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'theme-nine-r34-test-'));
  t.after(() => fs.rmSync(temp,{recursive:true,force:true}));
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
  const rsha=sha(fs.readFileSync(rosterPath));
  const symbols=[...tickers,'SPY'].sort();
  const raw=Buffer.from('{"symbol":"SPY","timestamp":"2026-10-23T19:00:00Z"}\n');
  const digest=sha(raw);
  const entry={symbol:'SPY',path:`raw/SPY_${digest}.jsonl`,sha256:digest,
    source:'https://getmarkethistory.com',priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
    schemaVersion:'GMH_1H_OHLCV_NDJSON_R23',lastTimestampUTC:'2026-10-23T19:00:00Z',
    requestedUrl:'https://getmarkethistory.com/api/v1/bars/stocks/SPY/1h?start=2023-01-01&end=2026-10-26&format=jsonl'};
  fs.writeFileSync(path.join(home,'raw',`SPY_${digest}.jsonl`),raw);
  const manifest={version:1,project:'legacy-nine-r23',rosterSha256:rsha,
    source:'https://getmarkethistory.com',
    licenseStatus:'PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED',files:[entry]};
  const cp={version:1,project:'legacy-nine-r23',rosterSha256:rsha,
    start:'2023-01-01',end:'2026-10-26',
    symbols:Object.fromEntries(symbols.map(s=>[s,{
      complete:true,files:s==='SPY'?[{path:entry.path,sha256:digest}]:[],
      noBars:s!=='SPY',lastTimestamp:s==='SPY'?entry.lastTimestampUTC:null}]))};
  const key=sha(JSON.stringify({roster:rsha,start:cp.start,end:cp.end})).slice(0,20);
  const mf=path.join(home,'raw-manifest.json');
  const cf=path.join(home,'state',`collection-${key}.json`);
  fs.writeFileSync(mf,JSON.stringify(manifest));
  fs.writeFileSync(cf,JSON.stringify(cp));
  return {dataRoot,rosterPath,home,manifest,cp,entry,mf,cf,rawPath:path.join(home,...entry.path.split('/'))};
}

test('reports completed immutable baseline and one inclusive overlap anchor',t=>{
  const f=fixture(t);
  const r=auditNineR34RefreshPreflight(f);
  assert.equal(r.verifiedRawPages,1);
  assert.equal(r.completedSymbols,64);
  assert.equal(r.latestSpyNYDay,'2026-10-23');
  assert.equal(r.suggestedOverlapStartNYDay,'2026-10-23');
  assert.equal(r.providerCalls,0);
  assert.equal(r.rawWrites+r.dbWrites+r.d1Writes+r.schedulerWrites+r.publicationWrites,0);
});
test('rejects missing verified SPY baseline',t=>{
  const f=fixture(t);
  f.manifest.files=[];fs.writeFileSync(f.mf,JSON.stringify(f.manifest));
  f.cp.symbols.SPY.files=[];f.cp.symbols.SPY.lastTimestamp=null;f.cp.symbols.SPY.noBars=true;
  fs.writeFileSync(f.cf,JSON.stringify(f.cp));
  assert.throws(()=>auditNineR34RefreshPreflight(f),/SPY_BASELINE_MISSING/);
});
test('rejects corrupted immutable raw',t=>{
  const f=fixture(t);
  fs.appendFileSync(f.rawPath,'alteration');
  assert.throws(()=>auditNineR34RefreshPreflight(f),/RAW_SHA_MISMATCH/);
});
test('rejects changed window in baseline manifest',t=>{
  const f=fixture(t);
  f.manifest.files[0].requestedUrl=f.entry.requestedUrl.replace('2026-10-26','2026-10-27');
  fs.writeFileSync(f.mf,JSON.stringify(f.manifest));
  assert.throws(()=>auditNineR34RefreshPreflight(f),/RAW_SOURCE_WINDOW_MISMATCH/);
});
test('rejects incomplete baseline checkpoint',t=>{
  const f=fixture(t);
  f.cp.symbols.T001.complete=false;fs.writeFileSync(f.cf,JSON.stringify(f.cp));
  assert.throws(()=>auditNineR34RefreshPreflight(f),/BASE_CHECKPOINT_INCOMPLETE/);
});
