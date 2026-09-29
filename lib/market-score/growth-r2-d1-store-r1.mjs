import {GROWTH_R2_FEATURE_IDS} from "./growth-r2-contract.mjs";
import {GROWTH_R2_SEED_ROWS,GROWTH_R2_SEED_SHA256} from "./growth-r2-seed-r1.mjs";

const REQUIRED=new Set(GROWTH_R2_FEATURE_IDS);
const initByDb=new WeakMap();
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const MAX_ROWS_PER_INSERT=4;

function validRow(row){
  return REQUIRED.has(row?.candidateId)&&typeof row?.observationDate==="string"&&
    typeof row?.availableAt==="string"&&finite(row?.harmonizedValue);
}
function recordHashInput(row){
  return [row.candidateId,row.observationDate,row.harmonizedValue,row.nativeValue??null,row.frequency??null,row.sourceHash??null,row.selector??null].join("|");
}
async function sha256Hex(text){
  const bytes=new TextEncoder().encode(text);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
export async function normalizeGrowthR2StoreRow(row,{retrievedAt=null}={}){
  if(!validRow(row))throw new Error(`GROWTH_R2_STORE_ROW_INVALID:${row?.candidateId??"UNKNOWN"}`);
  const recordHash=row.recordHash??await sha256Hex(recordHashInput(row));
  return {
    candidateId:row.candidateId,observationDate:row.observationDate,observationPeriod:row.observationPeriod??null,
    availableAt:row.availableAt,releaseDate:row.releaseDate??null,vintageId:row.vintageId??recordHash,
    pitEligible:row.pitEligible!==false,provider:row.provider??null,selector:row.selector??null,
    frequency:row.frequency??"MONTHLY",nativeValue:finite(row.nativeValue)?row.nativeValue:row.harmonizedValue,
    nativeUnit:row.nativeUnit??null,harmonizedValue:row.harmonizedValue,harmonizedUnit:row.harmonizedUnit??null,
    transformRule:row.transformRule??"IDENTITY",sourceHash:row.sourceHash??recordHash,sourceUrl:row.sourceUrl??null,
    featureRevision:row.featureRevision??"G12_HARMONIZED_FEATURE_R1",methodRevision:row.methodRevision??"G12_HARMONIZATION_METHOD_R1",
    retrievedAt:retrievedAt??row.retrievedAt??row.availableAt,recordHash,
  };
}
async function ensureTables(db){
  let p=initByDb.get(db);
  if(!p){
    p=db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS growth_r2_feature_history_v1 (
        candidate_id TEXT NOT NULL, observation_date TEXT NOT NULL, observation_period TEXT,
        available_at TEXT NOT NULL, release_date TEXT, vintage_id TEXT NOT NULL,
        pit_eligible INTEGER NOT NULL, provider TEXT, selector TEXT, frequency TEXT,
        native_value REAL, native_unit TEXT, harmonized_value REAL NOT NULL, harmonized_unit TEXT,
        transform_rule TEXT, source_hash TEXT, source_url TEXT, feature_revision TEXT,
        method_revision TEXT, retrieved_at TEXT NOT NULL, record_hash TEXT NOT NULL,
        PRIMARY KEY(candidate_id,observation_date,record_hash)
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS growth_r2_history_lookup_v1
        ON growth_r2_feature_history_v1(candidate_id,observation_date,available_at)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS growth_r2_feature_current_v1 (
        candidate_id TEXT PRIMARY KEY, observation_date TEXT NOT NULL, observation_period TEXT,
        available_at TEXT NOT NULL, release_date TEXT, vintage_id TEXT NOT NULL,
        pit_eligible INTEGER NOT NULL, provider TEXT, selector TEXT, frequency TEXT,
        native_value REAL, native_unit TEXT, harmonized_value REAL NOT NULL, harmonized_unit TEXT,
        transform_rule TEXT, source_hash TEXT, source_url TEXT, feature_revision TEXT,
        method_revision TEXT, retrieved_at TEXT NOT NULL, record_hash TEXT NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS growth_r2_meta_v1 (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS growth_r2_provider_snapshots_v1 (
        provider_group TEXT NOT NULL,snapshot_hash TEXT NOT NULL,retrieved_at TEXT NOT NULL,
        source_url TEXT,payload_json TEXT NOT NULL,PRIMARY KEY(provider_group,snapshot_hash)
      )`),
    ]).catch(e=>{initByDb.delete(db);throw e});
    initByDb.set(db,p);
  }
  await p;
}
function bindRow(st,row){
  return st.bind(row.candidateId,row.observationDate,row.observationPeriod,row.availableAt,row.releaseDate,row.vintageId,
    row.pitEligible?1:0,row.provider,row.selector,row.frequency,row.nativeValue,row.nativeUnit,row.harmonizedValue,row.harmonizedUnit,
    row.transformRule,row.sourceHash,row.sourceUrl,row.featureRevision,row.methodRevision,row.retrievedAt,row.recordHash);
}
const COLS=`candidate_id,observation_date,observation_period,available_at,release_date,vintage_id,pit_eligible,provider,selector,frequency,native_value,native_unit,harmonized_value,harmonized_unit,transform_rule,source_hash,source_url,feature_revision,method_revision,retrieved_at,record_hash`;
const Q="("+Array(21).fill("?").join(",")+")";
async function insertHistory(db,rows){
  let written=0;
  for(let i=0;i<rows.length;i+=MAX_ROWS_PER_INSERT){
    const chunk=rows.slice(i,i+MAX_ROWS_PER_INSERT);
    const sql=`INSERT OR IGNORE INTO growth_r2_feature_history_v1(${COLS}) VALUES ${chunk.map(()=>Q).join(",")}`;
    const vals=[]; for(const r of chunk)vals.push(r.candidateId,r.observationDate,r.observationPeriod,r.availableAt,r.releaseDate,r.vintageId,r.pitEligible?1:0,r.provider,r.selector,r.frequency,r.nativeValue,r.nativeUnit,r.harmonizedValue,r.harmonizedUnit,r.transformRule,r.sourceHash,r.sourceUrl,r.featureRevision,r.methodRevision,r.retrievedAt,r.recordHash);
    const res=await db.prepare(sql).bind(...vals).run();
    const n=Number(res?.meta?.changes??res?.meta?.rows_written??0); if(Number.isFinite(n)&&n>0)written+=n;
  }
  return written;
}
async function upsertCurrent(db,rows){
  let written=0;
  for(const r of rows){
    const st=db.prepare(`INSERT INTO growth_r2_feature_current_v1(${COLS}) VALUES(${Array(21).fill("?").join(",")})
      ON CONFLICT(candidate_id) DO UPDATE SET
        observation_date=excluded.observation_date,observation_period=excluded.observation_period,available_at=excluded.available_at,
        release_date=excluded.release_date,vintage_id=excluded.vintage_id,pit_eligible=excluded.pit_eligible,provider=excluded.provider,
        selector=excluded.selector,frequency=excluded.frequency,native_value=excluded.native_value,native_unit=excluded.native_unit,
        harmonized_value=excluded.harmonized_value,harmonized_unit=excluded.harmonized_unit,transform_rule=excluded.transform_rule,
        source_hash=excluded.source_hash,source_url=excluded.source_url,feature_revision=excluded.feature_revision,method_revision=excluded.method_revision,
        retrieved_at=excluded.retrieved_at,record_hash=excluded.record_hash
      WHERE excluded.observation_date>growth_r2_feature_current_v1.observation_date
         OR (excluded.observation_date=growth_r2_feature_current_v1.observation_date AND excluded.record_hash<>growth_r2_feature_current_v1.record_hash)`);
    const res=await bindRow(st,r).run(); const n=Number(res?.meta?.changes??res?.meta?.rows_written??0); if(Number.isFinite(n)&&n>0)written+=n;
  }
  return written;
}
async function metaValue(db,key){
  const r=await db.prepare(`SELECT value FROM growth_r2_meta_v1 WHERE key=?`).bind(key).first(); return r?.value??null;
}
export async function ensureGrowthR2HistoricalSeed(db,{nowIso=new Date().toISOString()}={}){
  if(!db?.prepare||!db?.batch)throw new Error("GROWTH_R2_DB_REQUIRED");
  await ensureTables(db);
  if(await metaValue(db,"historical_seed_sha256")===GROWTH_R2_SEED_SHA256)return {status:"ALREADY_SEEDED",rowsWritten:0,seedSha256:GROWTH_R2_SEED_SHA256};
  const normalized=[]; for(const row of GROWTH_R2_SEED_ROWS)normalized.push(await normalizeGrowthR2StoreRow(row));
  const rowsWritten=await insertHistory(db,normalized);
  await db.prepare(`INSERT OR REPLACE INTO growth_r2_meta_v1(key,value,updated_at) VALUES(?,?,?)`).bind("historical_seed_sha256",GROWTH_R2_SEED_SHA256,nowIso).run();
  return {status:"SEEDED",rowsWritten,rowCount:normalized.length,seedSha256:GROWTH_R2_SEED_SHA256};
}
export async function persistGrowthR2ForwardBatch(db,{records=[],snapshots=[]}={}){
  if(!db?.prepare||!db?.batch)throw new Error("GROWTH_R2_DB_REQUIRED");
  await ensureTables(db);
  const normalized=[]; for(const row of records)normalized.push(await normalizeGrowthR2StoreRow(row));
  const ids=new Set(normalized.map(r=>r.candidateId)); if(ids.size!==GROWTH_R2_FEATURE_IDS.length)throw new Error(`GROWTH_R2_FORWARD_EXACT24_REQUIRED:${ids.size}`);
  const historyWritten=await insertHistory(db,normalized); const currentWritten=await upsertCurrent(db,normalized);
  let snapshotWritten=0;
  for(const s of snapshots){
    const res=await db.prepare(`INSERT OR IGNORE INTO growth_r2_provider_snapshots_v1(provider_group,snapshot_hash,retrieved_at,source_url,payload_json) VALUES(?,?,?,?,?)`)
      .bind(s.providerGroup,s.snapshotHash,s.retrievedAt,s.sourceUrl??null,JSON.stringify(s.payload??null)).run();
    const n=Number(res?.meta?.changes??res?.meta?.rows_written??0); if(Number.isFinite(n)&&n>0)snapshotWritten+=n;
  }
  return {status:"STORED",recordCount:normalized.length,historyWritten,currentWritten,snapshotWritten};
}
export async function readGrowthR2History(db,{asOf}={}){
  if(!db?.prepare)return [];
  await ensureTables(db);
  const r=await db.prepare(`SELECT candidate_id,observation_date,observation_period,available_at,release_date,vintage_id,pit_eligible,provider,selector,frequency,native_value,native_unit,harmonized_value,harmonized_unit,transform_rule,source_hash,source_url,feature_revision,method_revision,retrieved_at,record_hash
    FROM growth_r2_feature_history_v1 WHERE pit_eligible=1 AND substr(available_at,1,10)<=? ORDER BY candidate_id,observation_date,available_at`).bind(asOf).all();
  return (r?.results??[]).map(x=>({candidateId:x.candidate_id,observationDate:x.observation_date,observationPeriod:x.observation_period,availableAt:x.available_at,releaseDate:x.release_date,vintageId:x.vintage_id,pitEligible:x.pit_eligible===1,provider:x.provider,selector:x.selector,frequency:x.frequency,nativeValue:Number(x.native_value),nativeUnit:x.native_unit,harmonizedValue:Number(x.harmonized_value),harmonizedUnit:x.harmonized_unit,transformRule:x.transform_rule,sourceHash:x.source_hash,sourceUrl:x.source_url,featureRevision:x.feature_revision,methodRevision:x.method_revision,retrievedAt:x.retrieved_at,recordHash:x.record_hash}));
}
export async function readGrowthR2Current(db){
  if(!db?.prepare)return [];
  await ensureTables(db);
  const r=await db.prepare(`SELECT candidate_id,observation_date,available_at,harmonized_value,record_hash FROM growth_r2_feature_current_v1 ORDER BY candidate_id`).all();
  return r?.results??[];
}
export const GROWTH_R2_D1_CONTRACT=Object.freeze({historyTable:"growth_r2_feature_history_v1",currentTable:"growth_r2_feature_current_v1",snapshotTable:"growth_r2_provider_snapshots_v1",appendOnlyHistory:true,requiredCoverage:24,calculatorNetworkRequests:0});
