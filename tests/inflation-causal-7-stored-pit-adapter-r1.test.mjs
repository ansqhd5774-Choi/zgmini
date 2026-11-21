import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateInflation7StoredPitAdapter,INFLATION7_PRIVATE_RAW_FILES}
 from '../lib/inflation-causal-7-stored-pit-adapter-r1.mjs';

const STORED='2026-11-07T10:20:30.000Z';
const NOW=Date.parse('2026-11-15T12:00:00.000Z');
const CUTOFFS=['2026-11-06T12:00:00.000Z','2026-11-08T12:00:00.000Z'];
const obs=(date,value,extra={})=>({date,value,...extra});
const docs=()=>({
 'eia-us-regular-gasoline-weekly.json':{
  schemaVersion:1,provider:'EIA',sourceVersion:'INFLATION_CAUSAL_CANDIDATE_EIA_REGULAR_R1',
  sourceStoredAt:STORED,selector:'EMM_EPMR_PTE_NUS_DPG',frequency:'WEEKLY',
  unit:'USD_PER_GALLON',observations:[
   obs('2026-10-26',3.04,{unit:'USD_PER_GALLON'}),
   obs('2026-11-02',3.01,{unit:'USD_PER_GALLON'}),
  ],
 },
 'treasury-mts-customs-duties.json':{
  schemaVersion:1,provider:'US_TREASURY_MTS',sourceVersion:'INFLATION_CAUSAL_CANDIDATE_TREASURY_MTS_R1',
  sourceStoredAt:STORED,lineCode:'405',classification:'Customs Duties',frequency:'MONTHLY',
  observations:[obs('2026-09-30',null,{period:'2026-09',netUsdDecimal:'0.00',
   unit:'USD',valueKind:'MONTHLY_NET_CASH_RECEIPTS'})],
 },
 'bls-cpi-ppi3.json':{
  schemaVersion:1,provider:'BLS',sourceVersion:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1',
  sourceStoredAt:STORED,frequency:'MONTHLY',
  series:{
   CUSR0000SEHA:[obs('2026-09-01',450.1)],
   CUSR0000SEHC01:[obs('2026-09-01',445.2)],
   WPSFD4:[obs('2026-09-01',159.78)],
  },
 },
 'census-m3-manufacturing-inventories.json':{
  schemaVersion:1,provider:'US_CENSUS_M3',
  sourceVersion:'INFLATION_CAUSAL_CANDIDATE_CENSUS_M3_R1',
  sourceStoredAt:STORED,selector:'MTM/TI',frequency:'MONTHLY',
  unit:'USD_MILLION_SA_NOMINAL',
  observations:[obs('2026-09-01',976044,{unit:'USD_MILLION_SA_NOMINAL',
   selector:'MTM/TI',seasonallyAdjusted:true})],
 },
 'fed-g17-manufacturing-ip.json':{
  schemaVersion:1,provider:'FEDERAL_RESERVE_G17',
  sourceVersion:'INFLATION_CAUSAL_CANDIDATE_FED_G17_R1',
  sourceStoredAt:STORED,selector:'GMF',frequency:'MONTHLY',
  unit:'CURRENT_G17_INDEX_SA',
  observations:[obs('1972-01-01',33.4),obs('2026-09-01',100.1)],
 },
});
const pit=(input=docs(),cutoffs=CUTOFFS)=>evaluateInflation7StoredPitAdapter({
 documentsByFile:input,cutoffs,now:NOW
});
const find=(r,id)=>r.evaluation.candidates.find(x=>x.id===id);

test('all five real document shapes supply seven IDs without claiming early PIT',()=>{
 const out=pit();
 assert.equal(out.schema,'W01_PRIVATE_INFLATION7_STORED_PIT_AUDIT_R1');
 assert.equal(out.sourceFilesSupplied,5);
 assert.equal(out.sourceRowsParsed,7);
 assert.deepEqual(out.sevenIdsWithConservativePIT,['2','16','22','23','24','28','29']);
 assert.equal(out.sevenCandidatesWithConservativePIT,7);
 for(const id of out.sevenIdsWithConservativePIT){
  assert.equal(find(out,id).availableCutoffs,1);
  assert.equal(find(out,id).storageOnlyCutoffs,1);
  assert.equal(find(out,id).releaseVerifiedCutoffs,0);
  assert.equal(find(out,id).firstFail.reason,'NOT_YET_AVAILABLE_AT_CUTOFF');
 }
 assert.equal(out.providerCalls,0);
 assert.equal(out.dbWrites,0);
 assert.equal(out.d1Writes,0);
 assert.equal(out.rawEgress,0);
 assert.equal(JSON.stringify(out).includes('976044'),false);
});

test('PPI can be valid when CPI and Census are missing: 4/7, not invented 7/7',()=>{
 const source=docs();
 source['bls-cpi-ppi3.json'].series={WPSFD4:source['bls-cpi-ppi3.json'].series.WPSFD4};
 delete source['census-m3-manufacturing-inventories.json'];
 const out=pit(source);
 assert.equal(out.sourceFilesSupplied,4);
 assert.deepEqual(out.sevenIdsWithConservativePIT,['2','16','24','29']);
 assert.equal(out.sevenCandidatesWithConservativePIT,4);
 assert.equal(out.sourceErrors['22'],'INFL7_SOURCE_ROWS_MISSING');
 assert.equal(out.sourceErrors['23'],'INFL7_SOURCE_ROWS_MISSING');
 assert.equal(out.sourceErrors['28'],'SOURCE_FILE_NOT_SUPPLIED');
 assert.equal(find(out,'22').availableCutoffs,0);
});

test('Treasury actual zero retains a row, and release date remains unknown',()=>{
 const out=pit();
 assert.equal(find(out,'16').status,'PIT_PARTIAL');
 assert.equal(find(out,'16').storageOnlyCutoffs,1);
 assert.equal(find(out,'16').releaseVerifiedCutoffs,0);
});

test('1972 G17 observation remains legitimate after the 2026 storage snapshot',()=>{
 const out=pit();
 assert.equal(find(out,'29').observationsSupplied,2);
 assert.equal(find(out,'29').availableCutoffs,1);
 assert.equal(find(out,'29').lastObservationDate,'2026-09-01');
});

test('bad source and future-stored document fail isolated, never produce fake PIT',()=>{
 const source=docs();
 source['eia-us-regular-gasoline-weekly.json'].sourceStoredAt=
  '2028-01-01T00:00:00.000Z';
 const out=pit(source);
 assert.equal(out.sourceErrors['2'],'INFL7_SOURCE_PROVENANCE_INVALID');
 assert.equal(find(out,'2').availableCutoffs,0);
 assert.equal(out.sevenCandidatesWithConservativePIT,6);
});

test('scope remains the exactly approved private five file names',()=>{
 assert.equal(Object.keys(INFLATION7_PRIVATE_RAW_FILES).length,7);
 assert.throws(()=>pit({'raw-secret.json':{}}),
  e=>e.code==='W01_PIT_PRIVATE_FILE_SCOPE_STOP');
 assert.throws(()=>pit(null),
  e=>e.code==='W01_PIT_PRIVATE_FILE_SCOPE_STOP');
});

test('a current stored snapshot does not create time travel for older cutoffs',()=>{
 const out=pit(docs(),['2025-03-01T00:00:00.000Z',
  '2026-11-06T00:00:00.000Z']);
 assert.equal(out.sevenCandidatesWithConservativePIT,0);
 assert.equal(out.evaluation.sourceCandidatesFullyObserved,0);
});
