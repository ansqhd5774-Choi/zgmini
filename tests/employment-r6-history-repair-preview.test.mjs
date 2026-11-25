import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {prepareEmploymentHistoryRepair as prepare} from "../lib/market-score/employment-r6-history-repair-preview.mjs";
const sha=x=>createHash("sha256").update(x).digest("hex");
const c={logical_series_id:"STATE_INITIAL_CLAIMS",geography_type:"STATE",geography_code:"AK",
 observation_date:"2025-07-26",provider:"DOL_ETA",provider_series_id:"ETA539:C3",
 frequency:"WEEKLY",pit_class:"HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY",
 value:0,source_hash:"a".repeat(64),source_revision:"revision",retrieved_at:"2026-11-01T00:00:00Z"};
const e={logicalSeriesId:c.logical_series_id,geographyType:c.geography_type,
 geographyCode:c.geography_code,observationDate:c.observation_date,
 classification:"RAW_OBSERVATION_MATCH_HISTORICAL_TIME_UNPROVEN",
 historicalAvailabilityProved:false,repairAuthorized:false,
 sourceVersions:[{sourceHash:c.source_hash,value:0,sourceRevision:"revision",
  retrievedAt:"2026-11-01T00:00:00Z",responseHash:"b".repeat(64),snapshotId:"c".repeat(64)}]};
const input=(rows=[e])=>{const evidenceDigest=sha(JSON.stringify(rows));
 const receiptBytes=Buffer.from(JSON.stringify({kind:"PIT0605_PC_WORKSPACE_PRIVATE_V1",digest:evidenceDigest,rows}));
 return {receiptBytes,receiptSha256:sha(receiptBytes),evidenceDigest,expectedKeys:rows.length,
 currentRows:[c],historyRows:[],recordedAt:"2026-11-26T00:00:00Z"};};
test("zero survives, original receipt retained, no past availability or write",()=>{
 const r=prepare(input());assert.equal(r.eligible,1);assert.equal(r.rows[0].currentPreimage.value,0);
 assert.equal(r.rows[0].sourceReceipt.retrievedAt,"2026-11-01T00:00:00Z");
 assert.equal(r.rows[0].proposedAvailableAt,"2026-11-26T00:00:00Z");
 assert.equal(r.repairAuthorized,false);assert.equal(r.sqliteWrites,0);
});
test("history exists or current has drifted: no insert candidate",()=>{
 assert.equal(prepare({...input(),historyRows:[c]}).held.existingHistory,1);
 assert.equal(prepare({...input(),currentRows:[{...c,value:1}]}).held.unmatched,1);
});
test("receipt alteration or duplicate identity fail closed",()=>{
 assert.throws(()=>prepare({...input(),receiptSha256:"f".repeat(64)}),/INPUT_INVALID/);
 assert.throws(()=>prepare(input([e,e])),/DUPLICATE_EVIDENCE/);
});
test("unverified PIT or mismatched revision cannot be promoted",()=>{
 assert.throws(()=>prepare(input([{...e,historicalAvailabilityProved:true}])),/SCOPE_INVALID/);
 assert.equal(prepare({...input(),currentRows:[{...c,source_revision:"different"}]}).eligible,0);
});
