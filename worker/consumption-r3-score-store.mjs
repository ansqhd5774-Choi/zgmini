import {C1_R3_CORE95,C1_R3_REVISION} from "../lib/market-score/consumption-c1-r3.mjs";

const finiteScore=v=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100;
const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const init=new WeakMap();

async function ensureTables(db){
  let p=init.get(db);
  if(!p){
    p=db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS c1_r3_candidate_scores_v1 (
        revision TEXT NOT NULL,
        score_date TEXT NOT NULL,
        candidate_id TEXT NOT NULL,
        score REAL NOT NULL,
        observation_date TEXT,
        computed_at TEXT NOT NULL,
        source_snapshot_sha256 TEXT,
        PRIMARY KEY(revision,score_date,candidate_id)
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS c1_r3_candidate_scores_lookup_v1
        ON c1_r3_candidate_scores_v1(revision,score_date DESC)`),
    ]).catch(e=>{init.delete(db);throw e});
    init.set(db,p);
  }
  await p;
}

export async function persistConsumptionC1R3Calculation(db,{scoreDate,computedAt,rows,sourceSnapshotSha256=null}={}){
  if(!db||typeof db.prepare!=="function"||typeof db.batch!=="function")throw new Error("C1_R3_DB_REQUIRED");
  if(!validDate(scoreDate))throw new Error("C1_R3_SCORE_DATE_INVALID");
  if(typeof computedAt!=="string"||!Number.isFinite(Date.parse(computedAt)))throw new Error("C1_R3_COMPUTED_AT_INVALID");
  if(!Array.isArray(rows))throw new Error("C1_R3_ROWS_REQUIRED");
  const by=new Map(rows.map(x=>[x?.candidateId,x]));
  if(by.size!==C1_R3_CORE95.length||C1_R3_CORE95.some(id=>!by.has(id)))throw new Error("C1_R3_CORE95_EXACT_SET_REQUIRED");
  for(const id of C1_R3_CORE95){
    const r=by.get(id);
    if(!finiteScore(r?.score))throw new Error(`C1_R3_SCORE_INVALID:${id}`);
    if(r?.observationDate!=null&&!validDate(r.observationDate))throw new Error(`C1_R3_OBSERVATION_DATE_INVALID:${id}`);
  }
  await ensureTables(db);
  const statements=C1_R3_CORE95.map(id=>{
    const r=by.get(id);
    return db.prepare(`INSERT OR REPLACE INTO c1_r3_candidate_scores_v1(
      revision,score_date,candidate_id,score,observation_date,computed_at,source_snapshot_sha256
    ) VALUES(?,?,?,?,?,?,?)`).bind(
      C1_R3_REVISION,scoreDate,id,r.score,r.observationDate??null,computedAt,sourceSnapshotSha256
    );
  });
  let rowsWritten=0;
  for(let i=0;i<statements.length;i+=50){
    const result=await db.batch(statements.slice(i,i+50));
    for(const item of result??[]){
      const n=Number(item?.meta?.changes??item?.meta?.rows_written??0);
      if(Number.isFinite(n)&&n>0)rowsWritten+=n;
    }
  }
  return {status:"STORED",revision:C1_R3_REVISION,scoreDate,rowCount:C1_R3_CORE95.length,rowsWritten};
}

export const C1_R3_SCORE_STORE_CONTRACT=Object.freeze({
  role:"CALCULATION_OUTPUT_STORE_ONLY",
  providerApiCalls:0,
  formulasExecuted:false,
  acceptedRevision:C1_R3_REVISION,
  exactCandidateCount:C1_R3_CORE95.length,
});
