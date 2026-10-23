import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {traceSeries,materializeBars,recompute,compareHistory} from '../scripts/pc-writer/theme-biotech-forensic-r1.mjs';
import {scoreAll252} from '../scripts/pc-writer/theme-optional-score-r188.mjs';
import {r158ScorePrices} from '../lib/market-score/theme-etf-provisional-score.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const prices=(n=628)=>({own:Array.from({length:n},(_,i)=>50+i*0.07+Math.sin(i*0.15)*0.3),
 spy:Array.from({length:n},(_,i)=>100+i*0.11+Math.cos(i*0.09)*0.6)});

test('R188 full traces are native R188 and R158 exact-input equal at each of last three days',()=>{
 const {own,spy}=prices(),trace=traceSeries(own,spy),all=scoreAll252(own,spy),native=r158ScorePrices(own,spy);
 assert.equal(trace.length,252);
 for(let i=0;i<252;i++)assert.ok(Math.abs(trace[i].score-all[i])<1e-10);
 for(let i=625;i<628;i++)assert.ok(Math.abs(trace[i-376].score-native[i])<1e-10);
 const metric=trace[0].metrics.trend.m125;
 assert.equal(metric.rankWindow,252);
 assert.equal(metric.midrank,100*(metric.rankBelow+metric.rankEqual/2)/252);
});

test('hourly selection is NY timezone safe, excludes is_gap, uses 12pm early closing, distinguishes 628/252 windows',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'theme-biotech-forensic-fixture-'));
 try{
  const home=path.join(base,'themes','biotech'),raw=path.join(home,'raw');fs.mkdirSync(raw,{recursive:true});
  const manifest={version:1,themeId:'biotech',files:[]},start=Date.parse('2024-01-02T00:00:00Z');
  const calendar=[];let d=start;
  while(calendar.length<628){const day=new Date(d),week=day.getUTCDay();if(week!==0&&week!==6)calendar.push(day.toISOString().slice(0,10));d+=86400000;}
  const early='2024-07-03';assert.ok(calendar.includes(early));
  const otherEarly=new Set(['2024-07-03','2024-11-29','2024-12-24','2025-07-03','2025-11-28','2025-12-24']);
  const hourLocal=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'});
  const selectUtcHour=(date,local)=>{
   for(const hour of [16,17,19,20])if(hourLocal.format(new Date(`${date}T${hour}:00:00Z`))===local)return String(hour).padStart(2,'0');
   throw Error('FIXTURE_CANNOT_FIND_NY_HOUR');
  };
  const sample=prices(628);
  for(const [symbol,price] of [['IBB',sample.own],['XBI',sample.own.map((x,i)=>x*0.93+i*0.002)],['SPY',sample.spy]]){
   const rows=[];
   for(let i=0;i<calendar.length;i++){
    const date=calendar[i];
    const hour=selectUtcHour(date,otherEarly.has(date)?'12':'15');
    const timestamp=`${date}T${hour}:00:00Z`;
    rows.push(JSON.stringify({timestamp,close:price[i],symbol,is_gap:false}));
    if(i===500)rows.push(JSON.stringify({timestamp:`${date}T${hour}:30:00Z`,close:9999,symbol,is_gap:true}));
   }
   const buffer=Buffer.from(rows.join('\n')+'\n'),filename=`raw/${symbol}_${sha(buffer).slice(0,16)}.jsonl`;
   fs.writeFileSync(path.join(home,filename),buffer);
   manifest.files.push({path:filename,sha256:sha(buffer),source:'https://getmarkethistory.com',collectedAt:'2026-10-23T00:00:00Z',
    schemaVersion:'TEST_V1',priceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',observationFrom:calendar[0],observationThrough:calendar.at(-1)});
  }
  fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify(manifest));
  const corpus=materializeBars(base,{id:'biotech',symbols:['IBB','XBI'],benchmark:'SPY',rawManifest:'themes/biotech/raw-manifest.json'});
  assert.equal(corpus.dates.length,628);
  for(const symbol of ['IBB','XBI','SPY']){
   assert.equal(corpus.details[symbol].gapBars,1);
   assert.equal(corpus.tables[symbol].get(early).timestamp,'2024-07-03T16:00:00Z');
  }
  const history=recompute(corpus,calendar.at(-1));
  assert.equal(history.history.length,252);
  assert.equal(history.dates.length,628);
  const original={observationDate:calendar.at(-1),history:history.history.map(p=>({...p}))};
  original.history.at(-1).score=Number((original.history.at(-1).score+0.01).toFixed(5));
  const diffs=compareHistory(original,history,corpus);
  assert.equal(diffs.count,1);assert.equal(diffs.firstChanged,calendar.at(-1));
  assert.equal(diffs.dates[0].firstVerifiedMismatchStage,'PUBLISHED_FINAL_SCORE_VS_NEW_RAW');
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
