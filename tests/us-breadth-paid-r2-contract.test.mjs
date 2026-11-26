import test from 'node:test';
import assert from 'node:assert/strict';
import {US_PAID_R2_FEED_KEY,US_PAID_R2_VERSION,
  US_PAID_R2_SOURCE,US_PAID_R2_METHOD,
  validPaidUsR2Record,paidUsR2PublicProjection}
  from '../worker/us-breadth-paid-r2-contract.mjs';

const row=(date,risingPct,unchangedPct,fallingPct)=>
  ({date,risingPct,unchangedPct,fallingPct});
function sample(){
  return {
    version:US_PAID_R2_VERSION,
    status:'READY',market:'usa',phase:'CONFIRMED',
    publicationStage:'PUBLIC_FINAL',plan:'full',
    source:US_PAID_R2_SOURCE,universe:'US_MARKETPARQUET_ACTIVE_STOCKS',
    priceMode:'SPLIT_ADJUSTED_DAILY_CLOSE',
    methodologyVersion:US_PAID_R2_METHOD,
    finalizedAt:'2026-11-20T22:00:00.000Z',
    sourceFileSha256:'a'.repeat(64),
    firstDate:'2026-11-19',lastDate:'2026-11-20',
    observationDate:'2026-11-20',historyComplete:false,
    points:[row('2026-11-19',25,50,25),row('2026-11-20',50,25,25)],
  };
}
test('new paid R2 key differs from retired free and S&P500 B1-R5',()=>{
  assert.equal(US_PAID_R2_FEED_KEY,'us-breadth-paid-r2-v1');
  assert.notEqual(US_PAID_R2_FEED_KEY,'breadth-paid-b1-r5-v1');
  assert.notEqual(US_PAID_R2_FEED_KEY,'public:market-breadth-r1:usa');
});
test('paid R2 accepts exact real percent-only observations',()=>{
  const x=sample();
  assert.equal(validPaidUsR2Record(x),true);
  const compact=paidUsR2PublicProjection(x);
  assert.deepEqual(compact.points,x.points);
  assert.deepEqual(compact.current,x.points.at(-1));
  assert.equal('sourceFileSha256' in compact,false);
  assert.equal('plan' in compact,false);
  assert.equal('counts' in compact,false);
  assert.equal('rawPrices' in compact,false);
  assert.equal('points' in paidUsR2PublicProjection(x,{history:false}),false);
});
test('free or falsified plan and any extra raw field is rejected',()=>{
  for(const field of ['plan','source','publicationStage','methodologyVersion']){
    const x=sample();
    x[field]={plan:'free',source:'MARKETPARQUET_FREE_SAMPLE',
      publicationStage:'STAGING_ONLY',methodologyVersion:'FAKE'}[field];
    assert.equal(validPaidUsR2Record(x),false,field);
  }
  const x=sample();x.rawPrices=[{close:123}];
  assert.equal(validPaidUsR2Record(x),false);
  const y=sample();y.points[0].rawCount=3000;
  assert.equal(validPaidUsR2Record(y),false);
});
test('invalid percentages, implied missing days or fake history status fail',()=>{
  const x=sample();x.points[1].fallingPct=33;
  assert.equal(validPaidUsR2Record(x),false);
  const y=sample();y.points[0].date='2026-11-18';
  assert.equal(validPaidUsR2Record(y),false);
  const z=sample();z.historyComplete=true;
  assert.equal(validPaidUsR2Record(z),false);
  const a=sample();a.points[1].fallingPct=null;
  assert.equal(validPaidUsR2Record(a),false);
});
