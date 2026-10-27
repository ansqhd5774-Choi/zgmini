import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditAllSpaceEtfScores} from
 '../scripts/pc-writer/theme-space-satellite-r15-all-etf-score-audit.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const candidates=['UFO','NASA','WARP','ORBX','MARS','ARKX','ROKT','DIPR','WSPC'];

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r15-fixture-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,'themes','space-satellite');
 fs.mkdirSync(path.join(home,'raw'),{recursive:true});
 const files=[];
 const dates=[];
 for(let d=new Date('2026-01-02T00:00:00Z');dates.length<235;
  d=new Date(d.getTime()+86400000)){
  if(d.getUTCDay()!==0&&d.getUTCDay()!==6)dates.push(d.toISOString().slice(0,10));
 }
 const time=date=>`${date}T${date<'2026-03-08'||date>='2026-11-01'?'20':'19'}:00:00Z`;
 const bar=(ticker,date,i)=>({symbol:ticker,timestamp:time(date),
  close:100+i*.17+Math.sin(i/6)*(ticker==='SPY'?1:2),is_gap:false});
 const spy=dates.map((date,i)=>bar('SPY',date,i));
 const spyReader=()=>({sourceTheme:'data-center-power',manifestSha256:'MOCK_SPY_SHA',
  bars:spy});
 const add=(ticker,n=160,stale=false)=>{
  const selection=dates.slice(stale?-n-1:-n,stale?-1:undefined);
  const raw=selection.map(date=>JSON.stringify(bar(ticker,date,dates.indexOf(date))))
   .join('\n')+'\n';
  const digest=sha(raw),relative=`raw/${ticker}_${digest}.jsonl`;
  fs.writeFileSync(path.join(home,relative),raw);
  files.push({path:relative,sha256:digest,source:'https://getmarkethistory.com',
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'});
  return relative;
 };
 const finish=()=>fs.writeFileSync(path.join(home,'raw-manifest.json'),
  JSON.stringify({version:1,themeId:'space-satellite',files}));
 return {root,home,add,finish,spyReader,dates,files};
}

test('R15 scores all 9 ETF candidates independently with no pair cap',t=>{
 const f=fixture(t);
 for(const ticker of candidates.slice(0,7))f.add(ticker,165);
 f.add('DIPR',28);f.add('WSPC',15);f.finish();
 const initial=fs.readFileSync(path.join(f.home,'raw-manifest.json'));
 const out=auditAllSpaceEtfScores({dataRoot:f.root,spyReader:f.spyReader});
 assert.equal(out.candidateCount,9);
 assert.equal(out.records.length,9);
 assert.deepEqual(out.records.map(r=>r.ticker),candidates);
 assert.equal(out.currentScoreCount,7);
 for(const record of out.records.slice(0,7)){
  assert.equal(record.status,'PRIVATE_CURRENT_SCORE_AVAILABLE');
  assert.ok(record.currentScore>0&&record.currentScore<=100);
  assert.equal(record.chartWindowSessions,235);
  assert.match(record.historySha256,/^[a-f0-9]{64}$/);
 }
 assert.equal(out.records[7].status,'WATCH_UNDER_40_ACTUAL_COMMON_SESSIONS');
 assert.equal(out.records[7].currentScore,null);
 assert.equal(out.records[8].currentScore,null);
 assert.equal(out.aggregateScore,null);
 assert.equal(out.aggregateWeights,null);
 assert.equal(out.aumWeightsVerified,false);
 assert.equal(out.providerCalls,0);assert.equal(out.publicWrites,0);
 assert.equal(out.d1Writes,0);assert.equal(out.schedulerWrites,0);
 assert.equal(fs.readFileSync(path.join(f.home,'raw-manifest.json')).equals(initial),true);
});

test('R15 never treats an old observed score as a current ETF score',t=>{
 const f=fixture(t);f.add('ROKT',150,true);f.finish();
 const out=auditAllSpaceEtfScores({dataRoot:f.root,
  symbols:['ROKT'],spyReader:f.spyReader});
 const record=out.records[0];
 assert.equal(record.status,'STALE_PRICE_NO_CURRENT_SCORE');
 assert.equal(record.currentScore,null);
 assert.ok(record.lastHistoricalScore>0);
 assert.equal(record.lastHistoricalIsNotCurrent,true);
 assert.equal(record.lastHistoricalScoreDate,f.dates.at(-2));
 assert.equal(record.benchmarkLastNy15Date,f.dates.at(-1));
});

test('R15 arbitrary expanded candidate list is not capped at 2/3/9',t=>{
 const f=fixture(t);f.add('UFO',175);f.finish();
 const symbols=[...candidates,...Array.from({length:17},(_,i)=>`ETF${i}`)];
 const out=auditAllSpaceEtfScores({dataRoot:f.root,symbols,spyReader:f.spyReader});
 assert.equal(out.candidateCount,26);
 assert.equal(out.records.length,26);
 assert.equal(out.records.at(-1).status,'NO_LOCAL_RAW');
 assert.equal(out.records.at(-1).currentScore,null);
});

test('R15 blocks tampered private raw source without provider or site writes',t=>{
 const f=fixture(t);const file=f.add('UFO',155);f.finish();
 fs.appendFileSync(path.join(f.home,file),'\n');
 assert.throws(()=>auditAllSpaceEtfScores({dataRoot:f.root,
  symbols:['UFO'],spyReader:f.spyReader}),/R13_RAW_SHA_MISMATCH/);
});
