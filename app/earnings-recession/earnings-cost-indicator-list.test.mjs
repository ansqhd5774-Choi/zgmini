import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEarningsCostIndicatorView,KNOWN_EARNINGS_COST_INDICATORS,EARNINGS_C_COST_SCHEMA}
  from './earnings-cost-indicator-list.mjs';

const bls=(id,series,name='추가 BLS 지표',kind='RAW',unit='PERCENT')=>({
  indicatorId:id,seriesId:series,name,kind,unit,provider:'BLS',category:'COST_PRESSURE',
  sourceURL:'https://data.bls.gov/timeseries/'+series,
  frequency:series==='PRS85006111'?'QUARTERLY':'MONTHLY',adjustment:'SA',
  changeUnit:unit==='INDEX'?'INDEX_POINTS':'PERCENTAGE_POINTS',
  value:null,status:'PENDING',
});
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
    bls('bls_ppi_final_demand_yoy_sa','WPSFD4','서버 이름은 다름','DERIVED'),
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

test('verified WPSFD42 activates both service labels and rejects identity substitutions',()=>{
  const yoy=bls('bls_ppi_services_yoy_sa','WPSFD42','서버 제목',
    'DERIVED','PERCENT');
  const index=bls('bls_ppi_services_index','WPSFD42','서버 제목','RAW','INDEX');
  const view=buildEarningsCostIndicatorView(payload([yoy,index]));
  assert.equal(view.indicators.length,7);
  assert.equal(view.indicators[5].name,'서비스 생산자물가 상승률');
  assert.equal(view.indicators[6].name,'서비스 생산자물가 지수');
  const forged=buildEarningsCostIndicatorView(payload([
    {...yoy,seriesId:'WPSFD4',sourceURL:'https://data.bls.gov/timeseries/WPSFD4'},
    {...index,kind:'DERIVED',unit:'PERCENT',changeUnit:'PERCENTAGE_POINTS'},
  ]));
  assert.equal(forged.indicators.length,5);
  assert.equal(forged.rows.length,0);
});

test('spoofed source URL, wrong provider and duplicate IDs cannot extend list',()=>{
  const good=bls('bls_new_verified_observation','PRS85006111');
  const wrong={...good,sourceURL:'javascript:alert(1)',indicatorId:'bls_wrong_url'};
  const other={...good,provider:'CENSUS',indicatorId:'bls_wrong_provider'};
  const view=buildEarningsCostIndicatorView(payload([good,good,wrong,other]));
  assert.equal(view.rows.length,1);
  assert.equal(view.indicators.length,6);
});

test('known indicator ID with wrong series, kind or unit is not assigned another source value',()=>{
  const id='bls_ppi_final_demand_yoy_sa';
  const invalid=[
    bls(id,'WPSFD41','잘못 연결','DERIVED'),
    bls(id,'WPSFD4','잘못 연결','RAW'),
    bls(id,'WPSFD4','잘못 연결','DERIVED','INDEX'),
  ];
  const view=buildEarningsCostIndicatorView(payload(invalid));
  assert.equal(view.valid,true);
  assert.equal(view.indicators.length,5);
  assert.equal(view.rows.length,0);
});

test('new BLS row with unrenderable unit, category or change unit stays excluded',()=>{
  const base=bls('bls_new_verified_observation','PRS85006111');
  const invalid=[
    {...base,indicatorId:'bls_bad_unit',unit:'USD'},
    {...base,indicatorId:'bls_bad_category',category:'SCORE'},
    {...base,indicatorId:'bls_bad_change',changeUnit:'PERCENT'},
  ];
  const view=buildEarningsCostIndicatorView(payload(invalid));
  assert.equal(view.rows.length,0);
  assert.equal(view.indicators.length,5);
});

test('unknown schema is not treated as published compatible data',()=>{
  const view=buildEarningsCostIndicatorView({...payload([bls('bls_new_verified_observation','WPSFD4')]),schemaVersion:'future-contract'});
  assert.equal(view.valid,false);
  assert.equal(view.indicators.length,5);
});
