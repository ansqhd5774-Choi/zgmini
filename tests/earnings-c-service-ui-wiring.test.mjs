// W05: source-free desktop/mobile BLS service view regression.
// Never accesses provider, operational PC SQLite or Cloudflare D1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  EARNINGS_C_COST_SCHEMA,
  KNOWN_EARNINGS_COST_INDICATORS,
  OPTIONAL_EARNINGS_COST_INDICATORS,
  buildEarningsCostIndicatorView,
} from '../app/earnings-recession/earnings-cost-indicator-list.mjs';

const mkRow=(meta,edits={})=>({
  indicatorId:meta.id,name:meta.name,category:'COST_PRESSURE',
  provider:'BLS',seriesId:meta.series,
  sourceURL:'https://data.bls.gov/timeseries/'+meta.series,
  kind:meta.kind,unit:meta.unit,
  changeUnit:meta.unit==='INDEX'?'INDEX_POINTS':'PERCENTAGE_POINTS',
  frequency:meta.series==='PRS85006111'?'QUARTERLY':'MONTHLY',
  adjustment:'SA',status:'READY',value:158.076,
  freshness:{status:'FRESH',reason:null},
  ...edits,
});
const oldRows=KNOWN_EARNINGS_COST_INDICATORS.map(meta=>mkRow(meta));
const extraRows=OPTIONAL_EARNINGS_COST_INDICATORS.map(meta=>mkRow(meta));
const payload=rows=>({
  schemaVersion:EARNINGS_C_COST_SCHEMA,
  historicalMode:'CURRENT_RETRIEVAL_NOT_PIT',
  rows,
});
const ids=x=>x.indicators.map(row=>row.id);

test('before D1 publishes WPSFD42, both desktop and mobile keep the original five metadata entries',()=>{
  const missing=buildEarningsCostIndicatorView(null);
  assert.equal(missing.valid,false);
  assert.equal(missing.indicators.length,5);
  assert.equal(missing.rows.length,0);
  const current=buildEarningsCostIndicatorView(payload(oldRows));
  assert.equal(current.valid,true);
  assert.deepEqual(ids(current),KNOWN_EARNINGS_COST_INDICATORS.map(row=>row.id));
  assert.equal(current.rows.length,5);
});

test('after verified service 2-row GET, only the two WPSFD42 entries extend the five',()=>{
  const view=buildEarningsCostIndicatorView(payload([...oldRows,...extraRows]));
  assert.equal(view.valid,true);
  assert.equal(view.indicators.length,7);
  assert.equal(view.rows.length,7);
  assert.deepEqual(ids(view).slice(5),[
    'bls_ppi_services_yoy_sa','bls_ppi_services_index',
  ]);
  assert.ok(view.rows.slice(5).every(row=>row.seriesId==='WPSFD42'));
});

test('WPSFD42 is atomic: partial, stale, duplicate or malformed service observations leave five',()=>{
  const first=extraRows[0],second=extraRows[1];
  const cases=[
    [...oldRows,first],
    [...oldRows,second],
    [...oldRows,first,{...second,status:'PARTIAL',value:null}],
    [...oldRows,{...first,freshness:{status:'STALE',reason:'OBSERVATION_EXPIRED'}},second],
    [...oldRows,first,{...second,seriesId:'WPSFD41'}],
    [...oldRows,first,{...second,sourceURL:'https://other.example/data'}],
    [...oldRows,first,first,second],
  ];
  for(const source of cases){
    const view=buildEarningsCostIndicatorView(payload(source));
    assert.equal(view.indicators.length,5);
    assert.deepEqual(ids(view),KNOWN_EARNINGS_COST_INDICATORS.map(x=>x.id));
    assert.ok(view.rows.every(row=>row.seriesId!=='WPSFD42'));
  }
});

test('unknown row, bad schema and invalid provider do not add published indicator lines',()=>{
  const unknown={...mkRow(extraRows[0]),indicatorId:'bls_unapproved_sample'};
  const wrong={...extraRows[1],provider:'UNKNOWN'};
  const view=buildEarningsCostIndicatorView(payload([...oldRows,...extraRows,unknown]));
  assert.equal(view.indicators.length,7);
  assert.ok(!ids(view).includes(unknown.indicatorId));
  const wrongPair=buildEarningsCostIndicatorView(payload([...oldRows,extraRows[0],wrong]));
  assert.equal(wrongPair.indicators.length,5);
  const invalid=buildEarningsCostIndicatorView({
    ...payload([...oldRows,...extraRows]),schemaVersion:'not-an-approved-schema',
  });
  assert.equal(invalid.valid,false);
  assert.equal(invalid.indicators.length,5);
  assert.equal(invalid.rows.length,0);
});

test('desktop table and mobile cards use the same validated indicator adapter',()=>{
  const jsx=fs.readFileSync(new URL('../app/earnings-recession/earnings-risk-only-panel.tsx',import.meta.url),'utf8');
  assert.match(jsx,/import \{buildEarningsCostIndicatorView\} from ".\/earnings-cost-indicator-list\.mjs"/);
  assert.match(jsx,/const costView=buildEarningsCostIndicatorView\(costPayload\)/);
  assert.match(jsx,/const costIndicators=costView\.indicators/);
  assert.equal((jsx.match(/\{costIndicators\.map\(meta=>/g)||[]).length,2);
  assert.doesNotMatch(jsx,/const costIndicators=\[/);
  assert.doesNotMatch(jsx,/fetch\(['"]https:\/\/data\.bls\.gov/);
});
