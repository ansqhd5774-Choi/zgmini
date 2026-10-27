// Pure tests, no PC database, D1, network, or file writes.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {draftQfrPayload,QFR_DRAFT_SCHEMA,QFR_PROPOSED_D1_KEY}
  from './EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_READONLY.mjs';

const RETRIEVED_AT='2026-10-27T14:52:13.108Z';
const GENERATED_AT='2026-10-27T15:00:00.000Z';
const history=['2025-Q2','2025-Q3','2025-Q4','2026-Q1','2026-Q2']
  .map((period,i)=>({period,salesMillionsUSD:1000+i*100,
    afterTaxProfitMillionsUSD:100+i*20,
    afterTaxProfitMarginPct:100*(100+i*20)/(1000+i*100)}));
const current=history.at(-1),previous=history.at(-2);
function preview(){
  return {status:'PASS_QFR_STORED_READONLY_PREVIEW',provider:'CENSUS',
    dataset:'QFR_MFG_US_NSA_AFTER_TAX_MARGIN',
    contract:'EARNINGS_CENSUS_QFR_MFG_RAW_ZIP_V1',
    snapshotSha256:'a'.repeat(64),sourceSha256:'b'.repeat(64),
    sourceStoredAt:Date.parse(RETRIEVED_AT),sourceRetrievedAt:RETRIEVED_AT,
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
const make=p=>draftQfrPayload(p,{generatedAt:GENERATED_AT});

test('read-only projection keeps one independent Census row and a separate checkpoint',()=>{
  const p=preview(),a=make(p),b=make(p);
  assert.deepEqual(a,b);
  assert.equal(a.proposedKey,QFR_PROPOSED_D1_KEY);
  assert.equal(a.payload.schemaVersion,QFR_DRAFT_SCHEMA);
  assert.equal(a.payload.sourceVersion,p.snapshotSha256);
  assert.equal(a.payload.sourceSha256,p.sourceSha256);
  assert.equal(a.payload.sourceStoredAt,Date.parse(RETRIEVED_AT));
  assert.deepEqual(a.payload.coverage,{configured:1,ready:1,independentSources:1});
  assert.equal(a.payload.rows.length,1);
  assert.equal(a.payload.rows[0].adjustment,'NSA');
  assert.equal(a.payload.rows[0].category,'PROFITABILITY');
  assert.equal(a.payload.rows[0].changeUnit,'PERCENTAGE_POINTS');
  assert.equal(a.payload.rows[0].releaseDate,null);
  assert.equal(a.payload.rows[0].officialVintageId,null);
  assert.equal(a.payload.rows[0].history.length,5);
  assert.equal(a.approvedForD1Write,false);
  assert.equal(a.workerRegistered,false);
  assert.equal(a.siteDeployed,false);
  assert.doesNotMatch(JSON.stringify(a),/rawZipBase64|SALES_MILLIONS_USD_RAW/);
});

test('false score eligibility and historical PIT claim are rejected',()=>{
  for(const property of [{scoreInput:true},{historyMode:'HISTORICAL_PIT'},{officialVintageId:'unverified'}]){
    assert.throws(()=>make({...preview(),...property}),/QFR_R4_SOURCE_PREVIEW_INVALID/);
  }
});

test('changed raw profit without rederived margin is rejected',()=>{
  const p=preview();p.history.at(-1).afterTaxProfitMillionsUSD=999;
  assert.throws(()=>make(p),/QFR_R4_HISTORY_LINEAGE_INVALID/);
});

test('gap, duplicate quarter and wrong previous margin are rejected',()=>{
  const gap=preview();gap.history[2].period='2026-Q1';
  assert.throws(()=>make(gap),/QFR_R4_HISTORY_LINEAGE_INVALID/);
  const wrong=preview();wrong.indicator.previousValue+=1;
  assert.throws(()=>make(wrong),/QFR_R4_INDICATOR_LINEAGE_INVALID/);
});

test('untrusted sourceStoredAt and future generation fail before key or D1 publication',()=>{
  const wrong=preview();wrong.sourceStoredAt--;
  assert.throws(()=>make(wrong),/QFR_R4_SOURCE_PREVIEW_INVALID/);
  assert.throws(()=>draftQfrPayload(preview(),{generatedAt:'2099-01-01T00:00:00.000Z'}),
    /QFR_R4_SOURCE_PREVIEW_INVALID/);
});
