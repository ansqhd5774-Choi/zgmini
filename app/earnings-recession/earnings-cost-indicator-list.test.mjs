import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEarningsCostIndicatorView,KNOWN_EARNINGS_COST_INDICATORS,EARNINGS_C_COST_SCHEMA}
  from './earnings-cost-indicator-list.mjs';

const bls=(id,series,name='추가 BLS 지표')=>({indicatorId:id,seriesId:series,name,
  kind:'RAW',provider:'BLS',sourceURL:'https://data.bls.gov/timeseries/'+series,
  value:null,status:'STALE'});
const payload=rows=>({schemaVersion:EARNINGS_C_COST_SCHEMA,
  historicalMode:'CURRENT_RETRIEVAL_NOT_PIT',rows});

test('pending response preserves the five known placeholders',()=>{
  const view=buildEarningsCostIndicatorView(null);
  assert.equal(view.valid,false);
  assert.equal(view.rows.length,0);
  assert.deepEqual(view.indicators,KNOWN_EARNINGS_COST_INDICATORS);
});

test('published known BLS series preserve existing names and order',()=>{
  const view=buildEarningsCostIndicatorView(payload([
    bls('bls_ppi_final_demand_yoy_sa','WPSFD4','서버 이름은 다름'),
    bls('bls_unit_labor_cost_yoy','PRS85006111'),
  ]));
  assert.equal(view.valid,true);
  assert.equal(view.indicators.length,5);
  assert.equal(view.indicators[0].name,'최종수요 생산자물가 상승률');
  assert.equal(view.rows.length,2);
});

test('new verified BLS row appears without changing the display array',()=>{
  const newId='bls_new_verified_observation';
  const view=buildEarningsCostIndicatorView(payload([bls(newId,'PRS85006111')]));
  assert.equal(view.indicators.length,6);
  assert.equal(view.indicators.at(-1).id,newId);
  assert.equal(view.rows[0].value,null);
});

test('spoofed source URL, wrong provider and duplicate IDs cannot extend list',()=>{
  const good=bls('bls_new_verified_observation','PRS85006111');
  const wrong={...good,sourceURL:'javascript:alert(1)',indicatorId:'bls_wrong_url'};
  const other={...good,provider:'CENSUS',indicatorId:'bls_wrong_provider'};
  const view=buildEarningsCostIndicatorView(payload([good,good,wrong,other]));
  assert.equal(view.rows.length,1);
  assert.equal(view.indicators.length,6);
});

test('unknown schema is not treated as published compatible data',()=>{
  const view=buildEarningsCostIndicatorView({...payload([bls('bls_new_verified_observation','WPSFD4')]),schemaVersion:'future-contract'});
  assert.equal(view.valid,false);
  assert.equal(view.indicators.length,5);
});
