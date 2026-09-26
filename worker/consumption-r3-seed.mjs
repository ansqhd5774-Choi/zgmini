import {C1_R3_CORE95,C1_R3_REVISION,buildConsumptionC1R3} from "../lib/market-score/consumption-c1-r3.mjs";
import {persistConsumptionC1R3Calculation} from "./consumption-r3-score-store.mjs";

const finite=v=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100;
const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const esc=s=>String(s).replaceAll("'","''");

export function buildConsumptionC1R3SeedPlan(seed){
  if(seed?.schema!=="ZGMINI_C1_R345P_ACCEPTED_E6_SEED_V1")throw new Error("C1_R3_SEED_SCHEMA_INVALID");
  if(seed?.methodologyRevision!==C1_R3_REVISION)throw new Error("C1_R3_SEED_REVISION_INVALID");
  if(!Array.isArray(seed?.matrix)||seed.matrix.length!==1520)throw new Error("C1_R3_SEED_MATRIX_COUNT");
  const byDate=new Map();
  for(const r of seed.matrix){
    if(!C1_R3_CORE95.includes(r?.candidateId))throw new Error(`C1_R3_SEED_ID:${r?.candidateId}`);
    if(!validDate(r?.scoreDate)||!finite(r?.score))throw new Error(`C1_R3_SEED_ROW:${r?.candidateId}`);
    if(!byDate.has(r.scoreDate))byDate.set(r.scoreDate,[]);
    byDate.get(r.scoreDate).push(r);
  }
  const snapshots=[...byDate.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([scoreDate,rows])=>{
    const by=new Map(rows.map(r=>[r.candidateId,r]));
    if(by.size!==95||C1_R3_CORE95.some(id=>!by.has(id)))throw new Error(`C1_R3_SEED_CORE95:${scoreDate}`);
    const normalized=C1_R3_CORE95.map(id=>{
      const r=by.get(id);
      return {candidateId:id,score:r.score,observationDate:r.observationDate??null};
    });
    const domain=buildConsumptionC1R3({scoreRows:normalized,scoreDate});
    if(domain.status!=="READY")throw new Error(`C1_R3_SEED_DOMAIN_NOT_READY:${scoreDate}`);
    return {scoreDate,rows:normalized,domainScore:domain.score};
  });
  if(snapshots.length!==16)throw new Error("C1_R3_SEED_SNAPSHOT_COUNT");
  return {revision:C1_R3_REVISION,snapshotCount:snapshots.length,rowCount:1520,snapshots};
}

export function buildConsumptionC1R3SeedSql(seed,{seedSha256=null}={}){
  const plan=buildConsumptionC1R3SeedPlan(seed);
  const out=[
    "BEGIN TRANSACTION;",
    `CREATE TABLE IF NOT EXISTS c1_r3_candidate_scores_v1 (
      revision TEXT NOT NULL,
      score_date TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      score REAL NOT NULL,
      observation_date TEXT,
      computed_at TEXT NOT NULL,
      source_snapshot_sha256 TEXT,
      PRIMARY KEY(revision,score_date,candidate_id)
    );`,
    "CREATE INDEX IF NOT EXISTS c1_r3_candidate_scores_lookup_v1 ON c1_r3_candidate_scores_v1(revision,score_date DESC);",
  ];
  const computedAt="2026-09-24T00:00:00.000Z";
  for(const snap of plan.snapshots){
    for(const row of snap.rows){
      out.push(`INSERT OR REPLACE INTO c1_r3_candidate_scores_v1(revision,score_date,candidate_id,score,observation_date,computed_at,source_snapshot_sha256) VALUES('${esc(C1_R3_REVISION)}','${esc(snap.scoreDate)}','${esc(row.candidateId)}',${row.score},${row.observationDate?`'${esc(row.observationDate)}'`:"NULL"},'${computedAt}',${seedSha256?`'${esc(seedSha256)}'`:"NULL"});`);
    }
  }
  out.push("COMMIT;");
  return out.join("\n")+"\n";
}

export async function persistConsumptionC1R3AcceptedSeed(db,seed,{computedAt="2026-09-24T00:00:00.000Z",seedSha256=null}={}){
  const plan=buildConsumptionC1R3SeedPlan(seed);
  const results=[];
  for(const snap of plan.snapshots){
    results.push(await persistConsumptionC1R3Calculation(db,{
      scoreDate:snap.scoreDate,
      computedAt,
      rows:snap.rows,
      sourceSnapshotSha256:seedSha256,
    }));
  }
  return {status:"STORED",revision:C1_R3_REVISION,snapshotCount:results.length,rowCount:results.reduce((s,x)=>s+(x.rowCount??0),0),results};
}

export const C1_R3_ACCEPTED_SEED_CONTRACT=Object.freeze({
  sourceEvidence:"ZG_C1_10_R343E6",
  evidenceRows:1520,
  snapshots:16,
  networkRequests:0,
  scoringRecomputed:false,
  researchTargetsIncluded:false,
});
