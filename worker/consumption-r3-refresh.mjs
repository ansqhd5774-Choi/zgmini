import {
  C1_R3_OPERATIONAL_CONFIG,
  C1_R3_OPERATIONAL_AXES,
  C1_R3_BASELINE_SCORE_DATE,
} from "../lib/market-score/consumption-r3-operational-config.mjs";
import {C1_R3_BASELINE_NON_ALFRED_HISTORY} from "../lib/market-score/consumption-r3-baseline-history.mjs";
import {calculateConsumptionR3Operational} from "./consumption-r3-operational-calculator.mjs";
import {listCompleteConsumptionR3Fixtures} from "./consumption-r3-source-store.mjs";
import {persistConsumptionC1R3Calculation} from "./consumption-r3-score-store.mjs";

const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);

export async function refreshConsumptionR3FromStored(db,{asOf,computedAt=new Date().toISOString()}={}){
  if(!validDate(asOf))throw new Error("C1_R3_REFRESH_ASOF_INVALID");
  if(!db||typeof db.prepare!=="function")return {status:"SKIPPED_DB_UNAVAILABLE",calculated:false};
  const fixtures=await listCompleteConsumptionR3Fixtures(db,{throughScoreDate:asOf});
  if(!fixtures.length)return {status:"NO_NEW_COMPLETE_SOURCE_SNAPSHOT",calculated:false,latestBaseline:C1_R3_BASELINE_SCORE_DATE};
  const current=fixtures.at(-1),prior=fixtures.slice(0,-1);
  const result=calculateConsumptionR3Operational({
    config:C1_R3_OPERATIONAL_CONFIG,
    axisMembership:C1_R3_OPERATIONAL_AXES,
    sourceFixture:current,
    priorSourceFixtures:prior,
    nonAlfredFeatureHistory:C1_R3_BASELINE_NON_ALFRED_HISTORY,
  });
  if(result.status!=="READY"||result.rows.length!==95){
    return {status:"PARTIAL_SOURCE_CALCULATION",calculated:false,scoreDate:current.scoreDate,missing:result.missing??[]};
  }
  const stored=await persistConsumptionC1R3Calculation(db,{
    scoreDate:current.scoreDate,
    computedAt,
    rows:result.rows.map(r=>({candidateId:r.candidateId,score:r.score,observationDate:r.observationDate??null})),
    sourceSnapshotSha256:null,
  });
  return {
    status:"CALCULATED_AND_STORED",
    calculated:true,
    scoreDate:current.scoreDate,
    quarter:current.quarter,
    candidateCount:result.rows.length,
    axisScores:result.axisScores,
    flat7:result.flat7,
    rowsWritten:stored.rowsWritten,
  };
}

export const C1_R3_REFRESH_CONTRACT=Object.freeze({
  revision:"R3.45P",
  calculationSource:"STORED_SOURCE_SNAPSHOTS_ONLY",
  networkRequests:0,
  liveResponseScoring:false,
  providerApiCalls:0,
  missingPolicy:"PARTIAL_NULL_NO_REWEIGHT",
});
