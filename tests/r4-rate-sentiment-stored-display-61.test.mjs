import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {buildRateSentimentR1,RATE_SENTIMENT_R1_RESEARCH} from '../lib/market-score/rate-sentiment-r1-research.mjs';
import {rateSentimentCalendarLag,RATE_SENTIMENT_MAX_OBSERVATION_DAYS} from '../lib/market-score/rate-sentiment-freshness.mjs';
import {preparePublicRateSentiment,RATE_SENTIMENT_PUBLIC_KEY} from '../scripts/pc-writer/rate-sentiment-publication.mjs';
import {storedRateSentimentResponse} from '../worker/rate-sentiment-public.mjs';
import {verifiedRateSentimentStoredView} from '../lib/rate-sentiment-stored-display-r4.mjs';

const data={DGS2:[],DGS3MO:[],DGS10:[]};
const cursor=new Date('2023-01-02T00:00:00Z');
for(let i=0;i<950;i++){
 while([0,6].includes(cursor.getUTCDay()))cursor.setUTCDate(cursor.getUTCDate()+1);
 const observationDate=cursor.toISOString().slice(0,10);
 data.DGS2.push({observationDate,value:4+Math.sin(i/13)*.12});
 data.DGS3MO.push({observationDate,value:4.15+Math.sin(i/29)*.06});
 data.DGS10.push({observationDate,value:4.7+Math.cos(i/17)*.18});
 cursor.setUTCDate(cursor.getUTCDate()+1);
}
const date=data.DGS2.at(-1).observationDate;
const baseNow=Date.parse(date+'T12:00:00Z'),storedAt=baseNow-3600000;
const calculated=buildRateSentimentR1({
 dgs2Rows:data.DGS2,dgs3moRows:data.DGS3MO,dgs10Rows:data.DGS10,asOfDate:date,
});
const sourceBody='gzip:'+gzipSync(JSON.stringify({rateR2:{series:data}})).toString('base64');
const local=new Map();
const core={
 prepare(sql){
  return {
   bind(...args){this.args=args;return this;},
   async first(){
    if(sql.includes('market_input_batches_v1'))return {body:sourceBody,stored_at:storedAt};
    const x=local.get(this.args[0]);
    return x?{body:x.body,stored_at:x.storedAt}:null;
   },
   async run(){
    const [key,body,at]=this.args;
    local.set(key,{body,storedAt:at});
    return {success:true};
   },
  };
 },
};
const prepared=await preparePublicRateSentiment(core,baseNow);
assert.equal(prepared.status,'LOCAL_READY');
const original=prepared.body;
const copy=()=>structuredClone(original);
const view=(body=original,now=baseNow)=>verifiedRateSentimentStoredView(body,now);
const atDay=(d)=>baseNow+d*86400000;
const api=(body=original,now=baseNow,stored=now-3600000)=>{
 const db={prepare(sql){
  assert.match(sql,/market_public_snapshots_v1/);
  return {bind(key){
   assert.equal(key,RATE_SENTIMENT_PUBLIC_KEY);
   return {async first(){return {body:JSON.stringify(body),stored_at:stored};}};
  }};
 }};
 return storedRateSentimentResponse(new Request('https://example.test/api/rate-sentiment'),{db,now});
};

test('approved H.15 DGS2/DGS3MO/DGS10 50/20/20/10 research scorer remains separate from RATE_R3',()=>{
 assert.equal(RATE_SENTIMENT_R1_RESEARCH.version,'RATE_SENTIMENT_R1_RESEARCH');
 assert.deepEqual(RATE_SENTIMENT_R1_RESEARCH.weights,{policyProxy:.5,twoYearRsi:.2,tenYearRsi:.2,stability:.1});
 assert.equal(RATE_SENTIMENT_R1_RESEARCH.productionApproved,false);
 assert.equal(RATE_SENTIMENT_R1_RESEARCH.fedWatchEquivalent,false);
 assert.equal(calculated.status,'READY');
 assert.equal(calculated.historyMode,'CURRENT_VINTAGE_ONLY');
 assert.equal(calculated.lookAheadSafe,false);
});

test('actual PC calculator to local public writer gives consistent 22+5 saved scores without provider calls',()=>{
 assert.equal(prepared.prepared,true);
 assert.equal(prepared.observationDate,date);
 assert.equal(original.observationDate,calculated.observationDate);
 assert.equal(original.sourceStoredAt,storedAt);
 assert.equal(original.source,'FEDERAL_RESERVE_H15_STORED_RATES');
 assert.equal(original.week.length,5);
 assert.equal(original.oneMonth.length,22);
 assert.deepEqual(original.week,original.oneMonth.slice(-5));
 assert.equal(original.week.at(-1).label,date);
 assert.equal(original.oneMonth.at(-1).label,date);
 assert.equal(original.score,original.week.at(-1).value);
 assert.equal(original.score,Number(calculated.score.toFixed(2)));
 assert.equal(view(),original);
});

test('same stored observation is valid through day 7 and invalid from day 8, unchanged in history',()=>{
 assert.equal(RATE_SENTIMENT_MAX_OBSERVATION_DAYS,7);
 assert.equal(rateSentimentCalendarLag(date,new Date(atDay(7)).toISOString().slice(0,10)),7);
 assert.equal(view(original,atDay(7)),original);
 assert.equal(view(original,atDay(8)),null);
 assert.equal(view(original,atDay(9)),null);
 assert.equal(original.observationDate,date);
});

test('GET returns saved score without calculator, and does not falsely publish on stale day 8',async()=>{
 const ready=await api();assert.equal(ready.status,200);
 assert.equal((await ready.json()).score,original.score);
 const seventh=await api(original,atDay(7));
 assert.equal(seventh.status,200);
 const eighth=await api(original,atDay(8));
 assert.equal(eighth.status,503);
 assert.equal((await eighth.json()).reason,'STORED_OBSERVATION_STALE');
});

test('weekend/API re-query never invents a new published date or fake chart value',()=>{
 for(const days of [1,2,3,5,7]){
  const body=view(original,atDay(days));
  assert.equal(body?.observationDate,date);
  assert.equal(body?.week.at(-1).label,date);
  assert.equal(body?.score,original.score);
 }
});

test('valid stored point history is strictly increasing, may skip holidays, and has exact published endpoints',()=>{
 assert.ok(original.week.every((row,i)=>i===0||row.label>original.week[i-1].label));
 assert.ok(original.oneMonth.every((row,i)=>i===0||row.label>original.oneMonth[i-1].label));
 const removed=copy();
 const idx=removed.oneMonth.findIndex((row,i)=>i>0&&i<15);
 removed.oneMonth.splice(idx,1);
 assert.equal(view(removed),null); // published 22-point contract, no fabricated replacement
});

test('tampered score cannot differ from the last saved weekly chart value',()=>{
 const x=copy();x.score+=1;assert.equal(view(x),null);
});

test('tampered final week point cannot differ from headline and month last point',()=>{
 const x=copy();x.week.at(-1).value+=1;assert.equal(view(x),null);
});

test('tampered monthly final point cannot silently override the weekly and current score',()=>{
 const x=copy();x.oneMonth.at(-1).value+=1;assert.equal(view(x),null);
});

test('week must be exactly five actual latest one-month observations, no older reordered five',()=>{
 const x=copy();x.week=x.oneMonth.slice(-6,-1);assert.equal(view(x),null);
});

test('unavailable, partial or unapproved public methodology must not display a ready number',()=>{
 for(const patch of [{status:'STALE'},{status:'PARTIAL'},{status:'UNAVAILABLE'},
  {version:'RATE_R3'},{version:'OTHER'},{source:'OTHER_FEED'},
  {historyMode:'PIT_VERIFIED'}]){
  assert.equal(view({...original,...patch}),null);
 }
});

test('missing or malformed period contracts do not become zero-filled charts',()=>{
 for(const patch of [{week:[]},{week:null},{oneMonth:null},{oneMonth:[]},
  {week:original.week.slice(1)},{oneMonth:original.oneMonth.slice(1)}]){
  assert.equal(view({...original,...patch}),null);
 }
});

test('a source observation from future or impossible date is rejected',()=>{
 for(const bad of ['2026-02-30','2026-13-01','2040-01-01','2026-00-01']){
  assert.equal(view({...original,observationDate:bad}),null);
 }
});

test('source observation on a non-H15 weekend is not a valid scored weekday',()=>{
 const saturday=new Date(baseNow);
 while(saturday.getUTCDay()!==6)saturday.setUTCDate(saturday.getUTCDate()+1);
 assert.equal(view({...original,observationDate:saturday.toISOString().slice(0,10)},saturday.getTime()),null);
});

test('duplicate or unordered week/month points never overwrite stored actual observations',()=>{
 for(const name of ['week','oneMonth']){
  const reversed=copy();reversed[name].reverse();assert.equal(view(reversed),null);
  const duplicate=copy();duplicate[name][1].label=duplicate[name][0].label;
  assert.equal(view(duplicate),null);
 }
});

test('future and invalid week/month labels cannot be used as a fake new score point',()=>{
 for(const name of ['week','oneMonth']){
  for(const invalid of ['2040-01-01','2026-02-30','invalid']){
   const x=copy();x[name].at(-1).label=invalid;assert.equal(view(x),null);
  }
 }
});

test('missing, text, negative, over-100 and non-finite numbers fail, not become 0',()=>{
 for(const bad of [null,undefined,'0',NaN,Infinity,-1,101]){
  assert.equal(view({...original,score:bad}),null);
  const x=copy();x.week[0].value=bad;assert.equal(view(x),null);
  const y=copy();y.oneMonth[0].value=bad;assert.equal(view(y),null);
 }
});

test('a real stored 0 is valid if all matching saved endpoints also contain 0',()=>{
 const x=copy();x.score=0;x.week.at(-1).value=0;x.oneMonth.at(-1).value=0;
 assert.equal(view(x),x);
});

test('official same-day correction needs matching last point across both stored histories',()=>{
 const x=copy();const v=Math.max(0,Math.min(100,x.score+1));
 x.score=v;x.week.at(-1).value=v;x.oneMonth.at(-1).value=v;
 assert.equal(view(x)?.observationDate,date);
 assert.equal(view(x)?.score,v);
 assert.equal(x.week.at(-1).label,date);
});

test('source stored-at timestamp cannot be invalid or in the future',()=>{
 for(const bad of [null,undefined,0,-1,1.5,'123',baseNow+1,Infinity]){
  assert.equal(view({...original,sourceStoredAt:bad}),null);
 }
});

test('the reader rejects a malformed stored snapshot instead of returning HTTP 200',async()=>{
 const bad=copy();bad.week.at(-1).value+=1;
 const res=await api(bad);
 assert.equal(res.status,503);
 const json=await res.json();
 assert.equal(json.reason,'STORED_SCORE_INVALID');
 assert.equal(res.headers.get('x-rate-sentiment-source'),'STORED');
});

test('unavailable 503 stays a read-only error and does not request H15 or write D1',()=>{
 const get=readFileSync(new URL('../worker/rate-sentiment-public.mjs',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../app/outbreak-events.tsx',import.meta.url),'utf8');
 const helper=readFileSync(new URL('../lib/rate-sentiment-stored-display-r4.mjs',import.meta.url),'utf8');
 assert.match(get,/verifiedRateSentimentStoredView\(body,now\)/);
 assert.match(ui,/verifiedRateSentimentStoredView\(payload,Date\.now\(\)\)/);
 assert.match(ui,/useStoredIndex<RateSentimentSnapshot>\('\/api\/rate-sentiment'\)/);
 assert.doesNotMatch(get,/fetch\(|buildRateSentimentR1|INSERT INTO|UPDATE |CREATE TABLE/);
 assert.doesNotMatch(helper,/buildRateSentimentR1|fetch\(|INSERT INTO|UPDATE /);
});
