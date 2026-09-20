import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAssetBubbleR9Partial,
  buildPriceAccelerationR9,
  buildSpeculativeFlowsR9,
} from '../lib/diagnostic-layer/asset-bubble-r9-components.mjs';

function monthRows(count, fn) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const year = 2000 + Math.floor(i / 12);
    const month = i % 12 + 1;
    rows.push({observationDate:`${year}-${String(month).padStart(2,'0')}-15`,value:fn(i)});
    rows.push({observationDate:`${year}-${String(month).padStart(2,'0')}-28`,value:fn(i)*1.001});
  }
  return rows;
}

test('R9 price acceleration uses last observation of month and exact 3M/12M lags', () => {
  const prices = monthRows(90, i => 100*(1.01**i));
  const out = buildPriceAccelerationR9(prices);
  assert.equal(out.monthly[0].observationDate.endsWith('-28'),true);
  const current=prices[12*2+1].value,p3=prices[9*2+1].value,p12=prices[1].value;
  const expected=4*Math.log(current/p3)-Math.log(current/p12);
  assert.ok(Math.abs(out.monthly[0].value-expected)<1e-12);
});

test('R9 price acceleration score is inverse expanding percentile with 60 valid raw observations', () => {
  const out=buildPriceAccelerationR9(monthRows(90,i=>100+i+i*i/1000));
  const scored=out.monthly.filter(row=>row.score!==null);
  assert.ok(scored.length>0);
  assert.equal(scored[0].validHistory,60);
});

test('R10 quarter mapping uses the last observed month in each quarter', () => {
  const out=buildPriceAccelerationR9(monthRows(90,i=>100+i));
  const q=out.quarterly.find(row=>row.quarter==='2001-Q1');
  assert.equal(q.observationDate,'2001-03-28');
});

test('R9 speculative-flow percentile starts at first valid flow observation', () => {
  const flow=[{quarter:'2020-Q1',value:10},{quarter:'2020-Q2',value:20},{quarter:'2020-Q3',value:5}];
  const price=[
    {quarter:'2020-Q1',priceAccelRaw:0.2,priceAccelScore:50},
    {quarter:'2020-Q2',priceAccelRaw:0.3,priceAccelScore:50},
    {quarter:'2020-Q3',priceAccelRaw:0.4,priceAccelScore:50},
  ];
  const out=buildSpeculativeFlowsR9(flow,price);
  assert.equal(out.rows[0].inverseFlowPercentileScore,50);
  assert.equal(out.rows[0].score,50);
});

test('R9 speculative-flow gate returns 100 when price acceleration is non-positive', () => {
  const out=buildSpeculativeFlowsR9(
    [{quarter:'2020-Q1',value:999}],
    [{quarter:'2020-Q1',priceAccelRaw:0,priceAccelScore:1}],
  );
  assert.equal(out.rows[0].score,100);
});

test('R9 speculative-flow does not invent raw flowMagnitude4Q', () => {
  const out=buildSpeculativeFlowsR9([],[]);
  assert.equal(out.sourceContract,'PRECOMPUTED_FLOW_MAGNITUDE_4Q_REQUIRED');
  assert.equal(out.status,'PARTIAL');
});

test('Asset Bubble remains PARTIAL and un-reweighted when breadth is absent', () => {
  const q='2026-Q1';
  const out=buildAssetBubbleR9Partial({
    valuationScoreRows:[{quarter:q,value:60}],
    priceAccelerationQuarterRows:[{quarter:q,priceAccelScore:70}],
    riskAssetShareScoreRows:[{quarter:q,value:80}],
    speculativeFlowRows:[{quarter:q,score:90}],
    excessLiquidityScoreRows:[{quarter:q,value:50}],
  });
  const row=out.rows[0];
  assert.equal(row.knownWeight,0.90);
  assert.ok(Math.abs(row.knownContribution0to90-(60*.35+70*.25+80*.15+90*.10+50*.05))<1e-12);
  assert.equal(row.status,'PARTIAL');
  assert.equal(row.score,null);
  assert.ok(row.missing.includes('breadthDivergence'));
});

test('Asset Bubble becomes READY only when all six locked components are present', () => {
  const q='2026-Q1';
  const out=buildAssetBubbleR9Partial({
    valuationScoreRows:[{quarter:q,value:60}],
    priceAccelerationQuarterRows:[{quarter:q,priceAccelScore:70}],
    riskAssetShareScoreRows:[{quarter:q,value:80}],
    speculativeFlowRows:[{quarter:q,score:90}],
    breadthScoreRows:[{quarter:q,value:40}],
    excessLiquidityScoreRows:[{quarter:q,value:50}],
  });
  assert.equal(out.rows[0].status,'READY');
  assert.ok(Math.abs(out.rows[0].score-(60*.35+70*.25+80*.15+90*.10+40*.10+50*.05))<1e-12);
});
