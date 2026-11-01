import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBeaManufacturingProfitCsv,buildBeaManufacturingProfitPreview,
  BEA_MFG_PROFIT_SERIES} from '../lib/market-score/earnings-bea-manufacturing-profit-source-r1.mjs';

const data=`observation_date,${BEA_MFG_PROFIT_SERIES}\n2025-04-01,681.285\n2025-07-01,741.175\n2025-10-01,801.724\n2026-01-01,812.346\n2026-04-01,1053.304\n`;
const config={sourceVersion:'f'.repeat(64),sourceStoredAt:Date.parse('2026-10-28T00:00:00.000Z')};

test('BEA manufacturing 2026-Q2 YoY from five official-quarter observations',()=>{
  const out=buildBeaManufacturingProfitPreview(data,config);
  assert.equal(out.indicator.observationPeriod,'2026-Q2');
  assert.equal(out.indicator.yearAgoPeriod,'2025-Q2');
  assert.equal(out.indicator.history.length,5);
  assert.ok(Math.abs(out.indicator.value-(1053.304/681.285-1)*100)<1e-12);
  assert.equal(out.indicator.profitsDefinition,'WITH_INVENTORY_VALUATION_ADJUSTMENT');
  assert.equal(out.indicator.officialReleaseDate,null);
  assert.equal(out.indicator.source,'BEA NIPA Table 6.16D N400RC');
});

test('parser rejects wrong series or missing/fabricated profit',()=>{
  assert.throws(()=>parseBeaManufacturingProfitCsv(data.replace(BEA_MFG_PROFIT_SERIES,'WRONG')),/INVALID_CSV_HEADER/);
  assert.throws(()=>parseBeaManufacturingProfitCsv(data.replace('812.346','.')),/INVALID_VALUE/);
  assert.throws(()=>parseBeaManufacturingProfitCsv(data.replace('2025-10-01','2025-07-01')),/NONCONTIGUOUS/);
});

test('derived YoY rejects zero or negative prior-year profits',()=>{
  assert.throws(()=>buildBeaManufacturingProfitPreview(data.replace('681.285','0.000'),config),/YOY_BASE_NONPOSITIVE/);
  assert.throws(()=>buildBeaManufacturingProfitPreview(data.replace('681.285','-1.000'),config),/YOY_BASE_NONPOSITIVE/);
});

test('unapproved source checkpoint and future observation fail closed',()=>{
  assert.throws(()=>buildBeaManufacturingProfitPreview(data,{...config,sourceVersion:'changed'}),/SOURCE_CHECKPOINT/);
  assert.throws(()=>buildBeaManufacturingProfitPreview(data,{...config,sourceStoredAt:Date.parse('2026-05-01T00:00:00Z')}),/FUTURE_OBSERVATION/);
});
