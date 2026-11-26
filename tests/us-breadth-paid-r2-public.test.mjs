import test from 'node:test';
import assert from 'node:assert/strict';
import {readPaidUsR2Feed} from '../worker/us-breadth-paid-r2-public.mjs';
import {US_PAID_R2_VERSION,US_PAID_R2_SOURCE,US_PAID_R2_METHOD,
  US_PAID_R2_FEED_KEY} from '../worker/us-breadth-paid-r2-contract.mjs';

// Nov 20, 2026 (Friday) is a completed NY session on Nov 21 UTC.
const now=Date.parse('2026-11-21T02:00:00.000Z');
function record(){
  return {
    version:US_PAID_R2_VERSION,status:'READY',market:'usa',phase:'CONFIRMED',
    publicationStage:'PUBLIC_FINAL',plan:'full',
    source:US_PAID_R2_SOURCE,universe:'US_MARKETPARQUET_ACTIVE_STOCKS',
    priceMode:'SPLIT_ADJUSTED_DAILY_CLOSE',methodologyVersion:US_PAID_R2_METHOD,
    finalizedAt:'2026-11-20T22:00:00.000Z',
    sourceFileSha256:'a'.repeat(64),
    firstDate:'2026-11-19',lastDate:'2026-11-20',
    observationDate:'2026-11-20',historyComplete:false,
    points:[
      {date:'2026-11-19',risingPct:25,unchangedPct:50,fallingPct:25},
      {date:'2026-11-20',risingPct:50,unchangedPct:25,fallingPct:25},
    ],
  };
}
function db(body=record(),storedAt=Date.parse('2026-11-20T22:01:00Z')){
  const calls=[];
  return {
    calls,
    prepare(sql){
      calls.push(['prepare',sql]);
      return {bind(key){
        calls.push(['bind',key]);
        return {first:async()=>({body:JSON.stringify(body),stored_at:storedAt})};
      }};
    },
  };
}
test('current uses exact paid key and hides private SHA/raw/counts',async()=>{
  const d=db();
  const r=await readPaidUsR2Feed(d,{now,mode:'current'});
  assert.equal(r.ok,true);
  assert.equal(r.httpStatus,200);
  assert.deepEqual(r.body.current,record().points[1]);
  assert.equal('sourceFileSha256' in r.body,false);
  assert.equal('points' in r.body,false);
  assert.equal('plan' in r.body,false);
  assert.equal('rawPrices' in r.body,false);
  assert.equal(d.calls.filter(c=>c[0]==='bind').length,1);
  assert.equal(d.calls.find(c=>c[0]==='bind')[1],US_PAID_R2_FEED_KEY);
});
test('history retains real days but not source evidence',async()=>{
  const r=await readPaidUsR2Feed(db(),{now,mode:'history'});
  assert.equal(r.ok,true);
  assert.equal(r.body.points.length,2);
  assert.equal(r.body.historyComplete,false);
  assert.equal(r.body.points.at(-1).date,'2026-11-20');
  assert.equal('sourceFileSha256' in r.body,false);
});
test('stale current rejected; historical data remains explicitly dated',async()=>{
  const later=Date.parse('2026-11-24T02:00:00Z');
  const current=await readPaidUsR2Feed(db(),{now:later});
  assert.equal(current.ok,false);
  assert.equal(current.reason,'US_PAID_R2_STALE_OBSERVATION');
  const history=await readPaidUsR2Feed(db(),{now:later,mode:'history'});
  assert.equal(history.ok,true);
  assert.equal(history.body.lastDate,'2026-11-20');
});
test('free or invalid record cannot be exposed',async()=>{
  const x=record();x.plan='free';
  assert.equal((await readPaidUsR2Feed(db(x),{now})).reason,
    'US_PAID_R2_INVALID_PAID_PUBLIC_RECORD');
  const y=record();y.points[0].counts={rising:123};
  assert.equal((await readPaidUsR2Feed(db(y),{now})).reason,
    'US_PAID_R2_INVALID_PAID_PUBLIC_RECORD');
});
test('future stored timestamp and missing D1 are not READY',async()=>{
  const r=await readPaidUsR2Feed(db(record(),now+200_000),{now});
  assert.equal(r.reason,'US_PAID_R2_INVALID_PUBLICATION_TIME');
  const absent=await readPaidUsR2Feed(null,{now});
  assert.equal(absent.reason,'US_PAID_R2_CORE_DB_UNAVAILABLE');
});
