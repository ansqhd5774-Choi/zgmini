import {
  C1_R3_REQUIRED_SOURCE_KEYS,
  C1_R3_BASELINE_SCORE_DATE,
} from "../lib/market-score/consumption-r3-operational-config.mjs";

const init=new WeakMap();
const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const validQuarter=v=>typeof v==="string"&&/^\d{4}-Q[1-4]$/.test(v);
const enc=new TextEncoder();
const sourceSet=new Set(C1_R3_REQUIRED_SOURCE_KEYS);

async function sha256Hex(text){
  const d=await globalThis.crypto.subtle.digest("SHA-256",enc.encode(text));
  return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function ensureTables(db){
  let p=init.get(db);
  if(!p){
    p=db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS c1_r3_source_snapshots_v1 (
        revision TEXT NOT NULL,
        score_date TEXT NOT NULL,
        quarter TEXT NOT NULL,
        source_key TEXT NOT NULL,
        provider TEXT NOT NULL,
        payload_sha256 TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        source_url TEXT,
        PRIMARY KEY(revision,score_date,source_key)
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS c1_r3_source_snapshots_lookup_v1
        ON c1_r3_source_snapshots_v1(revision,score_date DESC,source_key)`),
    ]).catch(e=>{init.delete(db);throw e});
    init.set(db,p);
  }
  await p;
}
async function all(db,sql,args=[]){
  const r=await db.prepare(sql).bind(...args).all();
  return Array.isArray(r?.results)?r.results:[];
}

export async function persistConsumptionR3SourcePayloads(db,{
  scoreDate,quarter,payloads,retrievedAt=new Date().toISOString(),sourceUrls={},
}={}){
  if(!db||typeof db.prepare!=="function"||typeof db.batch!=="function")throw new Error("C1_R3_SOURCE_DB_REQUIRED");
  if(!validDate(scoreDate)||!validQuarter(quarter))throw new Error("C1_R3_SOURCE_PERIOD_INVALID");
  if(scoreDate<=C1_R3_BASELINE_SCORE_DATE) return {status:"BASELINE_NO_STORE",scoreDate,quarter,stored:0};
  if(!payloads||typeof payloads!=="object")throw new Error("C1_R3_SOURCE_PAYLOADS_REQUIRED");
  if(typeof retrievedAt!=="string"||!Number.isFinite(Date.parse(retrievedAt)))throw new Error("C1_R3_SOURCE_RETRIEVED_AT_INVALID");
  await ensureTables(db);
  const stmts=[];
  for(const [sourceKey,payload] of Object.entries(payloads)){
    if(!sourceSet.has(sourceKey))throw new Error(`C1_R3_SOURCE_KEY_INVALID:${sourceKey}`);
    const json=JSON.stringify(payload);
    const h=await sha256Hex(json);
    const provider=sourceKey.split(":")[0];
    stmts.push(db.prepare(`INSERT OR REPLACE INTO c1_r3_source_snapshots_v1(
      revision,score_date,quarter,source_key,provider,payload_sha256,payload_json,retrieved_at,source_url
    ) VALUES(?,?,?,?,?,?,?,?,?)`).bind(
      "R3.45P",scoreDate,quarter,sourceKey,provider,h,json,retrievedAt,sourceUrls[sourceKey]??null
    ));
  }
  let rowsWritten=0;
  for(let i=0;i<stmts.length;i+=40){
    const rr=await db.batch(stmts.slice(i,i+40));
    for(const x of rr??[]){
      const n=Number(x?.meta?.changes??x?.meta?.rows_written??0);
      if(Number.isFinite(n)&&n>0)rowsWritten+=n;
    }
  }
  return {status:"STORED",scoreDate,quarter,stored:stmts.length,rowsWritten};
}

export async function loadCompleteConsumptionR3Fixture(db,{scoreDate}={}){
  if(!db||typeof db.prepare!=="function")return null;
  if(!validDate(scoreDate)||scoreDate<=C1_R3_BASELINE_SCORE_DATE)return null;
  await ensureTables(db);
  const rows=await all(db,`SELECT source_key,payload_json,quarter
    FROM c1_r3_source_snapshots_v1
    WHERE revision=? AND score_date=?
    ORDER BY source_key`,["R3.45P",scoreDate]);
  const by=new Map(rows.map(r=>[r.source_key,r]));
  if(C1_R3_REQUIRED_SOURCE_KEYS.some(k=>!by.has(k)))return null;
  const quarter=rows[0]?.quarter;
  if(!validQuarter(quarter)||rows.some(r=>r.quarter!==quarter))throw new Error("C1_R3_SOURCE_QUARTER_CONFLICT");
  const payloads={};
  for(const k of C1_R3_REQUIRED_SOURCE_KEYS)payloads[k]=JSON.parse(by.get(k).payload_json);
  return {schema:"ZGMINI_C1_R345P_STORED_SOURCE_FIXTURE_V1",revision:"R3.45P",quarter,scoreDate,payloads};
}

export async function listCompleteConsumptionR3Fixtures(db,{throughScoreDate}={}){
  if(!db||typeof db.prepare!=="function")return [];
  if(!validDate(throughScoreDate))throw new Error("C1_R3_SOURCE_THROUGH_INVALID");
  await ensureTables(db);
  const heads=await all(db,`SELECT score_date,COUNT(*) AS row_count
    FROM c1_r3_source_snapshots_v1
    WHERE revision=? AND score_date>? AND score_date<=?
    GROUP BY score_date
    HAVING COUNT(*)=?
    ORDER BY score_date`,["R3.45P",C1_R3_BASELINE_SCORE_DATE,throughScoreDate,C1_R3_REQUIRED_SOURCE_KEYS.length]);
  const out=[];
  for(const h of heads){
    const fx=await loadCompleteConsumptionR3Fixture(db,{scoreDate:h.score_date});
    if(fx)out.push(fx);
  }
  return out;
}

export async function sourceKeysMissingForScoreDate(db,{scoreDate}={}){
  if(!db||typeof db.prepare!=="function")return [...C1_R3_REQUIRED_SOURCE_KEYS];
  if(!validDate(scoreDate))throw new Error("C1_R3_SOURCE_SCORE_DATE_INVALID");
  if(scoreDate<=C1_R3_BASELINE_SCORE_DATE)return [];
  await ensureTables(db);
  const rows=await all(db,`SELECT source_key FROM c1_r3_source_snapshots_v1
    WHERE revision=? AND score_date=?`,["R3.45P",scoreDate]);
  const have=new Set(rows.map(r=>r.source_key));
  return C1_R3_REQUIRED_SOURCE_KEYS.filter(k=>!have.has(k));
}

export const C1_R3_SOURCE_STORE_CONTRACT=Object.freeze({
  revision:"R3.45P",
  mode:"REVISION_SEPARATED_APPENDABLE_SOURCE_SNAPSHOTS",
  requiredSourceCount:C1_R3_REQUIRED_SOURCE_KEYS.length,
  calculationPerformed:false,
  providerRequests:0,
});
