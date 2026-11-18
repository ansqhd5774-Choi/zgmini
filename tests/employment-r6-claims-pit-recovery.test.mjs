import test from "node:test";
import assert from "node:assert/strict";
import {EMPLOYMENT_R4_CORE_STATES} from "../lib/market-score/employment-r4-shadow-contract.mjs";
import {inspectStateClaimsPitReconciliation} from "../lib/market-score/employment-r6-claims-pit-recovery.mjs";
import {EMPLOYMENT_R6_FEATURES} from "../lib/market-score/employment-r6-formula.mjs";
import {computeFeaturePoint,deriveEmploymentR6FeatureHistory} from "../lib/market-score/employment-r6-feature-engine.mjs";

const H="a".repeat(64);
const at="2026-11-16T14:00:00.000Z";
const week=(i)=>new Date(Date.UTC(2015,4,2)+i*7*86_400_000).toISOString().slice(0,10);
function row(i,geo,extra={}){
 return {logical_series_id:"STATE_INITIAL_CLAIMS",geography_type:"STATE",
  geography_code:geo,observation_date:week(i),source_hash:H,
  provider:"DOL_ETA",provider_series_id:"ETA539:C3",frequency:"WEEKLY",
  quality_status:"READY_CORE_51",
  pit_class:"HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY",
  provenance_json:JSON.stringify({parser:"ETA539",truePitAsserted:false}),
  retrieved_at:"2026-11-09T10:02:32.682Z",available_at:null,
  value:10000+i+EMPLOYMENT_R4_CORE_STATES.indexOf(geo),
  ...extra};
}
function rows(weeks){
 const out=[];for(let i=0;i<weeks;i++)for(const geo of EMPLOYMENT_R4_CORE_STATES)
  out.push(row(i,geo));
 return out;
}
test("W04 source-only audit isolates missing 51-state CURRENT/HISTORY keys without mutation",()=>{
 const current=rows(9),history=current.slice(0,6*51);
 const old=structuredClone(current),prior=structuredClone(history);
 const p=inspectStateClaimsPitReconciliation({currentRows:current,historyRows:history,asOfIso:at});
 assert.equal(p.status,"REVIEW_MISSING_HISTORY");
 assert.equal(p.currentKnownKeys,459);
 assert.equal(p.historyMatchedKeys,306);
 assert.equal(p.missingHistoryKeys,153);
 assert.equal(p.metadataEligibleMissingKeys,153);
 assert.equal(p.metadataUnverifiedMissingKeys,0);
 assert.equal(p.currentComplete51Weeks,9);
 assert.equal(p.historyMatchedComplete51Weeks,6);
 assert.equal(p.currentLatestCompleteWeek,week(8));
 assert.equal(p.historyLatestMatchingCompleteWeek,week(5));
 assert.equal(p.firstMissingWeek,week(6));
 assert.equal(p.lastMissingWeek,week(8));
 assert.equal(p.repairAuthorized,false);
 assert.equal(p.providerCalls,0);
 assert.equal(p.operationalWrites,0);
 assert.deepEqual(current,old);
 assert.deepEqual(history,prior);
});
test("W04 source revision disagreement never becomes a silent missing-key repair",()=>{
 const old=row(0,"AL"),other={...old,source_hash:"b".repeat(64),value:101};
 const p=inspectStateClaimsPitReconciliation({currentRows:[old],historyRows:[other],asOfIso:at});
 assert.equal(p.status,"HOLD_REVISION_CONFLICTS");
 assert.equal(p.revisionDisagreements,1);
 assert.equal(p.missingHistoryKeys,0);
 assert.equal(p.metadataEligibleMissingKeys,0);
});
test("W04 older matching HISTORY revision cannot hide newer conflicting revision",()=>{
 const current=row(0,"AL"),old={...current,retrieved_at:"2026-11-09T10:02:32.682Z"},
  newer={...current,source_hash:"b".repeat(64),value:1234,
    retrieved_at:"2026-11-10T10:02:32.682Z"};
 const result=inspectStateClaimsPitReconciliation({
  currentRows:[current],historyRows:[old,newer],asOfIso:at});
 assert.equal(result.status,"HOLD_REVISION_CONFLICTS");
 assert.equal(result.historyMatchedKeys,0);
 assert.equal(result.revisionDisagreements,1);
 assert.equal(result.repairAuthorized,false);
});
test("W04 malformed or unproven source is not eligible for future History insertion",()=>{
 const original=row(0,"AL");
 for(const change of [
  {source_hash:"bad"},{value:-1},{provider:"THIRD_PARTY"},
  {provider_series_id:"CUSTOM"},{provenance_json:"{invalid"},
  {quality_status:"UNVERIFIED"},{pit_class:"FORGED"},
 ]){
  const p=inspectStateClaimsPitReconciliation({currentRows:[{...original,...change}],historyRows:[],asOfIso:at});
  assert.equal(p.status,"HOLD_UNVERIFIED_SOURCE_METADATA");
  assert.equal(p.metadataEligibleMissingKeys,0);
  assert.equal(p.metadataUnverifiedMissingKeys,1);
 }
});
test("W04 future availability and retrieval cannot backdate a historical PIT key",()=>{
 const original=row(0,"AL");
 const p=inspectStateClaimsPitReconciliation({
  currentRows:[original,{...row(1,"AK"),available_at:"2026-11-17T00:00:00Z"},
    {...row(2,"CA"),retrieved_at:"2026-11-17T00:00:00Z"}],
  historyRows:[],asOfIso:at});
 assert.equal(p.currentKnownKeys,1);
 assert.equal(p.missingHistoryKeys,1);
});
test("W04 missing one state prevents fabricated complete-51-week evidence",()=>{
 const current=rows(3).filter(x=>!(x.geography_code==="AL"&&x.observation_date===week(2)));
 const p=inspectStateClaimsPitReconciliation({currentRows:current,historyRows:[],asOfIso:at});
 assert.equal(p.currentKnownKeys,3*51-1);
 assert.equal(p.currentComplete51Weeks,2);
 assert.equal(p.historyMatchedComplete51Weeks,0);
});
test("W04 600 raw weeks prove formula could score only after full verified PIT lineage, not by changing weights",()=>{
 const current=rows(600),history=current.filter(x=>x.observation_date<=week(533));
 const report=inspectStateClaimsPitReconciliation({currentRows:current,historyRows:history,asOfIso:at});
 assert.equal(report.currentComplete51Weeks,600);
 assert.equal(report.historyMatchedComplete51Weeks,534);
 assert.equal(report.missingHistoryKeys,66*51);
 const feature=EMPLOYMENT_R6_FEATURES.find(x=>x.id==="STATE_CLAIMS_BREADTH");
 const historical=computeFeaturePoint(feature,history.map(x=>({
  logicalSeriesId:x.logical_series_id,geographyCode:x.geography_code,
  observationDate:x.observation_date,value:x.value,sourceHash:x.source_hash,
 })));
 assert.equal(historical.score,null);
 assert.equal(historical.status,"PARTIAL_HISTORY");
 const complete=computeFeaturePoint(feature,current.map(x=>({
  logicalSeriesId:x.logical_series_id,geographyCode:x.geography_code,
  observationDate:x.observation_date,value:x.value,sourceHash:x.source_hash,
 })));
 assert.equal(complete.status,"READY");
 assert.equal(Number.isFinite(complete.score),true);
 assert.equal(complete.observationDate,week(599));
 assert.equal(report.repairAuthorized,false);
});

test("W04 PIT-04-07 distinguishes SQLite null/blank from genuine zero",()=>{
 const validZero=row(0,"AL",{value:0});
 for(const invalid of [null,undefined,"","  ","not-a-number",false]){
  const current=row(0,"AL",{value:invalid});
  const missing=inspectStateClaimsPitReconciliation({
   currentRows:[current],historyRows:[],asOfIso:at,
  });
  assert.equal(missing.missingHistoryKeys,1);
  assert.equal(missing.metadataEligibleMissingKeys,0);
  assert.equal(missing.metadataUnverifiedMissingKeys,1);
  assert.equal(missing.status,"HOLD_UNVERIFIED_SOURCE_METADATA");
  assert.equal(missing.repairAuthorized,false);
  // A bad current value cannot masquerade as the same numeric 0 in HISTORY.
  const paired=inspectStateClaimsPitReconciliation({
   currentRows:[current],historyRows:[validZero],asOfIso:at,
  });
  assert.equal(paired.historyMatchedKeys,0);
  assert.equal(paired.revisionDisagreements,1);
  assert.equal(paired.status,"HOLD_REVISION_CONFLICTS");
 }
 for(const valid of [0,"0"," 0 "]){
  const current=row(0,"AL",{value:valid});
  const missing=inspectStateClaimsPitReconciliation({
   currentRows:[current],historyRows:[],asOfIso:at,
  });
  assert.equal(missing.metadataEligibleMissingKeys,1);
  assert.equal(missing.metadataUnverifiedMissingKeys,0);
  assert.equal(missing.status,"REVIEW_MISSING_HISTORY");
  const paired=inspectStateClaimsPitReconciliation({
   currentRows:[current],historyRows:[validZero],asOfIso:at,
  });
  assert.equal(paired.historyMatchedKeys,1);
  assert.equal(paired.revisionDisagreements,0);
 }
});

test("PIT-06-04 equal-time conflicting HISTORY revisions HOLD regardless of input order",()=>{
 const current=row(0,"AL");
 const matching={...current,recorded_at:"2026-11-09T11:00:00.000Z"};
 const conflicting={...matching,source_hash:"b".repeat(64),value:matching.value+1};
 const before=structuredClone([current,matching,conflicting]);
 for(const historyRows of [[matching,conflicting],[conflicting,matching]]){
  const result=inspectStateClaimsPitReconciliation({
   currentRows:[current],historyRows,asOfIso:at,
  });
  assert.equal(result.status,"HOLD_REVISION_CONFLICTS");
  assert.equal(result.historyMatchedKeys,0);
  assert.equal(result.revisionDisagreements,1);
  assert.equal(result.historyMatchedComplete51Weeks,0);
  assert.equal(result.promotionApproved,false);
  assert.equal(result.repairAuthorized,false);
  assert.equal(result.operationalWrites,0);
 }
 assert.deepEqual([current,matching,conflicting],before);
});

test("PIT-06-04 identical equal-time HISTORY duplicates do not falsely conflict",()=>{
 const current=row(0,"AL");
 const revision={...current,recorded_at:"2026-11-09T11:00:00.000Z"};
 const report=inspectStateClaimsPitReconciliation({
  currentRows:[current],historyRows:[revision,{...revision}],asOfIso:at,
 });
 assert.equal(report.historyMatchedKeys,1);
 assert.equal(report.revisionDisagreements,0);
 assert.equal(report.status,"CURRENT_HISTORY_MATCHED");
 assert.equal(report.repairAuthorized,false);
});

test("PIT-06-04 equal-time conflicting PIT provenance must HOLD even for same value/hash",()=>{
 const current=row(0,"AL");
 const revision={...current,recorded_at:"2026-11-09T11:00:00.000Z"};
 const changed={...revision,provenance_json:'{"parser":"ETA539","truePitAsserted":true}'};
 for(const historyRows of [[revision,changed],[changed,revision]]){
  const report=inspectStateClaimsPitReconciliation({
   currentRows:[current],historyRows,asOfIso:at,
  });
  assert.equal(report.status,"HOLD_REVISION_CONFLICTS");
  assert.equal(report.historyMatchedKeys,0);
  assert.equal(report.revisionDisagreements,1);
  assert.equal(report.repairAuthorized,false);
 }
});

test("PIT-06-04 later recorded time wins over an older same-retrieval revision",()=>{
 const current=row(0,"AL");
 const earlier={...current,recorded_at:"2026-11-09T10:03:00.000Z",
  source_hash:"b".repeat(64),value:1234};
 const latest={...current,recorded_at:"2026-11-09T11:00:00.000Z"};
 for(const historyRows of [[earlier,latest],[latest,earlier]]){
  const report=inspectStateClaimsPitReconciliation({
   currentRows:[current],historyRows,asOfIso:at,
  });
  assert.equal(report.historyMatchedKeys,1);
  assert.equal(report.revisionDisagreements,0);
  assert.equal(report.status,"CURRENT_HISTORY_MATCHED");
 }
});

test("PIT-06-07 selected HISTORY keeps score PARTIAL and chart source at the last verified week",()=>{
 const current=rows(600);
 const history=current.filter(x=>x.observation_date<=week(533));
 const before=structuredClone({current,history});
 const feature=EMPLOYMENT_R6_FEATURES.find(x=>x.id==="STATE_CLAIMS_BREADTH");
 const toInput=x=>({
  logicalSeriesId:x.logical_series_id,geographyCode:x.geography_code,
  observationDate:x.observation_date,value:x.value,sourceHash:x.source_hash,
 });
 const selected=history.map(toInput);
 const points=deriveEmploymentR6FeatureHistory(feature,selected);
 const computed=computeFeaturePoint(feature,selected);
 const audit=inspectStateClaimsPitReconciliation({
  currentRows:current,historyRows:history,asOfIso:at,
 });
 assert.equal(audit.missingHistoryKeys,66*51);
 assert.equal(audit.historyMatchedComplete51Weeks,534);
 assert.equal(audit.repairAuthorized,false);
 assert.equal(points.length,479);
 assert.equal(points.at(-1).date,week(533));
 assert.equal(computed.status,"PARTIAL_HISTORY");
 assert.equal(computed.score,null);
 assert.equal(computed.observationDate,points.at(-1).date);
 assert.equal(computed.rawValue,points.at(-1).value);
 assert.equal(points.some(p=>p.date===week(599)),false);
 assert.deepEqual({current,history},before);
});

test("PIT-06-07 complete in-memory reference uses identical chart/scoring transform without approving repair",()=>{
 const current=rows(600);
 const original=structuredClone(current);
 const feature=EMPLOYMENT_R6_FEATURES.find(x=>x.id==="STATE_CLAIMS_BREADTH");
 const selected=current.map(x=>({
  logicalSeriesId:x.logical_series_id,geographyCode:x.geography_code,
  observationDate:x.observation_date,value:x.value,sourceHash:x.source_hash,
 }));
 const points=deriveEmploymentR6FeatureHistory(feature,selected);
 const computed=computeFeaturePoint(feature,selected);
 const audit=inspectStateClaimsPitReconciliation({
  currentRows:current,historyRows:current,asOfIso:at,
 });
 assert.equal(audit.historyMatchedComplete51Weeks,600);
 assert.equal(audit.missingHistoryKeys,0);
 assert.equal(audit.operationalWrites,0);
 assert.equal(audit.repairAuthorized,false);
 assert.equal(points.length,545);
 assert.equal(points.at(-1).date,week(599));
 assert.equal(computed.status,"READY");
 assert.equal(Number.isFinite(computed.score),true);
 assert.equal(computed.observationDate,points.at(-1).date);
 assert.equal(computed.rawValue,points.at(-1).value);
 assert.deepEqual(current,original);
});

test("PIT-06-05 invalid C3 counts and unproven/future storage times stay HOLD-only",()=>{
 const original=row(0,"AL");
 const untouched=structuredClone(original);
 for(const change of [
  {value:1.5},{value:Number.MAX_SAFE_INTEGER+1},
  {value:"1.5"},{value:"1e3"},{value:"0x10"},{value:"01"},
  {recorded_at:"2026-11-17T00:00:00Z"},
  {first_seen_at:"2026-11-17T00:00:00Z"},
  {recordedAt:"2026-11-17T00:00:00Z"},
  {firstSeenAt:"2026-11-17T00:00:00Z"},
  {recorded_at:"malformed"},
  {first_seen_at:null},
  {provider:"UNOFFICIAL_PROVIDER"},
  {source_hash:"invalid"},
 ]){
  const report=inspectStateClaimsPitReconciliation({
   currentRows:[{...original,...change}],historyRows:[],asOfIso:at,
  });
  assert.equal(report.currentKnownKeys,1,JSON.stringify(change));
  assert.equal(report.missingHistoryKeys,1,JSON.stringify(change));
  assert.equal(report.metadataEligibleMissingKeys,0,JSON.stringify(change));
  assert.equal(report.metadataUnverifiedMissingKeys,1,JSON.stringify(change));
  assert.equal(report.status,"HOLD_UNVERIFIED_SOURCE_METADATA");
  assert.equal(report.repairAuthorized,false);
  assert.equal(report.promotionApproved,false);
  assert.equal(report.operationalWrites,0);
 }
 assert.deepEqual(original,untouched);
});

test("PIT-06-05 genuine zero and known non-future storage times remain review-only",()=>{
 const current=row(0,"AL",{
  value:0,recorded_at:"2026-11-09T11:00:00Z",
  first_seen_at:"2026-11-09T09:00:00Z",
 });
 const before=structuredClone(current);
 const report=inspectStateClaimsPitReconciliation({
  currentRows:[current],historyRows:[],asOfIso:at,
 });
 assert.equal(report.currentKnownKeys,1);
 assert.equal(report.missingHistoryKeys,1);
 assert.equal(report.metadataEligibleMissingKeys,1);
 assert.equal(report.metadataUnverifiedMissingKeys,0);
 assert.equal(report.status,"REVIEW_MISSING_HISTORY");
 assert.equal(report.repairAuthorized,false);
 assert.equal(report.promotionApproved,false);
 assert.equal(report.operationalWrites,0);
 assert.deepEqual(current,before);
});
