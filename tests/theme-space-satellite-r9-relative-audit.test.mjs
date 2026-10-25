import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {calculateRelativeShadow,runR9} from '../scripts/pc-writer/theme-space-satellite-r9-relative-audit.mjs';
import {runR8} from '../scripts/pc-writer/theme-space-satellite-r8-real-audit.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function weekdays(count){
 const values=[];
 for(let ms=Date.parse('2024-01-02T00:00:00Z');values.length<count;ms+=86400000){
  const d=new Date(ms);if(d.getUTCDay()>0&&d.getUTCDay()<6)values.push(d.toISOString().slice(0,10));
 }
 return values;
}
const nyHour=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'});
function proxyTime(date){
 const early=new Set(['2024-07-03','2024-11-29','2024-12-24',
  '2025-07-03','2025-11-28','2025-12-24']);
 const target=early.has(date)?'12':'15';
 for(let hour=16;hour<=21;hour++){
  const time=`${date}T${String(hour).padStart(2,'0')}:00:00Z`;
  if(nyHour.format(new Date(time))===target)return time;
 }
 throw Error('R9_TEST_NY_PROXY_HOUR_MISSING');
}
function addRaw(root,theme,symbol,days,start=0){
 const home=path.join(root,'themes',theme),rawDir=path.join(home,'raw');
 fs.mkdirSync(rawDir,{recursive:true});
 const rows=days.slice(start).map((date,j)=>({symbol,timestamp:proxyTime(date),
  close:100*Math.exp(.0003*(start+j)+Math.sin(.13*(start+j)+(symbol==='NASA'?1:0))*.025),
  is_gap:false}));
 const bytes=Buffer.from(rows.map(row=>JSON.stringify(row)).join('\n')+'\n');
 const sha256=hash(bytes),relative=`raw/${symbol}_${sha256}.jsonl`;
 fs.writeFileSync(path.join(home,relative),bytes);
 return {path:relative,sha256,source:'https://getmarkethistory.com',
  collectedAt:'2026-10-25T00:00:00Z',observationFrom:days[start],
  observationThrough:days.at(-1),priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'};
}
function fixture(root){
 const days=weekdays(656),space='space-satellite',shared='data-center-power';
 const ufo=addRaw(root,space,'UFO',days),nasa=addRaw(root,space,'NASA',days,512),
  spy=addRaw(root,shared,'SPY',days);
 for(const [theme,files] of [[space,[ufo,nasa]],[shared,[spy]]]){
  fs.writeFileSync(path.join(root,'themes',theme,'raw-manifest.json'),
   JSON.stringify({version:1,themeId:theme,files}));
 }
 return {days};
}

test('R9 pure method allows any 2–5 or more ETFs and preserves first 39 actual sessions as missing',()=>{
 const dates=weekdays(90),spy=new Map(dates.map((date,i)=>[date,150*Math.exp(.004*i)]));
 for(const n of [2,3,4,5,10]){
  const daily={SPY:spy};
  for(let i=0;i<n;i++){
   daily[`ETF${i+1}`]=new Map(dates.slice(i).map((date,j)=>[
    date,100*Math.exp(.002*j+.014*Math.sin(j*.13+i))]));
  }
  const result=calculateRelativeShadow({daily,etfs:Object.keys(daily).filter(k=>k!=='SPY')});
  assert.equal(result.etfs.length,n);
  assert.equal(result.history[0].score,null);
  assert.equal(result.history[38].score,null);
  assert.ok(result.scoredSessions>0);
  const latest=result.latest;
  assert.equal(latest.status,'ADAPTIVE_PROVISIONAL');
  assert.ok(Math.abs(Object.values(latest.weights).reduce((a,b)=>a+b,0)-100)<.01);
 }
});

test('R9 actual-fixture shadow restores earlier real scores but leaves R8 unchanged',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-r9-shadow-'));
 try{
  const {days}=fixture(root),before=runR8({dataRoot:root}),out=runR9({dataRoot:root}),after=runR8({dataRoot:root});
  assert.deepEqual(after,before);
  assert.equal(before.candidate.scoredSessions,29);
  assert.equal(out.candidate.baselineR8ScoredSessions,29);
  assert.equal(out.candidate.r9RelativeScoredSessions,105);
  assert.equal(out.candidate.gainedHistoricalSessions,76);
  assert.equal(out.candidate.historicalSessionsMatchingApprovedR3,29);
  assert.equal(out.candidate.firstR9ScoredDate,days[551]);
  assert.equal(out.candidate.latestObservationDate,days.at(-1));
  assert.ok(Math.abs(out.candidate.currentRelativeWeights.NASA-36.172)<.001);
  assert.equal(out.candidate.latestScoreMatchesApprovedR3,true);
  assert.equal(out.publicationAuthorized,false);
  assert.equal(out.providerCalls,0);
  assert.equal(out.publicWrites,0);
  assert.equal(out.d1Writes,0);
  assert.equal(out.schedulerWrites,0);
  assert.equal(JSON.stringify(out).includes('history'),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('R9 fails closed on tampered original source rather than fabricating provisional history',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-r9-badsha-'));
 try{
  fixture(root);
  const dir=path.join(root,'themes','space-satellite');
  const entry=JSON.parse(fs.readFileSync(path.join(dir,'raw-manifest.json'),'utf8')).files[0];
  fs.appendFileSync(path.join(dir,entry.path),'altered');
  assert.throws(()=>runR9({dataRoot:root}),/SPACE_R2_RAW_HASH_MISMATCH/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
