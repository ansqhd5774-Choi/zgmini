import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BREADTH_R8_SHADOW_METHOD,
  BREADTH_R8_WEIGHTS,
  buildBreadthR8Components,
  buildBreadthR8Trend,
} from '../lib/market-score/breadth-r8-shadow.mjs';

function dateAt(day){
  return new Date(Date.UTC(2025,0,1)+day*86400000).toISOString().slice(0,10);
}
function fixture(days=360,tickers=500){
  const members=Array.from({length:tickers},(_,i)=>`T${String(i).padStart(3,'0')}`);
  const rows=[];
  for(let d=0;d<days;d++){
    const tradeDate=dateAt(d);
    for(let i=0;i<tickers;i++){
      const rising=i<tickers/2;
      const slope=rising?0.1:-0.05;
      const currentClose=200+slope*d;
      const previousClose=200+slope*(d-1);
      rows.push({trade_date:tradeDate,ticker:members[i],previous_close:previousClose,current_close:currentClose,current_volume:100000/currentClose});
    }
  }
  const relativeSeries={
    equalWeighted:Array.from({length:days},(_,d)=>({date:dateAt(d),value:100+d*0.1})),
    capWeighted:Array.from({length:days},(_,d)=>({date:dateAt(d),value:100+d*0.1})),
  };
  return {rows,universes:[{tradeDate:dateAt(0),members}],relativeSeries,currentDate:dateAt(days-1)};
}

test('R8 contract weights sum to one and 13 factors are fixed',()=>{
  assert.equal(BREADTH_R8_SHADOW_METHOD,'BREADTH_R8_13FACTOR_SHADOW_R1');
  assert.equal(Object.keys(BREADTH_R8_WEIGHTS).length,13);
  const sum=Object.values(BREADTH_R8_WEIGHTS).reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(sum-1)<1e-12);
});

test('R8 balanced synthetic PIT market produces neutral 50 across all 13 factors',()=>{
  const f=fixture();
  const out=buildBreadthR8Components(f);
  assert.equal(out.status,'READY');
  assert.equal(out.missingFactors.length,0);
  assert.equal(out.finalSmoothing,'NONE');
  assert.ok(Math.abs(out.score-50)<1e-9,`score=${out.score}`);
  for(const [key,value] of Object.entries(out.components)){
    assert.ok(Math.abs(value-50)<1e-9,`${key}=${value}`);
  }
  assert.equal(out.coverage.daily.returnCoverage,1);
  assert.equal(out.coverage.daily.valueCoverage,1);
  assert.equal(out.coverage.long.ma200,500);
  assert.equal(out.coverage.long.highLow52w,500);
});

test('R8 does not reweight when relative-strength source is missing',()=>{
  const f=fixture();
  const out=buildBreadthR8Components({...f,relativeSeries:null});
  assert.equal(out.status,'PARTIAL');
  assert.equal(out.score,null);
  assert.deepEqual(out.missingFactors,['equalCapRelativeStrength']);
  assert.equal(out.components.ma50,50);
  assert.equal(out.components.ma200,50);
});

test('R8 trend only emits dates with all 13 factors ready',()=>{
  const f=fixture();
  const early=dateAt(200),late=f.currentDate;
  const out=buildBreadthR8Trend({...f,dates:[early,late]});
  assert.equal(out.results.length,2);
  assert.equal(out.results[0].status,'PARTIAL');
  assert.equal(out.results[1].status,'READY');
  assert.deepEqual(out.trend.map(x=>x.label),[late]);
});
