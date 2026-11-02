// Optional R6 side lane for the already-approved PC Core Writer.
// A disabled or mismatched source never opens SQLite or contacts D1.
import path from "node:path";
import {
  stageEmploymentR6OneYear,
  publishEmploymentR6OneYear,
} from "./employment-r6-one-year-stage.mjs";

export async function runEmploymentR6AutoPublication({
  enabled=false,
  pcHome,
  approvedSource,
  runningSource,
  remote,
  dbId,
  now=Date.now(),
  stage=stageEmploymentR6OneYear,
  publish=publishEmploymentR6OneYear,
}={}){
  if(enabled!==true)return {status:"DISABLED"};
  // The ordinary PC Writer can accept publication-compatible source drift;
  // this new R6 output additionally requires exact approval of its code SHA.
  if(!approvedSource||approvedSource!==runningSource){
    throw Error("EMPLOYMENT_R6_SOURCE_NOT_APPROVED");
  }
  if(typeof pcHome!=="string"||!path.isAbsolute(pcHome)
    ||typeof dbId!=="string"||!dbId||!remote
    ||!Number.isSafeInteger(now)||now<=0){
    throw Error("EMPLOYMENT_R6_PUBLICATION_INPUT_INVALID");
  }
  const asOfDate=new Date(now).toISOString().slice(0,10);
  // No candidate DB, provider fetch, schema modification or second scheduler.
  const body=await stage({dbPath:path.join(pcHome,"storage","core.sqlite"),asOfDate});
  if(body?.asOfDate!==asOfDate)throw Error("EMPLOYMENT_R6_STAGE_DATE_MISMATCH");
  const result=await publish({body,remote,dbId,now});
  return {
    status:result.status,
    asOfDate,
    sourceStoredAt:body.sourceStoredAt,
    sourceFeatures:body.summary.sourceFeatures,
    chartReadyFeatures:body.summary.chartReadyFeatures,
    recentlyObservedFeatures:body.summary.recentlyObservedFeatures,
  };
}
