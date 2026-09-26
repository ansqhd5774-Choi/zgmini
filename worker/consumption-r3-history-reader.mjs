import {
  C1_R3_CORE95,
  C1_R3_REVISION,
  buildConsumptionC1R3,
  buildConsumptionC1R3Unavailable,
} from "../lib/market-score/consumption-c1-r3.mjs";

const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);

async function allRows(db,sql,args=[]){
  const st=db.prepare(sql).bind(...args);
  if(typeof st.all!=="function")throw new Error("C1_R3_DB_READ_UNSUPPORTED");
  const r=await st.all();
  return Array.isArray(r?.results)?r.results:[];
}

export async function loadStoredConsumptionC1R3(db,{asOf}={}){
  if(!validDate(asOf))throw new Error("C1_R3_ASOF_INVALID");
  if(!db||typeof db.prepare!=="function"){
    return buildConsumptionC1R3Unavailable("C1_R3_DB_UNAVAILABLE");
  }
  let heads;
  try{
    heads=await allRows(db,`SELECT score_date,MAX(computed_at) AS computed_at,COUNT(*) AS row_count
      FROM c1_r3_candidate_scores_v1
      WHERE revision=? AND score_date<=?
      GROUP BY score_date
      HAVING COUNT(*)=?
      ORDER BY score_date DESC
      LIMIT 1`,[C1_R3_REVISION,asOf,C1_R3_CORE95.length]);
  }catch(error){
    return buildConsumptionC1R3Unavailable(`C1_R3_HEAD_READ:${error instanceof Error?error.message:"UNKNOWN"}`);
  }
  const head=heads[0];
  if(!head?.score_date)return buildConsumptionC1R3Unavailable("C1_R3_COMPLETE_SNAPSHOT_MISSING");
  let rows;
  try{
    rows=await allRows(db,`SELECT candidate_id,score,observation_date,computed_at,source_snapshot_sha256
      FROM c1_r3_candidate_scores_v1
      WHERE revision=? AND score_date=?
      ORDER BY candidate_id`,[C1_R3_REVISION,head.score_date]);
  }catch(error){
    return buildConsumptionC1R3Unavailable(`C1_R3_ROWS_READ:${error instanceof Error?error.message:"UNKNOWN"}`);
  }
  return buildConsumptionC1R3({
    scoreDate:head.score_date,
    computedAt:head.computed_at??null,
    scoreRows:rows.map(r=>({
      candidateId:r.candidate_id,
      score:Number(r.score),
      observationDate:r.observation_date??null,
      computedAt:r.computed_at??null,
      sourceSnapshotSha256:r.source_snapshot_sha256??null,
    })),
  });
}

export const C1_R3_HISTORY_READER_CONTRACT=Object.freeze({
  revision:C1_R3_REVISION,
  source:"STORED_CALCULATION_HISTORY_ONLY",
  liveProviderFallback:false,
  networkRequests:0,
  requiredCandidateCount:C1_R3_CORE95.length,
  missingPolicy:"PARTIAL_NULL_NO_REWEIGHT",
});
