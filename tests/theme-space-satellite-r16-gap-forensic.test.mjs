import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {forensicSpaceScoreGaps} from
 '../scripts/pc-writer/theme-space-satellite-r16-gap-forensic.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const symbols=['UFO','NASA','WARP','ORBX','MARS','ARKX','ROKT','DIPR','WSPC'];

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r16-fixture-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,'themes','space-satellite');
 fs.mkdirSync(path.join(home,'raw'),{recursive:true});
 const dates=[];
 for(let d=new Date('2026-03-30T00:00:00Z');dates.length<160;
  d=new Date(d.getTime()+86400000)){
  if(d.getUTCDay()!==0&&d.getUTCDay()!==6)dates.push(d.toISOString().slice(0,10));
 }
 const hour=(date,nyHour)=>String((date>='2026-11-01'?5:4)+nyHour).padStart(2,'0');
 const bar=(symbol,date,i,nyHour=15)=>({symbol,
  timestamp:`${date}T${hour(date,nyHour)}:00:00Z`,
  close:100+i*.15+Math.sin(i/4),is_gap:false});
 const spy=dates.map((date,i)=>bar('SPY',date,i));
 const spyReader=()=>({sourceTheme:'data-center-power',manifestSha256:'R16_FIXTURE_SPY',bars:spy});
 const files=[];
 const add=(ticker,lookback,{sparse=false}={})=>{
  const bars=[];
  for(let i=dates.length-lookback;i<dates.length;i++){
   const date=dates[i];
   if(sparse&&i>=dates.length-30&&i%2===0)bars.push(bar(ticker,date,i,14));
   else bars.push(bar(ticker,date,i));
  }
  const content=bars.map(b=>JSON.stringify(b)).join('\n')+'\n';
  const hash=sha(content),relative=`raw/${ticker}_${hash}.jsonl`;
  fs.writeFileSync(path.join(home,relative),content);
  files.push({path:relative,sha256:hash,source:'https://getmarkethistory.com',
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'});
  return relative;
 };
 const finish=()=>{
  const manifest=JSON.stringify({version:1,themeId:'space-satellite',files});
  fs.writeFileSync(path.join(home,'raw-manifest.json'),manifest);
  return sha(manifest);
 };
 return {root,home,add,finish,spyReader,dates};
}

test('R16 explains incomplete R2 windows without inventing missing closing prices',t=>{
 const f=fixture(t);
 f.add('UFO',155);f.add('ORBX',130,{sparse:true});f.add('DIPR',28);
 const digest=f.finish();const manifest=fs.readFileSync(path.join(f.home,'raw-manifest.json'));
 const result=forensicSpaceScoreGaps({dataRoot:f.root,spyReader:f.spyReader,
  expectedManifestSha:digest,expectedSpySha:'R16_FIXTURE_SPY'});
 assert.equal(result.candidateCount,9);
 const ufo=result.records.find(x=>x.ticker==='UFO');
 assert.equal(ufo.reason,'CURRENT_PRIVATE_SCORE_AVAILABLE');
 assert.ok(ufo.currentScore>0);
 const orbx=result.records.find(x=>x.ticker==='ORBX');
 assert.equal(orbx.reason,'R2_METRIC_WINDOWS_INCOMPLETE');
 assert.equal(orbx.lastEtfNy15Date,result.benchmarkLastNy15Date);
 assert.ok(orbx.latest45MissingNy15Days>0);
 assert.equal(orbx.latest45Missing15ButOtherHourlyDays,15);
 assert.ok(orbx.metricLookbacks['21'].missing>0);
 assert.equal(orbx.currentScore,null);
 assert.equal(orbx.gapFillSuggested,false);
 const dipr=result.records.find(x=>x.ticker==='DIPR');
 assert.equal(dipr.reason,'UNDER_40_ACTUAL_COMMON_SESSIONS');
 assert.equal(dipr.commonSpyNy15Days,28);
 assert.equal(result.providerCalls,0);assert.equal(result.rawFilesWritten,0);
 assert.equal(fs.readFileSync(path.join(f.home,'raw-manifest.json')).equals(manifest),true);
});

test('R16 detects source drift before doing a score-gap classification',t=>{
 const f=fixture(t);f.add('UFO',100);const digest=f.finish();
 assert.throws(()=>forensicSpaceScoreGaps({dataRoot:f.root,
  spyReader:f.spyReader,expectedManifestSha:'0'.repeat(64),
  expectedSpySha:'R16_FIXTURE_SPY'}),/R16_R15_SOURCE_SNAPSHOT_CHANGED/);
 const match=forensicSpaceScoreGaps({dataRoot:f.root,spyReader:f.spyReader,
  expectedManifestSha:digest,expectedSpySha:'R16_FIXTURE_SPY'});
 assert.equal(match.records.length,9);
});

test('R16 does not hardcode a two-ETF or nine-ETF selection limit',t=>{
 const f=fixture(t);const digest=f.finish();
 const expanded=[...symbols,...Array.from({length:13},(_,i)=>`ETF${i}`)];
 const result=forensicSpaceScoreGaps({dataRoot:f.root,
  symbols:expanded,spyReader:f.spyReader,
  expectedManifestSha:digest,expectedSpySha:'R16_FIXTURE_SPY'});
 assert.equal(result.candidateCount,22);
 assert.equal(result.records.at(-1).reason,'UNDER_40_ACTUAL_COMMON_SESSIONS');
});
