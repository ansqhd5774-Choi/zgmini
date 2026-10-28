import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeAssetR10RawForUi} from '../app/asset-bubble/asset-r10-raw-ui-r1.mjs';

const ids=['valuationPressure','priceAcceleration','riskAssetShare',
 'speculativeFlows','breadthDivergence','excessLiquidity'];
const units=['TIMES_GDP','LOG_PERCENT_POINTS','PERCENTAGE_POINTS',
 'PERCENT_OF_PRIOR_HOLDINGS','PERCENTILE_POINTS','PERCENTAGE_POINTS'];
const base=()=>({status:'READY',methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',
 historyMode:'CURRENT_VINTAGE_ONLY',rightsStatus:'USER_ACCEPTED_UNVERIFIED',
 sourceVersion:'approved-vintage-2026',sourceStoredAt:100,
 asOfDate:'2026-10-28',scoreObservationQuarter:'2026-Q2',score:22.57324252737245,
 indicators:ids.map((id,i)=>({id,score:i*10,status:'READY',value:null,unit:'점'}))});
const raw=()=>({schemaVersion:'asset-bubble-r10-raw-r1-v1',status:'READY',
 sourceVersion:'approved-vintage-2026',sourceStoredAt:100,
 asOfDate:'2026-10-28',scoreObservationQuarter:'2026-Q2',
 rightsStatus:'USER_ACCEPTED_UNVERIFIED',diagnosticScore:22.57324252737245,
 factors:ids.map((id,i)=>({id,score:i*10,value:i+.12,previousValue:i+.09,
  unit:units[i],source:'APPROVED_STORED_SOURCE',
  observationDate:'2026-06-30',previousObservationDate:'2026-03-31'}))});

test('six raw values join, but total/component safety scores never change',()=>{
 const saved=base(),merged=mergeAssetR10RawForUi(saved,raw());
 assert.equal(merged.score,saved.score);
 assert.deepEqual(merged.indicators.map(x=>x.score),saved.indicators.map(x=>x.score));
 assert.deepEqual(merged.indicators.map(x=>x.value),[.12,1.12,2.12,3.12,4.12,5.12]);
 assert.deepEqual(merged.indicators.map(x=>x.unit),['배','로그 %p','%p','%','백분위점','%p']);
 assert.ok(saved.indicators.every(row=>row.value===null));
});
test('raw absent or mismatched vintage/score/quarters leaves existing score API intact',()=>{
 const saved=base();
 assert.equal(mergeAssetR10RawForUi(saved,null),saved);
 for(const field of ['sourceVersion','sourceStoredAt','asOfDate',
  'scoreObservationQuarter','diagnosticScore','rightsStatus']){
  const other=raw();other[field]=field==='sourceStoredAt'?200:
   field==='diagnosticScore'?24:'DIFFERENT';
  assert.equal(mergeAssetR10RawForUi(saved,other),saved,field);
 }
 const wrong=raw();wrong.factors[2].score=45;
 assert.equal(mergeAssetR10RawForUi(saved,wrong),saved);
});
test('four development-only rows are not included in six-factor join',()=>{
 const saved=base(),other=raw();other.factors.push({id:'optionsSpeculation',value:1});
 assert.equal(mergeAssetR10RawForUi(saved,other),saved);
});
