// Tests the verified R3 -> R4 draft -> QFR D1 schema bridge without D1 or PC writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseQfrD1Mode,prepareQfrD1Payload} from './EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs';
import {QFR_SNAPSHOT_KEY,QFR_SCHEMA} from '../../worker/earnings-companion-c-qfr-r1.mjs';

const SOURCE='2026-10-27T14:52:13.108Z';
const AT=Date.parse('2026-10-28T02:00:00.000Z');
const history=['2025-Q2','2025-Q3','2025-Q4','2026-Q1','2026-Q2']
  .map((period,i)=>({period,salesMillionsUSD:1000+i*100,
    afterTaxProfitMillionsUSD:100+i*20,
    afterTaxProfitMarginPct:100*(100+i*20)/(1000+i*100)}));
function preview(){
  const current=history.at(-1),previous=history.at(-2);
  return {status:'PASS_QFR_STORED_READONLY_PREVIEW',provider:'CENSUS',
    dataset:'QFR_MFG_US_NSA_AFTER_TAX_MARGIN',
    contract:'EARNINGS_CENSUS_QFR_MFG_RAW_ZIP_V1',
    snapshotSha256:'a'.repeat(64),sourceSha256:'b'.repeat(64),
    sourceStoredAt:Date.parse(SOURCE),sourceRetrievedAt:SOURCE,
    historyMode:'CURRENT_RETRIEVAL_NOT_PIT',officialVintageId:null,
    adjustment:'NOT_SEASONALLY_ADJUSTED',
    sourceURL:'https://www.census.gov/econ_getzippedfile/?programCode=QFR',
    scoreInput:false,independentSourceCount:1,storedSnapshotsChecked:1,
    observedThrough:current.period,history:structuredClone(history),
    indicator:{indicatorId:'census_qfr_manufacturing_after_tax_margin_nsa',
      kind:'DERIVED',unit:'PERCENT',value:current.afterTaxProfitMarginPct,
      previousValue:previous.afterTaxProfitMarginPct,
      changePercentagePoints:current.afterTaxProfitMarginPct-previous.afterTaxProfitMarginPct,
      observationPeriod:current.period,previousPeriod:previous.period,releaseDate:null,
      methodology:'100 * after_tax_profit_millions_usd / sales_millions_usd'},
  };
}

test('publisher mode is dry-run unless BOTH apply and exact confirmation are given',()=>{
  assert.deepEqual(parseQfrD1Mode([]),{apply:false});
  assert.deepEqual(parseQfrD1Mode(['--dry-run']),{apply:false});
  assert.deepEqual(parseQfrD1Mode(['--apply','--confirm-census-qfr-d1-write']),{apply:true});
  for(const args of [['--apply'],['--confirm-census-qfr-d1-write'],
    ['--dry-run','--apply','--confirm-census-qfr-d1-write'],['--force'],
    ['--apply','--confirm-census-qfr-d1-write','--force']])
    assert.throws(()=>parseQfrD1Mode(args),/QFR_D1_EXPLICIT_CONFIRMATION_REQUIRED/);
});
test('R3 stored preview projects to approved independent key/schema and fixed original checkpoint',()=>{
  const p=preview();
  const out=prepareQfrD1Payload(p,{generatedAt:'2026-10-27T15:05:00.000Z',now:AT});
  assert.equal(out.payload.schemaVersion,QFR_SCHEMA);
  assert.equal(QFR_SNAPSHOT_KEY,'detail:earnings-recession-indicators:census-qfr-mfg-margin:v1');
  assert.equal(out.payload.sourceVersion,p.snapshotSha256);
  assert.equal(out.payload.sourceStoredAt,p.sourceStoredAt);
  assert.equal(out.payload.rows.length,1);
  assert.equal(out.payload.rows[0].provider,'CENSUS');
  assert.equal(out.payload.rows[0].history.length,5);
  assert.equal(out.payload.rows[0].releaseDate,null);
  assert.equal(out.payload.rows[0].officialVintageId,null);
  assert.doesNotMatch(JSON.stringify(out),/rawZipBase64/);
});
test('source lineage edits and a stale source fail before any DB adapter',()=>{
  const p=preview();p.indicator.value+=1;
  assert.throws(()=>prepareQfrD1Payload(p,{generatedAt:'2026-10-27T15:05:00.000Z',now:AT}),
    /QFR_R4_INDICATOR_LINEAGE_INVALID/);
  const correct=preview();
  assert.throws(()=>prepareQfrD1Payload(correct,{generatedAt:'2026-10-27T15:05:00.000Z',
    now:Date.parse('2027-07-01T00:00:00.000Z')}),/QFR_D1_SOURCE_STALE/);
});
