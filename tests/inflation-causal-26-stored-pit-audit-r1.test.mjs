import test from 'node:test';
import assert from 'node:assert/strict';
import {INFLATION_CAUSAL_19} from '../lib/inflation-causal-public-catalog.mjs';
import {evaluateInflation26StoredPitAudit}
 from '../lib/inflation-causal-26-stored-pit-audit-r1.mjs';

const now=Date.parse('2026-11-15T12:00:00.000Z');
const store='2026-11-07T22:40:02.928Z';
const cutoffs=['2026-11-06T00:00:00.000Z','2026-11-15T00:00:00.000Z'];
const nineteen=(ready=19)=>({
 schemaVersion:'inflation-causal-public-19-r1-v1',
 status:ready===19?'READY':'PARTIAL',
 score:null,sourceStoredAt:Date.parse(store),
 sourceVersion:'INFL19_PRESENTATION_'+'a'.repeat(64),
 indicators:INFLATION_CAUSAL_19.map((m,i)=>i>=ready?({
  id:m.id,series:m.series,unit:m.unit,status:'PENDING',
  value:null,previousValue:null,observationDate:null,
  previousObservationDate:null,availableAt:null,sourceStoredAt:null,history:[],
 }):({
  id:m.id,series:m.series,unit:m.unit,status:'READY',
  value:2,previousValue:1,observationDate:'2026-10-01',
  previousObservationDate:'2026-09-01',availableAt:null,
  sourceStoredAt:store,
  history:[{date:'2026-09',value:1},{date:'2026-10',value:2}],
 })),
});
const eia=()=>({
 schemaVersion:1,provider:'EIA',sourceVersion:'INFLATION_CAUSAL_CANDIDATE_EIA_REGULAR_R1',
 sourceStoredAt:store,selector:'EMM_EPMR_PTE_NUS_DPG',frequency:'WEEKLY',
 unit:'USD_PER_GALLON',
 observations:[
  {date:'2026-10-26',value:3.00,unit:'USD_PER_GALLON'},
  {date:'2026-11-02',value:3.01,unit:'USD_PER_GALLON'},
 ],
});
const supplemental=()=>({
 'eia-us-regular-gasoline-weekly.json':eia(),
 'treasury-mts-customs-duties.json':{
  schemaVersion:1,provider:'US_TREASURY_MTS',
  sourceVersion:'INFLATION_CAUSAL_CANDIDATE_TREASURY_MTS_R1',
  sourceStoredAt:store,lineCode:'405',classification:'Customs Duties',frequency:'MONTHLY',
  observations:[{date:'2026-09-30',period:'2026-09',netUsdDecimal:'0.00',
   unit:'USD',valueKind:'MONTHLY_NET_CASH_RECEIPTS'}],
 },
 'bls-cpi-ppi3.json':{
  schemaVersion:1,provider:'BLS',
  sourceVersion:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1',
  sourceStoredAt:store,frequency:'MONTHLY',
  series:{WPSFD4:[{date:'2026-09-01',value:159.78}]},
 },
 'fed-g17-manufacturing-ip.json':{
  schemaVersion:1,provider:'FEDERAL_RESERVE_G17',
  sourceVersion:'INFLATION_CAUSAL_CANDIDATE_FED_G17_R1',
  sourceStoredAt:store,selector:'GMF',frequency:'MONTHLY',
  unit:'CURRENT_G17_INDEX_SA',
  observations:[{date:'1972-01-01',value:33.4},{date:'2026-09-01',value:100.1}],
 },
});
const audit=(public19=nineteen(),seven=supplemental(),dates=cutoffs)=>
 evaluateInflation26StoredPitAudit({
  nineteenPublicPayload:public19,sevenDocumentsByFile:seven,
  cutoffs:dates,now
 });
const byId=(r,id)=>r.candidates.find(c=>c.id===id);

test('the actual 19+7 document shapes combine into 23/26 storage-level PIT inputs',()=>{
 const r=audit();
 assert.equal(r.schema,'W01_INFLATION26_STORED_PIT_AUDIT_R1');
 assert.equal(r.sourceCandidates,26);
 assert.equal(r.originalResearchCandidates,30);
 assert.equal(r.old19WithStoredCutoffEvidence,19);
 assert.equal(r.new7WithStoredCutoffEvidence,4);
 assert.equal(r.sourcesWithStoredCutoffEvidence,23);
 assert.equal(r.fullCutoffCoverage,0);
 assert.equal(r.candidates.length,30);
 assert.equal(r.selectedIndicators,0);
 assert.equal(r.approvedCompositeFormula,false);
 assert.equal(r.rawEgress,0);
 assert.equal(r.providerCalls+r.dbWrites+r.d1Writes,0);
 assert.equal(JSON.stringify(r).includes('159.78'),false);
});

test('release time is never inferred and earlier cutoff cannot consume later snapshot',()=>{
 const r=audit();
 assert.equal(byId(r,'1').availableCutoffs,1);
 assert.equal(byId(r,'1').storageOnlyCutoffs,1);
 assert.equal(byId(r,'1').releaseVerifiedCutoffs,0);
 assert.equal(byId(r,'1').firstFail.reason,'NOT_YET_AVAILABLE_AT_CUTOFF');
 assert.equal(r.releaseTimesNotInvented,true);
 assert.equal(byId(r,'29').storageOnlyCutoffs,1);
});

test('invalid CPI/Census persist as unavailable but valid original PPI is retained',()=>{
 const r=audit();
 for(const id of ['22','23','28']){
  assert.equal(byId(r,id).availableCutoffs,0);
  assert.equal(r.sourceErrors[id],id==='28'?'SOURCE_FILE_NOT_SUPPLIED':
   'INFL7_SOURCE_ROWS_MISSING');
 }
 assert.equal(byId(r,'24').availableCutoffs,1);
 assert.equal(byId(r,'24').lastObservationDate,'2026-09-01');
 assert.equal(byId(r,'16').availableCutoffs,1); // actual numeric zero is not missing
});

test('one missing 19 source never becomes ready because another item is valid',()=>{
 const r=audit(nineteen(18),supplemental());
 assert.equal(r.old19WithStoredCutoffEvidence,18);
 assert.equal(r.sourcesWithStoredCutoffEvidence,22);
 assert.equal(byId(r,'31').status,'PIT_UNVERIFIED');
});

test('the candidate inventory still excludes #20 and #27 double weight',()=>{
 const r=audit();
 assert.equal(r.candidates.some(x=>x.id==='20'),false);
 assert.equal(byId(r,'27').status,'MERGED_NO_NEW_RAW_SOURCE');
 for(const id of ['15','17','30'])
  assert.equal(byId(r,id).status,'DEFINITION_NOT_APPROVED');
 for(const id of ['22','23'])assert.equal(byId(r,id).eligibleAsPredictor,false);
});

test('19 known official availableAt is never applied to unrelated historical month',()=>{
 const p=nineteen();
 p.indicators[0].availableAt='2026-11-07T11:00:00.000Z';
 const r=audit(p);
 assert.equal(byId(r,'1').availableCutoffs,1);
 assert.equal(byId(r,'1').releaseVerifiedCutoffs,1);
 assert.equal(byId(r,'1').storageOnlyCutoffs,0);
 // Earlier cutoff still unavailable; partial summary month never had an
 // invented historical release and cannot be used before the store timestamp.
 assert.equal(byId(r,'1').firstFail.reason,'NOT_YET_AVAILABLE_AT_CUTOFF');
});

test('all missing projected sources remain unverified, never invent 19/19',()=>{
 const r=audit(nineteen(0),{});
 assert.equal(r.old19WithStoredCutoffEvidence,0);
 assert.equal(r.new7WithStoredCutoffEvidence,0);
 assert.equal(r.sourcesWithStoredCutoffEvidence,0);
 assert.equal(r.candidates.filter(x=>x.availableCutoffs>0).length,0);
});

test('tampered contract is not silently accepted as live PC evidence',()=>{
 const changed=nineteen();
 changed.indicators[0].series='FORGED';
 assert.throws(()=>audit(changed),
  /INFLATION_CAUSAL_PUBLIC_SERIES_INVALID/);
 const altered=nineteen();
 altered.indicators[0].history[1].value=200;
 assert.throws(()=>audit(altered),e=>e.code==='W01_PIT_19_PUBLIC_HISTORY_CONFLICT');
 assert.throws(()=>audit(nineteen(),{'raw-secret.json':{}}),
  e=>e.code==='W01_PIT_PRIVATE_FILE_SCOPE_STOP');
});
