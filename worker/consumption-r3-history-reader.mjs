import {
  C1_R3_CORE95,
  C1_R3_REVISION,
  buildConsumptionC1R3,
  buildConsumptionC1R3Unavailable,
} from "../lib/market-score/consumption-c1-r3.mjs";

const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const HISTORY_LIMIT=64;

async function allRows(db,sql,args=[]){
  const st=db.prepare(sql).bind(...args);
  if(typeof st.all!=="function")throw new Error("C1_R3_DB_READ_UNSUPPORTED");
  const r=await st.all();
  return Array.isArray(r?.results)?r.results:[];
}

function scoreRows(rows=[]){
  return rows.map(r=>({
    candidateId:r.candidate_id,
    score:Number(r.score),
    observationDate:r.observation_date??null,
    computedAt:r.computed_at??null,
    sourceSnapshotSha256:r.source_snapshot_sha256??null,
  }));
}

function buildSnapshot(head,rows=[]){
  return buildConsumptionC1R3({
    scoreDate:head?.score_date??null,
    computedAt:head?.computed_at??null,
    scoreRows:scoreRows(rows),
  });
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
      LIMIT ?`,[C1_R3_REVISION,asOf,C1_R3_CORE95.length,HISTORY_LIMIT]);
  }catch(error){
    return buildConsumptionC1R3Unavailable(`C1_R3_HEAD_READ:${error instanceof Error?error.message:"UNKNOWN"}`);
  }
  const head=heads[0];
  if(!head?.score_date)return buildConsumptionC1R3Unavailable("C1_R3_COMPLETE_SNAPSHOT_MISSING");
  const oldest=heads.at(-1)?.score_date??head.score_date;
  let rows;
  try{
    rows=await allRows(db,`SELECT score_date,candidate_id,score,observation_date,computed_at,source_snapshot_sha256
      FROM c1_r3_candidate_scores_v1
      WHERE revision=? AND score_date>=? AND score_date<=?
      ORDER BY score_date,candidate_id`,[C1_R3_REVISION,oldest,head.score_date]);
  }catch(error){
    return buildConsumptionC1R3Unavailable(`C1_R3_ROWS_READ:${error instanceof Error?error.message:"UNKNOWN"}`);
  }

  const byDate=new Map();
  for(const row of rows??[]){
    if(typeof row?.score_date!=="string")continue;
    if(!byDate.has(row.score_date))byDate.set(row.score_date,[]);
    byDate.get(row.score_date).push(row);
  }

  const current=buildSnapshot(head,byDate.get(head.score_date)??[]);
  if(current.status!=="READY"||typeof current.score!=="number")return current;

  const trend=heads.slice().reverse().flatMap(h=>{
    const snapshot=buildSnapshot(h,byDate.get(h.score_date)??[]);
    return snapshot.status==="READY"&&typeof snapshot.score==="number"
      ? [{date:h.score_date,value:snapshot.score,score:snapshot.score}]
      : [];
  });

  return {...current,trend};
}

export const C1_R3_HISTORY_READER_CONTRACT=Object.freeze({
  revision:C1_R3_REVISION,
  source:"STORED_CALCULATION_HISTORY_ONLY",
  liveProviderFallback:false,
  networkRequests:0,
  requiredCandidateCount:C1_R3_CORE95.length,
  missingPolicy:"PARTIAL_NULL_NO_REWEIGHT",
  trendSource:"STORED_COMPLETE_SNAPSHOTS_ONLY",
  historyLimit:HISTORY_LIMIT,
});
