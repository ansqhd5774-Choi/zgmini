import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {scoreAll252,regularHour15Rows} from '../scripts/pc-writer/theme-optional-score-r188.mjs';
import {scoreAdaptiveTimeline} from '../scripts/pc-writer/theme-optional-adaptive-r2.mjs';
import {auditSpaceSatelliteAdaptive,selectRealHourlySessions} from '../scripts/pc-writer/theme-space-satellite-adaptive-r2.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const nyHour=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'});
function days(count){
 const result=[];
 for(let ms=Date.parse('2023-12-01T00:00:00Z');result.length<count;ms+=86400000){
  const d=new Date(ms);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)result.push(d.toISOString().slice(0,10));
 }
 return result;
}
function prices(count){
 return Array.from({length:count},(_,i)=>({
  own:80*Math.exp(.00031*i+Math.sin(.13*i)*.025+Math.cos(.049*i)*.006),
  spy:150*Math.exp(.00021*i+Math.sin(.07*i)*.014)
 }));
}
function timeline(count){const values=prices(count);return days(count).map((date,i)=>({date,...values[i]}));}
function timestamp(date){
 const early=new Set(['2024-07-03','2024-11-29','2024-12-24','2025-07-03','2025-11-28','2025-12-24']);
 const wanted=early.has(date)?'12':'15';
 for(let hour=16;hour<=21;hour++){
  const iso=date+'T'+String(hour).padStart(2,'0')+':00:00Z';
  if(nyHour.format(new Date(iso))===wanted)return iso;
 }
 throw Error('NO_NY_HOUR');
}
function fixture(root){
 const home=path.join(root,'themes','space-satellite');
 fs.mkdirSync(path.join(home,'raw'),{recursive:true});
 const dates=days(700),files=[];
 const begins={UFO:0,NASA:580,SPY:0};
 for(const symbol of Object.keys(begins)){
  const rows=dates.slice(begins[symbol]).map((date,j)=>({symbol,timestamp:timestamp(date),
   close:(symbol==='SPY'?150:80)*Math.exp(.0004*(begins[symbol]+j)+
    Math.sin(.11*(begins[symbol]+j))*.02),is_gap:false}));
  const bytes=Buffer.from(rows.map(row=>JSON.stringify(row)).join('\n')+'\n');
  const hash=sha(bytes),relative='raw/'+symbol+'_'+hash+'.jsonl';
  fs.writeFileSync(path.join(home,relative),bytes);
  files.push({path:relative,sha256:hash,source:'https://getmarkethistory.com',
   collectedAt:'2026-10-25T00:00:00Z',observationThrough:dates.at(-1),
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'});
 }
 fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify({version:1,
  themeId:'space-satellite',files}));
 return {home,dates,files};
}

test('adaptive R2 equals R188 to machine precision for every one of last 252 mature scores',()=>{
 const rows=timeline(700),adaptive=scoreAdaptiveTimeline(rows),
  reference=scoreAll252(rows.map(r=>r.own),rows.map(r=>r.spy));
 for(let i=0;i<252;i++){
  const row=adaptive.at(i-252);
  assert.equal(row.status,'R188_COMPATIBLE');
  assert.ok(Math.abs(row.score-reference[i])<1e-11,`${i}: ${row.score} vs ${reference[i]}`);
 }
});

test('young ETF receives provisional actual-data score without 628 days, preserves prelaunch gaps',()=>{
 const rows=timeline(160);
 for(let i=0;i<105;i++)rows[i].own=null;
 const result=scoreAdaptiveTimeline(rows);
 assert.equal(result.length,160);
 assert.equal(result[104].score,null);
 assert.equal(result[143].score,null);
 assert.equal(result[144].status,'ADAPTIVE_PROVISIONAL');
 assert.ok(result[144].score>=0&&result[144].score<=100);
 assert.deepEqual(result[144].activeMetrics.trend,['r20']);
 assert.deepEqual(result[144].activeMetrics.relativeStrength,['rs20']);
 assert.deepEqual(result[144].activeMetrics.volatility,['rv20','dsv20']);
 assert.equal(result[144].samples.rs20,20);
});

test('adaptive R2 gradually restores original indicators and reaches complete normalization at 377 rows',()=>{
 const rows=timeline(377),result=scoreAdaptiveTimeline(rows);
 assert.equal(result[39].status,'ADAPTIVE_PROVISIONAL');
 assert.equal(result[79].activeMetrics.trend.includes('r60'),true);
 assert.equal(result[81].activeMetrics.volatility.includes('dd63'),true);
 assert.equal(result[143].activeMetrics.trend.includes('m125'),true);
 assert.equal(result[144].activeMetrics.relativeStrength.includes('rs125'),true);
 assert.equal(result[375].status,'ADAPTIVE_PROVISIONAL');
 assert.equal(result[376].status,'R188_COMPATIBLE');
 assert.equal(result[376].samples.rs125,252);
});

test('ETF data holes cause null on missing day, no invented prices, and no compressed lookback',()=>{
 const rows=timeline(100);rows[58].own=null;
 const result=scoreAdaptiveTimeline(rows);
 assert.equal(result[57].status,'ADAPTIVE_PROVISIONAL');
 assert.equal(result[58].score,null);
 assert.equal(result[59].score,null);
 assert.equal(result[79].status,'ADAPTIVE_PROVISIONAL');
 assert.equal(result[79].samples.r20,39); // Missing 58 excluded; no artificial 58th metric.
 assert.throws(()=>scoreAdaptiveTimeline([{date:'2026-10-10',own:1,spy:1},
  {date:'2026-10-09',own:1,spy:1}]),{code:'ADAPTIVE_INVALID_REAL_SESSION_ROWS'});
});

test('short hourly selection has exactly the R188 price proxy and early-close behavior',()=>{
 const real=days(700).map((date,i)=>({timestamp:timestamp(date),close:40+i*.1}));
 assert.deepEqual(selectRealHourlySessions(real),regularHour15Rows(real));
 assert.equal(selectRealHourlySessions(real.slice(0,12)).length,12);
 const special={timestamp:timestamp('2025-11-28'),close:91};
 assert.deepEqual(selectRealHourlySessions([special])[0].date,'2025-11-28');
});

test('UFO+NASA private audit scores young NASA with actual-fixture history, no publication or write',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-adaptive-r2-'));
 try{
  const {dates}=fixture(root),result=auditSpaceSatelliteAdaptive({dataRoot:root});
  assert.equal(result.status,'PRIVATE_PRIORITY_PAIR_READY');
  assert.equal(result.coverage.UFO.dailySessions,700);
  assert.equal(result.coverage.NASA.dailySessions,120);
  assert.equal(result.coverage.SPY.dailySessions,700);
  assert.equal(result.individualStocksUsed,0);
  assert.equal(result.publicationAuthorized,false);
  assert.equal(result.derivedLicenseVerified,false);
  assert.equal(result.publicWrites,0);
  assert.equal(result.d1Writes,0);
  assert.equal(result.schedulerWrites,0);
  assert.equal(result.candidates.length,1);
  for(const candidate of result.candidates){
   assert.equal(candidate.history.length,252);
   assert.ok(candidate.scoredSessions>0);
   assert.ok(candidate.missingSessions>0);
   assert.equal(candidate.history.at(-1).date,dates.at(-1));
   assert.equal(candidate.history[0].score,null);
   assert.equal(candidate.latestStatus,'ADAPTIVE_PROVISIONAL');
  }
  assert.equal(result.candidates[0].commonSessions,120);
  assert.equal(result.candidates[0].eligibility.route,'ADAPTIVE_R2');
  assert.ok(Math.abs(result.candidates[0].latestWeights.UFO-
   (50+20*(377-120)/337))<.001);
  assert.ok(Math.abs(result.candidates[0].latestWeights.NASA-
   (50-20*(377-120)/337))<.001);
  assert.equal(result.candidates[0].history[0].weights,null);
  assert.equal(result.candidates[0].history.at(-1).weights.NASA,
   result.candidates[0].latestWeights.NASA);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('R2 private audit refuses any edited original raw byte',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-adaptive-bad-'));
 try{
  const {home,files}=fixture(root),target=path.join(home,files[0].path);
  fs.appendFileSync(target,'tamper');
  assert.throws(()=>auditSpaceSatelliteAdaptive({dataRoot:root}),{code:'SPACE_R2_RAW_HASH_MISMATCH'});
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
