import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {EMPLOYMENT_R4_CORE_STATES} from "../lib/market-score/employment-r4-shadow-contract.mjs";
import {parseEta539ShadowRows} from "../lib/market-score/employment-r4-shadow-provider.mjs";
import {classifyStoredEta539MissingHistory} from "../lib/market-score/employment-r6-pit04-key-evidence.mjs";

const sha=x=>createHash("sha256").update(x).digest("hex");
const retrievedAt="2026-11-19T01:00:00.000Z";
const checkedAt="2026-11-19T02:00:00.000Z";
const body=["st,rptdate,c2,c3",...EMPLOYMENT_R4_CORE_STATES.map(
  (state,i)=>[state,"11/12/2026","10/17/2026",String(i+1)].join(",")
)].join("\n")+"\n";
const bodySha256=sha(body);
const releaseGroup="DOL_UI_WEEKLY_CLAIMS";
const provider="DOL_ETA";
const requestKey="DOL_ETA539:60w";
const snapshotId=sha([releaseGroup,provider,requestKey,bodySha256].join("|"));
const snapshot={provider,releaseGroup,requestKey,retrievedAt,body,bodySha256,snapshotId,
  detailJson:JSON.stringify({responseHash:bodySha256,historyWeeks:60})};
const run={provider:"EMPLOYMENT_R6_DOL_UI_WEEKLY_CLAIMS",status:"SUCCESS",
  completedAt:"2026-11-19T01:01:00.000Z",
  detailJson:JSON.stringify({rawSnapshots:[{snapshotId,bodySha256}]})};
async function fixture(){
  const rows=(await parseEta539ShadowRows(body,{retrievedAt,historyWeeks:60})).rows;
  const ak=rows.find(x=>x.geographyCode==="AK");
  const al=rows.find(x=>x.geographyCode==="AL");
  const toCurrent=(x,extras={})=>({
    logical_series_id:x.logicalSeriesId,geography_type:x.geographyType,
    geography_code:x.geographyCode,observation_date:x.observationDate,
    provider:x.provider,provider_series_id:x.providerSeriesId,
    source_hash:x.sourceHash,value:x.value,...extras,
  });
  return [
    toCurrent(ak),
    toCurrent(al,{value:al.value+1}),
    toCurrent(ak,{geography_code:"AZ",observation_date:"2026-10-10",
      source_hash:"a".repeat(64)}),
  ];
}
const audit=async(overrides={})=>classifyStoredEta539MissingHistory({
  missingCurrentRows:await fixture(),candidateHistoryRows:[],
  rawSnapshots:[snapshot],collectorRuns:[run],checkedAt,...overrides,
});
test("verified stored raw observation and original run partition three missing keys without historical PIT promotion",async()=>{
  const result=await audit({candidateHistoryRows:[(await fixture())[0]]});
  assert.equal(result.missingHistoryKeys,3);
  assert.equal(result.acceptedDOLSnapshots,1);
  assert.equal(result.counts.ORIGINAL_VERSION_AND_HISTORICAL_AVAILABILITY_PROVED,0);
  assert.equal(result.counts.RAW_OBSERVATION_MATCH_HISTORICAL_TIME_UNPROVEN,1);
  assert.equal(result.counts.RAW_OBSERVATION_OR_REVISION_CONFLICT,1);
  assert.equal(result.counts.RAW_NOT_FOUND_IN_CHECKED_SCOPE,1);
  assert.equal(result.privateEvidence.length,3);
  const ak=result.privateEvidence.find(x=>x.geographyCode==="AK");
  assert.equal(ak.candidateInternalValueAndHashMatch,true);
  assert.equal(ak.sourceVersions[0].snapshotId,snapshotId);
  assert.equal(ak.sourceVersions[0].retrievedAt,retrievedAt);
  assert.equal(ak.candidateVersion.sourceHash,(await fixture())[0].source_hash);
  assert.equal(result.historicPitAttested,false);
  assert.equal(result.repairAuthorized,false);
  assert.match(result.evidenceDigest,/^[a-f0-9]{64}$/);
});
test("missing run does not falsely link otherwise valid raw body",async()=>{
  const result=await audit({collectorRuns:[]});
  assert.equal(result.acceptedDOLSnapshots,0);
  assert.equal(result.rejectedRawSnapshots.run,1);
  assert.equal(result.counts.RAW_NOT_FOUND_IN_CHECKED_SCOPE,3);
});
test("tampered raw body fails independent SHA and cannot certify keys",async()=>{
  const altered=await audit({rawSnapshots:[{...snapshot,body:body.replace("10/17/2026,1","10/17/2026,9")}]});
  assert.equal(altered.acceptedDOLSnapshots,0);
  assert.equal(altered.rejectedRawSnapshots.bodyOrId,1);
  assert.equal(altered.counts.RAW_NOT_FOUND_IN_CHECKED_SCOPE,3);
});
test("future receipts, duplicate identities and invalid snapshot metadata fail closed",async()=>{
  const future=await audit({collectorRuns:[{...run,completedAt:"2026-11-20T00:00:00.000Z"}]});
  assert.equal(future.acceptedDOLSnapshots,0);
  const missingDetail=await audit({rawSnapshots:[{...snapshot,detailJson:"{}"}]});
  assert.equal(missingDetail.rejectedRawSnapshots.metadata,1);
  const same=await fixture();
  await assert.rejects(audit({missingCurrentRows:[same[0],same[0]]}),/PIT0605_DUPLICATE_KEY/);
});
