import test from "node:test";
import assert from "node:assert/strict";
import {classifyEmploymentR6Pit04KeyEvidence as audit} from "../lib/market-score/employment-r6-pit04-key-evidence.mjs";
import {EMPLOYMENT_R4_CORE_STATES} from "../lib/market-score/employment-r4-shadow-contract.mjs";
const base={logical_series_id:"STATE_INITIAL_CLAIMS",geography_type:"STATE",
 geography_code:"AL",observation_date:"2026-11-07",value:0,
 source_hash:"a".repeat(64),provider:"DOL_ETA",provider_series_id:"ETA539:C3",
 quality_status:"READY_CORE_51",pit_class:"HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY",
 provenance_json:'{"truePitAsserted":false}',retrieved_at:"2026-11-10T00:00:00Z",
 available_at:"2026-11-10T00:00:00Z"};
const go=(coreCurrentRows,coreHistoryRows,candidateCurrentRows=[],candidateHistoryRows=[],extra={})=>
 audit({coreCurrentRows,coreHistoryRows,candidateCurrentRows,candidateHistoryRows,
 asOfIso:"2026-11-18T00:00:00Z",...extra});
test("per-key missing and conflict counts are distinct, not summed",()=>{
 const core=[base,{...base,geography_code:"AK"},{...base,geography_code:"AZ"},
  {...base,geography_code:"CA"}];
 const history=[base,{...base,geography_code:"CA"}];
 const candidate=[{...base,geography_code:"AK"},{...base,geography_code:"AZ",pit_class:""},
  {...base,geography_code:"CA",value:3}];
 const ch=[{...base,geography_code:"AK"},{...base,geography_code:"AZ",pit_class:""}];
 const original=JSON.stringify([core,history,candidate,ch]);
 const r=go(core,history,candidate,ch);
 assert.equal(r.counts.coreHistoryMissing,2);
 assert.equal(r.counts.candidateOverlapConflicts,1);
 assert.equal(r.counts.missingCandidateInternalMatch,1);
 assert.equal(r.counts.missingCandidateIncomplete,1);
 assert.equal(r.counts.missingWithoutCandidate,0);
 assert.equal(r.evidenceTotal,3);
 assert.equal(r.evidence[0].reason,"CANDIDATE_CURRENT_CONFLICT");
 assert.equal(r.rawPitAttested,false);
 assert.equal(r.repairAuthorized,false);
 assert.equal(JSON.stringify([core,history,candidate,ch]),original);
 assert.ok(!JSON.stringify(r).includes(base.source_hash));
});
test("true zero differs from null and latest HISTORY revision is decisive",()=>{
 const old={...base,retrieved_at:"2026-11-09T00:00:00Z"};
 const changed={...base,value:1,retrieved_at:"2026-11-12T00:00:00Z"};
 assert.equal(go([base],[old,changed]).counts.coreHistoryConflict,1);
 const r=go([{...base,value:null}],[],[base],[base]);
 assert.equal(r.counts.missingCandidateInternalMatch,0);
 assert.equal(r.counts.missingCandidateIncomplete,1);
});
test("future retrieved-at blocks retrospective candidate metadata",()=>{
 const future={...base,retrieved_at:"2026-11-19T00:00:00Z"};
 const r=go([base],[],[base],[future]);
 assert.equal(r.counts.coreHistoryMissing,1);
 assert.equal(r.counts.missingCandidateIncomplete,1);
 assert.equal(r.promotionApproved,false);
});
test("output caps evidence without losing counts",()=>{
 const geo=["AL","AK","AZ","CA"];
 const current=geo.map(geography_code=>({...base,geography_code}));
 const r=go(current,[],[],[],{maxEvidenceRows:2});
 assert.equal(r.counts.coreHistoryMissing,4);
 assert.equal(r.evidenceTotal,4);
 assert.equal(r.evidence.length,2);
 assert.equal(r.evidenceTruncated,true);
 assert.equal(r.nextOffset,2);
 const second=go(current,[],[],[],{maxEvidenceRows:2,offset:r.nextOffset});
 assert.deepEqual(second.counts,r.counts);
 assert.equal(second.evidenceTotal,4);
 assert.equal(second.evidence.length,2);
 assert.equal(second.evidenceTruncated,false);
 assert.equal(second.nextOffset,null);
 assert.ok(second.evidence.every(x=>!r.evidence.some(y=>x.geographyCode===y.geographyCode)));
 assert.throws(()=>go([base],[],[],[],{maxEvidenceRows:9}),/PIT0408_ARGUMENT_INVALID/);
 assert.throws(()=>go([base],[],[],[],{offset:-1}),/PIT0408_ARGUMENT_INVALID/);
});

test("forged PIT class and ambiguous equal-time revisions cannot be an internal match",()=>{
 const forged={...base,pit_class:"FORGED_HISTORY"};
 const no=go([base],[],[forged],[forged]);
 assert.equal(no.counts.missingCandidateInternalMatch,0);
 assert.equal(no.counts.missingCandidateIncomplete,1);
 const ambiguous=go([base],[base,{...base,value:2}]);
 assert.equal(ambiguous.counts.coreHistoryAmbiguous,1);
 assert.equal(ambiguous.evidence[0].reason,"CORE_HISTORY_AMBIGUOUS");
});

test("non-decimal and unsafe numeric counts never qualify as candidate evidence",()=>{
 for(const value of ["0x10","1e2","+1","01","1.0"," 1 ","9007199254740992",-1,1.5,Infinity]){
  const r=go([base],[],[{...base,value}],[{...base,value}]);
  assert.equal(r.counts.missingCandidateInternalMatch,0,String(value));
  assert.equal(r.counts.missingCandidateIncomplete,1,String(value));
  assert.equal(r.repairAuthorized,false);
 }
 assert.equal(go([base],[],[base],[base]).counts.missingCandidateInternalMatch,1);
});

test("max default page is smaller than registered 12 KiB A-grade report limit",()=>{
 const original={...base};
 const rows=[];
 for(let i=0;i<55;i++)for(const region of ["AL","AK","AZ","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]){
  const date=new Date(Date.UTC(2025,0,4)+i*7*86400000).toISOString().slice(0,10);
  if(date<="2026-11-18")rows.push({...original,geography_code:region,observation_date:date});
 }
 const r=go(rows,[],[],[]);
 assert.equal(r.counts.coreHistoryMissing,rows.length);
 assert.equal(r.evidence.length,8);
 assert.equal(r.nextOffset,8);
 assert.ok(Buffer.byteLength(JSON.stringify(r),"utf8")<9000);
 assert.equal(r.rawPitAttested,false);
});

test("nullable recorded_at must retain CURRENT identity, but cannot authenticate candidate PIT",()=>{
 const current={...base,recorded_at:null,first_seen_at:null};
 const r=go([current],[],[],[]);
 assert.equal(r.counts.coreKeys,1);
 assert.equal(r.counts.coreHistoryMissing,1);
 assert.equal(r.evidenceTotal,1);
 assert.equal(r.evidence[0].reason,"MISSING_HISTORY_NO_CANDIDATE");
 const candidate=go([current],[],[current],[current]);
 assert.equal(candidate.counts.coreHistoryMissing,1);
 assert.equal(candidate.counts.missingCandidateIncomplete,1);
 assert.equal(candidate.counts.missingCandidateInternalMatch,0);
 assert.equal(candidate.promotionApproved,false);
});

test("malformed optional time remains in HOLD; known future time excludes its revision",()=>{
 for(const field of ["first_seen_at","recorded_at"]){
  const bad={...base,[field]:"not-a-date"};
  const r=go([bad],[],[bad],[bad]);
  assert.equal(r.counts.coreKeys,1,field);
  assert.equal(r.counts.coreHistoryMissing,1,field);
  assert.equal(r.counts.missingCandidateInternalMatch,0,field);
  assert.equal(r.counts.missingCandidateIncomplete,1,field);
  const future={...base,[field]:"2026-11-19T00:00:00Z"};
  assert.equal(go([future],[],[],[]).counts.coreKeys,0,field);
 }
 assert.equal(go([base],[],[base],[base]).counts.missingCandidateInternalMatch,1);
});

test("PIT04_FULL_CORE_SCAN_ORDER_INVARIANT: 40777 keys keep priority, counts, stable 8-row pages and 12KiB ceiling",()=>{
 assert.equal(EMPLOYMENT_R4_CORE_STATES.length,51);
 const rows=[];
 const start=Date.UTC(2011,6,9),week=7*86400000;
 for(let w=0;w<800&&rows.length<40777;w++){
  const date=new Date(start+w*week).toISOString().slice(0,10);
  for(const geo of EMPLOYMENT_R4_CORE_STATES){
   if(rows.length===40777)break;
   rows.push({...base,geography_code:geo,observation_date:date});
  }
 }
 assert.equal(rows.length,40777);
 const conflict=[{...rows[0],value:9}];
 const first=go(rows,[],conflict);
 assert.equal(first.counts.coreKeys,40777);
 assert.equal(first.counts.coreHistoryMissing,40777);
 assert.equal(first.counts.candidateOverlapConflicts,1);
 assert.equal(first.counts.missingCandidateIncomplete,1);
 assert.equal(first.counts.missingWithoutCandidate,40776);
 assert.equal(first.evidenceTotal,40777);
 assert.equal(first.evidence.length,8);
 assert.equal(first.evidence[0].reason,"CANDIDATE_CURRENT_CONFLICT");
 assert.equal(first.nextOffset,8);
 assert.equal(first.rawPitAttested,false);
 assert.equal(first.promotionApproved,false);
 assert.equal(first.repairAuthorized,false);
 assert.ok(Buffer.byteLength(JSON.stringify(first),"utf8")<12000);
 const shuffled=go([...rows].reverse(),[],conflict);
 assert.deepEqual(shuffled,first,"final reason/date/state output must not depend on Core row insertion order");
 const second=go(rows,[],conflict,[],{offset:8});
 assert.equal(second.evidenceTotal,first.evidenceTotal);
 assert.deepEqual(second.counts,first.counts);
 assert.equal(second.evidence.length,8);
 assert.equal(second.offset,8);
 assert.ok(second.evidence.every(item=>!first.evidence.some(prev=>
   item.observationDate===prev.observationDate&&item.geographyCode===prev.geographyCode)));
 assert.ok(Buffer.byteLength(JSON.stringify(second),"utf8")<12000);
});
