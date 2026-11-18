import test from "node:test";
import assert from "node:assert/strict";
import {classifyEmploymentR6Pit04KeyEvidence as audit} from "../lib/market-score/employment-r6-pit04-key-evidence.mjs";
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
 const r=go(geo.map(geography_code=>({...base,geography_code})),[],[],[],{maxEvidenceRows:2});
 assert.equal(r.counts.coreHistoryMissing,4);
 assert.equal(r.evidenceTotal,4);
 assert.equal(r.evidence.length,2);
 assert.equal(r.evidenceTruncated,true);
 assert.throws(()=>go([base],[],[],[],{maxEvidenceRows:513}),/PIT0408_ARGUMENT_INVALID/);
});
