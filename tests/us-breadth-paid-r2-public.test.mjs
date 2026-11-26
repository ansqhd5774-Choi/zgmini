import test from 'node:test';
import assert from 'node:assert/strict';
import {readPaidUsR2Feed} from '../worker/us-breadth-paid-r2-public.mjs';
import {US_PAID_R2_FEED_KEY}
  from '../worker/us-breadth-paid-r2-contract.mjs';

import {fullPaidUsR2Record}
  from './helpers/us-breadth-paid-r2-full-year-fixture.mjs';

// Nov 20, 2026 (Friday) is a completed NY session on Nov 21 UTC.
const now=Date.parse('2026-11-21T02:00:00.000Z');
const record=()=>fullPaidUsR2Record();
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
  assert.deepEqual(r.body.current,record().points.at(-1));
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
  assert.equal(r.body.points.length,250);
  assert.equal(r.body.historyComplete,true);
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
test('one to 249 legitimate point records are never API READY',async()=>{
  for(const count of [1,2,249]){
    const partial=record();
    partial.points=partial.points.slice(-count);
    partial.firstDate=partial.points[0].date;
    partial.historyComplete=false;
    for(const mode of ['current','history']){
      const response=await readPaidUsR2Feed(db(partial),{now,mode});
      assert.equal(response.ok,false);
      assert.equal(response.httpStatus,503);
      assert.equal(response.reason,'US_PAID_R2_INVALID_PAID_PUBLIC_RECORD');
    }
  }
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
