import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {calculateVariableBasketShadow,runSpaceVariableBasketShadow} from
 '../scripts/pc-writer/theme-space-satellite-r18-variable-basket-shadow.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const symbols=['UFO','NASA','WARP','ORBX','MARS','ARKX','ROKT','DIPR','WSPC'];
const days=n=>Array.from({length:n},(_,i)=>`2026-${String(1+Math.floor(i/28)).padStart(2,'0')}-${String(1+i%28).padStart(2,'0')}`);

test('R18 pure shadow changes contributor count by real same-day scores; no forced equal basket',()=>{
 const dates=days(120),etfs=['UFO','NASA','WARP','ORBX'];
 const from={UFO:0,NASA:0,WARP:35,ORBX:50};
 const observed={},sessionCounts={},timelines={};
 for(const ticker of etfs){
  observed[ticker]=new Set(dates.slice(from[ticker]));
  sessionCounts[ticker]=new Map(dates.map((d,i)=>[d,Math.max(0,i-from[ticker]+1)]));
  timelines[ticker]=dates.map((_,i)=>({score:i-from[ticker]+1>=40?40+i/10:null,
   status:'ADAPTIVE_PROVISIONAL'}));
 }
 // ORBX has a historical score but no current real NY15 observation.
 observed.ORBX.delete(dates.at(-1));
 const s=calculateVariableBasketShadow({dates,etfs,timelines,observed,sessionCounts});
 assert.equal(s.dates,120);
 assert.equal(s.history[39].active.length,2);
 assert.equal(s.history[38].score,null);
 assert.equal(s.history[80].active.length,3);
 assert.equal(s.latest.active.length,3);
 assert.ok(s.latest.weights.UFO>s.latest.weights.WARP);
 assert.ok(Math.abs(Object.values(s.latest.weights).reduce((a,b)=>a+b,0)-100)<.001);
 assert.equal(s.contributorDays.ORBX,30);
 assert.ok(s.actualMixedScoreDays>0);
 assert.equal(s.history[0].status,'NO_ACTUAL_SCORED_ETF');
});

test('R18 pure reducer can include 25 actual ETFs without any two-ETF cap',()=>{
 const dates=days(85),etfs=Array.from({length:25},(_,i)=>`ETF${i}`);
 const observed=Object.fromEntries(etfs.map(s=>[s,new Set(dates)]));
 const sessionCounts=Object.fromEntries(etfs.map(s=>[s,new Map(dates.map((d,i)=>[d,i+1]))]));
 const timelines=Object.fromEntries(etfs.map(s=>[s,dates.map((_,i)=>({
  score:i>=39?55:null,status:'ADAPTIVE_PROVISIONAL'}))]));
 const result=calculateVariableBasketShadow({dates,etfs,observed,sessionCounts,timelines});
 assert.equal(result.latest.active.length,25);
 assert.equal(Object.keys(result.latest.weights).length,25);
 assert.equal(result.latest.score,55);
 assert.equal(result.history[38].score,null);
});

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-r18-test-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,'themes','space-satellite');
 fs.mkdirSync(path.join(home,'raw'),{recursive:true});
 const dates=[];
 for(let day=new Date('2026-03-30T00:00:00Z');dates.length<145;
  day=new Date(day.getTime()+86400000)){
  if(day.getUTCDay()!==0&&day.getUTCDay()!==6)dates.push(day.toISOString().slice(0,10));
 }
 const make=(symbol,date,i,hour=15)=>({symbol,
  timestamp:`${date}T${String(hour+4).padStart(2,'0')}:00:00Z`,
  close:100+i*.25+Math.sin(i/8),is_gap:false});
 const spy=dates.map((d,i)=>make('SPY',d,i));
 const spyReader=()=>({sourceTheme:'data-center-power',manifestSha256:'R18_FIX_SPY',bars:spy});
 const counts={UFO:145,NASA:100,WARP:85,ORBX:120,MARS:125,ARKX:145,
  ROKT:140,DIPR:28,WSPC:15};
 const files=[];
 for(const ticker of symbols){
  const bars=dates.slice(-counts[ticker]).flatMap((d,j)=>{
   if(ticker==='ORBX'&&d===dates.at(-1))return [make(ticker,d,j,14)];
   return [make(ticker,d,j)];
  });
  const content=bars.map(b=>JSON.stringify(b)).join('\n')+'\n',hash=sha(content),
   relative=`raw/${ticker}_${hash}.jsonl`;
  fs.writeFileSync(path.join(home,relative),content);
  files.push({path:relative,sha256:hash,source:'https://getmarkethistory.com',
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'});
 }
 const content=JSON.stringify({version:1,themeId:'space-satellite',files});
 fs.writeFileSync(path.join(home,'raw-manifest.json'),content);
 const audit=(expectedManifestSha=sha(content),includePrivateTrace=false)=>
  runSpaceVariableBasketShadow({dataRoot:root,spyReader,
   expectedManifestSha,expectedSpySha:'R18_FIX_SPY',includePrivateTrace});
 return {root,home,audit};
}

test('R18 integrates nine verified source candidates and scores only six current ETFs',t=>{
 const f=fixture(t),manifestPath=path.join(f.home,'raw-manifest.json');
 const before=fs.readFileSync(manifestPath),result=f.audit();
 assert.equal(result.candidateCount,9);
 assert.equal(result.independentlyCurrentScored,6);
 assert.equal(result.latestPrivateProposal.contributingEtfs.length,6);
 assert.ok(result.latestPrivateProposal.score>=0&&result.latestPrivateProposal.score<=100);
 assert.ok(result.realPrivateMixedDays>0);
 assert.equal(result.providerCalls,0);
 assert.equal(result.rawFilesWritten,0);
 assert.equal(result.publicWrites,0);
 assert.equal(result.sameHourFallbackApproved,undefined);
 assert.equal(result.priceMode,'CANONICAL_UNADJUSTED_NY15_OR_EARLY_CLOSE_12_ONLY');
 assert.equal(result.publicationAuthorized,false);
 assert.equal(result.privateTrace,undefined);
 const internal=f.audit(undefined,true);
 assert.equal(internal.shadowHistorySha256,result.shadowHistorySha256);
 assert.equal(internal.privateTrace.history.length,result.last252DisplayDays);
 assert.equal(internal.privateTrace.symbols.length,9);
 assert.ok(fs.readFileSync(manifestPath).equals(before));
 assert.throws(()=>f.audit('f'.repeat(64)),/R18_SOURCE_SNAPSHOT_CHANGED/);
});
