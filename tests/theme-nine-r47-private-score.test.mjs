import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {mergeNineR47HourlyRows,calculateNineR47PrivateScores} from
  '../scripts/pc-writer/theme-nine-r47-private-score.mjs';
import {runNineR47Recurring} from
  '../scripts/pc-writer/theme-nine-r47-recurring-private-refresh.mjs';
import {calculateNineR47PrivateThemes} from
  '../scripts/pc-writer/theme-nine-r47-private-theme-aggregate.mjs';
import {updateNineR47Private} from
  '../scripts/pc-writer/theme-nine-r47-recurring-private-update.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const price=(symbol,timestamp,close=10.5)=>({symbol,timestamp,
  open:10,high:11,low:9,close,volume:100,is_gap:false});

test('R47 overlap: exact duplicate accepted, changed close refused',()=>{
  const a=price('AAA','2026-10-23T19:00:00Z');
  const b=price('AAA','2026-10-26T19:00:00Z');
  const rows=mergeNineR47HourlyRows({symbol:'AAA',existing:[a],incoming:[a,b]});
  assert.equal(rows.length,2);
  assert.equal(rows[1].timestamp,b.timestamp);
  assert.throws(()=>mergeNineR47HourlyRows({symbol:'AAA',existing:[a],
    incoming:[{...a,close:10.7}]}),{code:'THEME_NINE_R47_MERGED_OVERLAP_PRICE_CONFLICT'});
});

test('R47 reuses R25 approved scoring on verified 9-theme baseline plus R35 window',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'theme-nine-r47-score-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const dataRoot=path.join(dir,'data');
  const home=path.join(dataRoot,'themes','legacy-nine-r23');
  fs.mkdirSync(path.join(home,'raw'),{recursive:true});
  fs.mkdirSync(path.join(home,'state'),{recursive:true});
  const tickers=Array.from({length:63},(_,i)=>`T${String(i+1).padStart(3,'0')}`);
  const groups=Array.from({length:9},(_,i)=>({theme:'test'+i,
    tickers:tickers.slice(i*7,i*7+7).map(ticker=>({ticker,approvedCandidate:true}))}));
  groups[0].tickers.push({ticker:'T008',approvedCandidate:true});
  const roster={schema:'zgmini.theme-nine.r20-approved-three-gate-candidates.v1',
    counts:{themes:9,positions:64,uniqueTickers:63},groups};
  const rosterPath=path.join(dir,'roster.json');
  fs.writeFileSync(rosterPath,JSON.stringify(roster));
  const rosterSha=sha(fs.readFileSync(rosterPath));
  const dates=[];
  for(let d=new Date('2026-10-23T00:00:00Z');dates.length<252;
      d=new Date(d.getTime()-86_400_000)){
    if(![0,6].includes(d.getUTCDay()))dates.push(d.toISOString().slice(0,10));
  }
  dates.reverse();
  const stamp=date=>{
    if(date==='2025-11-28'||date==='2025-12-24')return date+'T17:00:00Z';
    return date>='2026-03-08'||date<'2025-11-02'?
      date+'T19:00:00Z':date+'T20:00:00Z';
  };
  const symbols=['SPY',...tickers];
  const manifest={version:1,project:'legacy-nine-r23',rosterSha256:rosterSha,
    source:'https://getmarkethistory.com',
    licenseStatus:'PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED',files:[]};
  const cp={version:1,project:'legacy-nine-r23',rosterSha256:rosterSha,
    start:'2023-01-01',end:'2026-10-26',symbols:{}};
  for(const symbol of symbols){
    const bars=dates.map((date,i)=>price(symbol,stamp(date),10.5+(i%10)*0.01));
    const data=Buffer.from(bars.map(v=>JSON.stringify(v)).join('\n')+'\n');
    const digest=sha(data),rel=`raw/${symbol}_${digest}.jsonl`;
    fs.writeFileSync(path.join(home,rel),data);
    manifest.files.push({symbol,path:rel,sha256:digest,source:'https://getmarkethistory.com',
      requestedUrl:`https://getmarkethistory.com/api/v1/bars/stocks/${symbol}/1h?start=2023-01-01&end=2026-10-26&limit=5000&format=jsonl`,
      priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
      schemaVersion:'GMH_1H_OHLCV_NDJSON_R23',rows:bars.length,nonGapRows:bars.length,
      gapRows:0,firstTimestampUTC:bars[0].timestamp,lastTimestampUTC:bars.at(-1).timestamp});
    cp.symbols[symbol]={complete:true,files:[{path:rel,sha256:digest}],
      lastTimestamp:bars.at(-1).timestamp,noBars:false};
  }
  fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify(manifest));
  const key=sha(JSON.stringify({roster:rosterSha,start:cp.start,end:cp.end})).slice(0,20);
  fs.writeFileSync(path.join(home,'state',`collection-${key}.json`),JSON.stringify(cp));
  let calls=0;
  const result=await runNineR47Recurring({dataRoot,rosterPath,
    now:new Date('2026-10-28T18:00:00Z'),sleep:async()=>{},
    fetchImpl:async url=>{
      calls++;
      const symbol=url.pathname.split('/').at(-2);
      const text=[price(symbol,'2026-10-23T19:00:00Z',10.5+((251)%10)*0.01),
        price(symbol,'2026-10-26T19:00:00Z',10.51)].map(v=>JSON.stringify(v)).join('\n')+'\n';
      return new Response(text);
    }});
  assert.equal(result.status,'R35_DELTA_PRIVATE_COLLECTION_COMPLETE');
  assert.equal(calls,64);
  const score=calculateNineR47PrivateScores({dataRoot,rosterPath,
    now:new Date('2026-10-28T18:00:00Z')});
  assert.equal(score.status,'PRIVATE_R47_SCORES_CALCULATED_NOT_PUBLISHED');
  assert.equal(score.source.latestSpySessionDate,'2026-10-26');
  assert.equal(score.latest252TradingDates.length,252);
  assert.equal(Object.keys(score.individual).length,63);
  assert.equal(score.source.deltaCompletedWindows.length,1);
  assert.equal(score.source.deltaVerifiedPageReferences,64);
  assert.equal(score.publicationAuthorized,false);
  const evidence={contract:'THEME_NINE_R26_OFFICIAL_AUM_RESEARCH_EVIDENCE_V1',
    status:'RESEARCH_ONLY_NOT_APPROVED_FOR_LIVE_R32_WEIGHTS',
    candidateRosterSha256:rosterSha,currency:'USD',rows:tickers.map((ticker,i)=>({
      ticker,aumUsd:1000000*(i+1),aumAsOf:'2026-10-23',
      quality:'OFFICIAL_EXACT',issuerUrl:'https://example.org/evidence',
      amountApproximate:false}))};
  const approval={contract:'THEME_NINE_R32_DATED_AUM_PRIVATE_APPROVAL_V1',
    scope:'PRIVATE_STAGE5_AND_STAGE6_SHADOW_ONLY',
    policy:'USE_VERIFIED_OFFICIAL_ISSUER_AUM_WITH_ORIGINAL_AS_OF_DATE',
    scoreBenchmarkDate:'2026-10-23',candidateRosterSha256:rosterSha,
    evidenceContract:evidence.contract,doNotInventAum:true,
    doNotRelabelAumDates:true,doNotImposeUnapprovedMaximumLag:true,
    doNotReconstructHistoricalAum:true,publicationAuthorized:false};
  const shadow=calculateNineR47PrivateThemes({scores:score,roster,
    rosterBytes:fs.readFileSync(rosterPath),aum:evidence,approval});
  assert.equal(shadow.status,'PRIVATE_STAGE5_REFRESHED_NOT_PUBLISHED');
  assert.equal(shadow.themes.length,9);
  assert.equal(shadow.themes.reduce((n,g)=>n+g.history.length,0),2268);
  assert.equal(shadow.aumPrivateApprovalAnchorDate,'2026-10-23');
  assert.equal(shadow.aumCarriedForwardPastPrivateApprovalAnchor,true);
  assert.equal(shadow.themes[0].latest.mode,'NORMALIZED_DATED_OFFICIAL_AUM_THREE_PLUS');
  assert.equal(shadow.publicationAuthorized,false);
  const opts={dataRoot,rosterPath,now:new Date('2026-10-28T18:00:00Z'),
    officialEvidence:{roster,rosterBytes:fs.readFileSync(rosterPath),
      aum:evidence,approval},fetchImpl:async()=>{throw Error('DUPLICATE_GET');}};
  const saved=await updateNineR47Private(opts);
  assert.equal(saved.status,'PRIVATE_SHADOW_SAVED_NOT_PUBLISHED');
  assert.equal(saved.shadow.writtenFiles,2);
  assert.equal(saved.collection.providerCalls,0);
  const repeated=await updateNineR47Private(opts);
  assert.equal(repeated.status,'PRIVATE_SHADOW_ALREADY_VERIFIED');
  assert.equal(repeated.shadow.writtenFiles,0);
});
