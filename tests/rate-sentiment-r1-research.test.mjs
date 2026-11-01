import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildRateSentimentR1,wilderRsiSeries,RATE_SENTIMENT_R1_RESEARCH} from '../lib/market-score/rate-sentiment-r1-research.mjs';
function sample(n=850){
  const x={dgs2Rows:[],dgs3moRows:[],dgs10Rows:[]};
  const d=new Date('2023-01-02T12:00:00Z');
  for(let i=0;i<n;i++){
    while([0,6].includes(d.getUTCDay()))d.setUTCDate(d.getUTCDate()+1);
    const date=d.toISOString().slice(0,10);
    x.dgs2Rows.push({observationDate:date,value:4+Math.sin(i/13)*.12-i*.0002});
    x.dgs3moRows.push({observationDate:date,value:4.15+Math.sin(i/29)*.06});
    x.dgs10Rows.push({observationDate:date,value:4.7+Math.cos(i/17)*.18-i*.0001});
    d.setUTCDate(d.getUTCDate()+1);
  }
  return x;
}
const payload=sample(),asOfDate=payload.dgs2Rows.at(-1).observationDate;
test('Wilder RSI edge cases: rising/falling/flat',()=>{
  assert.equal(wilderRsiSeries(Array(30).fill(5)).at(-1),50);
  assert.equal(wilderRsiSeries(Array.from({length:30},(_,i)=>i)).at(-1),100);
  assert.equal(wilderRsiSeries(Array.from({length:30},(_,i)=>30-i)).at(-1),0);
});
test('research contract and full required weights remain isolated',()=>{
  assert.deepEqual(RATE_SENTIMENT_R1_RESEARCH.weights,{policyProxy:.5,twoYearRsi:.2,tenYearRsi:.2,stability:.1});
  assert.equal(RATE_SENTIMENT_R1_RESEARCH.productionApproved,false);
});
test('850 observations produce genuine 1W/1M finite research history',()=>{
  const r=buildRateSentimentR1({...payload,asOfDate});
  assert.equal(r.status,'READY');assert.equal(r.week.length,5);assert.equal(r.oneMonth.length,22);
  assert.equal(r.week.at(-1).date,asOfDate);
  assert.ok(r.week.every(x=>x.score>=0&&x.score<=100&&Object.values(x.components).every(Number.isFinite)));
  assert.equal(r.publicMutation,false);assert.equal(r.productionFormulaChanged,false);assert.equal(r.fedWatchEquivalent,false);
  assert.equal(r.lookAheadSafe,false);
  const w=r.weights,c=r.components;
  assert.ok(Math.abs(r.score-(w.policyProxy*c.policyProxy+w.twoYearRsi*c.twoYearRsi+w.tenYearRsi*c.tenYearRsi+w.stability*c.stability))<1e-9);
});
test('truncation cannot change any previously computed score',()=>{
  const r=buildRateSentimentR1({...payload,asOfDate});
  const last=r.week[0].date;
  const cutoff=Object.fromEntries(Object.entries(payload).map(([k,x])=>[k,x.filter(row=>row.observationDate<=last)]));
  const past=buildRateSentimentR1({...cutoff,asOfDate:last});
  assert.equal(past.score,r.week[0].score);
});
test('insufficient reference history is NOT_READY, not fabricated',()=>{
  const short=sample(100),last=short.dgs2Rows.at(-1).observationDate;
  const r=buildRateSentimentR1({...short,asOfDate:last});
  assert.equal(r.status,'NOT_READY');assert.equal(r.score,null);assert.deepEqual(r.week,[]);
});
test('missing one series is NOT_READY without zero substitution or reweighting',()=>{
  const r=buildRateSentimentR1({...payload,dgs10Rows:[],asOfDate});
  assert.equal(r.status,'NOT_READY');assert.equal(r.score,null);
});
test('stale stored observations cannot be presented as current',()=>{
  const r=buildRateSentimentR1({...payload,asOfDate:'2027-12-31'});
  assert.equal(r.status,'STALE');assert.equal(r.score,null);assert.ok(r.history.length>0);
});
test('invalid duplicates fail closed',()=>{
  const bad={...payload,dgs2Rows:[...payload.dgs2Rows,{...payload.dgs2Rows[20],value:999}]};
  assert.throws(()=>buildRateSentimentR1({...bad,asOfDate}),/RATE_SENTIMENT_DUPLICATE_CONFLICT/);
});
test('research runner cannot call providers or mutate public storage',()=>{
  const source=fs.readFileSync(new URL('../scripts/pc-writer/analyze-rate-sentiment-r1.mjs',import.meta.url),'utf8');
  assert.match(source,/readOnly:true/);
  assert.doesNotMatch(source,/--publish|publishMarket|INSERT INTO|UPDATE |CREATE TABLE|ALTER TABLE|fetch\(/);
});
