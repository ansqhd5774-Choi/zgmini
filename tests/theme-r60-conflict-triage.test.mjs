import test from 'node:test';
import assert from 'node:assert/strict';
import {auditR60,R60_VERSION} from '../lib/market-score/theme-r60-conflict-triage.mjs';
function fixture(){
 const symbols=Array.from({length:16},(_,i)=>'S'+i),missing=Array.from({length:29},(_,i)=>'M'+i);
 const policy={networkCalls:0,providerCalls:0,dbWrites:0,writerCalls:0,productionMutation:false};
 const r57={audit:'R57_CIBR_45_EXISTING_BASE_AND_INCREMENTAL_STOCK_COVERAGE',asof:'2026-10-16',sourceComplete:true,policy,
 source:{totalFiles:660,base:{filesParsed:55},incremental:{filesParsed:605}},auditStatus:'CONFLICTS_REQUIRE_REVIEW',
 coverage:{integrity:{conflictingTickerDatePairs:16},cib45:{tracked:45,withAtLeastOneDate:16,withTargetDate:16,atLeast756Dates:16,missingCompletely:missing,missingTargetDate:[...missing]},perTicker:[...symbols.map(symbol=>({symbol,hasTargetDate:true})),...missing.map(symbol=>({symbol,hasTargetDate:false}))]},
 staticSnapshotDateIntersection:{allMembersSharedObservedDates:0,fullHistoricalConstituentMembershipVerified:false}};
 const conflictSourceFiles=symbols.map((symbol,i)=>({symbol,date:'2026-10-15',records:2,variants:2,priceUnchanged:true,allRowsAlpacaIexSplit:true,selection:'NO_AUTOMATIC_WINNER',volumeDifferenceBand:i?'10_TO_LT_25_PCT':'5_TO_LT_10_PCT',versions:[
  {observations:1,fileModificationIsCaptureTimestamp:false,firstSeenFile:'2026-10-14-2026-10-15-group-000.json',firstFileSha256:'first-'+symbol,requestWindowAtFirst:{targetInside:true}},
  {observations:1,fileModificationIsCaptureTimestamp:false,firstSeenFile:'2026-10-15-2026-10-16-group-000.json',firstFileSha256:'second-'+symbol,requestWindowAtFirst:{targetInside:true}}
 ]}));
 const r59={audit:'R59_CIBR_2026_10_15_INCREMENTAL_VOLUME_PROVENANCE',asof:'2026-10-16',targetConflictDate:'2026-10-15',policy,sourceUnchangedFromR58:true,provenanceStatus:'METADATA_LOCATED_VOLUME_REVISION_UNRESOLVED',approvedReplacementValues:0,counts:{uniqueVolumeOnlyConflicts:16,matchedTargetRows:32,inspectedIncrementalFiles:605},conflictSourceFiles};
 return {r57,r59};
}
test('synthetic metadata remains research-only and leaves every revision unresolved',()=>{
 const {r57,r59}=fixture(),x=auditR60(r57,r59);
 assert.equal(x.version,R60_VERSION);assert.equal(x.missingMembers,29);assert.equal(x.priceDifferences,0);
 assert.equal(x.publicFiveAxisScoresAllowed,0);assert.equal(x.eligibleVolumeRevisionSelections,0);
});
test('rejects a silent revised volume winner',()=>{
 const {r57,r59}=fixture();r59.approvedReplacementValues=16;assert.throws(()=>auditR60(r57,r59),/R59_UNRESOLVED_PROVENANCE/);
});
test('rejects overlapping windows from unexpected dates',()=>{
 const {r57,r59}=fixture();r59.conflictSourceFiles[0].versions[0].firstSeenFile='2026-10-13-2026-10-15-group-000.json';
 assert.throws(()=>auditR60(r57,r59),/UNKNOWN_WINDOWS/);
});
test('rejects claiming historical PIT was verified',()=>{
 const {r57,r59}=fixture();r57.staticSnapshotDateIntersection.fullHistoricalConstituentMembershipVerified=true;
 assert.throws(()=>auditR60(r57,r59),/PIT_NOT_VERIFIED/);
});
test('rejects missing constituent drift and same file copies',()=>{
 const a=fixture();a.r57.coverage.cib45.missingCompletely.pop();assert.throws(()=>auditR60(a.r57,a.r59),/CIBR_COVERAGE/);
 const b=fixture();b.r59.conflictSourceFiles[0].versions[1].firstFileSha256='first-S0';
 assert.throws(()=>auditR60(b.r57,b.r59),/NON_DISTINCT_VERSIONS/);
});
test('rejects implicit provider fetches or writes',()=>{
 const a=fixture();a.r59.policy={...a.r59.policy,networkCalls:1};
 assert.throws(()=>auditR60(a.r57,a.r59),/NO_MUTATION_POLICY/);
});
